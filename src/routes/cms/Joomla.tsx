import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Play,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  History,
  Trash2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import Prompt from '../../components/Prompt';
import Terminal from '../../components/Terminal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { auditJoomla, type AuditResult, type Finding, type Severity } from '../../lib/joomlaAudit';
import { WORKER_URL, HAS_WORKER } from '../../lib/config';
import { cn } from '../../lib/cn';
import { pushAudit, clearAuditHistory, useAuditHistory, relativeTime, type AuditEntry } from '../../lib/history';

const STORAGE_KEY = 'pwn:joomlaaudit:v1';

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
  medium:   { text: 'text-accent-sapphire', border: 'border-accent-sapphire/40', bg: 'bg-accent-sapphire/5', label: 'MEDIA' },
  low:      { text: 'text-accent-blue', border: 'border-accent-blue/30', bg: 'bg-accent-blue/5', label: 'BAJA' },
  info:     { text: 'text-fg-dim', border: 'border-borderCustom', bg: 'bg-bgSurface', label: 'INFO' },
};

export default function Joomla() {
  const [state, setState] = useState<State>(loadState);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const history = useAuditHistory();

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
      const r = await auditJoomla(WORKER_URL, state.target.trim(), (l) => setProgress(l));
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

  const exportMarkdown = () => {
    if (!result) return;
    let md = `# Reporte de Auditoría Joomla - ${result.target}\n\n`;
    md += `- **Fecha:** ${new Date(result.startedAt).toLocaleString()}\n`;
    md += `- **Score de Seguridad:** ${result.score}/100 (${result.riskLabel})\n`;
    md += `- **Versión Joomla:** ${result.metadata.joomlaVersion || 'No detectada'}\n`;
    md += `- **HTTPS habilitado:** ${result.metadata.isHttps ? 'Sí' : 'No'}\n\n`;
    md += `## Hallazgos (${result.findings.length})\n\n`;
    result.findings.forEach((f, i) => {
      md += `### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}\n`;
      md += `- **Categoría:** ${f.category}\n`;
      md += `- **Detalle:** ${f.detail}\n`;
      md += `- **Recomendación:** ${f.recommendation}\n`;
      if (f.evidence) md += `- **Evidencia:** \`${f.evidence}\`\n`;
      md += `\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `joomla_audit_${result.target.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <Prompt cwd="~/cms-audit" command={`./joomla-audit ${state.target || '<target>'}`} />
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 shadow-glow">
            <ShieldAlert className="h-6 w-6 text-accent animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-fg font-mono tracking-tight">Joomla Audit</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted leading-relaxed font-mono">
              Auditoría pasiva serverless: analizamos la seguridad expuesta de tu sitio Joomla (archivos de configuración expuestos, cabeceras HTTP y leaks estructurales) de forma ética.
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
                La variable <code className="text-accent font-bold">VITE_WORKER_URL</code> no está definida.
                Despliega el Worker (<code>cd worker && npx wrangler deploy</code>) e inyéctala para habilitar los análisis.
              </p>
            </div>
          </div>
        </Terminal>
      )}

      <Terminal title="!! uso ético" className="border-accent/40 shadow-glow">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-fg leading-relaxed font-mono">
            <strong>Declaración de Consentimiento Obligatoria:</strong> Al ingresar un objetivo y lanzar
            la auditoría, confirmas que eres propietario del sitio o tienes autorización explícita para
            inspeccionarlo. Este sitio recopila cabeceras y archivos expuestos públicamente de manera pasiva.
          </p>
        </div>
      </Terminal>

      {/* Control Panel */}
      <Terminal title="joomla-scanner --dashboard">
        <div className="grid gap-6 md:grid-cols-12 items-end">
          <div className="md:col-span-6 space-y-2">
            <Input
              label="URL Objetivo (Target)"
              placeholder="ejemplo.com o https://ejemplo.com"
              value={state.target}
              onChange={(e) => setState((s) => ({ ...s, target: e.target.value }))}
              disabled={loading}
            />
          </div>
          <div className="md:col-span-4 flex items-center h-10 select-none">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.consent}
                onChange={(e) => setState((s) => ({ ...s, consent: e.target.checked }))}
                className="h-4.5 w-4.5 rounded border-borderCustom bg-bg-soft text-accent focus:ring-accent/30"
                disabled={loading}
              />
              <span className="text-xs text-textSecondary font-mono uppercase tracking-wider group-hover:text-textPrimary transition">
                Tengo autorización
              </span>
            </label>
          </div>
          <div className="md:col-span-2">
            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              disabled={!canRun || loading}
              onClick={run}
            >
              <Play className="h-4 w-4" />
              <span>SCAN</span>
            </Button>
          </div>
        </div>
      </Terminal>

      {/* Progress & Scanning Radar */}
      {loading && (
        <Terminal title="joomla-audit --status=active" className="border-accent/40 shadow-glow">
          <div className="relative p-8 flex flex-col items-center justify-center gap-6 overflow-hidden">
            <div className="relative w-36 h-36 rounded-full border border-accent/20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-accent/40 animate-ping opacity-25" />
              <div className="absolute w-full h-full rounded-full border border-accent/10" />
              <div className="absolute w-2/3 h-2/3 rounded-full border border-accent/20" />
              <div className="absolute w-1/3 h-1/3 rounded-full border border-accent/30" />
              <div className="absolute w-1/2 h-0.5 bg-gradient-to-r from-accent to-transparent origin-left left-1/2 top-1/2 -mt-[1px] animate-[spin_3s_linear_infinite]" />
              <ShieldAlert className="h-12 w-12 text-accent animate-pulse" />
            </div>
            
            <div className="text-center space-y-3 z-10 w-full max-w-md">
              <div className="font-mono text-sm text-accent uppercase tracking-widest animate-pulse font-semibold">
                AUDITANDO JOOMLA...
              </div>
              <div className="font-mono text-xs text-fg-muted bg-bg/60 py-2 px-4 rounded border border-borderCustom/60 truncate shadow-inner">
                {progress || 'Analizando estructura del sitio...'}
              </div>
              <div className="h-1.5 w-full bg-bgBase rounded-full overflow-hidden border border-borderCustom">
                <div className="h-full bg-accent animate-[pulse_1s_infinite] w-[80%]" />
              </div>
            </div>
          </div>
        </Terminal>
      )}

      {error && (
        <Terminal title="joomla-scanner --error" className="border-accent-red/40 shadow-glowRed">
          <div className="flex items-start gap-3 text-accent-red">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="font-mono text-sm">
              <p className="font-bold">Error durante la auditoría:</p>
              <p className="mt-1 text-textSecondary">{error}</p>
            </div>
          </div>
        </Terminal>
      )}

      {/* Results view */}
      {result && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Summary */}
          <Terminal title="joomla-scanner --resumen" className="border-borderCustom">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] items-center">
              <div className="flex justify-center">
                <ScoreRing score={result.score} label={result.riskLabel} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono">
                <div className="space-y-3">
                  <MetaRow k="Objetivo" v={result.target} />
                  <MetaRow k="Joomla Core Version" v={result.metadata.joomlaVersion || 'No detectada'} accent={!!result.metadata.joomlaVersion} />
                  <MetaRow k="Duración" v={`${result.durationMs}ms`} />
                </div>
                <div className="space-y-3">
                  <MetaRow k="SSL/HTTPS" v={result.metadata.isHttps ? 'Habilitado' : 'No Habilitado'} />
                  <MetaRow k="Powered By" v={result.metadata.poweredBy || 'Exposición Oculta'} />
                  <MetaRow k="Hallazgos" v={`${result.findings.length} problemas expuestos`} />
                </div>
              </div>
            </div>
          </Terminal>

          {/* Export and action toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={exportMarkdown} className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <span>Exportar Reporte (.MD)</span>
            </Button>
            <div className="ml-auto text-xs text-textMuted font-mono">
              Finalizado a las {new Date(result.finishedAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Findings List */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-fg font-mono uppercase tracking-widest">
                Hallazgos Estructurales
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-bgElevated border border-borderCustom text-textPrimary font-semibold">
                {result.findings.length}
              </span>
            </div>

            {result.findings.length === 0 ? (
              <Terminal title="joomla --findings=clear" className="border-accent-green/30">
                <div className="flex items-start gap-3 text-accent-green">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="font-mono text-sm">
                    <p className="font-bold">¡Ningún problema expuesto detectado de forma pasiva!</p>
                    <p className="mt-1 text-textSecondary">
                      El sitio responde de forma hermética a los escaneos superficiales.
                    </p>
                  </div>
                </div>
              </Terminal>
            ) : (
              <div className="space-y-4">
                {result.findings.map((f) => {
                  const style = SEV_STYLE[f.severity];
                  return (
                    <FindingItem key={f.id} finding={f} style={style} target={result.target} />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* History */}
      {history.length > 0 && !loading && (
        <section className="space-y-4 pt-6 border-t border-borderCustom/40">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-fg font-mono uppercase tracking-wider flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-accent" />
              <span>Historial Joomla</span>
            </h3>
            <Button
              variant="outline"
              className="px-2.5 py-1 text-[10px] text-accent-red hover:bg-accent-red/10 border-accent-red/20"
              onClick={() => clearAuditHistory()}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpiar Historial
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h: AuditEntry, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-borderCustom bg-bgSurface/60 space-y-2 hover:border-accent/40 transition cursor-pointer font-mono text-xs"
                onClick={() => {
                  setState({ target: h.target, consent: true });
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-accent font-bold truncate pr-2 max-w-[70%]">{h.target}</span>
                  <span className="text-[10px] text-textMuted">{relativeTime(h.ts)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-borderCustom/40 pt-2 text-textSecondary">
                  <span>Score: <b className="text-textPrimary">{h.score}</b></span>
                  <span>Riesgo: <b className="text-accent-sapphire">{h.riskLabel}</b></span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? '#a6e3a1' // Catppuccin Green
      : score >= 50
      ? '#74c7ec' // Catppuccin Sapphire
      : score >= 25
      ? '#cba6f7' // Catppuccin Mauve
      : '#f38ba8'; // Catppuccin Red

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
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dash}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
        <span className="text-3xl font-extrabold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-textMuted uppercase tracking-widest mt-1 font-bold">
          {label}
        </span>
      </div>
    </div>
  );
}

function MetaRow({ k, v, accent = false }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex flex-col border-b border-borderCustom/40 pb-2">
      <span className="text-[10px] uppercase tracking-wider text-textMuted font-bold">{k}</span>
      <span className={cn('text-sm break-all font-medium', accent ? 'text-accent font-semibold' : 'text-textPrimary')}>{v}</span>
    </div>
  );
}

function FindingItem({ finding, style, target }: { finding: Finding; style: any; target: string }) {
  const [open, setOpen] = useState(false);
  const epUrl = finding.id.startsWith('endpoint:') ? target + finding.id.slice('endpoint:'.length) : null;
  return (
    <div className={cn('rounded-xl border bg-bgSurface/50 overflow-hidden transition-all duration-300', open ? 'border-borderCustom' : style.border)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className="w-full flex items-center justify-between p-4 font-mono text-left select-none focus:outline-none cursor-pointer hover:bg-bgElevated/35 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
          <span className={cn('text-[10px] px-2 py-0.5 rounded font-extrabold border flex-shrink-0', style.text, style.border, style.bg)}>
            {style.label}
          </span>
          <span className="text-sm font-semibold text-textPrimary truncate">{finding.title}</span>
          {epUrl && <QuickActions url={epUrl} />}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-textMuted flex-shrink-0 transition duration-300', open && 'rotate-180')} />
      </div>
      
      {open && (
        <div className="p-4 border-t border-borderCustom/40 bg-bgBase/40 font-mono text-xs space-y-3 leading-relaxed">
          <div className="space-y-1">
            <div className="text-textMuted font-bold uppercase tracking-wider text-[10px]">Detalle:</div>
            <p className="text-textSecondary">{finding.detail}</p>
          </div>

          {epUrl && (
            <div className="space-y-1">
              <span className="text-textMuted font-bold uppercase tracking-wider text-[10px] block">Endpoint:</span>
              <a
                href={epUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-2 rounded border border-borderCustom bg-bgSurface px-3 py-2 font-mono text-xs text-accent hover:border-accent/60 hover:bg-accent/5 hover:shadow-glow transition-all break-all"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{epUrl}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-70 flex-shrink-0 text-accent" />
              </a>
            </div>
          )}

          {finding.evidence && (
            <div className="space-y-1">
              <div className="text-textMuted font-bold uppercase tracking-wider text-[10px]">Evidencia:</div>
              <pre className="p-2 rounded bg-bgSurface border border-borderCustom/50 text-accent font-semibold overflow-x-auto">
                {finding.evidence}
              </pre>
            </div>
          )}
          <div className="space-y-1 pt-2 border-t border-borderCustom/20">
            <div className="text-accent font-bold uppercase tracking-wider text-[10px]">Recomendación de Mitigación:</div>
            <p className="text-textPrimary">{finding.recommendation}</p>
          </div>
        </div>
      )}
    </div>
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
        className="rounded p-1.5 text-textMuted hover:text-accent-green hover:bg-bgElevated/50 transition-all focus:outline-none"
        title={copied ? '¡Copiado!' : 'Copiar URL del endpoint'}
        aria-label="Copiar URL del endpoint"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-accent-green" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="rounded p-1.5 text-textMuted hover:text-accent-blue hover:bg-bgElevated/50 transition-all focus:outline-none"
        title="Abrir endpoint en pestaña nueva"
        aria-label="Abrir endpoint en pestaña nueva"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
