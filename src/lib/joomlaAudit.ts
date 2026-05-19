/**
 * Auditor pasivo de Joomla.
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
    joomlaVersion: string | null;
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
    recommendation: 'Añade un CSP restrictivo en tu servidor web o mediante un plugin para prevenir inyecciones XSS y clickjacking.',
  },
  {
    key: 'strict-transport-security',
    title: 'Sin HSTS (Strict-Transport-Security)',
    severity: 'medium',
    recommendation: 'Añade `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` a tu servidor para forzar HTTPS.',
  },
  {
    key: 'x-frame-options',
    title: 'Sin X-Frame-Options',
    severity: 'low',
    recommendation: 'Inyecta la cabecera `X-Frame-Options: SAMEORIGIN` o `DENY` para denegar el renderizado en frames ajenos.',
  },
  {
    key: 'x-content-type-options',
    title: 'Sin X-Content-Type-Options',
    severity: 'low',
    recommendation: 'Añade `X-Content-Type-Options: nosniff` para evitar ataques MIME-sniffing.',
  },
  {
    key: 'referrer-policy',
    title: 'Sin Referrer-Policy',
    severity: 'low',
    recommendation: 'Configura `Referrer-Policy: strict-origin-when-cross-origin` para evitar fugas de información interna en la cabecera Referer.',
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
    path: '/administrator/',
    title: 'Consola de Administración Joomla expuesta',
    severity: 'info',
    successStatuses: [200],
    recommendation: 'La consola de administración está públicamente disponible. Considera agregar autenticación HTTP básica (htaccess), rate-limiting o cambiar el slug predeterminado mediante extensiones de seguridad Joomla.',
    detailOnHit: 'Panel de administración (/administrator/) detectado y accesible desde Internet.',
  },
  {
    path: '/joomla.xml',
    title: 'Archivo de manifiesto joomla.xml expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation: 'Elimina o restringe el acceso al archivo /joomla.xml. Este archivo suele contener datos de la versión del núcleo y de la instalación.',
    detailOnHit: 'joomla.xml expone información estructural del núcleo Joomla.',
  },
  {
    path: '/configuration.php-dist',
    title: 'configuration.php-dist expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation: 'Elimina /configuration.php-dist de tu servidor raíz. Da pistas de la estructura interna y configuraciones iniciales.',
    detailOnHit: 'Plantilla de configuración por defecto configuration.php-dist accesible.',
  },
  {
    path: '/htaccess.txt',
    title: 'htaccess.txt expuesto',
    severity: 'low',
    successStatuses: [200],
    recommendation: 'Borra /htaccess.txt si ya has renombrado tu archivo a .htaccess o bloquéalo a nivel del servidor web.',
    detailOnHit: 'htaccess.txt disponible públicamente.',
  },
  {
    path: '/web.config.txt',
    title: 'web.config.txt expuesto',
    severity: 'low',
    successStatuses: [200],
    recommendation: 'Elimina /web.config.txt de la carpeta raíz de tu Joomla.',
    detailOnHit: 'Plantilla web.config.txt de IIS expuesta.',
  },
  {
    path: '/README.txt',
    title: 'README.txt de Joomla expuesto',
    severity: 'low',
    successStatuses: [200],
    recommendation: 'Elimina los archivos de documentación README.txt y LICENSE.txt en el directorio de producción para evitar leak de información de versión.',
    detailOnHit: 'Documentación README.txt expuesta.',
  },
  {
    path: '/LICENSE.txt',
    title: 'LICENSE.txt de Joomla expuesto',
    severity: 'info',
    successStatuses: [200],
    recommendation: 'Borra el archivo /LICENSE.txt para no dar pistas adicionales sobre la instalación base.',
    detailOnHit: 'El archivo de licencia es públicamente legible.',
  },
];

function extractJoomlaVersion(body: string): string | null {
  // 1) Meta generator: <meta name="generator" content="Joomla! - Open Source Content Management" />
  // A veces contiene versión: "Joomla! 3.9 - Open Source Content Management"
  const meta = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']Joomla!\s*([0-9.]+)?/i);
  if (meta && meta[1]) return meta[1];
  return null;
}

function extractVersionFromXml(body: string): string | null {
  // <version>3.9.28</version> en joomla.xml
  const m = body.match(/<version>([0-9.]+)<\/version>/i);
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

export async function auditJoomla(
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
      recommendation: 'Desactiva la visualización de tecnologías y versiones en las cabeceras HTTP de tu servidor o PHP.ini (expose_php = Off).',
      evidence: poweredBy,
    });
  }

  // Versión vía generator
  let joomlaVersion = extractJoomlaVersion(root.body);
  if (joomlaVersion) {
    findings.push({
      id: 'meta:generator',
      title: `Versión Joomla detectada en generator: ${joomlaVersion}`,
      severity: 'low',
      category: 'meta',
      detail: `El código HTML expone la versión del CMS en las cabeceras meta.`,
      recommendation: 'Elimina el meta tag generator editando el archivo index.php del template activo o mediante un plugin de seguridad.',
      evidence: `Generator: Joomla! ${joomlaVersion}`,
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

  // Versión vía joomla.xml
  const jXml = endpointResults.find((r) => r.def.path === '/joomla.xml');
  if (jXml && jXml.def.successStatuses.includes(jXml.res.status)) {
    const v = extractVersionFromXml(jXml.res.body);
    if (v && !joomlaVersion) {
      joomlaVersion = v;
      findings.push({
        id: 'version:joomlaxml',
        title: `Versión exacta de Joomla filtrada en joomla.xml: ${v}`,
        severity: 'high',
        category: 'version',
        detail: `El archivo /joomla.xml se encuentra legible y revela la versión exacta del core (${v}).`,
        recommendation: 'Elimina o bloquea el archivo /joomla.xml para que no sea accesible externamente.',
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
      joomlaVersion,
      poweredBy,
    },
  };
}
