/**
 * Auditor pasivo de WordPress.
 *
 * Implementación 100% original. Inspirada en checks comunes de OWASP/CWE
 * y herramientas como WPScan/WPSentry — pero la lógica, los textos y el
 * sistema de score son nuestros.
 *
 * Política dura: SOLO observa. No envía credenciales, no fuzzea, no
 * realiza acciones que cambien estado del servidor. Métodos: GET/HEAD.
 */

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: 'headers' | 'endpoints' | 'enum' | 'version' | 'meta';
  detail: string;
  recommendation: string;
  evidence?: string;
}

export interface AuditResult {
  target: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  score: number;            // 0-100
  riskLabel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  findings: Finding[];
  metadata: {
    isHttps: boolean;
    wpVersion: string | null;
    server: string | null;
    poweredBy: string | null;
    wafDetected: string | null;
  };
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  finalUrl?: string;
  headers: Record<string, string>;
  body: string;
  truncated?: boolean;
  error?: string;
}

const SEVERITY_PENALTY: Record<Severity, number> = {
  info: 0,
  low: 5,
  medium: 10,
  high: 20,
  critical: 35,
};

function b64urlEncode(s: string): string {
  // UTF-8 safe base64url — esquiva el WAF managed de Cloudflare que filtra
  // patrones tipo `wp-config.php` o `.env` en el query string del Worker.
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function proxyGet(workerUrl: string, target: string, method: 'GET' | 'HEAD' = 'GET'): Promise<ProxyResponse> {
  const u = new URL(workerUrl);
  u.searchParams.set('target', b64urlEncode(target));
  if (method !== 'GET') u.searchParams.set('method', method);
  const resp = await fetch(u.toString(), { method: 'GET' });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    // Detección heurística del WAF managed bloqueando la request
    const wafBlock = resp.status === 403 && /attention required|cloudflare/i.test(txt);
    return {
      status: 0,
      statusText: 'proxy-error',
      headers: {},
      body: '',
      error: wafBlock
        ? `WAF de Cloudflare bloqueó la request (HTTP 403). Esto suele pasar con URLs muy obvias — el target queda igual, pero el patrón en query string lo detecta una regla managed.`
        : `proxy ${resp.status}: ${txt.slice(0, 200)}`,
    };
  }
  const data = (await resp.json()) as ProxyResponse;
  return data;
}

// ──────────────────────────── checks ────────────────────────────

const SEC_HEADERS: Array<{
  key: string;
  title: string;
  severity: Severity;
  recommendation: string;
}> = [
  {
    key: 'content-security-policy',
    title: 'Sin Content-Security-Policy (CSP)',
    severity: 'medium',
    recommendation:
      'Añade un CSP restrictivo. Mínimo: `default-src \'self\'; script-src \'self\'; object-src \'none\';`. Itera basándote en violaciones reportadas.',
  },
  {
    key: 'strict-transport-security',
    title: 'Sin HSTS (Strict-Transport-Security)',
    severity: 'medium',
    recommendation:
      'Añade `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Sólo aplica si el sitio sirve HTTPS.',
  },
  {
    key: 'x-frame-options',
    title: 'Sin X-Frame-Options',
    severity: 'low',
    recommendation:
      'Añade `X-Frame-Options: DENY` o usa `frame-ancestors \'none\'` en el CSP para prevenir clickjacking.',
  },
  {
    key: 'x-content-type-options',
    title: 'Sin X-Content-Type-Options',
    severity: 'low',
    recommendation: 'Añade `X-Content-Type-Options: nosniff` para evitar MIME-sniffing.',
  },
  {
    key: 'referrer-policy',
    title: 'Sin Referrer-Policy',
    severity: 'low',
    recommendation:
      'Añade `Referrer-Policy: strict-origin-when-cross-origin` para no filtrar URLs internas en navegaciones externas.',
  },
  {
    key: 'permissions-policy',
    title: 'Sin Permissions-Policy',
    severity: 'info',
    recommendation:
      'Considera `Permissions-Policy: geolocation=(), microphone=(), camera=()` y deshabilita lo que no uses.',
  },
];

