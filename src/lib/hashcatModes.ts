/**
 * Catálogo de modos de Hashcat (curado, no exhaustivo).
 *
 * Hashcat tiene ~600 modos; aquí incluimos los que aparecen en CTFs y
 * pentesting real con más frecuencia, agrupados por familia para que el
 * buscador del UI pueda filtrar por texto y categoría a la vez.
 *
 * Cada modo trae: id (number, lo que va en -m), nombre canónico, ejemplo
 * del hash y categoría. El ejemplo es útil para verificar a ojo que el
 * usuario tiene un hash de la familia correcta antes de mandar a romper.
 */

export type HashCategory =
  | 'generic'
  | 'unix'
  | 'windows'
  | 'kerberos'
  | 'web'
  | 'wifi'
  | 'cisco'
  | 'database'
  | 'archive'
  | 'application';

export interface HashMode {
  id: number;
  name: string;
  category: HashCategory;
  example?: string;
  keywords?: string[];
}

export const HASH_MODES: HashMode[] = [
  // ── generic ─────────────────────────────────────────────
  { id: 0, name: 'MD5', category: 'generic', example: '8743b52063cd84097a65d1633f5c74f5', keywords: ['md5'] },
  { id: 100, name: 'SHA1', category: 'generic', example: 'b89eaac7e61417341b710b727768294d0e6a277b', keywords: ['sha1'] },
  { id: 1300, name: 'SHA2-224', category: 'generic', keywords: ['sha224'] },
  { id: 1400, name: 'SHA2-256', category: 'generic', example: '127e6fbfe24a750e72930c220a8e138275656b8e5d8f48a98c3c92df2caba935', keywords: ['sha256'] },
  { id: 10800, name: 'SHA2-384', category: 'generic', keywords: ['sha384'] },
  { id: 1700, name: 'SHA2-512', category: 'generic', keywords: ['sha512'] },
  { id: 17400, name: 'SHA3-256', category: 'generic', keywords: ['sha3'] },
  { id: 17600, name: 'SHA3-512', category: 'generic', keywords: ['sha3'] },
  { id: 600, name: 'BLAKE2b-512', category: 'generic', keywords: ['blake2'] },
  { id: 11700, name: 'GOST R 34.11-2012 (Streebog) 256-bit', category: 'generic', keywords: ['gost', 'streebog'] },
  { id: 6000, name: 'RIPEMD-160', category: 'generic', keywords: ['ripemd'] },
  { id: 70, name: 'md5(utf16le($pass))', category: 'generic', keywords: ['md5', 'utf16'] },

  // ── unix / linux shadow ─────────────────────────────────
  { id: 500, name: 'md5crypt, MD5 (Unix), Cisco-IOS $1$', category: 'unix', example: '$1$28772684$iEwNOgGugqO9.bIz5sk8k/', keywords: ['shadow', 'md5crypt', '$1$'] },
  { id: 1500, name: 'descrypt, DES (Unix), Traditional DES', category: 'unix', example: '48c/R8JAv757A', keywords: ['shadow', 'des'] },
  { id: 7400, name: 'sha256crypt $5$, SHA512 (Unix)', category: 'unix', example: '$5$rounds=5000$GX7BopJZJxPc/KEK$le16UF8I2Anb.rOrn22AUPWvzUETDGefUmAV8AZkGcD', keywords: ['shadow', 'sha256crypt', '$5$'] },
  { id: 1800, name: 'sha512crypt $6$, SHA512 (Unix)', category: 'unix', example: '$6$72820166$U4DVzpcYxgw7MVVDGGvB2/H5lRistD5.Ah4upwENR5UtffLR4X4SxSzfREv8z6wVl0jRFX40/KbiTwhUDiouS1', keywords: ['shadow', 'sha512crypt', '$6$'] },
  { id: 3200, name: 'bcrypt $2*$, Blowfish (Unix)', category: 'unix', example: '$2a$05$LhayLxezLhK1LhWvKxCyLOj0j1u.Kj0jeMMletRiL/RRk5sQYNa0e', keywords: ['bcrypt', 'blowfish'] },
  { id: 7100, name: 'macOS v10.8+ (PBKDF2-SHA512)', category: 'unix', keywords: ['mac', 'macos', 'osx'] },

  // ── windows ─────────────────────────────────────────────
  { id: 1000, name: 'NTLM', category: 'windows', example: 'b4b9b02e6f09a9bd760f388b67351e2b', keywords: ['ntlm', 'windows'] },
  { id: 3000, name: 'LM', category: 'windows', example: '299bd128c1101fd6', keywords: ['lm', 'lanman', 'windows'] },
  { id: 5500, name: 'NetNTLMv1 / NetNTLMv1+ESS', category: 'windows', keywords: ['ntlmv1', 'netntlm', 'responder'] },
  { id: 5600, name: 'NetNTLMv2', category: 'windows', example: 'admin::N46iSNekpT:08ca45b7d7ea58ee:88dcbe4446168966a153a0064958dac6:5c7830315c7830310000000000000b45c67103d07d7b95acd12ffa11230e0000000052920b85f78d013c31cdb3b92f5d765c783030', keywords: ['ntlmv2', 'netntlm', 'responder'] },
  { id: 13100, name: 'Kerberos 5 TGS-REP etype 23 (Kerberoasting)', category: 'kerberos', keywords: ['kerberoast', 'tgs', 'spn'] },
  { id: 18200, name: 'Kerberos 5 AS-REP etype 23 (AS-REP Roasting)', category: 'kerberos', keywords: ['asrep', 'asreproast', 'pre-auth'] },
  { id: 7500, name: 'Kerberos 5 AS-REQ Pre-Auth etype 23', category: 'kerberos', keywords: ['kerberos', 'as-req', 'preauth'] },
  { id: 19600, name: 'Kerberos 5 TGS-REP etype 17 (AES-128)', category: 'kerberos', keywords: ['kerberos', 'aes128'] },
  { id: 19700, name: 'Kerberos 5 TGS-REP etype 18 (AES-256)', category: 'kerberos', keywords: ['kerberos', 'aes256'] },
  { id: 11600, name: '7-Zip', category: 'archive', keywords: ['7z'] },

  // ── web / cms ───────────────────────────────────────────
  { id: 400, name: 'phpass / WordPress / Joomla 2.5.18+', category: 'web', example: '$P$984478476IagS59wHZvyQMArzfx58u.', keywords: ['wordpress', 'joomla', 'phpass'] },
  { id: 11, name: 'Joomla < 2.5.18', category: 'web', keywords: ['joomla'] },
  { id: 7900, name: 'Drupal 7', category: 'web', example: '$S$C33783775$TLe.7DGGIIPpTbjA4qmTfQXyfM3OBz5XW3HOZ3LeQAuk8s5w/Tuf', keywords: ['drupal'] },
  { id: 2611, name: 'vBulletin < v3.8.5', category: 'web', keywords: ['vbulletin'] },
  { id: 2711, name: 'vBulletin >= v3.8.5', category: 'web', keywords: ['vbulletin'] },
  { id: 7600, name: 'Redmine', category: 'web', keywords: ['redmine'] },
  { id: 23, name: 'Skype', category: 'web', keywords: ['skype'] },
  { id: 124, name: 'Django SHA1 (legacy)', category: 'web', keywords: ['django'] },
  { id: 10000, name: 'Django PBKDF2-SHA256', category: 'web', keywords: ['django'] },

  // ── wifi ────────────────────────────────────────────────
  { id: 2500, name: 'WPA/WPA2 EAPOL HCCAP (deprecated)', category: 'wifi', keywords: ['wpa', 'eapol'] },
  { id: 22000, name: 'WPA-PBKDF2-PMKID+EAPOL', category: 'wifi', keywords: ['wpa', 'wpa2', 'eapol', 'pmkid', 'hcxdumptool'] },
  { id: 22001, name: 'WPA-PMK-PMKID+EAPOL', category: 'wifi', keywords: ['wpa', 'pmk', 'pmkid'] },
  { id: 16800, name: 'WPA-PMKID-PBKDF2', category: 'wifi', keywords: ['wpa', 'pmkid'] },

  // ── cisco ───────────────────────────────────────────────
  { id: 5700, name: 'Cisco-IOS type 4 (SHA256)', category: 'cisco', keywords: ['cisco'] },
  { id: 2400, name: 'Cisco-PIX MD5', category: 'cisco', keywords: ['cisco', 'pix'] },
  { id: 9200, name: 'Cisco-IOS $8$ (PBKDF2-SHA256)', category: 'cisco', keywords: ['cisco'] },
  { id: 9300, name: 'Cisco-IOS $9$ (scrypt)', category: 'cisco', keywords: ['cisco'] },

  // ── database ────────────────────────────────────────────
  { id: 12, name: 'PostgreSQL', category: 'database', keywords: ['postgres', 'pgsql'] },
  { id: 200, name: 'MySQL323', category: 'database', keywords: ['mysql'] },
  { id: 300, name: 'MySQL4.1/MySQL5', category: 'database', example: 'fcf7c1b8749cf99d88e5f34271d636178fb5d130', keywords: ['mysql'] },
  { id: 1731, name: 'MSSQL (2012, 2014)', category: 'database', keywords: ['mssql', 'sqlserver'] },
  { id: 131, name: 'MSSQL (2000)', category: 'database', keywords: ['mssql'] },
  { id: 132, name: 'MSSQL (2005)', category: 'database', keywords: ['mssql'] },
  { id: 3100, name: 'Oracle H: Type (Oracle 7+)', category: 'database', keywords: ['oracle'] },
  { id: 12300, name: 'Oracle T: Type (Oracle 12C+)', category: 'database', keywords: ['oracle'] },

  // ── archive / file format ───────────────────────────────
  { id: 12500, name: 'RAR3-hp', category: 'archive', keywords: ['rar'] },
  { id: 13000, name: 'RAR5', category: 'archive', keywords: ['rar'] },
  { id: 13600, name: 'ZIP (PKZIP)', category: 'archive', keywords: ['zip'] },
  { id: 17200, name: 'PKZIP (compressed)', category: 'archive', keywords: ['zip'] },
  { id: 17225, name: 'PKZIP (mixed multi-file)', category: 'archive', keywords: ['zip'] },
  { id: 9400, name: 'MS Office 2007', category: 'archive', keywords: ['office', 'docx'] },
  { id: 9500, name: 'MS Office 2010', category: 'archive', keywords: ['office'] },
  { id: 9600, name: 'MS Office 2013', category: 'archive', keywords: ['office'] },
  { id: 25400, name: 'PDF 1.4 - 1.6 (Acrobat 5 - 8)', category: 'archive', keywords: ['pdf'] },
  { id: 10500, name: 'PDF 1.4 - 1.6 (Acrobat 5 - 8) — collider#2', category: 'archive', keywords: ['pdf'] },

  // ── application ─────────────────────────────────────────
  { id: 22921, name: 'RSA/DSA/EC/OpenSSH Private Keys', category: 'application', keywords: ['ssh', 'rsa', 'openssh'] },
  { id: 6800, name: 'LastPass + LastPass sniffed', category: 'application', keywords: ['lastpass'] },
  { id: 6300, name: 'AIX {smd5}', category: 'application', keywords: ['aix'] },
  { id: 8400, name: 'WBB3 (Woltlab Burning Board)', category: 'application', keywords: ['wbb'] },
  { id: 11500, name: 'CRC32', category: 'generic', keywords: ['crc'] },
  { id: 11900, name: 'PBKDF2-HMAC-MD5', category: 'application', keywords: ['pbkdf2'] },
  { id: 12000, name: 'PBKDF2-HMAC-SHA1', category: 'application', keywords: ['pbkdf2'] },
  { id: 10900, name: 'PBKDF2-HMAC-SHA256', category: 'application', keywords: ['pbkdf2'] },
  { id: 12100, name: 'PBKDF2-HMAC-SHA512', category: 'application', keywords: ['pbkdf2'] },
];

