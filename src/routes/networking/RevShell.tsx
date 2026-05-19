import { useEffect, useMemo, useState } from 'react';
import {
  Terminal as TerminalIcon,
  Ear,
  Wand2,
  Search,
  Plus,
  Minus,
  Copy,
  Check,
  Download,
  Info,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import {
  PAYLOADS,
  SHELL_PATHS,
  encode,
  type Encoding,
  type Payload,
  type Category,
} from '../../lib/revshell';
import { cn } from '../../lib/cn';

interface State {
  lhost: string;
  lport: string;
  shellPath: string;
  encoding: Encoding;
  selected: Record<Category, string>;
  tab: Category;
}

const STORAGE_KEY = 'pwn:revshell:v2';
const DEFAULT: State = {
  lhost: '10.10.14.1',
  lport: '4444',
  shellPath: '/bin/bash',
  encoding: 'raw',
  selected: { shell: 'bash-tcp', listener: 'nc-listen', tty: 'python-pty' },
  tab: 'shell',
};

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    return { ...DEFAULT, ...p, selected: { ...DEFAULT.selected, ...(p.selected ?? {}) } };
  } catch {
    return DEFAULT;
  }
}

const TAB_DEFS: Array<{ id: Category; label: string; icon: React.ReactNode; description: string }> = [
  { id: 'shell',    label: 'Reverse Shell', icon: <TerminalIcon className="h-4 w-4" />, description: 'Payload que ejecutas en el objetivo' },
  { id: 'listener', label: 'Listener',      icon: <Ear className="h-4 w-4" />,           description: 'Comando que ejecutas en tu máquina' },
  { id: 'tty',      label: 'TTY Upgrade',   icon: <Wand2 className="h-4 w-4" />,         description: 'Para mejorar la shell una vez dentro' },
];

const ENCODINGS: Array<{ id: Encoding; label: string; hint: string }> = [
  { id: 'raw',            label: 'Raw',         hint: 'sin modificar' },
  { id: 'url',            label: 'URL',         hint: 'encodeURIComponent — útil en GET params' },
  { id: 'base64',         label: 'Base64',      hint: 'útil cuando hay caracteres conflictivos' },
  { id: 'powershell-enc', label: 'PS -enc',     hint: 'UTF-16LE base64 — formato `powershell -enc`' },
];

