/**
 * Auditor pasivo de Drupal.
 *
 * Implementación 100% serverless, ética y de solo lectura.
 * Realiza peticiones GET/HEAD mediante el proxy seguro de Cloudflare.
 */

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: 'headers' | 'endpoints' | 'version' | 'meta';
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
    drupalVersion: string | null;
    poweredBy: string | null;
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
    const wafBlock = resp.status === 403 && /attention required|cloudflare/i.test(txt);
    return {
      status: 0,
      statusText: 'proxy-error',
      headers: {},
      body: '',
      error: wafBlock
        ? 'WAF de Cloudflare bloqueó la request (HTTP 403).'
        : `proxy ${resp.status}: ${txt.slice(0, 200)}`,
    };
  }
  return (await resp.json()) as ProxyResponse;
}

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
    recommendation: 'Inyecta un CSP restrictivo para mitigar vulnerabilidades XSS e inyecciones maliciosas.',
  },
  {
    key: 'strict-transport-security',
    title: 'Sin HSTS (Strict-Transport-Security)',
    severity: 'medium',
    recommendation: 'Asegúrate de agregar `Strict-Transport-Security: max-age=63072000` si cuentas con un certificado SSL configurado.',
  },
  {
    key: 'x-frame-options',
    title: 'Sin X-Frame-Options',
    severity: 'low',
    recommendation: 'Previene el clickjacking inyectando `X-Frame-Options: SAMEORIGIN` en las cabeceras del servidor web.',
  },
  {
    key: 'x-content-type-options',
    title: 'Sin X-Content-Type-Options',
    severity: 'low',
    recommendation: 'Habilita `X-Content-Type-Options: nosniff` para obligar al navegador a seguir estrictamente los tipos MIME configurados.',
  },
  {
    key: 'referrer-policy',
    title: 'Sin Referrer-Policy',
    severity: 'low',
    recommendation: 'Agrega `Referrer-Policy: strict-origin-when-cross-origin` para controlar la cantidad de información que se envía al referenciar otros sitios.',
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
    path: '/core/CHANGELOG.txt',
    title: 'Archivo CHANGELOG.txt expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation: 'Elimina o bloquea el acceso a `/core/CHANGELOG.txt` y `/CHANGELOG.txt`. Este archivo expone el historial de versiones del core.',
    detailOnHit: 'Historial /core/CHANGELOG.txt disponible públicamente.',
  },
  {
    path: '/CHANGELOG.txt',
    title: 'Archivo CHANGELOG.txt en raíz expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation: 'Bloquea o elimina el CHANGELOG.txt de la carpeta raíz de tu instalación de Drupal.',
    detailOnHit: 'Historial /CHANGELOG.txt accesible.',
  },
  {
    path: '/user/login',
    title: 'Página de inicio de sesión Drupal expuesta',
    severity: 'info',
    successStatuses: [200],
    recommendation: 'El portal de inicio de sesión de Drupal (/user/login) está expuesto. Considera establecer restricciones por IP, rate-limiting, o autenticación básica adicional.',
    detailOnHit: 'Portal de autenticación de usuarios accesible públicamente.',
  },
  {
    path: '/core/install.php',
    title: 'Instalador de Drupal core/install.php expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation: 'Bloquea el acceso a `/core/install.php` mediante el archivo .htaccess o web.config del servidor para evitar intentos ilícitos de reinicialización.',
    detailOnHit: 'core/install.php responde con estado accesible.',
  },
  {
    path: '/sites/default/settings.php',
    title: 'settings.php accesible sin autenticación',
    severity: 'critical',
    successStatuses: [200],
    recommendation: 'Bloquea de inmediato el acceso a `/sites/default/settings.php`. Es una fuga crítica de seguridad que puede exponer credenciales de base de datos.',
    detailOnHit: 'settings.php expuesto. Contiene configuraciones críticas del CMS.',
  },
  {
    path: '/sites/default/settings.php.bak',
    title: 'Backup settings.php.bak expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation: 'Elimina cualquier copia de respaldo de configuraciones (.bak, .old, ~) en el servidor de producción.',
    detailOnHit: 'Copia settings.php.bak expuesta con contraseñas e información del núcleo.',
  },
  {
    path: '/core/lib/Drupal.php',
    title: 'Firma de código core/lib/Drupal.php expuesta',
    severity: 'low',
    successStatuses: [200],
    recommendation: 'Restringe el listado y lectura directa de archivos PHP del sistema en la carpeta /core/lib/.',
    detailOnHit: 'El archivo central de librería core/lib/Drupal.php se encuentra accesible.',
  },
];

