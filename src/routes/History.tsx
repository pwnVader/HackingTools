import { useState } from 'react';
import {
  History as HistoryIcon,
  Trash2,
  AlertOctagon,
  ShieldAlert,
  Terminal as TerminalIcon,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import Prompt from '../components/Prompt';
import Terminal from '../components/Terminal';
import { cn } from '../lib/cn';
import {
  useAllHistory,
  getBucketCounts,
  getStorageFootprint,
  totalFootprintBytes,
  clearAllToolkitStorage,
  clearAuditHistory,
  clearRevshellHistory,
  relativeTime,
  formatBytes,
  type HistoryEntry,
  type AuditEntry,
  type RevshellEntry,
} from '../lib/history';

export default function HistoryRoute() {
  const items = useAllHistory();
  const buckets = getBucketCounts();
  const footprint = getStorageFootprint();
  const totalBytes = totalFootprintBytes();

  const killAll = () => {
    // Sin window.confirm — la velocidad en mitad de una auditoría es prioridad.
    clearAllToolkitStorage();
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <Prompt cwd="~/history" command="./show-activity --all" />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <HistoryIcon className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-textPrimary font-mono tracking-tight">
              Historial Global
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-textSecondary leading-relaxed font-mono">
              Dashboard consolidado de toda la actividad guardada en localStorage por las
              herramientas del toolkit. Todo lo que aparece aquí está <em>sólo</em> en tu navegador
              — nunca tocó un servidor.
            </p>
          </div>
        </div>
      </header>

      {/* Killswitch */}
      <Killswitch onKill={killAll} totalBytes={totalBytes} keyCount={footprint.length} />

      {/* Buckets summary */}
      <section className="grid gap-3 sm:grid-cols-2">
        {buckets.map((b) => (
          <BucketCard
            key={b.kind}
            label={b.label}
            count={b.count}
            onClear={
              b.kind === 'audit' ? clearAuditHistory : clearRevshellHistory
            }
          />
        ))}
      </section>

      {/* Unified feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold">
            Actividad reciente · feed unificado
          </h2>
          <span className="text-xs text-textMuted font-mono">
            {items.length} {items.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>
        {items.length === 0 ? (
          <Terminal title="empty" className="border-borderCustom/50">
            <p className="text-xs text-textMuted font-mono">
              No hay actividad registrada todavía. Cualquier auditoría CMS exitosa o payload de
              reverse shell copiado aparecerá aquí.
            </p>
          </Terminal>
        ) : (
          <ul className="rounded-xl border border-borderCustom bg-bgSurface overflow-hidden divide-y divide-borderCustom/40">
            {items.map((it) => (
              <li key={it.id}>
                {it.kind === 'audit' ? (
                  <AuditRow entry={it} />
                ) : (
                  <RevshellRow entry={it} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Storage footprint */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage footprint
          </h2>
          <span className="text-xs text-textMuted font-mono">
            {formatBytes(totalBytes)} · {footprint.length}{' '}
            {footprint.length === 1 ? 'key' : 'keys'}
          </span>
        </div>
        {footprint.length === 0 ? (
          <Terminal title="empty" className="border-borderCustom/50">
            <p className="text-xs text-textMuted font-mono">
              Sin keys persistidas. localStorage está vacío.
            </p>
          </Terminal>
        ) : (
          <div className="rounded-xl border border-borderCustom bg-bgSurface overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="border-b border-borderCustom/60 bg-bgBase/40">
                <tr>
                  <th className="text-left px-4 py-2.5 text-textMuted font-semibold uppercase tracking-wider text-[10px]">
                    Key
                  </th>
                  <th className="text-left px-4 py-2.5 text-textMuted font-semibold uppercase tracking-wider text-[10px]">
                    Descripción
                  </th>
                  <th className="text-right px-4 py-2.5 text-textMuted font-semibold uppercase tracking-wider text-[10px]">
                    Tamaño
                  </th>
                </tr>
              </thead>
              <tbody>
                {footprint.map((it) => (
                  <tr key={it.key} className="border-t border-borderCustom/30">
                    <td className="px-4 py-2.5 text-accent break-all">{it.key}</td>
                    <td className="px-4 py-2.5 text-textSecondary">{it.label}</td>
                    <td className="px-4 py-2.5 text-right text-textPrimary">
                      {formatBytes(it.sizeBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────── sub-components ───────────────────────

function Killswitch({
  onKill,
  totalBytes,
  keyCount,
}: {
  onKill: () => void;
  totalBytes: number;
  keyCount: number;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <section className="rounded-xl border-2 border-accent-red/50 bg-accent-red/5 p-5 shadow-glowRed">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlertOctagon className="h-6 w-6 text-accent-red flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h2 className="text-lg font-bold text-accent-red font-mono tracking-tight">
              Global Killswitch
            </h2>
            <p className="text-xs text-textSecondary font-mono mt-1 leading-relaxed">
              Purga <strong>todo</strong> el estado del toolkit en localStorage:{' '}
              {keyCount} {keyCount === 1 ? 'key' : 'keys'} · {formatBytes(totalBytes)}. Sin
              diálogos de confirmación. Útil si compartes pantalla.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {armed ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onKill();
                  setArmed(false);
                }}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider bg-accent-red text-bgBase hover:bg-accent-red/90 transition shadow-glowRed"
              >
                <Trash2 className="h-4 w-4" />
                Confirmar purga
              </button>
              <button
                type="button"
                onClick={() => setArmed(false)}
                className="inline-flex items-center rounded-md px-3 py-2.5 font-mono text-xs text-textMuted border border-borderCustom hover:text-textPrimary transition"
              >
                cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setArmed(true)}
              disabled={keyCount === 0}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-wider border-2 transition',
                keyCount === 0
                  ? 'border-borderCustom text-textMuted cursor-not-allowed opacity-50'
                  : 'border-accent-red text-accent-red hover:bg-accent-red/10'
              )}
            >
              <ShieldAlert className="h-4 w-4" />
              Activar Killswitch
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function BucketCard({
  label,
  count,
  onClear,
}: {
  label: string;
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-borderCustom bg-bgSurface/60 p-4 flex items-center justify-between gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-textMuted font-mono font-semibold">
          {label}
        </div>
        <div className="text-2xl font-bold font-mono text-textPrimary mt-1">{count}</div>
      </div>
      <button
        type="button"
        onClick={onClear}
        disabled={count === 0}
        className={cn(
          'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider transition',
          count === 0
            ? 'border-borderCustom/50 text-textMuted/50 cursor-not-allowed'
            : 'border-borderCustom text-textMuted hover:text-accent-red hover:border-accent-red/50'
        )}
      >
        <Trash2 className="h-3 w-3" />
        Borrar
      </button>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const riskColor =
    entry.riskLabel === 'Bajo'
      ? 'text-accent-green'
      : entry.riskLabel === 'Medio'
      ? 'text-accent-peach'
      : entry.riskLabel === 'Alto'
      ? 'text-accent-purple'
      : 'text-accent-red';

  return (
    <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 hover:bg-bgElevated/40 transition">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 border border-accent/30 flex-shrink-0">
        <ShieldAlert className="h-3.5 w-3.5 text-accent" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-mono text-textPrimary truncate">{entry.target}</div>
        <div className="text-[11px] text-textMuted mt-0.5 flex items-center gap-2 flex-wrap font-mono">
          <span>{entry.findingCount} hallazgos</span>
          <span className="text-textMuted/60">·</span>
          <span className={cn('font-medium', riskColor)}>
            {entry.riskLabel} · {entry.score}/100
          </span>
        </div>
      </div>
      <span className="text-[11px] text-textMuted font-mono flex-shrink-0 col-start-2 sm:col-start-auto">
        {relativeTime(entry.ts)}
      </span>
    </div>
  );
}

function RevshellRow({ entry }: { entry: RevshellEntry }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(entry.payload).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-bgElevated/40 transition">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-peach/10 border border-accent-peach/30 flex-shrink-0">
        <TerminalIcon className="h-3.5 w-3.5 text-accent-peach" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-textPrimary truncate">{entry.payloadName}</span>
          <span className="rounded border border-borderCustom bg-bgElevated px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-textMuted flex-shrink-0">
            {entry.language}
          </span>
          {entry.encoding !== 'raw' && (
            <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-accent flex-shrink-0">
              {entry.encoding}
            </span>
          )}
        </div>
        <div className="text-[11px] text-textMuted mt-0.5 flex items-center gap-2 flex-wrap font-mono">
          <span>
            {entry.lhost}:{entry.lport}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className={cn(
          'inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-wider transition',
          'col-start-2 sm:col-start-auto justify-self-start sm:justify-self-auto',
          copied
            ? 'border-accent-green/60 bg-accent-green/10 text-accent-green'
            : 'border-borderCustom text-textMuted hover:text-accent hover:border-accent/50'
        )}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'copiado' : 'copiar'}
      </button>
      <span className="text-[11px] text-textMuted font-mono flex-shrink-0 col-start-2 sm:col-start-auto">
        {relativeTime(entry.ts)}
      </span>
    </div>
  );
}

// Re-export tipo para futuros consumidores que importen este módulo.
export type { HistoryEntry };
