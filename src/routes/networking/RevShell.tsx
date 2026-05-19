import { useEffect, useMemo, useState } from 'react';
import {
  Terminal as TerminalIcon,
  Ear,
  Wand2,
  Search,
  Plus,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Info,
  History,
  Trash2,
} from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import {
  PAYLOADS,
  SHELL_PATHS,
  TTY_STEPS,
  encode,
  type Encoding,
  type Payload,
  type Os,
  type TtyStep,
  type TtyVariant,
} from '../../lib/revshell';
import {
  pushRevshell,
  clearRevshellHistory,
  useRevshellHistory,
  relativeTime,
  type RevshellEntry,
} from '../../lib/history';
import { cn } from '../../lib/cn';

// Chevron SVG inline reusable para <select> nativos sin appearance.
// Stroke uses Catppuccin Mauve (#cba6f7)
const SELECT_CHEVRON_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23cba6f7' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.65rem center',
  backgroundSize: '0.75rem auto',
};

type OsFilter = 'all' | Os;

interface State {
  lhost: string;
  lport: string;
  shellPath: string;
  encoding: Encoding;
  os: OsFilter;
  selected: {
    shell: string;
    listener: string;
  };
}

const STORAGE_KEY = 'pwn:revshell:v4';
const DEFAULT: State = {
  lhost: '10.10.14.1',
  lport: '4444',
  shellPath: '/bin/bash',
  encoding: 'raw',
  os: 'all',
  selected: { shell: 'bash-tcp', listener: 'nc-listen' },
};

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...p,
      selected: { ...DEFAULT.selected, ...(p.selected ?? {}) },
    };
  } catch {
    return DEFAULT;
  }
}

const OS_FILTERS: Array<{ id: OsFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'linux', label: 'Linux' },
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
];

const ENCODINGS: Array<{ id: Encoding; label: string; hint: string }> = [
  { id: 'raw', label: 'Raw', hint: 'sin modificar' },
  { id: 'url', label: 'URL', hint: 'encodeURIComponent — útil en GET params' },
  { id: 'base64', label: 'Base64', hint: 'útil cuando hay caracteres conflictivos' },
  { id: 'powershell-enc', label: 'PS -enc', hint: 'UTF-16LE base64 — formato `powershell -enc`' },
];

const OS_LABEL: Record<Os, string> = {
  linux: 'Linux',
  macos: 'macOS',
  windows: 'Windows',
};