export default function RevShell() {
  const [state, setState] = useState<State>(loadState);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

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

  const allInTab = useMemo(() => PAYLOADS.filter((p) => p.category === state.tab), [state.tab]);
  const filtered = useMemo(() => {
    if (!search) return allInTab;
    const q = search.toLowerCase();
    return allInTab.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.language.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [allInTab, search]);

  const currentId = state.selected[state.tab];
  const current = useMemo(
    () => PAYLOADS.find((p) => p.id === currentId && p.category === state.tab) ?? allInTab[0],
    [currentId, state.tab, allInTab]
  );

  const raw = useMemo(() => (current ? current.generate(ctx) : ''), [current, ctx]);

  // Encoding solo aplica a reverse shells; en listener/tty es raw siempre
  const effectiveEncoding: Encoding = state.tab === 'shell' ? state.encoding : 'raw';
  const out = useMemo(() => encode(raw, effectiveEncoding), [raw, effectiveEncoding]);

  const incPort = (delta: number) =>
    setState((s) => ({
      ...s,
      lport: String(Math.max(1, Math.min(65535, (Number(s.lport) || 0) + delta))),
    }));

  const setTab = (tab: Category) => setState((s) => ({ ...s, tab }));
  const selectPayload = (id: string) =>
    setState((s) => ({ ...s, selected: { ...s.selected, [s.tab]: id } }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* */
    }
  };

  const download = () => {
    const ext = current?.language === 'powershell' ? 'ps1' : current?.language === 'python' ? 'py' : 'sh';
    const blob = new Blob([out], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current?.id ?? 'payload'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header className="space-y-4">
        <Prompt cwd="~/networking" command={`./revshell-gen --lhost ${ctx.lhost} --lport ${ctx.lport}`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent-green/40 bg-accent-green/5">
            <TerminalIcon className="h-6 w-6 text-accent-green" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-fg">Reverse Shell Generator</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed">
              Configura tu listener, elige plantilla y copia. Más de 20 payloads, 4 encodings,
              listeners y TTY upgrades. Todo se guarda en localStorage.
            </p>
          </div>
        </div>
      </header>

      {/* CONFIG BAR */}
      <section className="rounded-xl border border-bg-line bg-bg-card p-5 sm:p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1.5fr]">
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
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-fg-muted">LPORT</label>
            <div className="flex gap-1">
              <button
                onClick={() => incPort(-1)}
                className="rounded-l border border-r-0 border-bg-line bg-bg-soft px-3 text-fg-muted hover:text-accent-blue"
                aria-label="puerto -1"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                value={state.lport}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    lport: e.target.value.replace(/[^\d]/g, '').slice(0, 5),
                  }))
                }
                inputMode="numeric"
                className="flex-1 border border-bg-line bg-bg-soft px-3 py-3 text-center font-mono text-base text-fg focus:border-accent-green/60 focus:outline-none"
                placeholder="4444"
              />
              <button
                onClick={() => incPort(1)}
                className="rounded-r border border-l-0 border-bg-line bg-bg-soft px-3 text-fg-muted hover:text-accent-blue"
                aria-label="puerto +1"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Select
            label="Shell del objetivo"
            name="shell"
            value={state.shellPath}
            onChange={(e) => setState((s) => ({ ...s, shellPath: e.target.value }))}
            options={SHELL_PATHS.map((p) => ({ value: p, label: p }))}
          />
        </div>
      </section>

      {/* TABS */}
      <section>
        <div className="flex flex-wrap gap-1 rounded-xl border border-bg-line bg-bg-card p-1.5">
          {TAB_DEFS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-sm transition flex-1 justify-center sm:flex-initial sm:justify-start',
                state.tab === t.id
                  ? 'bg-accent-green/15 text-accent-green'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-soft'
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-fg-dim flex items-center gap-2 px-1">
          <Info className="h-3 w-3" />
          {TAB_DEFS.find((t) => t.id === state.tab)?.description}
        </p>
      </section>

      {/* PAYLOAD SELECTOR */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wider text-fg-muted">
            Selecciona plantilla <span className="text-fg-dim">({filtered.length}/{allInTab.length})</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="filtrar (bash, python, nc…)"
              className="rounded border border-bg-line bg-bg-soft pl-9 pr-3 py-2 font-mono text-sm text-fg w-64 focus:border-accent-green/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PayloadButton key={p.id} payload={p} selected={p.id === current?.id} onClick={() => selectPayload(p.id)} />
          ))}
          {filtered.length === 0 && (
            <p className="text-fg-dim text-sm col-span-full text-center py-8">Sin resultados para "{search}".</p>
          )}
        </div>
      </section>

      {/* ENCODING (only for reverse shell tab) */}
      {state.tab === 'shell' && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-fg-muted">Encoding</h2>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-bg-line bg-bg-card p-1.5">
            {ENCODINGS.map((e) => (
              <button
                key={e.id}
                onClick={() => setState((s) => ({ ...s, encoding: e.id }))}
                className={cn(
                  'rounded-lg px-3 py-2 font-mono text-sm transition',
                  state.encoding === e.id
                    ? 'bg-accent-blue/15 text-accent-blue'
                    : 'text-fg-muted hover:text-fg hover:bg-bg-soft'
                )}
                title={e.hint}
              >
                {e.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-dim px-1">
            {ENCODINGS.find((e) => e.id === state.encoding)?.hint}
          </p>
        </section>
      )}

      {/* BIG OUTPUT */}
      {current && (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-fg-muted">Payload</h2>
          <div className="rounded-xl border border-bg-line bg-bg-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bg-line bg-bg-soft px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base text-fg font-semibold">{current.name}</span>
                <span className="rounded border border-bg-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted">
                  {current.language}
                </span>
                {state.tab === 'shell' && state.encoding !== 'raw' && (
                  <span className="rounded border border-accent-blue/40 bg-accent-blue/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-blue">
                    {state.encoding}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={download}
                  className="inline-flex items-center gap-1.5 rounded border border-bg-line bg-bg-soft px-3 py-1.5 text-xs text-fg-muted hover:border-accent-blue/50 hover:text-accent-blue transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  descargar
                </button>
                <button
                  onClick={copy}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition',
                    copied
                      ? 'border-accent-green/60 bg-accent-green/10 text-accent-green'
                      : 'border-accent-green/40 bg-accent-green/5 text-accent-green hover:bg-accent-green/15'
                  )}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'copiado' : 'copiar'}
                </button>
              </div>
            </div>
            <pre className="overflow-x-auto px-4 py-5 text-sm leading-relaxed text-accent-green whitespace-pre-wrap break-all min-h-[120px]">
              <code>{out}</code>
            </pre>
            {current.notes && (
              <details className="border-t border-bg-line/60">
                <summary className="cursor-pointer list-none px-4 py-2.5 text-xs text-fg-muted hover:text-fg flex items-center gap-2">
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>notas</span>
                </summary>
                <p className="px-4 pb-3 text-xs text-fg-muted leading-relaxed">
                  <span className="text-accent-yellow">→</span> {current.notes}
                </p>
              </details>
            )}
          </div>
        </section>
      )}

      {/* WARNING */}
      <Terminal title="!! uso ético" className="border-accent-yellow/40">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-accent-yellow flex-shrink-0 mt-0.5" />
          <p className="text-xs text-fg leading-relaxed">
            Usa estos payloads solo en sistemas autorizados: laboratorios propios, CTFs, engagements
            con consentimiento escrito. El acceso no autorizado es delito en la mayoría de jurisdicciones.
          </p>
        </div>
      </Terminal>
    </div>
  );
}

function PayloadButton({
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
        'group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition',
        selected
          ? 'border-accent-green/60 bg-accent-green/10 shadow-glow'
          : 'border-bg-line bg-bg-card hover:border-accent-green/30 hover:bg-bg-soft'
      )}
    >
      <div className="min-w-0">
        <div className={cn('text-sm font-medium truncate', selected ? 'text-accent-green' : 'text-fg')}>
          {payload.name}
        </div>
        <div className="text-[11px] text-fg-dim mt-0.5">{payload.language}</div>
      </div>
      {selected && (
        <span className="text-[10px] uppercase tracking-wider text-accent-green flex-shrink-0">
          ●
        </span>
      )}
    </button>
  );
}
