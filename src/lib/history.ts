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
