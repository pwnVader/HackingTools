/**
 * Mapeo de hallazgos del wp-audit a referencias estándar de la industria:
 * CWE (Common Weakness Enumeration) y OWASP Top 10 (2021).
 *
 * No incluimos cálculo de CVSS porque la auditoría es pasiva y el contexto
 * (impacto real, autenticación requerida, etc.) no se puede determinar
 * desde fuera. Para CVEs específicos exponemos un constructor de URL que
 * apunta a la búsqueda autoritativa en NVD cuando hay versión detectada.
 */

import type { Finding } from './wpAudit';

export interface CweRef {
  id: number;
  title: string;
  url: string;
}

export interface OwaspRef {
  id: string; // e.g. "A05:2021"
  title: string;
  url: string;
}

export interface SecRefs {
  cwe?: CweRef;
  owasp?: OwaspRef;
}

const CWE_TITLES: Record<number, string> = {
  200: 'Information Exposure',
  203: 'Observable Discrepancy',
  284: 'Improper Access Control',
  307: 'Improper Restriction of Excessive Auth Attempts',
  319: 'Cleartext Transmission of Sensitive Info',
  430: 'Deployment of Wrong Handler',
  532: 'Insertion of Sensitive Info into Log File',
  538: 'Insertion of Sensitive Info into Externally-Accessible File',
  548: 'Exposure of Information Through Directory Listing',
  693: 'Protection Mechanism Failure',
  1021: 'Improper Restriction of Rendered UI Layers',
};

const OWASP_2021: Record<string, { slug: string; title: string }> = {
  A01: { slug: 'A01_2021-Broken_Access_Control', title: 'Broken Access Control' },
  A02: { slug: 'A02_2021-Cryptographic_Failures', title: 'Cryptographic Failures' },
  A05: { slug: 'A05_2021-Security_Misconfiguration', title: 'Security Misconfiguration' },
  A07: {
    slug: 'A07_2021-Identification_and_Authentication_Failures',
    title: 'Identification and Authentication Failures',
  },
  A09: {
    slug: 'A09_2021-Security_Logging_and_Monitoring_Failures',
    title: 'Security Logging and Monitoring Failures',
  },
};

function cwe(id: number): CweRef {
  return {
    id,
    title: CWE_TITLES[id] ?? 'CWE entry',
    url: `https://cwe.mitre.org/data/definitions/${id}.html`,
  };
}

function owasp(key: keyof typeof OWASP_2021): OwaspRef {
  const e = OWASP_2021[key];
  return {
    id: `${key}:2021`,
    title: e.title,
    url: `https://owasp.org/Top10/${e.slug}/`,
  };
}

const REF_MAP: Record<string, SecRefs> = {
  // Security headers ───────────────────────────────────────────────────
  'header:content-security-policy': { cwe: cwe(693), owasp: owasp('A05') },
  'header:strict-transport-security': { cwe: cwe(319), owasp: owasp('A02') },
  'header:x-frame-options': { cwe: cwe(1021), owasp: owasp('A05') },
  'header:x-content-type-options': { cwe: cwe(693), owasp: owasp('A05') },
  'header:referrer-policy': { cwe: cwe(200), owasp: owasp('A05') },
  'header:permissions-policy': { cwe: cwe(693), owasp: owasp('A05') },
  'header:powered-by': { cwe: cwe(200), owasp: owasp('A05') },
  // Meta ──────────────────────────────────────────────────────────────
  'meta:generator': { cwe: cwe(200), owasp: owasp('A05') },
  // Endpoints expuestos ───────────────────────────────────────────────
  'endpoint:/xmlrpc.php': { cwe: cwe(307), owasp: owasp('A07') },
  'endpoint:/wp-login.php': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/wp-admin/': { cwe: cwe(284), owasp: owasp('A01') },
  'endpoint:/wp-json/': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/readme.html': { cwe: cwe(200), owasp: owasp('A05') },
  'endpoint:/wp-content/debug.log': { cwe: cwe(532), owasp: owasp('A09') },
  'endpoint:/.env': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/wp-config.php~': { cwe: cwe(538), owasp: owasp('A05') },
  'endpoint:/wp-content/uploads/': { cwe: cwe(548), owasp: owasp('A05') },
  // Version disclosure ────────────────────────────────────────────────
  'version:readme': { cwe: cwe(200), owasp: owasp('A05') },
  // Enumeración de usuarios ───────────────────────────────────────────
  'enum:rest-users': { cwe: cwe(200), owasp: owasp('A01') },
  'enum:author': { cwe: cwe(200), owasp: owasp('A01') },
};

export function getSecRefs(f: Finding): SecRefs | null {
  return REF_MAP[f.id] ?? null;
}

export function isVersionRelated(f: Finding): boolean {
  return f.category === 'version' || f.id === 'meta:generator';
}

/**
 * Búsqueda en la NVD por versión exacta. No afirma que haya CVEs — el link
 * lleva al consultor a la base autoritativa para verificar manualmente.
 */
export function cveSearchUrl(wpVersion: string): string {
  const q = encodeURIComponent(`wordpress ${wpVersion}`);
  return `https://nvd.nist.gov/vuln/search/results?form_type=Basic&results_type=overview&query=${q}`;
}

/**
 * Construye la URL absoluta del endpoint expuesto cuando aplica
 * (categoría endpoints o enumeración con path conocido).
 */
export function endpointUrl(f: Finding, target: string): string | null {
  if (f.id.startsWith('endpoint:')) return target + f.id.slice('endpoint:'.length);
  if (f.id === 'enum:rest-users') return target + '/wp-json/wp/v2/users';
  if (f.id === 'enum:author') return target + '/?author=1';
  return null;
}
