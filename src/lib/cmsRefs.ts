/**
 * Referencias estándar (CWE / OWASP / CVE) y resolución de URLs unificada
 * para los tres auditores: WordPress, Joomla y Drupal.
 *
 * Diseñado para que el componente FindingItem y el generador de reportes
 * obtengan el mismo nivel de información independientemente del CMS.
 * Si un finding id no está mapeado, devolvemos null — el caller decide
 * cómo manejarlo (la UI simplemente no muestra los badges).
 */

export type Cms = 'wordpress' | 'joomla' | 'drupal';

export interface FindingLike {
  id: string;
  category: string;
}

export interface CweRef {
  id: number;
  title: string;
  url: string;
}
export interface OwaspRef {
  id: string; // "A05:2021"
  title: string;
  url: string;
}
export interface SecRefs {
  cwe?: CweRef;
  owasp?: OwaspRef;
}

// ── catálogo base ────────────────────────────────────────────────────

const CWE_TITLES: Record<number, string> = {
  200: 'Information Exposure',
  203: 'Observable Discrepancy',
  284: 'Improper Access Control',
  287: 'Improper Authentication',
  307: 'Improper Restriction of Excessive Auth Attempts',
  319: 'Cleartext Transmission of Sensitive Info',
  430: 'Deployment of Wrong Handler',
  434: 'Unrestricted Upload of File with Dangerous Type',
  522: 'Insufficiently Protected Credentials',
  532: 'Insertion of Sensitive Info into Log File',
  538: 'Insertion of Sensitive Info into Externally-Accessible File',
  548: 'Exposure of Information Through Directory Listing',
  693: 'Protection Mechanism Failure',
  749: 'Exposed Dangerous Method or Function',
  798: 'Use of Hard-coded Credentials',
  862: 'Missing Authorization',
  1021: 'Improper Restriction of Rendered UI Layers',
};

const OWASP_2021: Record<string, { slug: string; title: string }> = {
  A01: { slug: 'A01_2021-Broken_Access_Control', title: 'Broken Access Control' },
  A02: { slug: 'A02_2021-Cryptographic_Failures', title: 'Cryptographic Failures' },
  A03: { slug: 'A03_2021-Injection', title: 'Injection' },
  A05: { slug: 'A05_2021-Security_Misconfiguration', title: 'Security Misconfiguration' },
  A06: { slug: 'A06_2021-Vulnerable_and_Outdated_Components', title: 'Vulnerable and Outdated Components' },
  A07: {
    slug: 'A07_2021-Identification_and_Authentication_Failures',
    title: 'Identification and Authentication Failures',
  },
  A08: { slug: 'A08_2021-Software_and_Data_Integrity_Failures', title: 'Software and Data Integrity Failures' },
  A09: {
    slug: 'A09_2021-Security_Logging_and_Monitoring_Failures',
    title: 'Security Logging and Monitoring Failures',
  },
};

export function cwe(id: number): CweRef {
  return {
    id,
    title: CWE_TITLES[id] ?? 'CWE entry',
    url: `https://cwe.mitre.org/data/definitions/${id}.html`,
  };
}

export function owasp(key: keyof typeof OWASP_2021): OwaspRef {
  const e = OWASP_2021[key];
  return {
    id: `${key}:2021`,
    title: e.title,
    url: `https://owasp.org/Top10/${e.slug}/`,
  };
}

// ── mapa de cabeceras HTTP — compartido por los tres CMS ────────────

const HEADER_REFS: Record<string, SecRefs> = {
  'content-security-policy': { cwe: cwe(693), owasp: owasp('A05') },
  'strict-transport-security': { cwe: cwe(319), owasp: owasp('A02') },
  'x-frame-options': { cwe: cwe(1021), owasp: owasp('A05') },
  'x-content-type-options': { cwe: cwe(693), owasp: owasp('A05') },
  'referrer-policy': { cwe: cwe(200), owasp: owasp('A05') },
  'permissions-policy': { cwe: cwe(693), owasp: owasp('A05') },
  'powered-by': { cwe: cwe(200), owasp: owasp('A05') },
  'server-version': { cwe: cwe(200), owasp: owasp('A05') },
};

// ── mapa específico de WordPress ────────────────────────────────────

const WP_REFS: Record<string, SecRefs> = {
  'meta:generator': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/xmlrpc.php': { cwe: cwe(307), owasp: owasp('A07') },
  'endpoint:/wp-login.php': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/wp-admin/': { cwe: cwe(284), owasp: owasp('A01') },
  'endpoint:/wp-json/': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/readme.html': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/wp-content/debug.log': { cwe: cwe(532), owasp: owasp('A09') },
  'endpoint:/.env': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/wp-config.php~': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/wp-content/uploads/': { cwe: cwe(548), owasp: owasp('A05') },
  'version:readme': { cwe: cwe(200), owasp: owasp('A05') },
  'enum:rest-users': { cwe: cwe(200), owasp: owasp('A01') },
  'enum:author': { cwe: cwe(200), owasp: owasp('A01') },
};

// ── mapa específico de Joomla ───────────────────────────────────────