export default function RevShell() {
  const [state, setState] = useState<State>(loadState);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* */
    }
  }, [state]);

  const ctx = useMemo(
    () => ({
      lhost: state.lhost || '0.0.0.0',
      lport: Number(state.lport) || 4444,
      shellPath: state.shellPath,
    }),
    [state.lhost, state.lport, state.shellPath]
  );

  // ── shells filtradas por OS + search ────────────────────────────────
  const allShells = useMemo(() => PAYLOADS.filter((p) => p.category === 'shell'), []);
  const allListeners = useMemo(() => PAYLOADS.filter((p) => p.category === 'listener'), []);

  const shellsByOs = useMemo(() => {
    if (state.os === 'all') return allShells;
    return allShells.filter((p) => p.os.includes(state.os as Os));
  }, [allShells, state.os]);

  const filteredShells = useMemo(() => {
    if (!search) return shellsByOs;
    const q = search.toLowerCase();
    return shellsByOs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.language.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [shellsByOs, search]);

  // Si el seleccionado no está en la lista filtrada, autoseleccionar el primero
  const currentShellId = state.selected.shell;
  const currentShell = useMemo(() => {
    const inFiltered = filteredShells.find((p) => p.id === currentShellId);
    if (inFiltered) return inFiltered;
    return filteredShells[0] ?? allShells[0];
  }, [filteredShells, currentShellId, allShells]);

  const currentListener =
    allListeners.find((p) => p.id === state.selected.listener) ?? allListeners[0];

  const shellRaw = currentShell ? currentShell.generate(ctx) : '';
  const shellOut = useMemo(() => encode(shellRaw, state.encoding), [shellRaw, state.encoding]);

  const listenerOut = currentListener ? currentListener.generate(ctx) : '';

  const incPort = (delta: number) =>
    setState((s) => ({
      ...s,
      lport: String(Math.max(1, Math.min(65535, (Number(s.lport) || 0) + delta))),
    }));

  const selectShell = (id: string) =>
    setState((s) => ({ ...s, selected: { ...s.selected, shell: id } }));
  const selectListener = (id: string) =>
    setState((s) => ({ ...s, selected: { ...s.selected, listener: id } }));

  const setOs = (os: OsFilter) => setState((s) => ({ ...s, os }));

  return (
    <div className="space-y-8">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className="space-y-4">
        <Prompt cwd="~/networking" command={`./revshell-gen --lhost ${ctx.lhost} --lport ${ctx.lport}`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <TerminalIcon className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary font-mono">Reverse Shell Generator</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary leading-relaxed font-mono">
              Configura tu listener, elige plantilla y copia. Más de 20 payloads, 4 encodings,
              filtros por OS y listener siempre visible. Todo se guarda en localStorage.
            </p>
          </div>
        </div>
      </header>

      {/* ── TOP: CONFIG + LISTENER (siempre visible) ──────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Config: LHOST / LPORT */}
        <div className="rounded-xl border border-bg-line bg-bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-text-secondary font-bold font-mono">
            <span>Configuración</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1.2fr]">
            <Input
              label="LHOST (tu IP)"
              name="lhost"
              value={state.lhost}
              onChange={(e) => setState((s) => ({ ...s, lhost: e.target.value.trim() }))}
              placeholder="10.10.14.1"
              spellCheck={false}
              autoComplete="off"
              className="text-base py-3"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider text-text-secondary font-semibold font-mono">LPORT</label>
              <div className="flex">
                <input
                  value={state.lport}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      lport: e.target.value.replace(/[^\d]/g, '').slice(0, 5),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="4444"
                  className="flex-1 min-w-0 rounded-l-md border border-r-0 border-bg-line bg-bg-soft px-3 py-3 text-center font-mono text-base text-text-primary transition-all duration-200 focus:border-accent/80 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => incPort(1)}
                  className="inline-flex items-center gap-1 rounded-r-md border border-bg-line bg-bg-soft px-3.5 font-mono text-xs text-text-secondary transition-all duration-200 hover:text-accent hover:bg-accent/10 hover:border-accent/40 active:scale-95"
                  title="puerto +1"
                  aria-label="incrementar puerto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>1</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Listener (always visible) */}
        <div className="rounded-xl border border-bg-line bg-bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-text-secondary font-bold font-mono">
              <Ear className="h-3.5 w-3.5 text-accent" />
              <span>Listener</span>
            </div>
            <select
              value={state.selected.listener}
              onChange={(e) => selectListener(e.target.value)}
              style={SELECT_CHEVRON_STYLE}
              className="appearance-none rounded-md border border-bg-line bg-bg-soft pl-3 pr-8 py-1.5 font-mono text-xs text-text-primary cursor-pointer transition-all duration-200 hover:border-accent/40 focus:border-accent/80 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {allListeners.map((p) => (
                <option key={p.id} value={p.id} className="bg-bgSurface text-textPrimary">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <CodeBlock value={listenerOut} ariaLabel="comando del listener" size="sm" />
          {currentListener?.notes && <NotesCallout>{currentListener.notes}</NotesCallout>}
        </div>
      </section>

      {/* ── MAIN: TEMPLATES + PAYLOAD OUTPUT ──────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Templates panel */}
        <aside className="rounded-xl border border-bg-line bg-bg-card overflow-hidden">
          <div className="px-4 pt-4 pb-3 space-y-3 border-b border-bg-line">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold font-mono">Plantillas</h2>
              <span className="text-[10px] font-mono text-text-muted">
                {filteredShells.length}/{allShells.length}
              </span>
            </div>
            {/* OS pills */}
            <div className="flex flex-wrap gap-1">
              {OS_FILTERS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOs(o.id)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border transition-all duration-200',
                    state.os === o.id
                      ? 'border-accent/60 bg-accent/15 text-accent shadow-glow'
                      : 'border-bg-line text-text-secondary hover:text-text-primary hover:border-accent/40'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="bash, python, nc…"
                className="w-full rounded-md border border-bg-line bg-bg-soft pl-8 pr-2.5 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-accent/40 focus:border-accent/80 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
          <div className="max-h-[480px] lg:max-h-[560px] overflow-y-auto divide-y divide-bg-line/40">
            {filteredShells.map((p) => (
              <PayloadRow
                key={p.id}
                payload={p}
                selected={p.id === currentShell?.id}
                onClick={() => selectShell(p.id)}
              />
            ))}
            {filteredShells.length === 0 && (
              <p className="text-text-muted text-xs p-4 text-center font-mono">
                Sin plantillas para {state.os !== 'all' ? OS_LABEL[state.os as Os] : 'la búsqueda actual'}.
              </p>
            )}
          </div>
        </aside>

        {/* Payload output (big) */}
        <div className="rounded-xl border border-bg-line bg-bg-card overflow-hidden flex flex-col">
          {currentShell ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bg-line bg-bg-soft px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base text-text-primary font-semibold truncate font-mono">{currentShell.name}</span>
                  <span className="rounded border border-bg-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-secondary font-mono">
                    {currentShell.language}
                  </span>
                  {currentShell.os.map((o) => (
                    <span
                      key={o}
                      className="hidden sm:inline rounded border border-bg-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted font-mono"
                    >
                      {OS_LABEL[o]}
                    </span>
                  ))}
                  {state.encoding !== 'raw' && (
                    <span className="rounded border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent font-mono">
                      {state.encoding}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DownloadButton payload={currentShell} value={shellOut} />
                  <CopyCTA
                    value={shellOut}
                    onCopied={() => {
                      pushRevshell({
                        payloadName: currentShell.name,
                        language: currentShell.language,
                        payload: shellOut,
                        lhost: ctx.lhost,
                        lport: ctx.lport,
                        encoding: state.encoding,
                      });
                    }}
                  />
                </div>
              </div>

              <CodeBlock value={shellOut} ariaLabel="payload generado" size="lg" />

              {/* Modifiers: Shell + Encoding pegados al output */}
              <div className="border-t border-bg-line bg-bg-soft/40 px-4 py-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:items-end">
                  <Select
                    label="Shell del objetivo"
                    name="shell"
                    value={state.shellPath}
                    onChange={(e) => setState((s) => ({ ...s, shellPath: e.target.value }))}
                    options={SHELL_PATHS.map((p) => ({ value: p, label: p }))}
                  />
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-text-secondary mb-1.5 block font-bold font-mono">
                      Encoding
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {ENCODINGS.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setState((s) => ({ ...s, encoding: e.id }))}
                          title={e.hint}
                          className={cn(
                            'rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-all duration-200 border',
                            state.encoding === e.id
                              ? 'border-accent/60 bg-accent/15 text-accent shadow-glow'
                              : 'border-bg-line text-text-secondary hover:text-text-primary hover:border-accent/40'
                          )}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {currentShell.notes && <NotesCallout>{currentShell.notes}</NotesCallout>}
              </div>
            </>
          ) : (
            <p className="p-8 text-center text-text-muted text-sm font-mono">Sin plantilla seleccionada.</p>
          )}
        </div>
      </section>

      {/* ── TTY UPGRADE WORKFLOW ──────────────────────────────────── */}
      <TtyUpgradePanel lport={ctx.lport} />

      {/* ── HISTORY ───────────────────────────────────────────────── */}
      <RevshellHistoryPanel />

      {/* ── WARNING ───────────────────────────────────────────────── */}
      <Terminal title="!! uso ético" className="border-accent-red/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-accent-red flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-primary leading-relaxed font-mono">
            Usa estos payloads solo en sistemas autorizados: laboratorios propios, CTFs, engagements
            con consentimiento escrito. El acceso no autorizado es delito en la mayoría de jurisdicciones.
          </p>
        </div>
      </Terminal>
    </div>
  );
}

// ────────────────────────── sub-components ──────────────────────────

function PayloadRow({
  payload,
  selected,
  onClick,
}: {
  payload: Payload;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-all duration-200 border-l-2',
        selected
          ? 'border-l-accent bg-accent/15'
          : 'border-l-transparent hover:bg-bg-soft/60 hover:border-l-accent/20 hover:pl-5'
      )}
    >
      <div className="min-w-0 font-mono">
        <div
          className={cn(
            'text-sm font-bold truncate transition-colors duration-200',
            selected ? 'text-accent' : 'text-text-primary'
          )}
        >
          {payload.name}
        </div>
        <div className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider">
          {payload.language}
        </div>
      </div>
      {selected && (
        <span
          className="text-accent flex-shrink-0 text-xs shadow-glow animate-pulse"
          aria-hidden
        >
          ●
        </span>
      )}
    </button>
  );
}

