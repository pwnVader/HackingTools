/**
 * CORS proxy para hacking.pwnvader.com.
 *
 * El front (estático en GH Pages) no puede hacer fetch directo a sitios
 * arbitrarios por CORS. Este Worker pide la URL pedida y devuelve la
 * respuesta serializada en JSON, incluyendo headers, status y body.
 *
 * Uso (desde el cliente):
 *   GET https://<worker>.workers.dev/?url=https://example.com&method=GET
 *
 * El Worker:
 *  - Acepta solo http/https.
 *  - Limita el tamaño del body devuelto (MAX_BODY_BYTES).
 *  - Aplica timeout (TIMEOUT_MS).
 *  - Restringe Access-Control-Allow-Origin a la lista ALLOWED_ORIGINS.
 *
 * Pensado para auditoría pasiva. NO ataca ni hace requests no GET/HEAD
 * por defecto. Métodos permitidos: GET, HEAD, OPTIONS.
 */

export interface Env {
  ALLOWED_ORIGINS: string;
  MAX_BODY_BYTES: string;
  TIMEOUT_MS: string;
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function corsHeaders(env: Env, origin: string | null): HeadersInit {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  // Permite cualquier puerto en localhost / 127.0.0.1 — útil para dev (Vite picks 5173, 5174, …)
  const isAllowed =
    !!origin && (allowed.includes(origin) || LOCALHOST_RE.test(origin));
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
  if (isAllowed && origin) {
    headers['access-control-allow-origin'] = origin;
  } else if (allowed[0]) {
    headers['access-control-allow-origin'] = allowed[0];
  }
  return headers;
}

function json(body: unknown, init: ResponseInit, env: Env, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(env, origin),
      ...(init.headers ?? {}),
    },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin');

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }

    if (req.method !== 'GET') {
      return json({ error: 'method not allowed' }, { status: 405 }, env, origin);
    }

    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'pwnvader-cors-proxy' }, { status: 200 }, env, origin);
    }

    // Aceptamos `?target=<base64url>` (preferido — esquiva WAF managed rules
    // que bloquean patrones sensibles tipo `wp-config.php`, `.env`, etc. en
    // el query string) o el legacy `?url=<raw>`.
    const targetParam = url.searchParams.get('target');
    const urlParam = url.searchParams.get('url');
    let target: string | null = null;
    if (targetParam) {
      try {
        let v = targetParam.replace(/-/g, '+').replace(/_/g, '/');
        while (v.length % 4) v += '=';
        target = atob(v);
      } catch {
        return json({ error: 'invalid base64url target' }, { status: 400 }, env, origin);
      }
    } else if (urlParam) {
      target = urlParam;
    }
    if (!target) {
      return json(
        { error: 'missing ?target= (base64url) or ?url= query parameter' },
        { status: 400 },
        env,
        origin
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return json({ error: 'invalid url' }, { status: 400 }, env, origin);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return json({ error: 'only http/https are allowed' }, { status: 400 }, env, origin);
    }

    // Bloquear direcciones internas / metadata clouds (best-effort)
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return json({ error: 'target host blocked' }, { status: 403 }, env, origin);
    }

    const method = (url.searchParams.get('method') ?? 'GET').toUpperCase();
    if (!ALLOWED_METHODS.has(method)) {
      return json({ error: `method ${method} not allowed` }, { status: 400 }, env, origin);
    }

    const timeoutMs = Number(env.TIMEOUT_MS) || 10_000;
    const maxBytes = Number(env.MAX_BODY_BYTES) || 524_288;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(parsed.toString(), {
        method,
        redirect: 'manual',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; pwnvader-audit/1.0; +https://hacking.pwnvader.com)',
          accept: '*/*',
        },
        signal: controller.signal,
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      const headers: Record<string, string> = {};
      upstream.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });

      let body = '';
      let truncated = false;
      if (method !== 'HEAD') {
        const reader = upstream.body?.getReader();
        if (reader) {
          const chunks: Uint8Array[] = [];
          let total = 0;
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              total += value.byteLength;
              if (total > maxBytes) {
                const remaining = maxBytes - (total - value.byteLength);
                if (remaining > 0) chunks.push(value.slice(0, remaining));
                truncated = true;
                break;
              }
              chunks.push(value);
            }
          }
          reader.cancel();
          const merged = new Uint8Array(chunks.reduce((acc, c) => acc + c.byteLength, 0));
          let off = 0;
          for (const c of chunks) {
            merged.set(c, off);
            off += c.byteLength;
          }
          body = new TextDecoder('utf-8', { fatal: false }).decode(merged);
        }
      }

      clearTimeout(timer);

      return json(
        {
          status: upstream.status,
          statusText: upstream.statusText,
          finalUrl: upstream.url,
          headers,
          body,
          truncated,
        },
        { status: 200 },
        env,
        origin
      );
    } catch (err) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: 'upstream fetch failed', detail: message }, { status: 502 }, env, origin);
    }
  },
};
