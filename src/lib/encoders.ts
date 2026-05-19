/**
 * Catálogo de operaciones para el motor de recetas.
 * Cada operación es síncrona o asíncrona (hashes), pura y reversible-friendly.
 */

import { md5 } from './md5';

export type OpId =
  | 'b64-encode'
  | 'b64-decode'
  | 'b64url-encode'
  | 'b64url-decode'
  | 'url-encode'
  | 'url-decode'
  | 'hex-encode'
  | 'hex-decode'
  | 'binary-encode'
  | 'binary-decode'
  | 'html-encode'
  | 'html-decode'
  | 'rot13'
  | 'rot-n'
  | 'reverse'
  | 'uppercase'
  | 'lowercase'
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha384'
  | 'sha512'
  | 'jwt-decode';

export interface OpDef {
  id: OpId;
  name: string;
  group: 'encode' | 'decode' | 'transform' | 'hash' | 'inspect';
  description: string;
  params?: Array<{ id: string; label: string; type: 'number' | 'text'; default: string | number }>;
  run: (input: string, params?: Record<string, string>) => string | Promise<string>;
}

// ──────────────────── helpers ────────────────────

const enc = new TextEncoder();

function toUint8(s: string): Uint8Array {
  return enc.encode(s);
}

function fromUint8(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

function btoaUtf8(s: string): string {
  return btoa(String.fromCharCode(...toUint8(s)));
}

function atobUtf8(s: string): string {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return fromUint8(bytes);
}

async function webHash(algo: string, input: string): Promise<string> {
  const data = toUint8(input);
  // Copia a un ArrayBuffer concreto — TS estricto rechaza el ArrayBufferLike del TextEncoder
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  const buf = await crypto.subtle.digest(algo, ab);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function rotN(s: string, n: number): string {
  const N = ((n % 26) + 26) % 26;
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      out += String.fromCharCode(((code - 65 + N) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      out += String.fromCharCode(((code - 97 + N) % 26) + 97);
    } else {
      out += ch;
    }
  }
  return out;
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};
function htmlEscape(s: string): string {
  return s.replace(/[&<>"'`=/]/g, (m) => HTML_ENTITIES[m] ?? m);
}
function htmlUnescape(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// ──────────────────── catalog ────────────────────

export const OPS: OpDef[] = [
  {
    id: 'b64-encode',
    name: 'Base64 encode',
    group: 'encode',
    description: 'Codifica el input a Base64 estándar (UTF-8).',
    run: (s) => btoaUtf8(s),
  },
  {
    id: 'b64-decode',
    name: 'Base64 decode',
    group: 'decode',
    description: 'Decodifica Base64 estándar a UTF-8.',
    run: (s) => atobUtf8(s.trim()),
  },
  {
    id: 'b64url-encode',
    name: 'Base64-URL encode',
    group: 'encode',
    description: 'Variante URL-safe (- _) sin padding.',
    run: (s) => btoaUtf8(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
  },
  {
    id: 'b64url-decode',
    name: 'Base64-URL decode',
    group: 'decode',
    description: 'Decodifica Base64-URL.',
    run: (s) => {
      let v = s.trim().replace(/-/g, '+').replace(/_/g, '/');
      while (v.length % 4) v += '=';
      return atobUtf8(v);
    },
  },
  {
    id: 'url-encode',
    name: 'URL encode',
    group: 'encode',
    description: 'encodeURIComponent — codifica todos los caracteres especiales.',
    run: (s) => encodeURIComponent(s),
  },
  {
    id: 'url-decode',
    name: 'URL decode',
    group: 'decode',
    description: 'decodeURIComponent.',
    run: (s) => decodeURIComponent(s),
  },
  {
    id: 'hex-encode',
    name: 'Hex encode',
    group: 'encode',
    description: 'Cada byte UTF-8 a su representación hex (sin prefijo).',
    run: (s) => [...toUint8(s)].map((b) => b.toString(16).padStart(2, '0')).join(''),
  },
  {
    id: 'hex-decode',
    name: 'Hex decode',
    group: 'decode',
    description: 'Decodifica hex (ignora espacios, comas, 0x).',
    run: (s) => {
      const clean = s.replace(/0x|[\s,]/g, '').toLowerCase();
      if (clean.length % 2 !== 0) throw new Error('hex con longitud impar');
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
      }
      return fromUint8(bytes);
    },
  },
  {
    id: 'binary-encode',
    name: 'Binary encode',
    group: 'encode',
    description: 'Cada byte UTF-8 a 8 bits, separados por espacio.',
    run: (s) => [...toUint8(s)].map((b) => b.toString(2).padStart(8, '0')).join(' '),
  },
  {
    id: 'binary-decode',
    name: 'Binary decode',
    group: 'decode',
    description: 'Decodifica binario (acepta espacios o no).',
    run: (s) => {
      const clean = s.replace(/[^01]/g, '');
      if (clean.length % 8 !== 0) throw new Error('binario no múltiplo de 8 bits');
      const bytes = new Uint8Array(clean.length / 8);
      for (let i = 0; i < clean.length; i += 8) {
        bytes[i / 8] = parseInt(clean.slice(i, i + 8), 2);
      }
      return fromUint8(bytes);
    },
  },
  {
    id: 'html-encode',
    name: 'HTML entities encode',
    group: 'encode',
    description: 'Escapa < > & " \' / ` =',
    run: (s) => htmlEscape(s),
  },
  {
    id: 'html-decode',
    name: 'HTML entities decode',
    group: 'decode',
    description: 'Decodifica entidades HTML (named, decimal, hex).',
    run: (s) => htmlUnescape(s),
  },
  {
    id: 'rot13',
    name: 'ROT13',
    group: 'transform',
    description: 'Cifrado César con desplazamiento 13. Su propia inversa.',
    run: (s) => rotN(s, 13),
  },
  {
    id: 'rot-n',
    name: 'ROT-N',
    group: 'transform',
    description: 'Cifrado César con desplazamiento configurable.',
    params: [{ id: 'n', label: 'desplazamiento', type: 'number', default: 5 }],
    run: (s, p) => rotN(s, Number(p?.n ?? 5)),
  },
  {
    id: 'reverse',
    name: 'Reverse',
    group: 'transform',
    description: 'Invierte el orden de los caracteres (respetando code points).',
    run: (s) => [...s].reverse().join(''),
  },
  {
    id: 'uppercase',
    name: 'UPPERCASE',
    group: 'transform',
    description: 'Convierte a mayúsculas.',
    run: (s) => s.toUpperCase(),
  },
  {
    id: 'lowercase',
    name: 'lowercase',
    group: 'transform',
    description: 'Convierte a minúsculas.',
    run: (s) => s.toLowerCase(),
  },
  {
    id: 'md5',
    name: 'MD5',
    group: 'hash',
    description: 'Hash MD5 (no usar para seguridad).',
    run: (s) => md5(s),
  },
  {
    id: 'sha1',
    name: 'SHA-1',
    group: 'hash',
    description: 'Hash SHA-1 (no usar para seguridad).',
    run: (s) => webHash('SHA-1', s),
  },
  {
    id: 'sha256',
    name: 'SHA-256',
    group: 'hash',
    description: 'Hash SHA-256 (Web Crypto).',
    run: (s) => webHash('SHA-256', s),
  },
  {
    id: 'sha384',
    name: 'SHA-384',
    group: 'hash',
    description: 'Hash SHA-384 (Web Crypto).',
    run: (s) => webHash('SHA-384', s),
  },
  {
    id: 'sha512',
    name: 'SHA-512',
    group: 'hash',
    description: 'Hash SHA-512 (Web Crypto).',
    run: (s) => webHash('SHA-512', s),
  },
  {
    id: 'jwt-decode',
    name: 'JWT decode',
    group: 'inspect',
    description: 'Decodifica un JWT (header.payload.signature) sin verificar firma.',
    run: (s) => {
      const parts = s.trim().split('.');
      if (parts.length < 2) throw new Error('JWT debe tener al menos 2 segmentos');
      const dec = (seg: string) => {
        let v = seg.replace(/-/g, '+').replace(/_/g, '/');
        while (v.length % 4) v += '=';
        return atobUtf8(v);
      };
      const header = dec(parts[0]);
      const payload = dec(parts[1]);
      const fmt = (raw: string) => {
        try {
          return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          return raw;
        }
      };
      return `// header\n${fmt(header)}\n\n// payload\n${fmt(payload)}\n\n// signature\n${parts[2] ?? '(none)'}`;
    },
  },
];

export const OP_INDEX = Object.fromEntries(OPS.map((o) => [o.id, o])) as Record<OpId, OpDef>;

export interface RecipeStep {
  id: OpId;
  params?: Record<string, string>;
}

export async function runRecipe(input: string, steps: RecipeStep[]): Promise<string> {
  let current = input;
  for (const step of steps) {
    const op = OP_INDEX[step.id];
    if (!op) throw new Error(`Operación desconocida: ${step.id}`);
    current = await op.run(current, step.params);
  }
  return current;
}
