import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Play,
  FileJson,
  FileText,
  FileCode2,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import CopyButton from '../../components/CopyButton';
import {
  auditWordpress,
  findingsByCategory,
  type AuditResult,
  type Finding,
  type Severity,
} from '../../lib/wpAudit';
import { toMarkdown, toHtml, downloadFile, printHtmlReport, sanitizeFilename } from '../../lib/wpExport';
import { WORKER_URL, HAS_WORKER } from '../../lib/config';
import { cn } from '../../lib/cn';

const STORAGE_KEY = 'pwn:wpaudit:v2';

interface State {
  target: string;
  consent: boolean;
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { target: '', consent: false, ...JSON.parse(raw) };
  } catch {
    /* */
  }
  return { target: '', consent: false };
}

const SEV_STYLE: Record<Severity, { text: string; border: string; bg: string; label: string }> = {
  critical: { text: 'text-accent-red', border: 'border-accent-red/60', bg: 'bg-accent-red/5', label: 'CRÍTICA' },
  high:     { text: 'text-accent-purple', border: 'border-accent-purple/60', bg: 'bg-accent-purple/5', label: 'ALTA' },
  medium:   { text: 'text-accent-yellow', border: 'border-accent-yellow/60', bg: 'bg-accent-yellow/5', label: 'MEDIA' },
  low:      { text: 'text-accent-blue', border: 'border-accent-blue/50', bg: 'bg-accent-blue/5', label: 'BAJA' },
  info:     { text: 'text-fg-muted', border: 'border-bg-line', bg: 'bg-bg-soft', label: 'INFO' },
};

