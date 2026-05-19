/**
 * Historial local — sólo localStorage, sin servidor.
 *
 * Diseñado para llevar registro durante una auditoría real: cada herramienta
 * empuja sus eventos a su propio bucket (no se mezclan) y los componentes
 * pueden suscribirse a cambios vía hooks.
 *
 * El cap por bucket es bajo (MAX) — el historial es para los últimos pasos
 * de la sesión, no para auditoría forense persistente.
 */

import { useEffect, useState } from 'react';

export type HistoryKind = 'audit' | 'revshell';

export interface AuditEntry {
  kind: 'audit';
  id: string;
  ts: string; // ISO
  target: string;
  findingCount: number;
  riskLabel: string;
  score: number;
}

export interface RevshellEntry {
  kind: 'revshell';
  id: string;
  ts: string;
  payloadName: string;
  language: string;
  payload: string;
  lhost: string;
  lport: number;
  encoding: string;
}

export type HistoryEntry = AuditEntry | RevshellEntry;

const KEYS: Record<HistoryKind, string> = {
  audit: 'pwn:history:audit:v1',
  revshell: 'pwn:history:revshell:v1',
};

const MAX = 15;

// ─── read/write base ─────────────────────────────────────────────────

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* quota / private mode — no-op */
  }
}

function rid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── subscriber pattern ──────────────────────────────────────────────

const listeners: Record<HistoryKind, Set<() => void>> = {
  audit: new Set(),
  revshell: new Set(),
};

function notify(kind: HistoryKind): void {
  listeners[kind].forEach((fn) => fn());
}

// ─── audit ───────────────────────────────────────────────────────────

export function getAuditHistory(): AuditEntry[] {
  return read<AuditEntry>(KEYS.audit);
}

export function pushAudit(entry: Omit<AuditEntry, 'kind' | 'id' | 'ts'>): void {
  const list = getAuditHistory();
  const next: AuditEntry = {
    kind: 'audit',
    id: rid(),
    ts: new Date().toISOString(),
    ...entry,
  };
  list.unshift(next);
  write(KEYS.audit, list.slice(0, MAX));
  notify('audit');
}

export function clearAuditHistory(): void {
  localStorage.removeItem(KEYS.audit);
  notify('audit');
}

// ─── revshell ────────────────────────────────────────────────────────

export function getRevshellHistory(): RevshellEntry[] {
  return read<RevshellEntry>(KEYS.revshell);
}

export function pushRevshell(entry: Omit<RevshellEntry, 'kind' | 'id' | 'ts'>): void {
  const list = getRevshellHistory();
  const next: RevshellEntry = {
    kind: 'revshell',
    id: rid(),
    ts: new Date().toISOString(),
    ...entry,
  };
  list.unshift(next);
  write(KEYS.revshell, list.slice(0, MAX));
  notify('revshell');
}

export function clearRevshellHistory(): void {
  localStorage.removeItem(KEYS.revshell);
  notify('revshell');
}

// ─── react hooks ─────────────────────────────────────────────────────

export function useAuditHistory(): AuditEntry[] {
  const [items, setItems] = useState<AuditEntry[]>(() => getAuditHistory());
  useEffect(() => {
    const fn = () => setItems(getAuditHistory());
    listeners.audit.add(fn);
    return () => {
      listeners.audit.delete(fn);
    };
  }, []);
  return items;
}

export function useRevshellHistory(): RevshellEntry[] {
  const [items, setItems] = useState<RevshellEntry[]>(() => getRevshellHistory());
  useEffect(() => {
    const fn = () => setItems(getRevshellHistory());
    listeners.revshell.add(fn);
    return () => {
      listeners.revshell.delete(fn);
    };
  }, []);
  return items;
}

// ─── global aggregation ──────────────────────────────────────────────

/**
 * Feed unificado, orden cronológico inverso. Útil para el dashboard
 * /history que muestra toda la actividad de la sesión en un solo timeline.
 */
