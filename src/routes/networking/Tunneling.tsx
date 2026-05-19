import { useEffect, useMemo, useState } from 'react';
import {
  Workflow,
  Server,
  Network as NetworkIcon,
  Target,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import { cn } from '../../lib/cn';
import {
  PIVOT_TOOLS,
  buildPlan,
  type PivotContext,
  type PivotTool,
} from '../../lib/pivoting';

const STORAGE_KEY = 'pwn:tunneling:v1';

interface State {
  tool: PivotTool;
  ctx: PivotContext;
}

const DEFAULT: State = {
  tool: 'chisel',
  ctx: {
    kaliIp: '10.10.14.1',
    kaliPort: '8443',
    pivotUser: 'lowpriv',
    pivotIp: '10.10.10.50',
    targetNet: '172.16.50.0/24',
    targetPort: '80',
    socksPort: '1080',
  },
};

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    return { ...DEFAULT, ...p, ctx: { ...DEFAULT.ctx, ...(p.ctx ?? {}) } };
  } catch {
    return DEFAULT;
  }
}

export default function Tunneling() {
  const [state, setState] = useState<State>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* */
    }
  }, [state]);

  const plan = useMemo(() => buildPlan(state.tool, state.ctx), [state.tool, state.ctx]);
  const currentTool = PIVOT_TOOLS.find((t) => t.id === state.tool) ?? PIVOT_TOOLS[0];

  const setField = (key: keyof PivotContext, value: string) =>
    setState((s) => ({ ...s, ctx: { ...s.ctx, [key]: value } }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <Prompt
          cwd="~/networking/tunneling"
          command={`./pivoting-architect --tool ${currentTool.shortLabel}`}
        />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <Workflow className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-textPrimary font-mono tracking-tight">
              Pivoting Architect
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-textSecondary leading-relaxed font-mono">
              Diseña tu flujo de tunneling visualmente. Define Kali → Pivot → Target, elige la
              herramienta (Chisel, SSH, Ligolo) y obtén los comandos exactos para cada nodo.
            </p>
          </div>
        </div>
      </header>

      {/* Tool tabs */}
      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {PIVOT_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setState((s) => ({ ...s, tool: t.id }))}
              className={cn(
                'rounded-md px-3 py-2 font-mono text-xs font-medium uppercase tracking-wider border transition',
                state.tool === t.id
                  ? 'border-accent/60 bg-accent/10 text-accent shadow-glow'
                  : 'border-borderCustom bg-bgSurface text-textSecondary hover:text-textPrimary hover:border-accent/30'
              )}
            >
              {t.shortLabel}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-textMuted font-mono leading-relaxed flex items-center gap-2">
          <Info className="h-3 w-3" />
          {currentTool.description}
        </p>
      </section>

      {/* 3-column flow: Kali → Pivot → Target */}
      <section className="grid gap-3 md:grid-cols-3">
        <NodeCard
          title="Kali"
          subtitle="Atacante"
          color="green"
          icon={<Server className="h-4 w-4" />}
        >
          <Field
            label="IP / hostname"
            value={state.ctx.kaliIp}
            onChange={(v) => setField('kaliIp', v)}
            placeholder="10.10.14.1"
          />
          <Field
            label="Puerto listener"
            value={state.ctx.kaliPort}
            onChange={(v) => setField('kaliPort', v)}
            placeholder="8443"
          />
          <Field
            label="Puerto SOCKS local"
            value={state.ctx.socksPort}
            onChange={(v) => setField('socksPort', v)}
            placeholder="1080"
          />
        </NodeCard>

        <NodeCard
          title="Pivot"
          subtitle="Máquina intermedia"
          color="peach"
          icon={<NetworkIcon className="h-4 w-4" />}
        >
          <Field
            label="Usuario SSH"
            value={state.ctx.pivotUser}
            onChange={(v) => setField('pivotUser', v)}
            placeholder="lowpriv"
          />
          <Field
            label="IP del pivot"
            value={state.ctx.pivotIp}
            onChange={(v) => setField('pivotIp', v)}
            placeholder="10.10.10.50"
          />
        </NodeCard>

        <NodeCard
          title="Target"
          subtitle="Red interna"
          color="red"
          icon={<Target className="h-4 w-4" />}
        >
          <Field
            label="Red / IP target"
            value={state.ctx.targetNet}
            onChange={(v) => setField('targetNet', v)}
            placeholder="172.16.50.0/24"
          />
          <Field
            label="Puerto target"
            value={state.ctx.targetPort}
            onChange={(v) => setField('targetPort', v)}
            placeholder="80"
          />
        </NodeCard>
      </section>

      {/* Dual output: Kali commands + Pivot commands */}
      <section className="grid gap-3 lg:grid-cols-2">
        <OutputBlock
          title="Ejecutar en Kali"
          subtitle="Tu máquina"
          accent="green"
          lines={plan.kaliCmds}
        />
        <OutputBlock
          title="Ejecutar en Pivot"
          subtitle="Máquina intermedia"
          accent="peach"
          lines={plan.pivotCmds}
        />
      </section>

      {/* Usage block */}
      {plan.usage.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-textMuted font-mono font-semibold">
            Cómo usar el túnel
          </h2>
          <OutputBlock title="Tras establecer el túnel" subtitle="En Kali" accent="mauve" lines={plan.usage} />
        </section>
      )}

      <Terminal title="!! nota operativa" className="border-accent-peach/40">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-accent-peach flex-shrink-0 mt-0.5" />
          <p className="text-xs text-textPrimary leading-relaxed font-mono">{plan.notes}</p>
        </div>
      </Terminal>
    </div>
  );
}