export default function Wordpress() {
  const [state, setState] = useState<State>(loadState);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* */
    }
  }, [state]);

  const canRun = state.target.trim() && state.consent && HAS_WORKER;

  const run = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress('iniciando…');
    try {
      const r = await auditWordpress(WORKER_URL, state.target.trim(), (l) => setProgress(l));
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Prompt cwd="~/cms-audit" command={`./wp-audit ${state.target || '<target>'}`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent-blue/40 bg-accent-blue/5">
            <ShieldAlert className="h-6 w-6 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-fg">WordPress Audit</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed">
              Auditoría 100% pasiva: solo GETs al sitio objetivo, sin enviar credenciales ni
              modificar nada. Sin instalar, sin registrarse.
            </p>
          </div>
        </div>
      </header>

      {!HAS_WORKER && (
        <Terminal title="configuración pendiente" className="border-accent-red/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-accent-red flex-shrink-0 mt-0.5" />
            <div className="text-sm text-fg">
              <p className="font-medium text-accent-red">El Worker no está configurado.</p>
              <p className="mt-1 text-fg-muted">
                La variable <code className="text-accent-yellow">VITE_WORKER_URL</code> no está definida en el build.
                Si eres pwnVader: despliega el Worker (<code>cd worker &amp;&amp; npx wrangler deploy</code>),
                guarda la URL como GitHub Actions secret <code>VITE_WORKER_URL</code> y vuelve a desplegar.
              </p>
            </div>
          </div>
        </Terminal>
      )}

      <Terminal title="!! uso ético" className="border-accent-yellow/40">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-accent-yellow flex-shrink-0 mt-0.5" />
          <p className="text-sm text-fg leading-relaxed">
            <span className="text-accent-yellow font-semibold">
              Usa esto solo en sitios que te pertenecen o donde tengas permiso escrito.
            </span>{' '}
            El acceso no autorizado, incluso pasivo, es delito en la mayoría de jurisdicciones.
          </p>
        </div>
      </Terminal>

      <section className="space-y-5">
        <Input
          label="URL del sitio WordPress"
          name="target"
          value={state.target}
          onChange={(e) => setState((s) => ({ ...s, target: e.target.value }))}
          placeholder="https://mi-sitio.com"
          spellCheck={false}
          autoComplete="off"
          className="text-base py-3"
        />

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={state.consent}
            onChange={(e) => setState((s) => ({ ...s, consent: e.target.checked }))}
            className="mt-0.5 h-4 w-4 accent-accent-green"
          />
          <span className="text-sm text-fg-muted">
            Confirmo que tengo autorización para auditar este sitio.
          </span>
        </label>

        <Button onClick={run} disabled={!canRun || loading} size="lg" className="w-full sm:w-auto">
          <Play className="h-4 w-4" />
          {loading ? progress || 'auditando…' : 'ejecutar auditoría'}
        </Button>
      </section>

      {error && (
        <Terminal title="stderr" className="border-accent-red/40">
          <p className="text-sm text-accent-red whitespace-pre-wrap break-words">{error}</p>
        </Terminal>
      )}

      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }: { result: AuditResult }) {
  const grouped = findingsByCategory(result.findings);
  const sevCounts: Record<Severity, number> = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of result.findings) sevCounts[f.severity]++;

  const fname = sanitizeFilename(result.target) + '_' + Date.now();
  const html = toHtml(result);
  const md = toMarkdown(result);
  const jsonStr = JSON.stringify(result, null, 2);

  return (
    <div className="space-y-8">
      <Terminal title="resumen ejecutivo">
        <div className="grid gap-8 md:grid-cols-[auto_1fr] items-center">
          <ScoreRing score={result.score} label={result.riskLabel} />
          <div className="space-y-3 text-sm">
            <Kv k="Target" v={result.target} mono />
            <Kv k="Score" v={`${result.score} / 100 — ${result.riskLabel}`} />
            <Kv k="Hallazgos" v={String(result.findings.length)} />
            <Kv
              k="Severidades"
              v={(['critical', 'high', 'medium', 'low', 'info'] as Severity[])
                .filter((s) => sevCounts[s] > 0)
                .map((s) => `${SEV_STYLE[s].label}:${sevCounts[s]}`)
                .join('  ·  ') || 'ninguna'}
            />
            <Kv k="Duración" v={`${result.durationMs} ms`} />
            {result.metadata.wpVersion && <Kv k="Versión WP" v={result.metadata.wpVersion} mono />}
            {result.metadata.wafDetected && <Kv k="WAF" v={result.metadata.wafDetected} />}
            {result.metadata.server && <Kv k="Server" v={result.metadata.server} mono />}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-bg-line">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-3">Exportar reporte</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadFile(md, `${fname}.md`, 'text/markdown;charset=utf-8')}>
              <FileText className="h-3.5 w-3.5" />
              Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile(html, `${fname}.html`, 'text/html;charset=utf-8')}>
              <FileCode2 className="h-3.5 w-3.5" />
              HTML
            </Button>
            <Button variant="outline" size="sm" onClick={() => printHtmlReport(html)}>
              <Printer className="h-3.5 w-3.5" />
              PDF (imprimir)
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadFile(jsonStr, `${fname}.json`, 'application/json;charset=utf-8')}>
              <FileJson className="h-3.5 w-3.5" />
              JSON
            </Button>
            <CopyButton value={jsonStr} label="copiar JSON" />
          </div>
          <p className="mt-2 text-[11px] text-fg-dim">
            <span className="text-accent-yellow">tip:</span> el botón PDF abre la versión HTML en una ventana nueva y dispara el diálogo de imprimir. Elige "Guardar como PDF".
          </p>
        </div>
      </Terminal>

      {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((sev) => {
        const list = result.findings.filter((f) => f.severity === sev);
        if (list.length === 0) return null;
        return (
          <section key={sev} className="space-y-3">
            <h2 className={cn('text-sm uppercase tracking-wider font-semibold flex items-center gap-2', SEV_STYLE[sev].text)}>
              <SeverityDot severity={sev} />
              {SEV_STYLE[sev].label} <span className="text-fg-dim">({list.length})</span>
            </h2>
            <div className="grid gap-2.5">
              {list.map((f) => (
                <FindingCard key={f.id} f={f} />
              ))}
            </div>
          </section>
        );
      })}

      {result.findings.length === 0 && (
        <Terminal title="resultado">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent-green" />
            <p className="text-accent-green text-sm">
              Sin hallazgos. El sitio cumple con todos los checks pasivos del scanner.
            </p>
          </div>
        </Terminal>
      )}

      <Terminal title="por categoría">
        <div className="grid gap-2.5 text-xs">
          {(['headers', 'endpoints', 'enum', 'version', 'meta'] as const).map((c) => (
            <div key={c} className="flex justify-between border-b border-bg-line/60 py-2 last:border-0">
              <span className="capitalize text-fg-muted">{c}</span>
              <span className="text-fg">{grouped[c].length} hallazgo{grouped[c].length === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      </Terminal>
    </div>
  );
}

const SEV_DOT: Record<Severity, string> = {
  critical: 'bg-accent-red',
  high: 'bg-accent-purple',
  medium: 'bg-accent-yellow',
  low: 'bg-accent-blue',
  info: 'bg-fg-dim',
};

function SeverityDot({ severity }: { severity: Severity }) {
  return <span className={cn('inline-block h-2 w-2 rounded-full', SEV_DOT[severity])} />;
}

function FindingCard({ f }: { f: Finding }) {
  const sev = SEV_STYLE[f.severity];
  return (
    <details className={cn('rounded-lg border bg-bg-card overflow-hidden transition', sev.border)}>
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-bg-soft/50">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              'rounded px-2 py-0.5 text-[10px] uppercase tracking-wider border font-semibold flex-shrink-0',
              sev.text,
              sev.border
            )}
          >
            {sev.label}
          </span>
          <span className="text-sm text-fg truncate">{f.title}</span>
        </div>
        <span className="text-xs text-fg-dim flex-shrink-0">[{f.category}]</span>
      </summary>
      <div className="border-t border-bg-line px-4 py-4 space-y-3 text-sm">
        <p className="text-fg-muted leading-relaxed">{f.detail}</p>
        {f.evidence && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-fg-dim">evidencia</span>
            <pre className="mt-1 rounded bg-bg-soft p-2.5 text-xs text-accent-green overflow-x-auto whitespace-pre-wrap break-all">
              <code>{f.evidence}</code>
            </pre>
          </div>
        )}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-fg-dim">recomendación</span>
          <p className="mt-1 text-fg leading-relaxed">{f.recommendation}</p>
        </div>
      </div>
    </details>
  );
}

function Kv({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-baseline">
      <span className="text-[11px] uppercase tracking-wider text-fg-muted">{k}</span>
      <span className={cn('text-fg break-all', mono && 'font-mono text-sm')}>{v}</span>
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? '#2bd57c' : score >= 50 ? '#f5c542' : score >= 25 ? '#c678dd' : '#ff5566';
  const circumference = 2 * Math.PI * 42;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative h-40 w-40 mx-auto md:mx-0">
      <svg viewBox="0 0 100 100" className="rotate-[-90deg]">
        <circle cx="50" cy="50" r="42" stroke="#1c2530" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-fg-muted mt-1">{label}</span>
      </div>
    </div>
  );
}