export function getAllHistory(): HistoryEntry[] {
  const all: HistoryEntry[] = [...getAuditHistory(), ...getRevshellHistory()];
  return all.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

export function useAllHistory(): HistoryEntry[] {
  const [items, setItems] = useState<HistoryEntry[]>(() => getAllHistory());
  useEffect(() => {
    const fn = () => setItems(getAllHistory());
    listeners.audit.add(fn);
    listeners.revshell.add(fn);
    return () => {
      listeners.audit.delete(fn);
      listeners.revshell.delete(fn);
    };
  }, []);
  return items;
}

/**
 * Conteo por bucket para mostrar cuántos eventos hay por categoría
 * sin tener que rehidratar las listas completas.
 */
export interface BucketCount {
  kind: HistoryKind;
  label: string;
  count: number;
}

export function getBucketCounts(): BucketCount[] {
  return [
    { kind: 'audit', label: 'Auditorías CMS', count: getAuditHistory().length },
    { kind: 'revshell', label: 'Payloads copiados', count: getRevshellHistory().length },
  ];
}

/**
 * Inventario de TODO lo que el toolkit tiene persistido en localStorage:
 * historial + estados de herramientas (config de RevShell, último target de
 * wp-audit, etc.). Útil para el dashboard "Global Killswitch" — el usuario
 * ve antes de borrar.
 *
 * Sólo enumera las keys que empiezan por `pwn:` para evitar tocar
 * localStorage de otras apps que puedan compartir origen (no debería
 * pasar pero por higiene).
 */
export interface StorageItem {
  key: string;
  sizeBytes: number;
  /** Etiqueta human-readable derivada del key. */
  label: string;
}

const KEY_LABELS: Record<string, string> = {
  'pwn:history:audit:v1': 'Historial · auditorías CMS',
  'pwn:history:revshell:v1': 'Historial · reverse shells',
  'pwn:wpaudit:v2': 'Estado · wp-audit (último target)',
  'pwn:joomlaaudit:v1': 'Estado · joomla-audit (último target)',
  'pwn:drupalaudit:v1': 'Estado · drupal-audit (último target)',
  'pwn:revshell:v4': 'Estado · revshell-gen (LHOST, LPORT, plantilla)',
  'pwn:revshell:v3': 'Estado · revshell-gen (legacy v3)',
  'pwn:revshell:v2': 'Estado · revshell-gen (legacy v2)',
};

function humanLabel(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  // Heurística: pwn:<tool>:<version>
  const parts = key.split(':');
  if (parts.length >= 2) return `${parts[1]} (${key})`;
  return key;
}

export function getStorageFootprint(): StorageItem[] {
  const out: StorageItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('pwn:')) continue;
      const value = localStorage.getItem(key) ?? '';
      // El tamaño en localStorage es aproximadamente el largo del string en UTF-16.
      out.push({ key, sizeBytes: value.length * 2, label: humanLabel(key) });
    }
  } catch {
    /* private mode / restricted */
  }
  return out.sort((a, b) => b.sizeBytes - a.sizeBytes);
}

export function totalFootprintBytes(): number {
  return getStorageFootprint().reduce((acc, it) => acc + it.sizeBytes, 0);
}

/**
 * KILLSWITCH GLOBAL.
 *
 * Borra TODAS las keys del toolkit (las que empiezan por `pwn:`) y notifica
 * a los suscriptores para que la UI se rehidrate al instante. NO recargamos
 * la página: el caller decide si tras esto navega o muestra estado vacío.
 *
 * Diseño deliberado:
 *  - No usa `window.confirm` (rompería el flujo en mitad de una auditoría).
 *  - No usa `localStorage.clear()` global: respeta keys no nuestras por si
 *    el navegador comparte origen con otra app montada en /something/else.
 */
export function clearAllToolkitStorage(): void {
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pwn:')) toDelete.push(key);
    }
    for (const k of toDelete) localStorage.removeItem(k);
  } catch {
    /* no-op si localStorage está bloqueado */
  }
  notify('audit');
  notify('revshell');
}

// ─── formatter ───────────────────────────────────────────────────────

/**
 * Tiempo relativo en castellano corto para UIs densas (lista de actividad).
 * Cae al toLocaleString cuando pasa de 24h.
 */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 30) return 'ahora';
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr}h`;
  return new Date(iso).toLocaleString();
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
