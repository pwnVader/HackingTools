/**
 * Subnetting IPv4 — utilidades puras, sin dependencias.
 * Soporta CIDR 0-32. RFC 3021 (cidr=31) y cidr=32 manejados como casos especiales.
 */

export interface SubnetInfo {
  ip: string;
  cidr: number;
  mask: string;
  maskBinary: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
  isPrivate: boolean;
  ipBinary: string;
  networkBinary: string;
  notes: string[];
}

export class SubnetError extends Error {}

export function parseIPv4(ip: string): number {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) throw new SubnetError('Formato IPv4 inválido (esperado A.B.C.D)');
  let out = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) throw new SubnetError(`Octeto inválido: "${p}"`);
    const n = Number(p);
    if (n < 0 || n > 255) throw new SubnetError(`Octeto fuera de rango: ${n}`);
    out = (out << 8) | n;
  }
  return out >>> 0;
}

export function ipToString(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

export function maskFromCidr(cidr: number): number {
  if (cidr < 0 || cidr > 32) throw new SubnetError('CIDR fuera de rango (0-32)');
  if (cidr === 0) return 0;
  return (0xffffffff << (32 - cidr)) >>> 0;
}

export function ipToBinary(n: number, dotted = true): string {
  const bits = n.toString(2).padStart(32, '0');
  if (!dotted) return bits;
  return bits.match(/.{8}/g)!.join('.');
}

export function getIpClass(firstOctet: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D';
  return 'E';
}

export function isPrivateIPv4(n: number): boolean {
  const a = (n >>> 24) & 0xff;
  const b = (n >>> 16) & 0xff;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * Acepta "192.168.1.10/24" o ("192.168.1.10", 24).
 */
export function analyze(input: string, cidrArg?: number): SubnetInfo {
  let ipStr = input;
  let cidr = cidrArg;
  if (input.includes('/')) {
    const [a, b] = input.split('/');
    ipStr = a;
    cidr = Number(b);
  }
  if (cidr === undefined || Number.isNaN(cidr)) {
    throw new SubnetError('Falta CIDR (usa /24 o pásalo aparte)');
  }
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) {
    throw new SubnetError('CIDR debe ser entero entre 0 y 32');
  }

  const ip = parseIPv4(ipStr);
  const mask = maskFromCidr(cidr);
  const wildcard = (~mask) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = cidr === 0 ? 2 ** 32 : 2 ** (32 - cidr);

  let firstHost = network;
  let lastHost = broadcast;
  let usable = 0;
  const notes: string[] = [];

  if (cidr === 32) {
    firstHost = network;
    lastHost = network;
    usable = 1;
    notes.push('CIDR /32 — host único. Network = Broadcast = First = Last.');
  } else if (cidr === 31) {
    firstHost = network;
    lastHost = broadcast;
    usable = 2;
    notes.push('CIDR /31 (RFC 3021) — enlace punto-a-punto, ambos hosts usables.');
  } else {
    firstHost = (network + 1) >>> 0;
    lastHost = (broadcast - 1) >>> 0;
    usable = total - 2;
  }

  const firstOctet = (ip >>> 24) & 0xff;
  const ipClass = getIpClass(firstOctet);
  const isPriv = isPrivateIPv4(ip);
  if (isPriv) notes.push('Dirección dentro de rango privado RFC 1918.');
  if (cidr === 0) notes.push('CIDR /0 — toda la Internet IPv4 (úsalo solo para rutas por defecto).');

  return {
    ip: ipToString(ip),
    cidr,
    mask: ipToString(mask),
    maskBinary: ipToBinary(mask),
    wildcard: ipToString(wildcard),
    network: ipToString(network),
    broadcast: ipToString(broadcast),
    firstHost: ipToString(firstHost),
    lastHost: ipToString(lastHost),
    totalAddresses: total,
    usableHosts: usable,
    ipClass,
    isPrivate: isPriv,
    ipBinary: ipToBinary(ip),
    networkBinary: ipToBinary(network),
    notes,
  };
}