export const CATEGORY_LABELS: Record<HashCategory, string> = {
  generic: 'Genéricos',
  unix: 'Unix / Linux',
  windows: 'Windows',
  kerberos: 'Kerberos / AD',
  web: 'Web / CMS',
  wifi: 'Wi-Fi',
  cisco: 'Cisco',
  database: 'Bases de datos',
  archive: 'Archivos / Office',
  application: 'Aplicaciones',
};

export function searchModes(query: string, limit = 30): HashMode[] {
  const q = query.trim().toLowerCase();
  if (!q) return HASH_MODES.slice(0, limit);
  return HASH_MODES.filter((m) => {
    if (String(m.id).includes(q)) return true;
    if (m.name.toLowerCase().includes(q)) return true;
    if (m.keywords?.some((k) => k.includes(q))) return true;
    return false;
  }).slice(0, limit);
}

// ──────────────────────── mask charsets ─────────────────────────────

export interface MaskCharset {
  symbol: string;
  label: string;
  preview: string;
  description: string;
}

export const MASK_CHARSETS: MaskCharset[] = [
  { symbol: '?l', label: 'lower', preview: 'a-z', description: 'Letras minúsculas (abcdefghijklmnopqrstuvwxyz)' },
  { symbol: '?u', label: 'upper', preview: 'A-Z', description: 'Letras mayúsculas (ABCDEFGHIJKLMNOPQRSTUVWXYZ)' },
  { symbol: '?d', label: 'digit', preview: '0-9', description: 'Dígitos (0123456789)' },
  { symbol: '?s', label: 'special', preview: '!@#$', description: 'Símbolos especiales (!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~)' },
  { symbol: '?a', label: 'all', preview: '?l?u?d?s', description: 'Cualquier carácter imprimible' },
  { symbol: '?h', label: 'hex-lo', preview: '0-9a-f', description: 'Hexadecimal minúscula' },
  { symbol: '?H', label: 'hex-up', preview: '0-9A-F', description: 'Hexadecimal mayúscula' },
  { symbol: '?b', label: 'binary', preview: '0x00-0xff', description: 'Byte completo (binario)' },
];
