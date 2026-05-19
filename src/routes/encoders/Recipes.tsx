import { useEffect, useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
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
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent-purple/40 bg-accent-purple/5">
            <Wand2 className="h-6 w-6 text-accent-purple" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-fg">Recipes</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed">
              Encadena operaciones de encoding, decoding, transformación y hashing. Tu input nunca sale
              del navegador.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Textarea
            label="Input"
            name="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />

          <div className="rounded-lg border border-bg-line bg-bg-card">
            <div className="flex items-center justify-between border-b border-bg-line px-3 py-2">
              <span className="text-xs uppercase tracking-wider text-fg-muted">Recipe</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={swapIO} disabled={!output}>
                  ⇅ swap output→input
                </Button>
                <Button variant="ghost" size="sm" onClick={clear} disabled={recipe.length === 0}>
                  clear
                </Button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {recipe.length === 0 && (
                <p className="text-fg-dim text-sm italic">Pasos vacíos — añade operaciones del panel derecho.</p>
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

          <Terminal title={error ? 'stderr' : 'output'}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className={cn('text-xs uppercase tracking-wider', error ? 'text-accent-red' : 'text-fg-muted')}>
                {error ? 'error' : `${output.length} caracteres`}
              </span>
              {!error && output && <CopyButton value={output} />}
            </div>
            <pre className="text-sm leading-relaxed whitespace-pre-wrap break-all text-fg max-h-[400px] overflow-y-auto">
              <code>{error ?? output}</code>
            </pre>
          </Terminal>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-bg-line bg-bg-card sticky top-4">
            <div className="border-b border-bg-line px-3 py-2 text-xs uppercase tracking-wider text-fg-muted">
              Operaciones
            </div>
            <div className="p-2 max-h-[70vh] overflow-y-auto space-y-3">
              {GROUP_ORDER.map((g) => (
                <div key={g}>
                  <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-fg-dim">
                    {GROUP_LABEL[g]}
                  </div>
                  <div className="grid gap-1">
                    {groups[g].map((op) => (
                      <button
                        key={op.id}
                        onClick={() => addStep(op.id)}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-accent-green/10 hover:text-accent-green transition"
                        title={op.description}
                      >
                        <span className="text-accent-green">+</span>
                        <span>{op.name}</span>
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
    <div className="rounded border border-bg-line bg-bg-soft px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-fg-dim font-mono">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-sm text-fg font-medium truncate">{op.name}</span>
          <span className="rounded border border-bg-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted hidden sm:inline">
            {op.group}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onUp} className="p-1 text-fg-muted hover:text-accent-blue" aria-label="subir">↑</button>
          <button onClick={onDown} className="p-1 text-fg-muted hover:text-accent-blue" aria-label="bajar">↓</button>
          <button onClick={onRemove} className="p-1 text-fg-muted hover:text-accent-red" aria-label="quitar">×</button>
        </div>
      </div>
      {op.params && op.params.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {op.params.map((p) => (
            <label key={p.id} className="flex items-center gap-1 text-xs text-fg-muted">
              {p.label}
              <input
                type={p.type === 'number' ? 'number' : 'text'}
                value={step.params?.[p.id] ?? String(p.default)}
                onChange={(e) => onParam(p.id, e.target.value)}
                className="w-20 rounded border border-bg-line bg-bg-card px-2 py-1 text-sm text-fg font-mono focus:border-accent-green/60 focus:outline-none"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