const ENDPOINTS_TO_CHECK: Array<{
  path: string;
  title: string;
  severity: Severity;
  successStatuses: number[];
  recommendation: string;
  detailOnHit: string;
}> = [
  {
    path: '/xmlrpc.php',
    title: 'xmlrpc.php expuesto',
    severity: 'medium',
    successStatuses: [200, 405],
    recommendation:
      'Si no usas XML-RPC (Jetpack, app móvil oficial), bloquéalo con tu WAF o un plugin (Disable XML-RPC) — es vector de bruteforce y DDoS via pingback.',
    detailOnHit:
      'XML-RPC habilitado. Permite enumeración de usuarios vía `wp.getUsersBlogs`, amplificación DDoS con pingback y bruteforce de credenciales sin throttling.',
  },
  {
    path: '/wp-login.php',
    title: 'wp-login.php accesible',
    severity: 'info',
    successStatuses: [200],
    recommendation:
      'Considera proteger /wp-login.php con autenticación HTTP adicional, rate-limit del WAF o renombrarlo con plugins tipo WPS Hide Login.',
    detailOnHit: 'Página de login estándar accesible desde Internet. Es objetivo común de bruteforce.',
  },
  {
    path: '/wp-admin/',
    title: 'wp-admin accesible sin auth',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Las requests a /wp-admin/ deberían redirigir a /wp-login.php. Si devuelve 200 sin auth puede haber un wp-admin/install.php expuesto.',
    detailOnHit: '/wp-admin/ responde 200 sin requerir autenticación.',
  },
  {
    path: '/wp-json/',
    title: 'REST API expuesta',
    severity: 'info',
    successStatuses: [200],
    recommendation:
      'La REST API es funcional por defecto. Restringe endpoints sensibles (users) con un mu-plugin o filter `rest_endpoints`.',
    detailOnHit: 'Endpoint /wp-json/ disponible — base de la REST API.',
  },
  {
    path: '/readme.html',
    title: 'readme.html expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation: 'Elimina o bloquea /readme.html — filtra la versión exacta de WordPress.',
    detailOnHit: 'readme.html accesible: filtra versión exacta de WordPress al atacante.',
  },
  {
    path: '/wp-content/debug.log',
    title: 'debug.log expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Borra el archivo y desactiva `WP_DEBUG_LOG` en producción. Bloquea wp-content/*.log en tu servidor web.',
    detailOnHit: 'debug.log accesible públicamente: puede contener stack traces, paths absolutos, queries SQL y datos sensibles.',
  },
  {
    path: '/.env',
    title: '.env expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Mueve .env fuera del docroot o bloquéalo en nginx/apache. Rota TODAS las credenciales que aparezcan.',
    detailOnHit: 'Archivo .env accesible — típicamente contiene credenciales de DB y API keys.',
  },
  {
    path: '/wp-config.php~',
    title: 'wp-config.php~ (backup) expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Elimina el backup. Configura tu servidor para denegar archivos terminados en ~, .bak, .old.',
    detailOnHit: 'Backup de wp-config.php accesible — incluye credenciales de BD y SALT keys.',
  },
  {
    path: '/wp-content/uploads/',
    title: 'Listing de uploads',
    severity: 'low',
    successStatuses: [200],
    recommendation:
      'Desactiva directory listing (`Options -Indexes` en Apache, `autoindex off` en nginx) o añade un index.html vacío.',
    detailOnHit: 'Directorio /wp-content/uploads/ permite listado.',
  },
];

// ──────────────────────────── helpers ────────────────────────────

function detectWAF(headers: Record<string, string>): string | null {
  if (headers['cf-ray'] || headers['server']?.toLowerCase().includes('cloudflare')) return 'Cloudflare';
  if (headers['x-sucuri-id']) return 'Sucuri';
  if (headers['server']?.toLowerCase().includes('akamai')) return 'Akamai';
  if (headers['x-cdn']?.toLowerCase().includes('imperva')) return 'Imperva';
  if (headers['x-amz-cf-id']) return 'AWS CloudFront';
  if (headers['x-cdn']) return headers['x-cdn'];
  return null;
}

