/**
 * Esteganografía con Unicode tag chars.
 *
 * Cada byte del mensaje UTF-8 se mapea a un code point en el bloque
 * "Tags" (U+E0000 - U+E00FF). El carrier (típicamente un emoji) lleva
 * estos tag chars adjuntos: visualmente solo se ve el emoji, pero al
 * iterar code points se recuperan los bytes.
 *
 * Idea documentada por Paul Butler (2025). Compatible con la mayoría
 * de navegadores y apps de chat que preservan code points raros.
 */

const TAG_BASE = 0xe0000;
const TAG_RANGE_END = 0xe00ff;

export interface EncodeResult {
  encoded: string;       // carrier + tag chars (lo que copias)
  bytesHidden: number;
  visualLength: number;  // longitud visual (typically 1 si es un solo emoji)
}

export interface DecodeResult {
  carrier: string;       // visible portion (emoji u otro)
  message: string;       // mensaje oculto
  bytes: number;         // bytes recuperados
}

export function encodeStego(carrier: string, message: string): EncodeResult {
  if (!carrier) throw new Error('Carrier (emoji o texto) requerido');
  const bytes = new TextEncoder().encode(message);
  let out = carrier;
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCodePoint(TAG_BASE + bytes[i]);
  }
  return {
    encoded: out,
    bytesHidden: bytes.length,
    visualLength: [...carrier].length,
  };
}

export function decodeStego(input: string): DecodeResult {
  const bytes: number[] = [];
  const carrierChars: string[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    if (cp >= TAG_BASE && cp <= TAG_RANGE_END) {
      bytes.push(cp - TAG_BASE);
    } else {
      carrierChars.push(ch);
    }
  }
  const carrier = carrierChars.join('');
  const message = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  return { carrier, message, bytes: bytes.length };
}

/**
 * Devuelve true si el string contiene tag chars.
 */
export function hasHiddenData(input: string): boolean {
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    if (cp >= TAG_BASE && cp <= TAG_RANGE_END) return true;
  }
  return false;
}

export const SAMPLE_CARRIERS = [
  '🙂', '😎', '🔥', '💀', '🦾', '🤖', '👾', '🐉', '⚡', '🌙',
  '🦊', '🐈‍⬛', '🥷', '🛸', '☠️', '🧠', '🪲', '🐧', '🦴', '🗝️',
];