function CodeBlock({
  value,
  ariaLabel,
  size = 'sm',
}: {
  value: string;
  ariaLabel: string;
  size?: 'sm' | 'lg';
}) {
  return (
    <pre
      aria-label={ariaLabel}
      className={cn(
        'overflow-x-auto px-4 font-mono text-text-primary whitespace-pre-wrap break-all bg-bg-soft/40 transition-all duration-300',
        size === 'lg' ? 'py-5 text-sm leading-relaxed min-h-[140px]' : 'py-3 text-xs leading-relaxed rounded-md border border-bg-line'
      )}
    >
      <code>{value}</code>
    </pre>
  );
}

function CopyCTA({
  value,
  compact,
  onCopied,
}: {
  value: string;
  compact?: boolean;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* */
    }
  };

  return (
    <button
      onClick={copy}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-mono font-bold transition-all duration-200 active:scale-95 border',
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        copied
          ? 'border-accent-green bg-accent-green/10 text-accent-green shadow-glowGreen'
          : 'border-accent/40 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/60 hover:shadow-glow'
      )}
      aria-live="polite"
    >
      {copied ? (
        <Check className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      ) : (
        <Copy className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
    </button>
  );
}

function DownloadButton({ payload, value }: { payload: Payload; value: string }) {
  const download = () => {
    const ext =
      payload.language === 'powershell'
        ? 'ps1'
        : payload.language === 'python'
        ? 'py'
        : payload.language === 'go'
        ? 'go'
        : payload.language === 'java'
        ? 'java'
        : payload.language === 'php'
        ? 'php'
        : payload.language === 'ruby'
        ? 'rb'
        : payload.language === 'perl'
        ? 'pl'
        : 'sh';
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-md border border-bg-line bg-bg-soft px-3 py-2 font-mono text-xs text-text-secondary hover:text-text-primary hover:border-accent/40 hover:bg-accent/5 transition-all duration-200 active:scale-95"
      title="Descargar como archivo"
      aria-label="descargar payload como archivo"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Descargar</span>
    </button>
  );
}

