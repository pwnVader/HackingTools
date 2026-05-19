import { useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Search,
  X,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  Type,
  Hash as HashIcon,
} from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import { cn } from '../../lib/cn';
import {
  HASH_MODES,
  MASK_CHARSETS,
  CATEGORY_LABELS,
  searchModes,
  type HashMode,
  type MaskCharset,
} from '../../lib/hashcatModes';

type AttackMode = '0' | '3' | '6' | '7';

interface MaskBlock {
  id: string;
  /** Símbolo del charset (?l, ?u, ?d, ?s, ?a, ?h, ?H, ?b) o un literal "abc" */
  value: string;
  /** Literal (texto fijo) en vez de charset */
  literal: boolean;
}

const ATTACK_MODES: Array<{ id: AttackMode; label: string; description: string }> = [
  { id: '3', label: '-a 3 · mask', description: 'Brute-force con máscara de charset por posición.' },
  { id: '0', label: '-a 0 · wordlist', description: 'Diccionario directo, sin máscara.' },
  { id: '6', label: '-a 6 · hybrid (W+M)', description: 'Wordlist + máscara al final (ej: word1234).' },
  { id: '7', label: '-a 7 · hybrid (M+W)', description: 'Máscara al inicio + wordlist (ej: 1234word).' },
];

const STORAGE_KEY = 'pwn:hashcat:v1';

interface State {
  modeId: number;
  attack: AttackMode;
  stack: MaskBlock[];
  hashFile: string;
  wordlist: string;
  rulesFile: string;
  outputFile: string;
  workload: '1' | '2' | '3' | '4';
  optimize: boolean;
}

const DEFAULT: State = {
  modeId: 1000, // NTLM por defecto, lo más usado en CTFs
  attack: '3',
  stack: [
    { id: 'd1', value: '?u', literal: false },
    { id: 'd2', value: '?l', literal: false },
    { id: 'd3', value: '?l', literal: false },
    { id: 'd4', value: '?l', literal: false },
    { id: 'd5', value: '?d', literal: false },
    { id: 'd6', value: '?d', literal: false },
    { id: 'd7', value: '?s', literal: false },
  ],
  hashFile: 'hashes.txt',
  wordlist: '/usr/share/wordlists/rockyou.txt',
  rulesFile: '',
  outputFile: 'cracked.txt',
  workload: '3',
  optimize: true,
};

