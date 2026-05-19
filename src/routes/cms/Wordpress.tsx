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
  Copy,
  Check,
  ExternalLink,
  History,
  Trash2,
  ChevronDown,
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
import {
  getSecRefs,
  endpointUrl,
  cveSearchUrl,
  isVersionRelated,
} from '../../lib/wpRefs';
import { toMarkdown, toHtml, downloadFile, printHtmlReport, sanitizeFilename } from '../../lib/wpExport';
import {
  pushAudit,
  clearAuditHistory,
  useAuditHistory,
  relativeTime,
  type AuditEntry,
} from '../../lib/history';
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
  critical: { text: 'text-accent-red', border: 'border-accent-red/40', bg: 'bg-accent-red/5', label: 'CRÍTICA' },
  high:     { text: 'text-accent-purple', border: 'border-accent-purple/40', bg: 'bg-accent-purple/5', label: 'ALTA' },
  medium:   { text: 'text-accent-peach', border: 'border-accent-peach/40', bg: 'bg-accent-peach/5', label: 'MEDIA' },
  low:      { text: 'text-accent-blue', border: 'border-accent-blue/30', bg: 'bg-accent-blue/5', label: 'BAJA' },
  info:     { text: 'text-fg-dim', border: 'border-borderCustom', bg: 'bg-bgSurface', label: 'INFO' },
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
      pushAudit({
        target: r.target,
        findingCount: r.findings.length,
        riskLabel: r.riskLabel,
        score: r.score,
      });
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
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <ShieldAlert className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-fg font-mono tracking-tight">WordPress Audit</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed font-mono">
              Auditoría 100% pasiva: solo GETs al sitio objetivo, sin enviar credenciales ni
              modificar nada. Sin instalar, sin registrarse.
            </p>
          </div>
        </div>
      </header>

      {!HAS_WORKER && (
        <Terminal title="configuración pendiente" className="border-accent-red/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-accent-red flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="text-sm text-fg font-mono">
              <p className="font-medium text-accent-red">El Worker no está configurado.</p>
              <p className="mt-1 text-fg-muted">
                La variable <code className="text-accent-peach font-bold">VITE_WORKER_URL</code> no está definida en el build.
                Si eres pwnVader: despliega el Worker (<code>cd worker &amp;&amp; npx wrangler deploy</code>),
                guarda la URL como GitHub Actions secret <code>VITE_WORKER_URL</code> y vuelve a desplegar.
              </p>
            </div>
          </div>
        </Terminal>
      )}

      <Terminal title="!! uso ético" className="border-accent/40 shadow-glow">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-fg leading-relaxed font-mono">
            <span className="text-accent font-semibold">
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
          className="text-base py-3 font-mono border-borderCustom hover:border-accent/40 transition-all focus:ring-accent/20"
        />

        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={state.consent}
            onChange={(e) => setState((s) => ({ ...s, consent: e.target.checked }))}
            className="h-4 w-4 rounded border-borderCustom bg-bgSurface text-accent focus:ring-accent/40 accent-accent"
          />
          <span className="text-sm text-fg-muted group-hover:text-fg transition font-mono">
            Confirmo que tengo autorización para auditar este sitio.
          </span>
        </label>

        <Button onClick={run} disabled={!canRun || loading} size="lg" className="w-full sm:w-auto font-mono hover:shadow-glow transition-all">
          <Play className="h-4 w-4 fill-current" />
          {loading ? progress || 'auditando…' : 'ejecutar auditoría'}
        </Button>
      </section>

      {loading && (
        <Terminal title="wp-scanner --status=active" className="border-accent/40 shadow-glow">
          <div className="relative p-8 flex flex-col items-center justify-center gap-6 overflow-hidden">
            {/* Radar Animation */}
            <div className="relative w-36 h-36 rounded-full border border-accent/20 flex items-center justify-center">
              {/* Radar sweep */}
              <div className="absolute inset-0 rounded-full border border-accent/40 animate-ping opacity-25" />
              <div className="absolute w-full h-full rounded-full border border-accent/10" />
              <div className="absolute w-2/3 h-2/3 rounded-full border border-accent/20" />
              <div className="absolute w-1/3 h-1/3 rounded-full border border-accent/30" />
              {/* Sweeping radar line */}
              <div className="absolute w-1/2 h-0.5 bg-gradient-to-r from-accent to-transparent origin-left left-1/2 top-1/2 -mt-[1px] animate-[spin_3s_linear_infinite]" />
              <ShieldAlert className="h-12 w-12 text-accent animate-pulse" />
            </div>
            
            <div className="text-center space-y-3 z-10 w-full max-w-md">
              <div className="font-mono text-sm text-accent uppercase tracking-widest animate-pulse font-semibold">
                AUDITORÍA EN PROCESO...
              </div>
              <div className="font-mono text-xs text-fg-muted bg-bg/60 py-2 px-4 rounded border border-borderCustom/60 truncate shadow-inner">
                {progress || 'Analizando estructura del sitio...'}
              </div>
              
              {/* Micro-progress bar */}
              <div className="h-1.5 w-full bg-bgBase rounded-full overflow-hidden border border-borderCustom">
                <div className="h-full bg-accent animate-[pulse_1s_infinite] w-[70%]" />
              </div>
            </div>
          </div>
        </Terminal>
      )}

      {error && (
        <Terminal title="stderr" className="border-accent-red/40">
          <p className="text-sm text-accent-red font-mono whitespace-pre-wrap break-words">{error}</p>
        </Terminal>
      )}

      {result && <ResultView result={result} />}

      <AuditHistoryPanel onRecall={(target) => setState((s) => ({ ...s, target }))} />
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
      <Terminal title="resumen ejecutivo" className="border-borderCustom">
        <div className="grid gap-8 md:grid-cols-[auto_1fr] items-center">
          <ScoreRing score={result.score} label={result.riskLabel} />
          <div className="space-y-3 text-sm font-mono">
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
            {result.metadata.poweredBy && <Kv k="X-Powered-By" v={result.metadata.poweredBy} mono />}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-borderCustom">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted font-mono mb-3">Exportar reporte</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadFile(html, `${fname}.html`, 'text/html;charset=utf-8')}
              className={EXPORT_PRIMARY}
            >
              <FileCode2 className="h-4 w-4" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => printHtmlReport(html)}
              className={EXPORT_PRIMARY}
            >
              <Printer className="h-4 w-4" />
              PDF
            </button>

            <span className="hidden sm:block h-7 w-px bg-borderCustom mx-1" aria-hidden />

            <button
              type="button"
              onClick={() => downloadFile(md, `${fname}.md`, 'text/markdown;charset=utf-8')}
              className={EXPORT_SECONDARY}
            >
              <FileText className="h-4 w-4" />
              Markdown
            </button>
            <button
              type="button"
              onClick={() => downloadFile(jsonStr, `${fname}.json`, 'application/json;charset=utf-8')}
              className={EXPORT_SECONDARY}
            >
              <FileJson className="h-4 w-4" />
              JSON
            </button>
            <CopyButton value={jsonStr} label="copiar JSON" />
          </div>
          <p className="mt-3 text-[11px] text-fg-dim font-mono">
            <span className="text-accent font-semibold">tip:</span> el botón PDF abre la versión HTML en una ventana nueva y dispara el diálogo de imprimir. Elige "Guardar como PDF".
          </p>
        </div>
      </Terminal>

      {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((sev) => {
        const list = result.findings.filter((f) => f.severity === sev);
        if (list.length === 0) return null;
        return (
          <section key={sev} className="space-y-3">
            <h2 className={cn('text-sm uppercase tracking-wider font-semibold font-mono flex items-center gap-2', SEV_STYLE[sev].text)}>
              <SeverityDot severity={sev} />
              {SEV_STYLE[sev].label} <span className="text-fg-dim">({list.length})</span>
            </h2>
            <div className="grid gap-2.5">
              {list.map((f) => (
                <FindingCard
                  key={f.id}
                  f={f}
                  target={result.target}
                  wpVersion={result.metadata.wpVersion}
                />
              ))}
            </div>
          </section>
        );
      })}

      {result.findings.length === 0 && (
        <Terminal title="resultado">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent-green" />
            <p className="text-accent-green text-sm font-mono">
              Sin hallazgos. El sitio cumple con todos los checks pasivos del scanner.
            </p>
          </div>
        </Terminal>
      )}

      <Terminal title="por categoría" className="border-borderCustom">
        <div className="grid gap-2.5 text-xs font-mono">
          {(['headers', 'endpoints', 'enum', 'version', 'meta'] as const).map((c) => (
            <div key={c} className="flex justify-between border-b border-borderCustom/60 py-2 last:border-0">
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
  medium: 'bg-accent-peach',
  low: 'bg-accent-blue',
  info: 'bg-fg-dim',
};

function SeverityDot({ severity }: { severity: Severity }) {
  return <span className={cn('inline-block h-2 w-2 rounded-full', SEV_DOT[severity])} />;
}

function FindingCard({
  f,
  target,
  wpVersion,
}: {
  f: Finding;
  target: string;
  wpVersion: string | null;
}) {
  const sev = SEV_STYLE[f.severity];
  const refs = getSecRefs(f);
  const epUrl = endpointUrl(f, target);
  const showCveLink = !!wpVersion && isVersionRelated(f);
  const showRefsRow = !!refs || showCveLink;

  return (
    <details className={cn('group rounded-lg border bg-bgSurface overflow-hidden transition-all duration-300 hover:border-accent/40', sev.border)}>
      <summary className="cursor-pointer list-none px-4 py-3 hover:bg-bgElevated/30 flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={cn(
              'rounded px-2 py-0.5 text-[10px] uppercase tracking-wider border font-semibold flex-shrink-0 font-mono',
              sev.text,
              sev.border
            )}
          >
            {sev.label}
          </span>
          <span className="text-sm text-fg truncate font-mono font-medium">{f.title}</span>
          {epUrl && <QuickActions url={epUrl} />}
          <span className="text-xs text-fg-dim flex-shrink-0 hidden sm:inline font-mono">[{f.category}]</span>
        </div>
        
        <div className="flex items-center gap-2">
          {showRefsRow && (
            <div className="hidden md:flex flex-wrap items-center gap-1.5">
              {refs?.cwe && (
                <RefBadge
                  href={refs.cwe.url}
                  label={`CWE-${refs.cwe.id}`}
                  title={`CWE-${refs.cwe.id}: ${refs.cwe.title}`}
                />
              )}
              {refs?.owasp && (
                <RefBadge
                  href={refs.owasp.url}
                  label={refs.owasp.id}
                  title={`OWASP Top 10 — ${refs.owasp.title}`}
                />
              )}
              {showCveLink && wpVersion && (
                <RefBadge
                  href={cveSearchUrl(wpVersion)}
                  label={`Buscar CVEs · WP ${wpVersion}`}
                  title={`Búsqueda en NVD para WordPress ${wpVersion}`}
                  accent
                />
              )}
            </div>
          )}
          <ChevronDown className="h-4 w-4 text-fg-dim group-open:rotate-180 transition-transform duration-300 flex-shrink-0" />
        </div>
      </summary>
      
      <div className="border-t border-borderCustom px-4 py-4 space-y-4 text-sm bg-bgBase/40">
        {/* Mobile References */}
        {showRefsRow && (
          <div className="flex md:hidden flex-wrap items-center gap-1.5 pb-2 border-b border-borderCustom/40">
            {refs?.cwe && (
              <RefBadge
                href={refs.cwe.url}
                label={`CWE-${refs.cwe.id}`}
                title={`CWE-${refs.cwe.id}: ${refs.cwe.title}`}
              />
            )}
            {refs?.owasp && (
              <RefBadge
                href={refs.owasp.url}
                label={refs.owasp.id}
                title={`OWASP Top 10 — ${refs.owasp.title}`}
              />
            )}
            {showCveLink && wpVersion && (
              <RefBadge
                href={cveSearchUrl(wpVersion)}
                label={`Buscar CVEs`}
                title={`Búsqueda en NVD para WordPress ${wpVersion}`}
                accent
              />
            )}
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-fg-dim font-mono font-semibold block">Detalle de vulnerabilidad</span>
          <p className="text-fg-muted leading-relaxed font-mono text-xs">{f.detail}</p>
        </div>

        {epUrl && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-fg-dim font-mono font-semibold block">endpoint</span>
            <a
              href={epUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-2 rounded border border-borderCustom bg-bgSurface px-3 py-2 font-mono text-xs text-accent hover:border-accent/60 hover:bg-accent/5 hover:shadow-glow transition-all break-all"
            >
              <span className="truncate">{epUrl}</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70 flex-shrink-0 text-accent" />
            </a>
          </div>
        )}

        {f.evidence && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-fg-dim font-mono font-semibold block">evidencia</span>
            <pre className="mt-1 rounded border border-borderCustom/60 bg-bgBase p-3 text-xs text-accent-green overflow-x-auto whitespace-pre-wrap break-all font-mono custom-scrollbar">
              <code>{f.evidence}</code>
            </pre>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-fg-dim font-mono font-semibold block">recomendación</span>
          <p className="mt-1 text-fg leading-relaxed font-mono text-xs border-l-2 border-accent/40 pl-3 py-0.5">{f.recommendation}</p>
        </div>
      </div>
    </details>
  );
}

function RefBadge({
  href,
  label,
  title,
  accent,
}: {
  href: string;
  label: string;
  title: string;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider transition-all duration-200',
        accent
          ? 'border-accent/40 bg-accent/5 text-accent hover:bg-accent/15 hover:border-accent/60'
          : 'border-borderCustom bg-bgSurface text-fg-dim hover:text-fg hover:border-fg-dim/60'
      )}
    >
      {label}
      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
    </a>
  );
}

function QuickActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div
      className="flex items-center gap-0.5 flex-shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleCopy}
        className="rounded p-1.5 text-fg-dim hover:text-accent-green hover:bg-bgElevated/50 transition-all focus:outline-none focus:ring-1 focus:ring-accent-green/40"
        title={copied ? '¡Copiado!' : 'Copiar URL del endpoint'}
        aria-label="Copiar URL del endpoint"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="rounded p-1.5 text-fg-dim hover:text-accent-blue hover:bg-bgElevated/50 transition-all focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
        title="Abrir endpoint en pestaña nueva"
        aria-label="Abrir endpoint en pestaña nueva"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

const EXPORT_PRIMARY = cn(
  'inline-flex items-center justify-center gap-2 rounded-md font-mono text-sm font-medium',
  'px-4 py-2.5 min-w-[110px]',
  'bg-bgSurface text-fg border border-borderCustom',
  'hover:bg-bgElevated hover:border-accent hover:text-accent shadow-sm',
  'transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/30'
);

const EXPORT_SECONDARY = cn(
  'inline-flex items-center justify-center gap-2 rounded-md font-mono text-sm font-medium',
  'px-4 py-2.5 min-w-[110px]',
  'bg-transparent text-fg-muted border border-borderCustom/60',
  'hover:text-fg hover:border-borderCustom hover:bg-bgSurface/40',
  'transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/30'
);

function Kv({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-baseline">
      <span className="text-[11px] uppercase tracking-widest text-fg-muted font-bold">{k}</span>
      <span className={cn('text-fg break-all', mono && 'font-mono text-sm')}>{v}</span>
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? '#a6e3a1' // Catppuccin Green (Bajo Riesgo)
      : score >= 50
      ? '#74c7ec' // Catppuccin Sapphire (Medio Riesgo)
      : score >= 25
      ? '#cba6f7' // Catppuccin Mauve (Alto Riesgo)
      : '#f38ba8'; // Catppuccin Red (Crítico Riesgo)

  const circumference = 2 * Math.PI * 42;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative h-40 w-40 mx-auto md:mx-0 transition-transform duration-500 hover:scale-105">
      <svg viewBox="0 0 100 100" className="rotate-[-90deg]">
        <circle cx="50" cy="50" r="42" stroke="#313244" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${color}80)`,
            transition: 'stroke-dasharray 1.1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-mono font-bold transition-all duration-500"
          style={{
            color,
            textShadow: `0 0 8px ${color}40`,
          }}
        >
          {score}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-fg-muted mt-1">{label}</span>
      </div>
    </div>
  );
}

// ───────────────────────── history panel ─────────────────────────

const RISK_COLOR: Record<string, string> = {
  Bajo: 'text-accent-green',
  Medio: 'text-accent-peach',
  Alto: 'text-accent-purple',
  Crítico: 'text-accent-red',
};

function AuditHistoryPanel({ onRecall }: { onRecall: (target: string) => void }) {
  const items = useAuditHistory();

  return (
    <section className="rounded-xl border border-borderCustom bg-bgSurface overflow-hidden shadow-sm">
      <details open={items.length > 0} className="group">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-bgElevated/35 transition select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <History className="h-4 w-4 text-fg-dim" />
            <span className="text-sm font-medium text-fg font-mono">Actividad reciente</span>
            <span className="rounded border border-borderCustom bg-bgBase px-2 py-0.5 font-mono text-[10px] text-fg-dim">
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearAuditHistory();
                }}
                className="inline-flex items-center gap-1.5 rounded border border-borderCustom px-2.5 py-1 text-[11px] font-mono text-fg-dim transition-all duration-200 hover:text-accent-red hover:border-accent-red/50 hover:bg-accent-red/5"
                aria-label="borrar historial de auditorías"
              >
                <Trash2 className="h-3 w-3" />
                <span>Borrar</span>
              </button>
            )}
            <ChevronDown className="h-4 w-4 text-fg-dim group-open:rotate-180 transition-transform duration-300" />
          </div>
        </summary>
        <div className="border-t border-borderCustom">
          {items.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-fg-dim font-mono">
              Sin auditorías registradas todavía. Cada escaneo exitoso queda guardado aquí
              (solo en este navegador).
            </p>
          ) : (
            <ul className="divide-y divide-borderCustom/40 bg-bgBase/20">
              {items.map((it) => (
                <AuditHistoryRow key={it.id} entry={it} onRecall={onRecall} />
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}

function AuditHistoryRow({
  entry,
  onRecall,
}: {
  entry: AuditEntry;
  onRecall: (target: string) => void;
}) {
  const riskClass = RISK_COLOR[entry.riskLabel] ?? 'text-fg-dim';
  return (
    <li>
      <button
        type="button"
        onClick={() => onRecall(entry.target)}
        className="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 text-left hover:bg-bgElevated/25 transition-all duration-200 group/row"
        title="usar este target como input"
      >
        <div className="min-w-0">
          <div className="text-sm text-fg font-mono truncate group-hover/row:text-accent transition-colors duration-200">{entry.target}</div>
          <div className="text-[11px] text-fg-dim font-mono mt-1 flex items-center gap-2 flex-wrap">
            <span>{entry.findingCount} hallazgo{entry.findingCount === 1 ? '' : 's'}</span>
            <span className="text-borderCustom">·</span>
            <span className={cn('font-medium', riskClass)}>
              {entry.riskLabel} · {entry.score}/100
            </span>
            <span className="text-borderCustom">·</span>
            <span title={new Date(entry.ts).toLocaleString()}>{relativeTime(entry.ts)}</span>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-fg-dim flex-shrink-0 group-hover/row:text-accent group-hover/row:translate-x-0.5 transition-all duration-200" />
      </button>
    </li>
  );
}