// ────────────────────── notes callout ─────────────────────

function NotesCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border-l-2 border-accent/60 bg-accent/5 px-3 py-2.5">
      <Info className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />
      <div className="min-w-0 font-mono">
        <div className="text-[10px] uppercase tracking-wider text-accent font-bold mb-0.5">
          Nota
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function KbdKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-bg-line bg-bg-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-primary shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
      {children}
    </kbd>
  );
}

// ────────────────────── TTY upgrade panel ─────────────────────

function TtyUpgradePanel({ lport }: { lport: number }) {
  const [stepId, setStepId] = useState<TtyStep['id']>('spawn');
  const [variantByStep, setVariantByStep] = useState<Record<string, string>>({
    spawn: 'python3-pty',
    stabilize: 'stty-raw',
    environment: 'env-basic',
    advanced: 'expect-sudo',
  });

  const currentStep = TTY_STEPS.find((s) => s.id === stepId) ?? TTY_STEPS[0];
  const currentVariantId = variantByStep[currentStep.id];
  const currentVariant =
    currentStep.variants.find((v) => v.id === currentVariantId) ?? currentStep.variants[0];

  const setVariant = (v: string) =>
    setVariantByStep((prev) => ({ ...prev, [currentStep.id]: v }));

  return (
    <section className="rounded-xl border border-bg-line bg-bg-card overflow-hidden">
      <header className="border-b border-bg-line px-5 py-4 flex items-center gap-3">
        <Wand2 className="h-4 w-4 text-accent" />
        <div className="flex-1 min-w-0 font-mono">
          <div className="text-sm font-bold text-text-primary">TTY Upgrade · Full TTY workflow</div>
          <div className="text-xs text-text-muted">
            Estabilización paso a paso para shells interactivas (vi, sudo, tab-completion).
          </div>
        </div>
      </header>

      {/* Step tabs */}
      <nav
        className="flex border-b border-bg-line overflow-x-auto"
        role="tablist"
        aria-label="Pasos del TTY upgrade"
      >
        {TTY_STEPS.map((s) => {
          const active = s.id === stepId;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => setStepId(s.id)}
              className={cn(
                'group relative flex items-center gap-2.5 px-4 py-3.5 text-left transition-all duration-200 flex-shrink-0 whitespace-nowrap',
                active
                  ? 'bg-bg-soft/50 text-text-primary font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/30'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-mono font-bold border transition-all duration-200',
                  active
                    ? 'border-accent bg-accent/15 text-accent shadow-glow'
                    : 'border-bg-line text-text-muted group-hover:text-text-secondary group-hover:border-accent/40'
                )}
                aria-hidden
              >
                {s.num ?? '+'}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider font-mono">{s.title}</span>
              {active && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-accent shadow-glow"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Step body */}
      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-text-secondary leading-relaxed font-mono">{currentStep.subtitle}</p>

        {/* Stabilize step has a procedural intro with kbd shortcuts */}
        {currentStep.id === 'stabilize' && (
          <ol className="space-y-2 text-sm text-text-primary font-mono">
            <li className="flex items-baseline gap-2">
              <span className="text-[10px] text-text-muted flex-shrink-0">1.</span>
              <span>
                En la shell remota, presiona <KbdKey>Ctrl</KbdKey> <span className="text-text-muted">+</span>{' '}
                <KbdKey>Z</KbdKey> para mandarla a background.
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <span className="text-[10px] text-text-muted flex-shrink-0">2.</span>
              <span>
                En <em className="not-italic text-text-secondary font-semibold">tu host</em>, copia y pega el comando de abajo.
              </span>
            </li>
            <li className="flex items-baseline gap-2">
              <span className="text-[10px] text-text-muted flex-shrink-0">3.</span>
              <span>
                Pulsa <KbdKey>Enter</KbdKey> en la shell remota — el prompt reaparece con TTY raw.
              </span>
            </li>
          </ol>
        )}

        {/* Variant tabs (skip if only one variant) */}
        {currentStep.variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {currentStep.variants.map((v) => {
              const active = v.id === currentVariant?.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVariant(v.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 font-mono text-xs font-semibold transition-all duration-200',
                    active
                      ? 'border-accent bg-accent/15 text-accent shadow-glow'
                      : 'border-bg-line text-text-secondary hover:text-text-primary hover:border-accent/40'
                  )}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        )}

        {currentVariant && (
          <TtyVariantView variant={currentVariant} lport={lport} stepId={currentStep.id} />
        )}
      </div>
    </section>
  );
}

function TtyVariantView({
  variant,
  lport,
  stepId,
}: {
  variant: TtyVariant;
  lport: number;
  stepId: TtyStep['id'];
}) {
  // Reemplaza placeholders LPORT en variants que los usan (socat).
  const command = variant.command.replace(/LPORT/g, String(lport));

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-bg-line bg-bg-soft overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-bg-line bg-bg-soft px-3 py-2">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
              {variant.language}
            </span>
            <span className="text-[10px] text-text-muted">·</span>
            <span className="text-xs text-text-primary font-bold">{variant.name}</span>
            {stepId === 'advanced' && (
              <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent font-bold">
                HackTricks
              </span>
            )}
          </div>
          <CopyCTA value={command} compact />
        </div>
        <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-text-primary whitespace-pre-wrap break-all">
          <code>{command}</code>
        </pre>
      </div>
      {variant.notes && <NotesCallout>{variant.notes}</NotesCallout>}
    </div>
  );
}

// ───────────────────────── history panel ─────────────────────────

function RevshellHistoryPanel() {
  const items = useRevshellHistory();

  return (
    <section className="rounded-xl border border-bg-line bg-bg-card overflow-hidden font-mono">
      <details open={items.length > 0}>
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-bg-soft/40 transition-colors duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <History className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-bold text-text-primary">Actividad reciente</span>
            <span className="rounded border border-bg-line bg-bg-soft px-1.5 py-0.5 text-[10px] text-text-muted">
              {items.length}
            </span>
            <span className="hidden sm:inline text-[11px] text-text-muted">
              · clic en una fila para recopiar el payload
            </span>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearRevshellHistory();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-bg-line px-2.5 py-1 text-[11px] font-bold text-text-secondary transition-all duration-200 hover:text-accent-red hover:border-accent-red/50 hover:bg-accent-red/5"
              aria-label="borrar historial de payloads"
            >
              <Trash2 className="h-3 w-3" />
              <span>Borrar</span>
            </button>
          )}
        </summary>
        <div className="border-t border-bg-line">
          {items.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-text-muted">
              Sin payloads copiados todavía. Cada vez que pulses Copiar en un payload de reverse
              shell queda registrado aquí (solo en este navegador).
            </p>
          ) : (
            <ul className="divide-y divide-bg-line/40">
              {items.map((it) => (
                <RevshellHistoryRow key={it.id} entry={it} />
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}

function RevshellHistoryRow({ entry }: { entry: RevshellEntry }) {
  const [flashed, setFlashed] = useState(false);

  const recopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.payload);
      setFlashed(true);
      window.setTimeout(() => setFlashed(false), 1200);
    } catch {
      /* */
    }
  };

  return (
    <li>
      <button
        type="button"
        onClick={recopy}
        className={cn(
          'group w-full grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 text-left transition-colors duration-200',
          flashed ? 'bg-accent-green/10' : 'hover:bg-bg-soft/40'
        )}
        title="copiar este payload al portapapeles"
      >
        <div className="min-w-0 font-mono">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-text-primary font-bold truncate">{entry.payloadName}</span>
            <span className="rounded border border-bg-line bg-bg-soft px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted flex-shrink-0">
              {entry.language}
            </span>
            {entry.encoding !== 'raw' && (
              <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent flex-shrink-0">
                {entry.encoding}
              </span>
            )}
          </div>
          <div className="text-[11px] text-text-secondary truncate">{entry.payload}</div>
          <div className="text-[11px] text-text-muted mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-accent/80">
              {entry.lhost}:{entry.lport}
            </span>
            <span className="text-text-muted/40">·</span>
            <span title={new Date(entry.ts).toLocaleString()}>{relativeTime(entry.ts)}</span>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-mono transition flex-shrink-0',
            flashed
              ? 'border-accent-green/60 bg-accent-green/15 text-accent-green'
              : 'border-bg-line bg-bg-soft text-fg-muted group-hover:text-accent-yellow group-hover:border-accent-yellow/50'
          )}
        >
          {flashed ? (
            <>
              <Check className="h-3 w-3" />
              <span>copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>copiar</span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}