// ─────────────────────────── sub-components ───────────────────────────

function NodeCard({
  title,
  subtitle,
  color,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  color: 'green' | 'peach' | 'red';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const palette = {
    green: { border: 'border-accent-green/40', text: 'text-accent-green', bg: 'bg-accent-green/5' },
    peach: { border: 'border-accent-peach/40', text: 'text-accent-peach', bg: 'bg-accent-peach/5' },
    red: { border: 'border-accent-red/40', text: 'text-accent-red', bg: 'bg-accent-red/5' },
  }[color];

  return (
    <div className={cn('rounded-xl border-2 bg-bgSurface p-4 space-y-3', palette.border)}>
      <div className="flex items-center gap-2">
        <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-md border', palette.border, palette.bg, palette.text)}>
          {icon}
        </span>
        <div>
          <div className={cn('text-sm font-bold font-mono uppercase tracking-wider', palette.text)}>
            {title}
          </div>
          <div className="text-[10px] text-textMuted font-mono uppercase tracking-wider">
            {subtitle}
          </div>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({
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
        spellCheck={false}
        autoComplete="off"
        className="rounded border border-borderCustom bg-bgBase px-3 py-2 font-mono text-xs text-textPrimary outline-none focus:border-accent/60 transition"
      />
    </div>
  );
}

function OutputBlock({
  title,
  subtitle,
  accent,
  lines,
}: {
  title: string;
  subtitle: string;
  accent: 'green' | 'peach' | 'mauve';
  lines: string[];
}) {
  const [copied, setCopied] = useState(false);
  const palette = {
    green: { border: 'border-accent-green/40', text: 'text-accent-green', bg: 'bg-accent-green/5' },
    peach: { border: 'border-accent-peach/40', text: 'text-accent-peach', bg: 'bg-accent-peach/5' },
    mauve: { border: 'border-accent/40', text: 'text-accent', bg: 'bg-accent/5' },
  }[accent];

  const fullText = lines.join('\n');

  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={cn('rounded-xl border-2 bg-bgSurface overflow-hidden', palette.border)}>
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b px-4 py-2.5',
          palette.border,
          palette.bg
        )}
      >
        <div>
          <div className={cn('text-sm font-bold font-mono uppercase tracking-wider', palette.text)}>
            {title}
          </div>
          <div className="text-[10px] text-textMuted font-mono uppercase tracking-wider mt-0.5">
            {subtitle}
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs font-medium transition',
            copied
              ? 'border-accent-green/60 bg-accent-green/15 text-accent-green'
              : `${palette.border} ${palette.text} hover:bg-bgElevated/40`
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="px-4 py-3 font-mono text-xs text-textPrimary overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        <code>{fullText}</code>
      </pre>
    </div>
  );
}
