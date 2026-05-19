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
  {
    key: 'permissions-policy',
    title: 'Sin Permissions-Policy',
    severity: 'info',
    recommendation:
      'Configura `Permissions-Policy: geolocation=(), microphone=(), camera=()` y deshabilita features del navegador que no uses.',
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
  {
    path: '/.env',
    title: '.env expuesto',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Mueve .env fuera del docroot o bloquéalo en nginx/apache. Rota TODAS las credenciales (DB, API keys, hash salt) inmediatamente.',
    detailOnHit:
      'Archivo .env accesible — Drupal moderno usa .env para credenciales DB y hash salt, lo cual implica takeover total.',
  },
  {
    path: '/.git/HEAD',
    title: 'Directorio .git/ expuesto',
    severity: 'high',
    successStatuses: [200],
    recommendation:
      'Bloquea /.git/ desde el servidor web. Con `git-dumper` un atacante reconstruye el código fuente completo y todos los commits — incluyendo secretos olvidados.',
    detailOnHit:
      '/.git/HEAD legible — el repositorio completo del sitio es probablemente descargable.',
  },
  {
    path: '/composer.json',
    title: 'composer.json expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Bloquea composer.json en producción. Expone la lista completa de módulos y versiones — facilita identificar exploits específicos.',
    detailOnHit: 'composer.json accesible — revela todos los módulos contrib y sus versiones.',
  },
  {
    path: '/composer.lock',
    title: 'composer.lock expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Bloquea composer.lock en producción. Revela versiones exactas de todas las dependencias (incluyendo dev deps con CVEs conocidos).',
    detailOnHit: 'composer.lock accesible — fingerprint exacto del stack de dependencias.',
  },
  {
    path: '/UPGRADE.txt',
    title: 'UPGRADE.txt expuesto',
    severity: 'low',
    successStatuses: [200],
    recommendation: 'Elimina UPGRADE.txt en producción — orienta al atacante sobre la rama de Drupal usada.',
    detailOnHit: 'Documentación UPGRADE.txt accesible.',
  },
  {
    path: '/INSTALL.txt',
    title: 'INSTALL.txt expuesto',
    severity: 'low',
    successStatuses: [200],
    recommendation: 'Elimina INSTALL.txt en producción.',
    detailOnHit: 'INSTALL.txt expuesto — confirma instalación Drupal y orienta sobre la versión mayor.',
  },
  {
    path: '/install.php',
    title: 'install.php (Drupal 7) activo',
    severity: 'critical',
    successStatuses: [200],
    recommendation:
      'Bloquea o elimina /install.php fuera de instalaciones nuevas. En Drupal 7 el instalador permite reconfigurar la DB → RCE.',
    detailOnHit:
      '/install.php responde — en Drupal 7 esto es vector clásico de takeover (reinstalar el CMS sobre el existente).',
  },
  {
    path: '/cron.php',
    title: 'cron.php accesible sin token',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'Configura `cron_safe_threshold` y exige el token de cron (`?cron_key=`) en el servidor web. /cron.php abierto es vector de DoS y filtra trazas de error.',
    detailOnHit:
      '/cron.php responde 200 sin requerir clave de cron — DoS sencillo y posible leak de información en errores.',
  },
  {
    path: '/sites/default/files/',
    title: 'Directorio /sites/default/files/ con listing',
    severity: 'low',
    successStatuses: [200],
    recommendation:
      'Desactiva directory listing (`Options -Indexes` en Apache, `autoindex off` en nginx). El directorio public files no debería listar contenido.',
    detailOnHit:
      'Directorio /sites/default/files/ permite listado — expone uploads, posibles backups y archivos privados accidentalmente públicos.',
  },
  {
    path: '/sites/default/private/',
    title: 'Directorio privado expuesto',
    severity: 'high',
    successStatuses: [200],
    recommendation:
      'El directorio "private files" debe estar FUERA del docroot o bloqueado por completo en el servidor web. Bloquea /sites/default/private/* inmediatamente.',
    detailOnHit:
      'Directorio configurado como "privado" en Drupal accesible por HTTP — contradicción de seguridad.',
  },
  {
    path: '/error_log',
    title: 'error_log de PHP expuesto',
    severity: 'high',
    successStatuses: [200],
    recommendation:
      'Borra /error_log y deshabilita `log_errors` en producción, o redirige los logs fuera del docroot.',
    detailOnHit:
      'error_log accesible — contiene stack traces, paths internos y queries fallidas con datos sensibles.',
  },
  {
    path: '/web.config',
    title: 'web.config (IIS) expuesto',
    severity: 'medium',
    successStatuses: [200],
    recommendation:
      'En IIS, web.config no debería ser legible vía HTTP. Verifica las reglas de MIME-type y handler para denegar lectura de .config.',
    detailOnHit: 'web.config accesible — expone configuración del servidor y posibles rewrites internos.',
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

  // Versión vía composer.json (revela también módulos contrib)
  const composer = endpointResults.find((r) => r.def.path === '/composer.json');
  if (composer && composer.def.successStatuses.includes(composer.res.status)) {
    try {
      const json = JSON.parse(composer.res.body);
      const coreVer = json?.require?.['drupal/core'] ?? json?.require?.['drupal/core-recommended'];
      if (coreVer && !drupalVersion) {
        const m = String(coreVer).match(/[0-9]+\.[0-9]+(\.[0-9]+)?/);
        if (m) {
          drupalVersion = m[0];
          findings.push({
            id: 'version:composer',
            title: `Versión de Drupal filtrada en composer.json: ${drupalVersion}`,
            severity: 'high',
            category: 'version',
            detail: `composer.json expone la versión exacta de drupal/core (${coreVer}). Junto con el listado de módulos contrib, da fingerprint completo del stack.`,
            recommendation:
              'Bloquea composer.json/composer.lock desde el servidor web (deny en nginx/apache).',
            evidence: `drupal/core: ${coreVer}`,
          });
        }
      }
    } catch {
      /* not json */
    }
  }

  // 3. Enumeración: JSON:API + perfil de usuario
  onProgress?.('enum users (JSON:API + /user/1)');
  const [jsonapiUsers, userOne] = await Promise.all([
    proxyGet(workerUrl, joinUrl(base, '/jsonapi/user/user')),
    proxyGet(workerUrl, joinUrl(base, '/user/1')),
  ]);

  // 3a) JSON:API expuesta (Drupal 8+)
  if (!jsonapiUsers.error) {
    if (jsonapiUsers.status === 200) {
      try {
        const json = JSON.parse(jsonapiUsers.body);
        const list = (json?.data ?? []) as Array<{
          attributes?: { name?: string; display_name?: string };
        }>;
        if (Array.isArray(list) && list.length > 0) {
          const names = list
            .map((u) => u?.attributes?.name ?? u?.attributes?.display_name)
            .filter(Boolean)
            .slice(0, 20);
          findings.push({
            id: 'enum:jsonapi-users',
            title: `Enumeración de usuarios vía JSON:API (${list.length} encontrados)`,
            severity: 'high',
            category: 'enum',
            detail:
              'El endpoint /jsonapi/user/user expone la lista de usuarios sin autenticación. Drupal 8+ trae JSON:API en core y suele estar activo por defecto.',
            recommendation:
              'Restringe el acceso a /jsonapi/user/user vía permisos de rol "anonymous": desmarca "View user information" o instala el módulo `jsonapi_extras` para filtrar campos sensibles.',
            evidence: names.length ? names.join(', ') : `${list.length} entradas en data[]`,
          });
        }
      } catch {
        /* not json */
      }
    } else if (jsonapiUsers.status === 401 || jsonapiUsers.status === 403) {
      findings.push({
        id: 'enum:jsonapi-enabled',
        title: 'JSON:API habilitada',
        severity: 'info',
        category: 'enum',
        detail:
          'El endpoint /jsonapi/user/user responde 401/403, indicando que el módulo JSON:API está habilitado. Es vector adicional de ataque si se filtran permisos.',
        recommendation:
          'Si no usas JSON:API públicamente, desactiva el módulo en Admin → Extend o restringe acceso por rol.',
        evidence: `/jsonapi/user/user → HTTP ${jsonapiUsers.status}`,
      });
    }
  }

  // 3b) Perfil /user/1 — el usuario 1 es siempre el super-admin en Drupal.
  // Si responde 200 con el nombre visible, es enum directa del super-admin.
  if (!userOne.error && userOne.status === 200) {
    // Drupal incluye el nombre del usuario en <title> o en h1.page-title
    const titleMatch = userOne.body.match(/<title>([^<|]+)/i);
    const h1Match = userOne.body.match(/<h1[^>]*>\s*([^<\s]+)\s*<\/h1>/i);
    const username =
      (titleMatch && titleMatch[1].trim()) || (h1Match && h1Match[1].trim()) || null;
    findings.push({
      id: 'enum:user1',
      title: `Perfil /user/1 (super-admin) accesible${username ? `: ${username}` : ''}`,
      severity: 'high',
      category: 'enum',
      detail:
        'En Drupal el usuario con UID 1 es siempre el super-administrador. Que su perfil sea legible sin auth revela el username exacto del root del CMS — facilita bruteforce dirigido.',
      recommendation:
        'Restringe la vista de perfiles a usuarios autenticados: Admin → People → Permissions → "View user profiles" sólo para roles confiables. Considera renombrar el usuario admin a algo no obvio.',
      evidence: username ? `username: ${username}` : '/user/1 → HTTP 200',
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
      drupalVersion,
      poweredBy,
    },
  };
}