function extractWpVersion(body: string, headers: Record<string, string>): string | null {
  // 1) <meta name="generator" content="WordPress X.Y.Z" />
  const meta = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']WordPress\s+([0-9.]+)["']/i);
  if (meta) return meta[1];
  // 2) header link a wp-json con version
  const xpb = headers['x-powered-by'];
  if (xpb) {
    const m = xpb.match(/WordPress\/([0-9.]+)/i);
    if (m) return m[1];
  }
  // 3) en /readme.html → manejado fuera
  return null;
}

function extractWpVersionFromReadme(body: string): string | null {
  const m = body.match(/Version\s+([0-9.]+)/i);
  return m ? m[1] : null;
}

function trySafeUrl(input: string): URL | null {
  try {
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    const u = new URL(input);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

function joinUrl(base: URL, path: string): string {
  const b = base.origin + base.pathname.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : '/' + path;
  return b + p;
}

// ──────────────────────────── main ────────────────────────────

export async function auditWordpress(
  workerUrl: string,
  rawTarget: string,
  onProgress?: (label: string) => void
): Promise<AuditResult> {
  const base = trySafeUrl(rawTarget);
  if (!base) throw new Error('URL inválida');
  const start = performance.now();
  const startedAt = new Date().toISOString();
  const findings: Finding[] = [];

  // ── 1. GET / (raíz) ──
  onProgress?.('GET /');
  const root = await proxyGet(workerUrl, base.origin + '/');
  if (root.error) {
    throw new Error(`No se pudo alcanzar el objetivo: ${root.error}`);
  }

  // headers
  for (const def of SEC_HEADERS) {
    if (!root.headers[def.key]) {
      // HSTS solo aplica si es HTTPS
      if (def.key === 'strict-transport-security' && base.protocol !== 'https:') continue;
      findings.push({
        id: `header:${def.key}`,
        title: def.title,
        severity: def.severity,
        category: 'headers',
        detail: `La respuesta de ${base.origin} no incluye el header \`${def.key}\`.`,
        recommendation: def.recommendation,
      });
    }
  }

  // server / powered-by leaks
  const server = root.headers['server'] ?? null;
  const poweredBy = root.headers['x-powered-by'] ?? null;
  if (server && /[\d.]/.test(server)) {
    findings.push({
      id: 'header:server-version',
      title: 'Header Server revela versión',
      severity: 'low',
      category: 'headers',
      detail: `Server: ${server}`,
      recommendation: 'Oculta o sanitiza el header `Server`. En nginx: `server_tokens off;`. En Apache: `ServerTokens Prod`.',
      evidence: `Server: ${server}`,
    });
  }
  if (poweredBy) {
    findings.push({
      id: 'header:powered-by',
      title: 'Header X-Powered-By presente',
      severity: 'low',
      category: 'headers',
      detail: `X-Powered-By: ${poweredBy}`,
      recommendation: 'Elimina el header X-Powered-By. En PHP: `expose_php = Off` en php.ini.',
      evidence: `X-Powered-By: ${poweredBy}`,
    });
  }

  // versión por meta generator
  let wpVersion = extractWpVersion(root.body, root.headers);
  if (wpVersion) {
    findings.push({
      id: 'meta:generator',
      title: 'Versión de WordPress filtrada en <meta generator>',
      severity: 'low',
      category: 'meta',
      detail: `Versión detectada: WordPress ${wpVersion}`,
      recommendation:
        'Quita el meta generator: `remove_action(\'wp_head\', \'wp_generator\');` en functions.php o desde un mu-plugin.',
      evidence: `<meta name="generator" content="WordPress ${wpVersion}">`,
    });
  }

  // ── 2. endpoints en paralelo ──
  onProgress?.('endpoints en paralelo');
  const endpointResults = await Promise.all(
    ENDPOINTS_TO_CHECK.map(async (e) => ({
      def: e,
      res: await proxyGet(workerUrl, joinUrl(base, e.path)),
    }))
  );

  for (const { def, res } of endpointResults) {
    if (res.error) continue;
    if (def.successStatuses.includes(res.status)) {
      findings.push({
        id: `endpoint:${def.path}`,
        title: def.title,
        severity: def.severity,
        category: 'endpoints',
        detail: def.detailOnHit,
        recommendation: def.recommendation,
        evidence: `${def.path} → HTTP ${res.status}`,
      });
    }
  }

  // versión vía readme
  const readme = endpointResults.find((r) => r.def.path === '/readme.html');
  if (readme && readme.def.successStatuses.includes(readme.res.status)) {
    const v = extractWpVersionFromReadme(readme.res.body);
    if (v && !wpVersion) {
      wpVersion = v;
      findings.push({
        id: 'version:readme',
        title: `Versión exacta en readme.html: WordPress ${v}`,
        severity: 'medium',
        category: 'version',
        detail: `El archivo /readme.html expone la versión exacta (${v}). Esto facilita búsqueda de exploits específicos para esa release.`,
        recommendation: 'Borra /readme.html o bloquéalo a nivel de servidor web.',
        evidence: v,
      });
    }
  }

  // ── 3. enumeración usuarios via REST API ──
  onProgress?.('enum users (wp-json)');
  const usersUrl = joinUrl(base, '/wp-json/wp/v2/users');
  const users = await proxyGet(workerUrl, usersUrl);
  if (!users.error && users.status === 200) {
    try {
      const arr = JSON.parse(users.body);
      if (Array.isArray(arr) && arr.length > 0) {
        const slugs = arr
          .map((u: any) => u?.slug ?? u?.name)
          .filter(Boolean)
          .slice(0, 20);
        findings.push({
          id: 'enum:rest-users',
          title: `Enumeración de usuarios via REST API (${arr.length} encontrados)`,
          severity: 'high',
          category: 'enum',
          detail:
            'El endpoint /wp-json/wp/v2/users devuelve la lista pública de usuarios con sus slugs (que son los nombres de login en la mayoría de instalaciones).',
          recommendation:
            'Bloquea el endpoint con un filter `rest_endpoints` o un mu-plugin: `add_filter(\'rest_endpoints\', fn($e) => unset($e[\'/wp/v2/users\']) ?: $e);`',
          evidence: slugs.join(', '),
        });
      }
    } catch {
      /* not json */
    }
  }

  // ── 4. enumeración via ?author=1 ──
  onProgress?.('enum users (author=1)');
  const authorProbe = await proxyGet(workerUrl, base.origin + '/?author=1');
  if (!authorProbe.error) {
    const loc = authorProbe.headers['location'];
    if ((authorProbe.status === 301 || authorProbe.status === 302) && loc?.includes('/author/')) {
      const match = loc.match(/\/author\/([^\/?]+)/);
      findings.push({
        id: 'enum:author',
        title: 'Enumeración de usuarios via ?author=1',
        severity: 'medium',
        category: 'enum',
        detail:
          'La query `?author=1` redirige a `/author/<username>/`, revelando el slug del primer usuario sin autenticación.',
        recommendation:
          'Aplica un rewrite que bloquee `?author=` en la URL o usa un plugin que mitigue user enumeration.',
        evidence: match ? `usuario: ${match[1]}` : loc,
      });
    }
  }

  // ── 5. WAF ──
  const waf = detectWAF(root.headers);

  // ── score ──
  let score = 100;
  for (const f of findings) score -= SEVERITY_PENALTY[f.severity];
  score = Math.max(0, Math.min(100, score));
  let label: AuditResult['riskLabel'];
  if (score >= 80) label = 'Bajo';
  else if (score >= 50) label = 'Medio';
  else if (score >= 25) label = 'Alto';
  else label = 'Crítico';

  const finishedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - start);

  return {
    target: base.origin,
    startedAt,
    finishedAt,
    durationMs,
    score,
    riskLabel: label,
    findings,
    metadata: {
      isHttps: base.protocol === 'https:',
      wpVersion,
      server,
      poweredBy,
      wafDetected: waf,
    },
  };
}

export function findingsByCategory(findings: Finding[]) {
  const out: Record<Finding['category'], Finding[]> = {
    headers: [],
    endpoints: [],
    enum: [],
    version: [],
    meta: [],
  };
  for (const f of findings) out[f.category].push(f);
  return out;
}