function extractDrupalVersion(body: string): string | null {
  // Meta generator: <meta name="generator" content="Drupal 9 (https://www.drupal.org)" />
  const meta = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']Drupal\s+([0-9.]+)?/i);
  if (meta && meta[1]) return meta[1];
  return null;
}

function extractVersionFromChangelog(body: string): string | null {
  // Drupal 9.4.5, 2022-08-17
  // Drupal 8.9.20, 2021-11-17
  const m = body.match(/Drupal\s+([0-9.]+),/i);
  return m ? m[1] : null;
}

function trySafeUrl(input: string): URL | null {
  try {
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    const u = new URL(input);
    return ['http:', 'https:'].includes(u.protocol) ? u : null;
  } catch {
    return null;
  }
}

function joinUrl(base: URL, path: string): string {
  const b = base.origin + base.pathname.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : '/' + path;
  return b + p;
}

export async function auditDrupal(
  workerUrl: string,
  rawTarget: string,
  onProgress?: (label: string) => void
): Promise<AuditResult> {
  const base = trySafeUrl(rawTarget);
  if (!base) throw new Error('URL inválida');
  const start = performance.now();
  const startedAt = new Date().toISOString();
  const findings: Finding[] = [];

  // 1. GET / (Raíz)
  onProgress?.('GET / (Index)');
  const root = await proxyGet(workerUrl, base.origin + '/');
  if (root.error) {
    throw new Error(`No se pudo alcanzar el objetivo: ${root.error}`);
  }

  // Headers
  for (const def of SEC_HEADERS) {
    if (!root.headers[def.key]) {
      if (def.key === 'strict-transport-security' && base.protocol !== 'https:') continue;
      findings.push({
        id: `header:${def.key}`,
        title: def.title,
        severity: def.severity,
        category: 'headers',
        detail: `La respuesta de ${base.origin} no incluye el header de seguridad \`${def.key}\`.`,
        recommendation: def.recommendation,
      });
    }
  }

  const poweredBy = root.headers['x-powered-by'] ?? null;
  if (poweredBy) {
    findings.push({
      id: 'header:powered-by',
      title: 'Header X-Powered-By presente',
      severity: 'low',
      category: 'headers',
      detail: `Fuga de tecnología en cabeceras: ${poweredBy}`,
      recommendation: 'Deshabilita la firma X-Powered-By o edita la configuración PHP.ini (expose_php = Off) para evitar escaneos automatizados.',
      evidence: poweredBy,
    });
  }

  // Versión vía generator
  let drupalVersion = extractDrupalVersion(root.body);
  if (drupalVersion) {
    findings.push({
      id: 'meta:generator',
      title: `Versión Drupal detectada en generator: ${drupalVersion}`,
      severity: 'low',
      category: 'meta',
      detail: `El código HTML expone la versión del CMS en las cabeceras generator.`,
      recommendation: 'Elimina la firma de generator deshabilitando el metatag generator en tu panel de administración o plantilla activa.',
      evidence: `Generator: Drupal ${drupalVersion}`,
    });
  }

  // 2. Endpoints en paralelo
  onProgress?.('analizando endpoints críticos');
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

  // Versión vía CHANGELOG
  const coreChangelog = endpointResults.find((r) => r.def.path === '/core/CHANGELOG.txt');
  const rootChangelog = endpointResults.find((r) => r.def.path === '/CHANGELOG.txt');
  let changelogRes = null;
  if (coreChangelog && coreChangelog.def.successStatuses.includes(coreChangelog.res.status)) {
    changelogRes = coreChangelog.res;
  } else if (rootChangelog && rootChangelog.def.successStatuses.includes(rootChangelog.res.status)) {
    changelogRes = rootChangelog.res;
  }

  if (changelogRes) {
    const v = extractVersionFromChangelog(changelogRes.body);
    if (v && !drupalVersion) {
      drupalVersion = v;
      findings.push({
        id: 'version:changelog',
        title: `Versión exacta de Drupal filtrada en CHANGELOG: ${v}`,
        severity: 'high',
        category: 'version',
        detail: `El archivo CHANGELOG expone la versión exacta (${v}). Esto le facilita al atacante la búsqueda de exploits específicos.`,
        recommendation: 'Bloquea el acceso o elimina los archivos CHANGELOG.txt del servidor.',
        evidence: v,
      });
    }
  }

  // 3. Score
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
      drupalVersion,
      poweredBy,
    },
  };
}
