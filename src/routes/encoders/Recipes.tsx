import { useEffect, useMemo, useState } from 'react';
import { Wand2, ArrowUp, ArrowDown, Trash2, Plus, GripVertical } from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Textarea from '../../components/ui/Textarea';
import CopyButton from '../../components/CopyButton';
import Button from '../../components/ui/Button';
import { OPS, OP_INDEX, runRecipe, type OpId, type RecipeStep, type OpDef } from '../../lib/encoders';
import { cn } from '../../lib/cn';

const STORAGE_KEY = 'pwn:recipes:v1';

const GROUP_ORDER: OpDef['group'][] = ['encode', 'decode', 'transform', 'hash', 'inspect'];
const GROUP_LABEL: Record<OpDef['group'], string> = {
  encode: 'Encode',
  decode: 'Decode',
  transform: 'Transform',
  hash: 'Hash',
  inspect: 'Inspect',
};

export default function Recipes() {
  const [input, setInput] = useState<string>('hola pwnVader');
  const [recipe, setRecipe] = useState<RecipeStep[]>([{ id: 'b64-encode' }]);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj.input !== undefined) setInput(obj.input);
        if (Array.isArray(obj.recipe)) setRecipe(obj.recipe);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // save
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ input, recipe }));
    } catch {
      /* ignore */
    }
  }, [input, recipe]);

  // run
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = await runRecipe(input, recipe);
        if (!cancelled) {
          setOutput(out);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setOutput('');
          setError(e instanceof Error ? e.message : 'Error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input, recipe]);

  const groups = useMemo(() => {
    const out: Record<OpDef['group'], OpDef[]> = {
      encode: [],
      decode: [],
      transform: [],
      hash: [],
      inspect: [],
    };
    for (const op of OPS) out[op.group].push(op);
    return out;
  }, []);

  const addStep = (id: OpId) => {
    const op = OP_INDEX[id];
    const params = op.params?.reduce<Record<string, string>>(
      (acc, p) => ({ ...acc, [p.id]: String(p.default) }),
      {}
    );
    setRecipe((r) => [...r, { id, params }]);
  };

  const removeStep = (idx: number) =>
    setRecipe((r) => r.filter((_, i) => i !== idx));

  const moveStep = (idx: number, dir: -1 | 1) =>
    setRecipe((r) => {
      const next = [...r];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return r;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });

  const updateParam = (idx: number, key: string, value: string) =>
    setRecipe((r) =>
      r.map((step, i) => (i === idx ? { ...step, params: { ...step.params, [key]: value } } : step))
    );

  const clear = () => setRecipe([]);
  const swapIO = () => {
    setInput(output);
    setRecipe([]);
  };

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Prompt cwd="~/encoders" command={`./recipes  # ${recipe.length} pasos`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <Wand2 className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-fg font-mono tracking-tight">Recipes</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed font-mono">
              Encadena operaciones de encoding, decoding, transformación y hashing. Tu input nunca sale
              del navegador.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Textarea
            label="Input"
            name="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="font-mono text-sm border-borderCustom hover:border-accent/40 focus:ring-accent/20 transition-all"
          />

          <div className="rounded-xl border border-borderCustom bg-bgSurface overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-borderCustom px-4 py-3 bg-bgElevated/10">
              <span className="text-xs uppercase tracking-widest text-fg font-mono font-bold">Recipe Steps</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={swapIO} disabled={!output} className="font-mono text-xs hover:border-accent hover:text-accent transition-all duration-200">
                  ⇅ swap output→input
                </Button>
                <Button variant="ghost" size="sm" onClick={clear} disabled={recipe.length === 0} className="font-mono text-xs hover:bg-accent-red/5 hover:text-accent-red transition-all duration-200">
                  clear
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3 bg-bgBase/20">
              {recipe.length === 0 && (
                <p className="text-fg-dim text-xs font-mono italic text-center py-6">Pasos vacíos — añade operaciones del panel derecho.</p>
              )}
              {recipe.map((step, idx) => (
                <StepCard
                  key={idx}
                  index={idx}
                  step={step}
                  op={OP_INDEX[step.id]}
                  onRemove={() => removeStep(idx)}
                  onUp={() => moveStep(idx, -1)}
                  onDown={() => moveStep(idx, 1)}
                  onParam={(k, v) => updateParam(idx, k, v)}
                />
              ))}
            </div>
          </div>

          <Terminal title={error ? 'stderr' : 'output'} className={cn(error ? 'border-accent-red/40' : 'border-borderCustom')}>
            <div className="flex items-start justify-between gap-3 mb-2 font-mono">
              <span className={cn('text-xs uppercase tracking-wider font-semibold', error ? 'text-accent-red' : 'text-accent')}>
                {error ? 'error' : `${output.length} caracteres`}
              </span>
              {!error && output && <CopyButton value={output} />}
            </div>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap break-all text-fg max-h-[400px] overflow-y-auto font-mono custom-scrollbar pr-2">
              <code>{error ?? output}</code>
            </pre>
          </Terminal>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-borderCustom bg-bgSurface sticky top-4 overflow-hidden shadow-sm">
            <div className="border-b border-borderCustom px-4 py-3 text-xs uppercase tracking-widest text-fg font-mono font-bold bg-bgElevated/20">
              Operaciones
            </div>
            <div className="p-3 max-h-[70vh] overflow-y-auto space-y-4 custom-scrollbar">
              {GROUP_ORDER.map((g) => (
                <div key={g} className="space-y-1.5">
                  <div className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-accent border-l border-accent/40">
                    {GROUP_LABEL[g]}
                  </div>
                  <div className="grid gap-1">
                    {groups[g].map((op) => (
                      <button
                        key={op.id}
                        onClick={() => addStep(op.id)}
                        className="flex items-center justify-between w-full rounded px-2.5 py-1.5 text-left text-xs font-mono text-fg-muted hover:bg-accent/5 hover:text-accent hover:border-accent/30 border border-transparent transition-all duration-200 group/btn"
                        title={op.description}
                      >
                        <span className="truncate">{op.name}</span>
                        <Plus className="h-3.5 w-3.5 text-fg-dim group-hover/btn:text-accent transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface StepCardProps {
  index: number;
  step: RecipeStep;
  op: OpDef;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  onParam: (key: string, value: string) => void;
}

function StepCard({ index, step, op, onRemove, onUp, onDown, onParam }: StepCardProps) {
  return (
    <div className="rounded-lg border border-borderCustom bg-bgSurface hover:border-accent/40 px-4 py-3.5 transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <GripVertical className="h-4 w-4 text-fg-dim/40 cursor-grab flex-shrink-0" />
          <span className="text-xs text-fg-dim font-mono">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-sm text-fg font-mono font-semibold truncate">{op.name}</span>
          <span className="rounded border border-borderCustom bg-bgBase px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-fg-dim hidden sm:inline">
            {op.group}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onUp}
            className="p-1 rounded text-fg-dim hover:text-accent hover:bg-bgElevated/50 transition-all duration-200 active:scale-90"
            title="Subir"
            aria-label="subir"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDown}
            className="p-1 rounded text-fg-dim hover:text-accent hover:bg-bgElevated/50 transition-all duration-200 active:scale-90"
            title="Bajar"
            aria-label="bajar"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded text-fg-dim hover:text-accent-red hover:bg-accent-red/5 transition-all duration-200 active:scale-90"
            title="Quitar"
            aria-label="quitar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      
      {op.params && op.params.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-borderCustom/30 pt-3">
          {op.params.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs font-mono text-fg-dim">
              <span>{p.label}:</span>
              <input
                type={p.type === 'number' ? 'number' : 'text'}
                value={step.params?.[p.id] ?? String(p.default)}
                onChange={(e) => onParam(p.id, e.target.value)}
                className="w-28 rounded border border-borderCustom bg-bgBase px-2.5 py-1 text-xs text-fg font-mono focus:border-accent/80 focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-200"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