const JOOMLA_REFS: Record<string, SecRefs> = {
  'meta:generator': { cwe: cwe(200), owasp: owasp('A05') },
  'version:joomlaxml': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/administrator/': { cwe: cwe(284), owasp: owasp('A01') },
  'endpoint:/administrator/manifests/files/joomla.xml': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/joomla.xml': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/configuration.php-dist': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/configuration.php~': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/configuration.php.bak': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/configuration.php.txt': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/installation/': { cwe: cwe(749), owasp: owasp('A05') },
  'endpoint:/installation/index.php': { cwe: cwe(749), owasp: owasp('A05') },
  'endpoint:/.env': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/.git/HEAD': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/htaccess.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/web.config.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/README.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/LICENSE.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/cache/': { cwe: cwe(548), owasp: owasp('A05') },
  'endpoint:/logs/': { cwe: cwe(532), owasp: owasp('A09') },
  'endpoint:/error_log': { cwe: cwe(532), owasp: owasp('A09') },
  'enum:rest-users': { cwe: cwe(200), owasp: owasp('A01') },
  'enum:rest-api-enabled': { cwe: cwe(200), owasp: owasp('A05') },
  'enum:registration-open': { cwe: cwe(862), owasp: owasp('A01') },
  'enum:login-page': { cwe: cwe(307), owasp: owasp('A07') },
};

// ── mapa específico de Drupal ───────────────────────────────────────

const DRUPAL_REFS: Record<string, SecRefs> = {
  'meta:generator': { cwe: cwe(200), owasp: owasp('A05') },
  'version:changelog': { cwe: cwe(200), owasp: owasp('A05') },
  'version:composer': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/core/CHANGELOG.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/CHANGELOG.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/user/login': { cwe: cwe(307), owasp: owasp('A07') },
  'endpoint:/core/install.php': { cwe: cwe(749), owasp: owasp('A05') },
  'endpoint:/install.php': { cwe: cwe(749), owasp: owasp('A05') },
  'endpoint:/sites/default/settings.php': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/sites/default/settings.php.bak': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/core/lib/Drupal.php': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/.env': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/.git/HEAD': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/composer.json': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/composer.lock': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/UPGRADE.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/INSTALL.txt': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/cron.php': { cwe: cwe(749), owasp: owasp('A05') },
  'endpoint:/sites/default/files/': { cwe: cwe(548), owasp: owasp('A05') },
  'endpoint:/sites/default/private/': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/error_log': { cwe: cwe(532), owasp: owasp('A09') },
  'endpoint:/web.config': { cwe: cwe(200), owasp: owasp('A05') },
  'enum:jsonapi-users': { cwe: cwe(200), owasp: owasp('A01') },
  'enum:jsonapi-enabled': { cwe: cwe(200), owasp: owasp('A05') },
  'enum:user1': { cwe: cwe(200), owasp: owasp('A01') },
};

// ── api pública ─────────────────────────────────────────────────────

export function getSecRefs(f: FindingLike, cms: Cms): SecRefs | null {
  if (f.id.startsWith('header:')) {
    const key = f.id.slice('header:'.length);
    return HEADER_REFS[key] ?? null;
  }
  const map = cms === 'wordpress' ? WP_REFS : cms === 'joomla' ? JOOMLA_REFS : DRUPAL_REFS;
  return map[f.id] ?? null;
}

/**
 * Devuelve la URL absoluta del endpoint si el finding apunta a uno alcanzable
 * desde el navegador (endpoint:* y enum:* con path conocido).
 *
 * Si devuelve null, el componente UI no debería mostrar el botón "abrir".
 */
export function endpointUrl(f: FindingLike, target: string, cms: Cms): string | null {
  if (f.id.startsWith('endpoint:')) {
    return target + f.id.slice('endpoint:'.length);
  }

  if (cms === 'wordpress') {
    if (f.id === 'enum:rest-users') return target + '/wp-json/wp/v2/users';
    if (f.id === 'enum:author') return target + '/?author=1';
    return null;
  }

  if (cms === 'joomla') {
    if (f.id === 'enum:rest-users' || f.id === 'enum:rest-api-enabled')
      return target + '/api/index.php/v1/users';
    if (f.id === 'enum:registration-open')
      return target + '/index.php?option=com_users&view=registration';
    if (f.id === 'enum:login-page')
      return target + '/index.php?option=com_users&view=login';
    return null;
  }

  // drupal
  if (f.id === 'enum:jsonapi-users' || f.id === 'enum:jsonapi-enabled')
    return target + '/jsonapi/user/user';
  if (f.id === 'enum:user1') return target + '/user/1';
  return null;
}

export function isVersionRelated(f: FindingLike): boolean {
  return f.category === 'version' || f.id === 'meta:generator';
}

/**
 * Búsqueda en NVD por CMS + versión. Es deliberadamente una *búsqueda*, no
 * una afirmación de CVE — la auditoría es pasiva y no resuelve CVEs.
 */
export function cveSearchUrl(cms: Cms, version: string): string {
  const stack = cms === 'wordpress' ? 'wordpress' : cms === 'joomla' ? 'joomla' : 'drupal';
  const q = encodeURIComponent(`${stack} ${version}`);
  return `https://nvd.nist.gov/vuln/search/results?form_type=Basic&results_type=overview&query=${q}`;
}

export function cmsDisplayName(cms: Cms): string {
  return cms === 'wordpress' ? 'WordPress' : cms === 'joomla' ? 'Joomla' : 'Drupal';
}
