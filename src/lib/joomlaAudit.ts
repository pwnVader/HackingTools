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
  {
    key: 'permissions-policy',
    title: 'Sin Permissions-Policy',
    severity: 'info',
    recommendation:
      'Configura `Permissions-Policy: geolocation=(), microphone=(), camera=()` y deshabilita cualquier feature de navegador que no uses.',
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
    recommendation:
      'La consola de administración está públicamente disponible. Considera agregar autenticación HTTP básica (htaccess), rate-limiting, o renombrar el directorio con extensiones tipo `AdminExile`.',
    detailOnHit: 'Panel de administración (/administrator/) detectado y accesible desde Internet.',
  },
  {
    path: '/administrator/manifests/files/joomla.xml',
    title: 'Manifest joomla.xml accesible vía /administrator',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Restringe el acceso a /administrator/manifests/ con reglas del servidor — este archivo expone la versión exacta del core.',
    detailOnHit: 'Manifest del core legible en /administrator/manifests/files/joomla.xml.',
  },
  {
    path: '/joomla.xml',
    title: 'Archivo de manifiesto joomla.xml expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Elimina o restringe el acceso al archivo /joomla.xml. Este archivo suele contener datos de la versión del núcleo y de la instalación.',
    detailOnHit: 'joomla.xml expone información estructural del núcleo Joomla.',
  },
  {
    path: '/configuration.php-dist',
    title: 'configuration.php-dist expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Elimina /configuration.php-dist de tu servidor raíz. Da pistas de la estructura interna y configuraciones iniciales.',
    detailOnHit: 'Plantilla de configuración por defecto configuration.php-dist accesible.',
  },
  {
    path: '/configuration.php~',
    title: 'configuration.php~ (backup) expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Elimina el backup inmediatamente. Configura el servidor para denegar archivos terminados en ~, .bak, .old, .swp. Rota TODAS las credenciales DB que aparezcan.',
    detailOnHit:
      'Backup de configuration.php accesible — incluye credenciales de base de datos y secret keys del CMS.',
  },
  {
    path: '/configuration.php.bak',
    title: 'configuration.php.bak expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Elimina el .bak. Bloquea por nginx/apache cualquier configuration.php.* fuera del .php legítimo. Rota credenciales DB y secret keys.',
    detailOnHit: 'Backup .bak de configuration.php accesible públicamente.',
  },
  {
    path: '/configuration.php.txt',
    title: 'configuration.php.txt expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Elimina la versión .txt y bloquea cualquier configuration.php.* a nivel de servidor. Rota credenciales si aparecen credenciales reales.',
    detailOnHit: 'Variante .txt de configuration.php accesible — expone credenciales en texto plano.',
  },
  {
    path: '/installation/',
    title: 'Directorio /installation/ residual',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Borra /installation/ inmediatamente. Su presencia permite re-instalar el CMS (sobreescribir configuration.php) → RCE prácticamente garantizado.',
    detailOnHit: 'Directorio /installation/ detectado tras la instalación — vector clásico de takeover.',
  },
  {
    path: '/installation/index.php',
    title: 'Instalador /installation/index.php activo',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'El instalador responde. Elimina /installation/ del docroot — un atacante puede reinstalar Joomla y tomar control total.',
    detailOnHit: '/installation/index.php sigue ejecutándose tras el setup inicial.',
  },
  {
    path: '/.env',
    title: '.env expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Mueve .env fuera del docroot o bloquéalo en nginx/apache. Rota TODAS las credenciales que aparezcan (DB, API keys, SMTP, JWT secrets).',
    detailOnHit: 'Archivo .env accesible — típicamente contiene credenciales de DB y API keys.',
  },
  {
    path: '/.git/HEAD',
    title: 'Directorio .git/ expuesto',
    severity: 'high',
    successStatuses: [200],
    recommendation:
      'Bloquea cualquier acceso a /.git/ desde el servidor web. Un atacante puede reconstruir el código fuente con `git-dumper` y descubrir credenciales en commits.',
    detailOnHit: '/.git/HEAD legible — el repositorio completo del sitio probablemente es descargable.',
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
    recommendation:
      'Elimina los archivos de documentación README.txt y LICENSE.txt en el directorio de producción para evitar leak de información de versión.',
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
  {
    path: '/cache/',
    title: 'Directorio /cache/ con listing',
    severity: 'low',
    successStatuses: [200],
    recommendation:
      'Desactiva directory listing (`Options -Indexes` en Apache, `autoindex off` en nginx) y añade un index.html vacío en /cache/.',
    detailOnHit: 'Directorio /cache/ permite listado — puede exponer fragmentos cacheados del CMS.',
  },
  {
    path: '/logs/',
    title: 'Directorio /logs/ accesible',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Bloquea /logs/ a nivel servidor. Los logs pueden contener paths absolutos, stack traces de PHP y credenciales en queries fallidas.',
    detailOnHit:
      'Directorio /logs/ accesible públicamente — puede filtrar logs de errores con información sensible.',
  },
  {
    path: '/error_log',
    title: 'error_log de PHP expuesto',
    severity: 'high',
    successStatuses: [200],
    recommendation:
      'Borra /error_log y deshabilita `log_errors` en producción, o redirige los logs fuera del docroot.',
    detailOnHit:
      'error_log de PHP accesible — contiene stack traces, paths internos y posiblemente credenciales en queries.',
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

  // Versión vía joomla.xml (root) o administrator/manifests
  const jXmlRoot = endpointResults.find((r) => r.def.path === '/joomla.xml');
  const jXmlAdmin = endpointResults.find(
    (r) => r.def.path === '/administrator/manifests/files/joomla.xml'
  );
  const versionSource =
    jXmlRoot && jXmlRoot.def.successStatuses.includes(jXmlRoot.res.status)
      ? { res: jXmlRoot.res, where: '/joomla.xml' }
      : jXmlAdmin && jXmlAdmin.def.successStatuses.includes(jXmlAdmin.res.status)
      ? { res: jXmlAdmin.res, where: '/administrator/manifests/files/joomla.xml' }
      : null;

  if (versionSource) {
    const v = extractVersionFromXml(versionSource.res.body);
    if (v && !joomlaVersion) {
      joomlaVersion = v;
      findings.push({
        id: 'version:joomlaxml',
        title: `Versión exacta de Joomla filtrada en ${versionSource.where}: ${v}`,
        severity: 'high',
        category: 'version',
        detail: `El manifest XML revela la versión exacta del core (${v}). Esto facilita la búsqueda de exploits específicos para esa release.`,
        recommendation:
          'Elimina o bloquea el manifest joomla.xml a nivel de servidor para que no sea accesible externamente.',
        evidence: v,
      });
    }
  }

  // 3. Enumeración: REST API de Joomla 4 + registro abierto en com_users
  onProgress?.('enum users (REST API + com_users)');
  const [restUsers, registration, contactProbe] = await Promise.all([
    proxyGet(workerUrl, joinUrl(base, '/api/index.php/v1/users')),
    proxyGet(workerUrl, joinUrl(base, '/index.php?option=com_users&view=registration')),
    proxyGet(workerUrl, joinUrl(base, '/index.php?option=com_users&view=login')),
  ]);

  // 3a) REST API expuesta — incluso un 401 revela que la API está habilitada
  if (!restUsers.error) {
    if (restUsers.status === 200) {
      // Caso raro: API abierta sin auth. Intentamos parsear y extraer slugs.
      try {
        const json = JSON.parse(restUsers.body);
        const list = (json?.data ?? json?.users ?? []) as Array<{
          attributes?: { name?: string; username?: string };
        }>;
        const names = list
          .map((u) => u?.attributes?.username ?? u?.attributes?.name)
          .filter(Boolean)
          .slice(0, 20);
        findings.push({
          id: 'enum:rest-users',
          title: `Enumeración de usuarios vía REST API (${list.length} encontrados)`,
          severity: 'critical',
          category: 'enum',
          detail:
            'El endpoint /api/index.php/v1/users devuelve la lista de usuarios sin autenticación. Es el peor escenario: leak completo de cuentas + roles.',
          recommendation:
            'Restringe el componente REST API: requiere Bearer Token, deshabilita la lectura pública de usuarios, o desactiva el componente com_api desde el panel de administración.',
          evidence: names.length ? names.join(', ') : '(JSON sin slugs reconocibles)',
        });
      } catch {
        findings.push({
          id: 'enum:rest-users',
          title: 'REST API /api/v1/users responde 200',
          severity: 'high',
          category: 'enum',
          detail:
            'El endpoint /api/index.php/v1/users responde con 200 pero el body no parece JSON estándar de Joomla. Aún así, indica que la API está habilitada y posiblemente sin auth.',
          recommendation:
            'Audita la configuración del componente com_api. Bloquea /api/ sin Bearer Token desde nginx/apache.',
          evidence: `/api/index.php/v1/users → HTTP 200`,
        });
      }
    } else if (restUsers.status === 401 || restUsers.status === 403) {
      findings.push({
        id: 'enum:rest-api-enabled',
        title: 'REST API de Joomla habilitada',
        severity: 'info',
        category: 'enum',
        detail:
          'El endpoint /api/index.php/v1/users responde 401/403, lo que indica que la API REST está habilitada (Joomla 4+). Es vector adicional de ataque a credenciales.',
        recommendation:
          'Si no usas la API REST, deshabilita el componente com_api o bloquea /api/ desde el servidor web.',
        evidence: `/api/index.php/v1/users → HTTP ${restUsers.status}`,
      });
    }
  }

  // 3b) Registro abierto — riesgo de creación masiva de cuentas
  if (!registration.error && registration.status === 200) {
    const body = registration.body.toLowerCase();
    const looksLikeRegistration =
      body.includes('com_users') &&
      (body.includes('registration') || body.includes('registro') || body.includes('register'));
    if (looksLikeRegistration) {
      findings.push({
        id: 'enum:registration-open',
        title: 'Registro de usuarios abierto al público',
        severity: 'medium',
        category: 'enum',
        detail:
          'El formulario /index.php?option=com_users&view=registration está accesible: cualquiera puede crear una cuenta. Vector de spam, escalada de privilegios si el rol por defecto tiene permisos, y enumeración de usuarios por mensaje de error de email duplicado.',
        recommendation:
          'En el panel de administración → Usuarios → Opciones, desactiva "Permitir registro de usuarios" si no es necesario. Si lo necesitas, exige verificación por email y CAPTCHA.',
        evidence: '/index.php?option=com_users&view=registration → HTTP 200 (form detectado)',
      });
    }
  }

  // 3c) Página de login pública — info para el reporte
  if (!contactProbe.error && contactProbe.status === 200) {
    findings.push({
      id: 'enum:login-page',
      title: 'Página de login frontend accesible',
      severity: 'info',
      category: 'enum',
      detail:
        'El formulario /index.php?option=com_users&view=login es público. Es objetivo común de bruteforce — combina con el registro abierto y la REST API para multiplicar superficie.',
      recommendation:
        'Considera proteger el login frontend con rate-limiting, 2FA (plugin core de Joomla) y/o WAF rules para bloquear bots.',
      evidence: '/index.php?option=com_users&view=login → HTTP 200',
    });
  }

  // 4. Score
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