function rid(): string {
  return `b-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed, stack: parsed.stack ?? DEFAULT.stack };
  } catch {
    return DEFAULT;
  }
}

export default function Hashcat() {
  const [state, setState] = useState<State>(loadState);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [literalDraft, setLiteralDraft] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* */
    }
  }, [state]);

  const mode = useMemo(
    () => HASH_MODES.find((m) => m.id === state.modeId) ?? HASH_MODES[0],
    [state.modeId]
  );

  const results = useMemo(() => searchModes(query, 30), [query]);

  const maskString = useMemo(
    () =>
      state.stack
        .map((b) => (b.literal ? b.value : b.value))
        .join(''),
    [state.stack]
  );

  const command = useMemo(() => buildCommand(state, mode, maskString), [state, mode, maskString]);

  const addCharset = (cs: MaskCharset) =>
    setState((s) => ({ ...s, stack: [...s.stack, { id: rid(), value: cs.symbol, literal: false }] }));

  const addLiteral = () => {
    const v = literalDraft.trim();
    if (!v) return;
    setState((s) => ({
      ...s,
      stack: [...s.stack, { id: rid(), value: v, literal: true }],
    }));
    setLiteralDraft('');
  };

  const removeBlock = (id: string) =>
    setState((s) => ({ ...s, stack: s.stack.filter((b) => b.id !== id) }));

  const clearStack = () => setState((s) => ({ ...s, stack: [] }));

  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Prompt cwd="~/cracking" command={`hashcat -m ${mode.id} -a ${state.attack} ...`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <KeyRound className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-textPrimary font-mono tracking-tight">
              Hashcat Mask Builder
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-textSecondary leading-relaxed font-mono">
              Constructor visual de comandos de Hashcat. Busca el módulo (-m) por nombre, arma la
              máscara apilando charsets, y copia el comando listo para ejecutar.
            </p>
          </div>
        </div>
      </header>

      <Terminal title="!! aviso" className="border-accent-peach/40">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-accent-peach flex-shrink-0 mt-0.5" />
          <p className="text-xs text-textPrimary leading-relaxed font-mono">
            Esta herramienta sólo <strong>construye</strong> el comando; nada se ejecuta en el
            navegador. Hashcat tiene que correr en tu máquina con GPU o CPU según corresponda.
          </p>
        </div>
      </Terminal>

      {/* Hash mode picker */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold flex items-center gap-2">
            <HashIcon className="h-4 w-4" />
            Algoritmo
          </h2>
          <span className="text-xs text-textMuted font-mono">
            {HASH_MODES.length} modos catalogados
          </span>
        </div>
        <div className="rounded-xl border border-borderCustom bg-bgSurface">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-bgElevated/40 transition font-mono"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-accent font-bold">
                -m {mode.id}
              </span>
              <span className="text-sm text-textPrimary truncate">{mode.name}</span>
              <span className="text-[10px] text-textMuted uppercase tracking-wider">
                {CATEGORY_LABELS[mode.category]}
              </span>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 text-textMuted transition', pickerOpen && 'rotate-180')}
            />
          </button>
          {pickerOpen && (
            <div className="border-t border-borderCustom">
              <div className="relative px-3 py-2 border-b border-borderCustom/60 bg-bgBase/40">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-textMuted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ntlm, sha256, kerberoast, wordpress…"
                  autoFocus
                  className="w-full bg-transparent pl-7 pr-3 py-1.5 font-mono text-xs text-textPrimary outline-none placeholder:text-textMuted/40"
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-borderCustom/30">
                {results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setState((s) => ({ ...s, modeId: m.id }));
                      setPickerOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'w-full grid grid-cols-[60px_1fr_auto] items-center gap-3 px-4 py-2 text-left hover:bg-bgElevated/40 transition font-mono text-xs',
                      m.id === mode.id && 'bg-accent/10'
                    )}
                  >
                    <span
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-bold text-center',
                        m.id === mode.id
                          ? 'border-accent/60 bg-accent/15 text-accent'
                          : 'border-borderCustom text-textMuted'
                      )}
                    >
                      -m {m.id}
                    </span>
                    <span className="text-textPrimary truncate">{m.name}</span>
                    <span className="text-[10px] text-textMuted uppercase tracking-wider">
                      {CATEGORY_LABELS[m.category]}
                    </span>
                  </button>
                ))}
                {results.length === 0 && (
                  <p className="px-4 py-3 text-xs text-textMuted font-mono text-center">
                    Sin resultados para "{query}".
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Attack mode */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold">
          Modo de ataque
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ATTACK_MODES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setState((s) => ({ ...s, attack: a.id }))}
              className={cn(
                'rounded-lg border p-3 text-left transition font-mono',
                state.attack === a.id
                  ? 'border-accent/60 bg-accent/10 text-accent shadow-glow'
                  : 'border-borderCustom bg-bgSurface text-textPrimary hover:border-accent/40'
              )}
            >
              <div className="text-xs font-bold uppercase tracking-wider">{a.label}</div>
              <div className="text-[11px] text-textMuted mt-1 leading-relaxed">
                {a.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Mask builder (only meaningful when attack uses masks) */}
      {(state.attack === '3' || state.attack === '6' || state.attack === '7') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" />
              Máscara · pila visual
            </h2>
            {state.stack.length > 0 && (
              <button
                type="button"
                onClick={clearStack}
                className="text-[11px] font-mono text-textMuted hover:text-accent-red transition uppercase tracking-wider"
              >
                limpiar pila
              </button>
            )}
          </div>

          {/* Stack visualization */}
          <div className="rounded-xl border border-borderCustom bg-bgSurface p-4 min-h-[80px]">
            {state.stack.length === 0 ? (
              <p className="text-xs text-textMuted font-mono text-center py-3">
                La pila está vacía. Agrega charsets desde los botones de abajo.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {state.stack.map((b, idx) => (
                  <div
                    key={b.id}
                    className={cn(
                      'group relative flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs transition',
                      b.literal
                        ? 'border-accent-peach/40 bg-accent-peach/10 text-accent-peach'
                        : 'border-accent/40 bg-accent/10 text-accent'
                    )}
                  >
                    <span className="text-[9px] text-textMuted/60 font-bold mr-0.5">
                      {idx + 1}
                    </span>
                    <span className="font-bold">{b.value}</span>
                    <button
                      type="button"
                      onClick={() => removeBlock(b.id)}
                      className="opacity-50 hover:opacity-100 hover:text-accent-red transition"
                      title="Quitar bloque"
                      aria-label="quitar bloque"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-borderCustom/40">
              <div className="text-[10px] text-textMuted uppercase tracking-wider font-mono mb-1">
                Máscara resultante
              </div>
              <code className="block font-mono text-sm text-accent break-all">
                {maskString || '(vacía)'}
              </code>
            </div>
          </div>

          {/* Charset buttons */}
          <div>
            <div className="text-[10px] text-textMuted uppercase tracking-wider font-mono mb-2">
              Charsets disponibles
            </div>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
              {MASK_CHARSETS.map((cs) => (
                <button
                  key={cs.symbol}
                  type="button"
                  onClick={() => addCharset(cs)}
                  title={cs.description}
                  className="rounded-md border border-borderCustom bg-bgSurface px-3 py-2.5 text-left transition font-mono hover:border-accent/50 hover:bg-accent/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-accent">{cs.symbol}</span>
                    <span className="text-[10px] text-textMuted uppercase tracking-wider">
                      {cs.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-textSecondary mt-0.5">{cs.preview}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Literal block builder */}
          <div className="rounded-md border border-borderCustom/60 bg-bgSurface p-3">
            <div className="text-[10px] text-textMuted uppercase tracking-wider font-mono mb-2">
              Bloque literal (texto fijo en la máscara)
            </div>
            <div className="flex gap-2">
              <input
                value={literalDraft}
                onChange={(e) => setLiteralDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLiteral();
                  }
                }}
                placeholder="ej: P@ss"
                className="flex-1 rounded border border-borderCustom bg-bgBase px-3 py-1.5 font-mono text-xs text-textPrimary outline-none focus:border-accent/60"
              />
              <button
                type="button"
                onClick={addLiteral}
                disabled={!literalDraft.trim()}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition',
                  literalDraft.trim()
                    ? 'border-accent-peach/60 bg-accent-peach/10 text-accent-peach hover:bg-accent-peach/20'
                    : 'border-borderCustom text-textMuted/50 cursor-not-allowed'
                )}
              >
                <Plus className="h-3 w-3" />
                Añadir
              </button>
            </div>
            <p className="text-[10px] text-textMuted mt-2 font-mono leading-relaxed">
              Útil para passwords con un prefijo o sufijo conocido (ej: "Verano" + ?d?d?d?d).
            </p>
          </div>
        </section>
      )}

      {/* Files + options */}
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold">
          Archivos y opciones
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FileInput
            label="Archivo de hashes (-)"
            value={state.hashFile}
            onChange={(v) => setState((s) => ({ ...s, hashFile: v }))}
            placeholder="hashes.txt"
          />
          {(state.attack === '0' || state.attack === '6' || state.attack === '7') && (
            <FileInput
              label="Wordlist"
              value={state.wordlist}
              onChange={(v) => setState((s) => ({ ...s, wordlist: v }))}
              placeholder="/usr/share/wordlists/rockyou.txt"
            />
          )}
          <FileInput
            label="Rules file (-r) · opcional"
            value={state.rulesFile}
            onChange={(v) => setState((s) => ({ ...s, rulesFile: v }))}
            placeholder="/usr/share/hashcat/rules/best64.rule"
          />
          <FileInput
            label="Output (-o)"
            value={state.outputFile}
            onChange={(v) => setState((s) => ({ ...s, outputFile: v }))}
            placeholder="cracked.txt"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-textMuted uppercase tracking-wider font-mono">
              Workload
            </label>
            <div className="flex">
              {(['1', '2', '3', '4'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, workload: w }))}
                  className={cn(
                    'px-2.5 py-1 font-mono text-xs border transition',
                    state.workload === w
                      ? 'bg-accent/10 border-accent/60 text-accent'
                      : 'border-borderCustom text-textMuted hover:text-textPrimary',
                    w === '1' && 'rounded-l',
                    w === '4' && 'rounded-r',
                    w !== '1' && '-ml-px'
                  )}
                >
                  -w {w}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.optimize}
              onChange={(e) => setState((s) => ({ ...s, optimize: e.target.checked }))}
              className="h-3.5 w-3.5 accent-accent"
            />
            <span className="text-[11px] text-textSecondary font-mono uppercase tracking-wider">
              -O (optimized kernels)
            </span>
          </label>
        </div>
      </section>

      {/* Output command */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold">
            Comando generado
          </h2>
          <button
            type="button"
            onClick={copy}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-sm font-medium border transition',
              copied
                ? 'border-accent-green/60 bg-accent-green/10 text-accent-green'
                : 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20'
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
        <pre className="rounded-xl border-2 border-accent/40 bg-bgSurface px-5 py-5 font-mono text-sm text-accent overflow-x-auto whitespace-pre-wrap break-all shadow-glow">
          <code>{command}</code>
        </pre>
        {mode.example && (
          <div className="rounded-md border-l-2 border-accent-peach/60 bg-accent-peach/5 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-accent-peach font-bold mb-0.5 font-mono">
              Ejemplo de hash · -m {mode.id}
            </div>
            <code className="text-[11px] text-textSecondary font-mono break-all">
              {mode.example}
            </code>
          </div>
        )}
      </section>
    </div>
  );
}

function FileInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-textMuted font-mono font-semibold">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-borderCustom bg-bgSurface px-3 py-2 font-mono text-xs text-textPrimary outline-none focus:border-accent/60 transition"
      />
    </div>
  );
}

function buildCommand(state: State, mode: HashMode, mask: string): string {
  const parts: string[] = ['hashcat'];
  parts.push(`-m ${mode.id}`);
  parts.push(`-a ${state.attack}`);
  parts.push(`-w ${state.workload}`);
  if (state.optimize) parts.push('-O');
  if (state.outputFile) parts.push(`-o ${state.outputFile}`);
  if (state.rulesFile) parts.push(`-r ${state.rulesFile}`);
  parts.push(state.hashFile || 'hashes.txt');

  if (state.attack === '0') {
    parts.push(state.wordlist || '/usr/share/wordlists/rockyou.txt');
  } else if (state.attack === '3') {
    parts.push(mask || '?a?a?a?a?a?a?a?a');
  } else if (state.attack === '6') {
    parts.push(state.wordlist || '/usr/share/wordlists/rockyou.txt');
    parts.push(mask || '?d?d?d?d');
  } else if (state.attack === '7') {
    parts.push(mask || '?d?d?d?d');
    parts.push(state.wordlist || '/usr/share/wordlists/rockyou.txt');
  }

  return parts.join(' ');
}
