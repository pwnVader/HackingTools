/**
 * Generador de reportes genérico para los tres auditores CMS.
 *
 * Toma una `AuditInput` agnóstica (subset estructural de los tres
 * `AuditResult` de WP/Joomla/Drupal) más un `CmsExportProfile` con
 * los datos específicos del CMS (nombre, versión, función para
 * resolver URL de endpoint, función para resolver refs CWE/OWASP).
 *
 * Salida: Markdown profesional + HTML standalone con tema Graphite &
 * Ember, resumen ejecutivo, filtros JS, escala de riesgo, refs CWE/
 * OWASP/CVE por hallazgo, y compatibilidad print → PDF.
 *
 * Comparte la paleta de colores y la estructura visual entre los tres
 * CMS para que un cliente reciba reportes consistentes.
 */

import type { Cms, FindingLike, SecRefs } from './cmsRefs';
import { cmsDisplayName } from './cmsRefs';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RiskLabel = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

export interface AuditFinding {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  detail: string;
  recommendation: string;
  evidence?: string;
}

export interface AuditInput {
  target: string;
  startedAt: string;
  durationMs: number;
  score: number;
  riskLabel: RiskLabel;
  findings: AuditFinding[];
}

export interface MetadataRow {
  label: string;
  value: string;
  mono?: boolean;
}

export interface CmsExportProfile {
  cms: Cms;
  /** Versión detectada del core del CMS, si la hay. */
  version: string | null;
  /** Header X-Powered-By tal como vino del target. */
  poweredBy: string | null;
  /** ¿El target responde por HTTPS? */
  isHttps: boolean;
  /** Resolución de URL absoluta para findings que apuntan a algo navegable. */
  endpointUrl: (f: FindingLike, target: string) => string | null;
  /** Resolución de refs CWE/OWASP por finding id. */
  refs: (f: FindingLike) => SecRefs | null;
  /** Constructor de URL de búsqueda en NVD para la versión detectada. */
  cveSearchUrl: (version: string) => string;
  /** Predicado: ¿este finding está relacionado con la versión del core? */
  isVersionRelated: (f: FindingLike) => boolean;
  /** Filas extra para la sección "Metadata técnica" (opcional). */
  extraMetadata?: MetadataRow[];
}

const SEV_LABEL: Record<Severity, string> = {
  critical: 'CRÍTICA',
  high: 'ALTA',
  medium: 'MEDIA',
  low: 'BAJA',
  info: 'INFO',
};

const SEV_EMOJI: Record<Severity, string> = {
  critical: '🔴',
  high: '🟣',
  medium: '🟡',
  low: '🔵',
  info: '⚪',
};

const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

// ────────────────────────── markdown ──────────────────────────

export function toMarkdown(r: AuditInput, p: CmsExportProfile): string {
  const cmsLabel = cmsDisplayName(p.cms);
  const lines: string[] = [];
  lines.push(`# Auditoría ${cmsLabel} — ${r.target}`);
  lines.push('');
  lines.push(`**Generado por** [hacking.pwnvader.com](https://hacking.pwnvader.com)  `);
  lines.push(`**Fecha:** ${fmtDate(r.startedAt)}  `);
  lines.push(`**Duración:** ${r.durationMs} ms`);
  lines.push('');
  lines.push(`## Resumen`);
  lines.push('');
  lines.push(`| Métrica | Valor |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Score | **${r.score} / 100 — ${r.riskLabel}** |`);
  lines.push(`| Hallazgos | ${r.findings.length} |`);
  if (p.version) lines.push(`| Versión ${cmsLabel} | \`${p.version}\` |`);
  if (p.poweredBy) lines.push(`| X-Powered-By | \`${p.poweredBy}\` |`);
  lines.push(`| HTTPS | ${p.isHttps ? 'sí' : 'no'} |`);
  for (const row of p.extraMetadata ?? []) {
    lines.push(`| ${row.label} | ${row.mono ? `\`${row.value}\`` : row.value} |`);
  }
  lines.push('');

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of r.findings) counts[f.severity]++;

  lines.push(`## Distribución por severidad`);
  lines.push('');
  for (const sev of SEV_ORDER) {
    if (counts[sev] > 0) lines.push(`- ${SEV_EMOJI[sev]} **${SEV_LABEL[sev]}**: ${counts[sev]}`);
  }
  lines.push('');

  lines.push(`## Hallazgos`);
  lines.push('');
  for (const sev of SEV_ORDER) {
    const items = r.findings.filter((f) => f.severity === sev);
    if (items.length === 0) continue;
    lines.push(`### ${SEV_EMOJI[sev]} ${SEV_LABEL[sev]} (${items.length})`);
    lines.push('');
    for (const f of items) {
      lines.push(`#### ${f.title}`);
      lines.push('');
      lines.push(`- **Categoría:** ${f.category}`);
      const refs = p.refs(f);
      const refParts: string[] = [];
      if (refs?.cwe) refParts.push(`[CWE-${refs.cwe.id}](${refs.cwe.url}) (${refs.cwe.title})`);
      if (refs?.owasp) refParts.push(`[${refs.owasp.id}](${refs.owasp.url}) ${refs.owasp.title}`);
      if (refParts.length > 0) lines.push(`- **Referencias:** ${refParts.join(' · ')}`);
      const url = p.endpointUrl(f, r.target);
      if (url) lines.push(`- **Endpoint:** [${url}](${url})`);
      if (p.isVersionRelated(f) && p.version) {
        lines.push(`- **Buscar CVEs:** [${cmsLabel} ${p.version}](${p.cveSearchUrl(p.version)})`);
      }
      lines.push(`- **Detalle:** ${f.detail}`);
      if (f.evidence) lines.push(`- **Evidencia:** \`${f.evidence}\``);
      lines.push(`- **Recomendación:** ${f.recommendation}`);
      lines.push('');
    }
  }

  if (r.findings.length === 0) {
    lines.push('_Sin hallazgos. El sitio pasó todos los checks pasivos._');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    '_Reporte generado de forma pasiva — solo se observaron respuestas HTTP, sin ejecutar exploits ni modificar nada en el sistema objetivo._'
  );
  lines.push('');
  lines.push(`### Ecosistema pwnVader`);
  lines.push('');
  lines.push(
    `- 🏠 [pwnvader.com](https://pwnvader.com) — portfolio profesional y servicios de pentesting`
  );
  lines.push(
    `- 🧪 [hacking.pwnvader.com](https://hacking.pwnvader.com) — laboratorio táctico (origen de este reporte)`
  );
  lines.push(
    `- 📚 [docs.pwnvader.com](https://docs.pwnvader.com) — writeups, metodologías y guías de hardening`
  );

  return lines.join('\n');
}

// ────────────────────────── html ──────────────────────────

const HTML_STYLE = `
  :root {
    --bg: #0d1117;
    --bg-elev: #161b22;
    --bg-soft: #1c232c;
    --bg-mute: #21262d;
    --border: #2a313a;
    --border-soft: #21262d;
    --fg: #e6edf3;
    --fg-muted: #8b949e;
    --fg-dim: #6e7681;
    --ember: #d4a017;
    --ember-soft: rgba(212, 160, 23, 0.12);
    --sev-critical: #e5534b;
    --sev-high: #f0883e;
    --sev-medium: #d4a017;
    --sev-low: #58a6ff;
    --sev-info: #8b949e;
    --ok: #3fb950;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html { color-scheme: dark; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  .mono, code, pre, .endpoint-link, .ref-badge {
    font-family: 'JetBrains Mono', 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
  }
  h1, h2, h3, h4 { font-weight: 600; letter-spacing: -0.01em; margin: 0; color: var(--fg); }
  p { margin: 0; }
  a { color: inherit; }

  .ember-rule {
    height: 3px;
    background: linear-gradient(90deg, transparent 0%, var(--ember) 50%, transparent 100%);
    opacity: 0.9;
  }
  .page { max-width: 1080px; margin: 0 auto; padding: 48px 32px 64px; }

  .report-head { display: grid; grid-template-columns: 1fr; gap: 28px; padding-bottom: 32px; border-bottom: 1px solid var(--border-soft); }
  @media (min-width: 760px) { .report-head { grid-template-columns: 1fr auto; align-items: end; } }
  .brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--fg-muted); font-weight: 500; }
  .brand-mark { color: var(--fg); font-weight: 700; letter-spacing: 0.04em; }
  .brand-mark-em { color: var(--ember); }
  .brand-divider { width: 1px; height: 12px; background: var(--border); }
  .report-title { font-size: 28px; line-height: 1.2; letter-spacing: -0.02em; }
  .report-subtitle { margin-top: 8px; font-size: 13px; color: var(--fg-dim); }
  .report-meta { display: grid; gap: 8px; margin: 0; min-width: 280px; }
  .report-meta > div { display: grid; grid-template-columns: 96px 1fr; gap: 14px; font-size: 13px; align-items: baseline; }
  .report-meta dt { color: var(--fg-dim); text-transform: uppercase; font-size: 10px; letter-spacing: 0.12em; font-weight: 500; margin: 0; }
  .report-meta dd { margin: 0; color: var(--fg); word-break: break-word; }
  .report-meta a { color: var(--fg); text-decoration: none; border-bottom: 1px dashed var(--border); transition: color 0.15s, border-color 0.15s; }
  .report-meta a:hover { color: var(--ember); border-color: var(--ember); }

  section { margin-top: 48px; }
  .section-head { margin-bottom: 20px; display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .section-head h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--fg-muted); font-weight: 600; }
  .section-head .section-sub { font-size: 12px; color: var(--fg-dim); }

  .exec-card { background: var(--bg-elev); border: 1px solid var(--border-soft); border-radius: 10px; padding: 32px; display: grid; gap: 32px; position: relative; overflow: hidden; }
  .exec-card::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: var(--ember); opacity: 0.7; }
  @media (min-width: 720px) { .exec-card { grid-template-columns: auto 1fr; align-items: center; } }
  .exec-score { display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .ring-wrap { position: relative; width: 156px; height: 156px; }
  .ring-wrap svg { width: 100%; height: 100%; }
  .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring-num { font-size: 44px; font-weight: 700; color: var(--fg); line-height: 1; font-feature-settings: 'tnum'; letter-spacing: -0.02em; }
  .ring-denom { font-size: 10px; color: var(--fg-dim); margin-top: 6px; letter-spacing: 0.12em; text-transform: uppercase; }
  .risk-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700; padding: 6px 14px; border-radius: 999px; border: 1px solid currentColor; }
  .risk-bajo { color: var(--ok); background: rgba(63, 185, 80, 0.08); }
  .risk-medio { color: var(--sev-medium); background: rgba(212, 160, 23, 0.08); }
  .risk-alto { color: var(--sev-high); background: rgba(240, 136, 62, 0.08); }
  .risk-critico { color: var(--sev-critical); background: rgba(229, 83, 75, 0.08); }
  .exec-text { display: flex; flex-direction: column; gap: 24px; }
  .exec-lead { font-size: 15px; line-height: 1.7; color: var(--fg); }
  .exec-lead strong { color: var(--fg); font-weight: 600; }
  .exec-lead em { font-style: normal; color: var(--ember); font-weight: 500; }
  .exec-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 24px; padding-top: 20px; border-top: 1px solid var(--border-soft); }
  .stat { display: flex; flex-direction: column; gap: 4px; }
  .stat-num { font-size: 22px; font-weight: 700; color: var(--fg); font-feature-settings: 'tnum'; line-height: 1; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--fg-dim); font-weight: 500; }

  .risk-scale { margin-top: 16px; padding: 18px 22px 20px; background: var(--bg-elev); border: 1px solid var(--border-soft); border-radius: 10px; }
  .scale-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .scale-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--fg-dim); font-weight: 500; }
  .scale-value { font-size: 12px; color: var(--fg-muted); font-feature-settings: 'tnum'; }
  .scale-value strong { color: var(--fg); }
  .scale-track { position: relative; display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: var(--bg-mute); }
  .scale-band { height: 100%; opacity: 0.55; }
  .band-critical { background: var(--sev-critical); width: 25%; }
  .band-high { background: var(--sev-high); width: 25%; }
  .band-medium { background: var(--sev-medium); width: 30%; }
  .band-low { background: var(--ok); width: 20%; }
  .scale-pointer { position: absolute; top: -5px; width: 2px; height: 18px; background: var(--fg); transform: translateX(-50%); border-radius: 2px; box-shadow: 0 0 0 2px var(--bg-elev); }
  .scale-axis { display: grid; grid-template-columns: 25% 25% 30% 20%; margin-top: 10px; font-size: 10px; color: var(--fg-dim); letter-spacing: 0.08em; text-transform: uppercase; }
  .scale-axis > span { text-align: center; }

  .meta-grid { margin: 0; background: var(--bg-elev); border: 1px solid var(--border-soft); border-radius: 10px; overflow: hidden; }
  .meta-grid > div { display: grid; grid-template-columns: 200px 1fr; gap: 16px; padding: 14px 22px; border-top: 1px solid var(--border-soft); align-items: center; }
  .meta-grid > div:first-child { border-top: 0; }
  .meta-grid dt { color: var(--fg-dim); text-transform: uppercase; font-size: 10px; letter-spacing: 0.12em; font-weight: 500; margin: 0; }
  .meta-grid dd { margin: 0; color: var(--fg); word-break: break-word; }
  .meta-grid code { font-size: 12.5px; }
  @media (max-width: 600px) { .meta-grid > div { grid-template-columns: 1fr; gap: 4px; } }

  .filter-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 14px 18px; background: var(--bg-elev); border: 1px solid var(--border-soft); border-radius: 10px; margin-bottom: 24px; }
  .filter-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--fg-dim); font-weight: 600; margin-right: 4px; }
  .filter-pill { cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 12px; border-radius: 999px; border: 1px solid currentColor; background: transparent; user-select: none; transition: opacity 0.18s ease, background-color 0.18s ease, transform 0.1s ease; font-family: inherit; }
  .filter-pill:active { transform: scale(0.97); }
  .filter-pill .count { background: currentColor; border-radius: 999px; padding: 1px 6px; font-size: 9px; min-width: 18px; text-align: center; font-feature-settings: 'tnum'; }
  .filter-pill .count > b { color: var(--bg-elev); font-weight: 700; }
  .filter-pill.is-off { opacity: 0.35; border-style: dashed; }
  .filter-pill.sev-critical { color: var(--sev-critical); }
  .filter-pill.sev-high { color: var(--sev-high); }
  .filter-pill.sev-medium { color: var(--sev-medium); }
  .filter-pill.sev-low { color: var(--sev-low); }
  .filter-pill.sev-info { color: var(--sev-info); }
  .filter-reset { margin-left: auto; background: transparent; color: var(--fg-dim); font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; padding: 5px 12px; border: 1px solid var(--border); border-radius: 999px; cursor: pointer; font-family: inherit; transition: color 0.15s, border-color 0.15s; }
  .filter-reset:hover { color: var(--ember); border-color: var(--ember); }

  .sev-group { margin-top: 28px; }
  .sev-group:first-of-type { margin-top: 0; }
  .sev-group-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-soft); }
  .sev-group-head h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; }
  .sev-group-count { font-size: 11px; color: var(--fg-dim); font-weight: 500; margin-left: auto; font-feature-settings: 'tnum'; }
  .sev-group.sev-critical h3 { color: var(--sev-critical); }
  .sev-group.sev-high h3 { color: var(--sev-high); }
  .sev-group.sev-medium h3 { color: var(--sev-medium); }
  .sev-group.sev-low h3 { color: var(--sev-low); }
  .sev-group.sev-info h3 { color: var(--sev-info); }
  .sev-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

  .finding { background: var(--bg-elev); border: 1px solid var(--border-soft); border-radius: 8px; margin-bottom: 12px; overflow: hidden; border-left: 3px solid var(--sev-info); }
  .finding[data-severity="critical"] { border-left-color: var(--sev-critical); }
  .finding[data-severity="high"] { border-left-color: var(--sev-high); }
  .finding[data-severity="medium"] { border-left-color: var(--sev-medium); }
  .finding[data-severity="low"] { border-left-color: var(--sev-low); }
  .finding-head { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid var(--border-soft); flex-wrap: wrap; }
  .finding-sev { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; padding: 4px 10px; border-radius: 4px; border: 1px solid currentColor; flex-shrink: 0; }
  .finding-sev.sev-critical { color: var(--sev-critical); background: rgba(229, 83, 75, 0.1); }
  .finding-sev.sev-high { color: var(--sev-high); background: rgba(240, 136, 62, 0.1); }
  .finding-sev.sev-medium { color: var(--sev-medium); background: rgba(212, 160, 23, 0.1); }
  .finding-sev.sev-low { color: var(--sev-low); background: rgba(88, 166, 255, 0.1); }
  .finding-sev.sev-info { color: var(--sev-info); background: rgba(139, 148, 158, 0.1); }
  .finding-title { flex: 1; font-size: 14.5px; font-weight: 600; color: var(--fg); min-width: 0; line-height: 1.35; }
  .finding-cat { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--fg-muted); font-weight: 600; background: var(--bg-mute); padding: 4px 9px; border-radius: 4px; flex-shrink: 0; }

  .finding-refs { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 18px 0; }
  .ref-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 9px; border-radius: 4px; border: 1px solid var(--border-soft); background: var(--bg-soft); color: var(--fg-muted); text-decoration: none; transition: color 0.15s, border-color 0.15s, background 0.15s; }
  .ref-badge:hover { color: var(--fg); border-color: var(--fg-muted); }
  .ref-badge.ref-cve { color: var(--ember); border-color: rgba(212, 160, 23, 0.4); background: var(--ember-soft); }
  .ref-badge.ref-cve:hover { color: var(--ember); border-color: var(--ember); }
  .ref-badge .ext { opacity: 0.7; font-size: 9px; }

  .finding-body { padding: 16px 18px; display: grid; gap: 14px; }
  .finding-row { display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: start; }
  @media (max-width: 600px) { .finding-row { grid-template-columns: 1fr; gap: 4px; } }
  .row-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--fg-dim); font-weight: 700; padding-top: 3px; }
  .row-value { color: var(--fg); font-size: 13.5px; line-height: 1.65; }
  .row-value code { background: var(--bg-mute); border: 1px solid var(--border-soft); padding: 1px 6px; border-radius: 4px; font-size: 12px; color: var(--fg); }
  .row-value pre { background: var(--bg); border: 1px solid var(--border-soft); padding: 12px 14px; border-radius: 6px; font-size: 12px; color: var(--fg-muted); overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.55; }
  .endpoint-link { display: inline-flex; align-items: center; gap: 8px; color: var(--ember); text-decoration: none; font-size: 12.5px; padding: 5px 11px; background: var(--ember-soft); border: 1px solid rgba(212, 160, 23, 0.3); border-radius: 6px; transition: background 0.15s, border-color 0.15s, transform 0.1s; word-break: break-all; }
  .endpoint-link:hover { background: rgba(212, 160, 23, 0.22); border-color: var(--ember); }
  .endpoint-link:active { transform: scale(0.985); }
  .endpoint-link .ext { font-size: 11px; opacity: 0.85; }

  .no-findings { background: var(--bg-elev); border: 1px solid var(--border-soft); border-radius: 10px; padding: 36px; text-align: center; color: var(--fg); font-size: 14px; }
  .no-findings .ok-mark { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(63, 185, 80, 0.1); color: var(--ok); margin-bottom: 14px; font-size: 22px; font-weight: 700; border: 1px solid rgba(63, 185, 80, 0.4); }
  .empty-filter { background: var(--bg-elev); border: 1px dashed var(--border); border-radius: 10px; padding: 24px; text-align: center; color: var(--fg-dim); font-size: 13px; }

  .report-footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--border-soft); text-align: center; color: var(--fg-dim); font-size: 12px; }
  .report-footer a { color: var(--fg-muted); text-decoration: none; }
  .report-footer a:hover { color: var(--ember); }
  .footer-small { margin-top: 6px; font-size: 11px; color: var(--fg-dim); }

  @media print {
    :root {
      --bg: #ffffff;
      --bg-elev: #fafafa;
      --bg-soft: #f3f4f6;
      --bg-mute: #ececec;
      --border: #d0d0d0;
      --border-soft: #e5e5e5;
      --fg: #1f1f1f;
      --fg-muted: #555;
      --fg-dim: #777;
    }
    body { background: white; color: var(--fg); }
    .ember-rule { background: var(--ember); }
    .filter-bar, .filter-reset { display: none; }
    .exec-card, .meta-grid, .finding, .risk-scale, .no-findings { box-shadow: none; }
    .page { padding: 24px 18px; }
    .finding { page-break-inside: avoid; }
  }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function riskClass(label: string): string {
  return label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function scoreColor(score: number): string {
  if (score >= 80) return '#3fb950';
  if (score >= 50) return '#d4a017';
  if (score >= 25) return '#f0883e';
  return '#e5534b';
}

function scoreRingSvg(score: number, color: string): string {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circ;
  return `
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="Score ${score} de 100">
      <circle cx="60" cy="60" r="${r}" stroke="#21262d" stroke-width="9" fill="none" />
      <circle cx="60" cy="60" r="${r}" stroke="${color}" stroke-width="9" fill="none"
        stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}" stroke-linecap="round"
        transform="rotate(-90 60 60)" />
    </svg>
  `;
}

function buildExecutiveNarrative(
  r: AuditInput,
  counts: Record<Severity, number>,
  cmsLabel: string
): string {
  const total = r.findings.length;
  const host = escapeHtml(r.target.replace(/^https?:\/\//, ''));

  if (total === 0) {
    return `El análisis pasivo de <strong>${host}</strong> no identificó hallazgos relevantes en la configuración expuesta del CMS ${cmsLabel}. Se recomienda mantener el ritmo actual de actualizaciones y monitoreo periódico.`;
  }
  if (counts.critical > 0) {
    return `El análisis identificó <strong>${counts.critical} hallazgo${counts.critical === 1 ? '' : 's'} de severidad <em>crítica</em></strong> en ${host} (${cmsLabel}) que requieren acción inmediata. Los riesgos detectados podrían facilitar el compromiso del sitio si son explotados por un atacante con conocimiento básico. Se recomienda priorizar la remediación <strong>antes del próximo despliegue productivo</strong>.`;
  }
  if (counts.high > 0) {
    return `Se detectaron <strong>${counts.high} vulnerabilidad${counts.high === 1 ? '' : 'es'} de <em>alto impacto</em></strong> en ${host} (${cmsLabel}). Aunque no representan un compromiso inmediato, exponen información sensible o facilitan ataques posteriores de enumeración y bruteforce. La remediación debería abordarse en el corto plazo, dentro del próximo ciclo de mantenimiento.`;
  }
  if (counts.medium > 0) {
    const mlow = counts.medium + counts.low;
    return `El análisis de ${host} (${cmsLabel}) reveló <strong>${mlow} hallazgo${mlow === 1 ? '' : 's'} de severidad <em>media o baja</em></strong>. La postura general es razonable, pero existen ajustes recomendados de hardening para reducir la superficie de ataque y endurecer la configuración expuesta.`;
  }
  return `<strong>${host}</strong> (${cmsLabel}) presenta una postura de seguridad sólida. Los ${total} hallazgo${total === 1 ? '' : 's'} identificado${total === 1 ? '' : 's'} son de carácter <em>informativo</em> o de bajo impacto, sin riesgo inmediato pero con oportunidades menores de endurecimiento.`;
}

const FILTER_SCRIPT = `
(function() {
  var ALL = ['critical','high','medium','low','info'];
  var pills = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var findings = Array.prototype.slice.call(document.querySelectorAll('[data-severity]'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('[data-sev-group]'));
  var resetBtn = document.querySelector('[data-reset]');
  var emptyMsg = document.querySelector('[data-empty]');
  var active = {};
  ALL.forEach(function(s) { active[s] = true; });

  function activeCount() {
    var n = 0;
    ALL.forEach(function(s) { if (active[s]) n++; });
    return n;
  }

  function apply() {
    var visibleTotal = 0;
    findings.forEach(function(el) {
      var sev = el.getAttribute('data-severity');
      var visible = !!active[sev];
      el.style.display = visible ? '' : 'none';
      if (visible) visibleTotal++;
    });
    groups.forEach(function(g) {
      var sev = g.getAttribute('data-sev-group');
      g.style.display = active[sev] ? '' : 'none';
    });
    pills.forEach(function(p) {
      var sev = p.getAttribute('data-filter');
      if (active[sev]) p.classList.remove('is-off');
      else p.classList.add('is-off');
    });
    if (emptyMsg) emptyMsg.style.display = (findings.length > 0 && visibleTotal === 0) ? '' : 'none';
  }

  pills.forEach(function(p) {
    p.addEventListener('click', function() {
      var sev = p.getAttribute('data-filter');
      active[sev] = !active[sev];
      if (activeCount() === 0) ALL.forEach(function(s) { active[s] = true; });
      apply();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      ALL.forEach(function(s) { active[s] = true; });
      apply();
    });
  }

  apply();
})();
`;

function renderRefsRow(
  f: AuditFinding,
  p: CmsExportProfile
): string {
  const refs = p.refs(f);
  const showCve = p.isVersionRelated(f) && !!p.version;
  if (!refs && !showCve) return '';
  const parts: string[] = [];
  if (refs?.cwe) {
    parts.push(
      `<a class="ref-badge" href="${escapeHtml(refs.cwe.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(refs.cwe.title)}">CWE-${refs.cwe.id}<span class="ext">↗</span></a>`
    );
  }
  if (refs?.owasp) {
    parts.push(
      `<a class="ref-badge" href="${escapeHtml(refs.owasp.url)}" target="_blank" rel="noopener noreferrer" title="OWASP Top 10 — ${escapeHtml(refs.owasp.title)}">${refs.owasp.id}<span class="ext">↗</span></a>`
    );
  }
  if (showCve && p.version) {
    parts.push(
      `<a class="ref-badge ref-cve" href="${escapeHtml(p.cveSearchUrl(p.version))}" target="_blank" rel="noopener noreferrer" title="Búsqueda en NVD">Buscar CVEs · ${cmsDisplayName(p.cms)} ${escapeHtml(p.version)}<span class="ext">↗</span></a>`
    );
  }
  return `<div class="finding-refs">${parts.join('')}</div>`;
}

export function toHtml(r: AuditInput, p: CmsExportProfile): string {
  const cmsLabel = cmsDisplayName(p.cms);
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of r.findings) counts[f.severity]++;

  const color = scoreColor(r.score);
  const rk = riskClass(r.riskLabel);
  const narrative = buildExecutiveNarrative(r, counts, cmsLabel);
  const total = r.findings.length;
  const critHigh = counts.critical + counts.high;
  const cats = new Set(r.findings.map((f) => f.category));
  const targetSafe = escapeHtml(r.target);

  const filterPills = SEV_ORDER.map((s) => {
    const c = counts[s];
    return `<button type="button" class="filter-pill sev-${s}" data-filter="${s}" aria-pressed="true">
        <span>${SEV_LABEL[s]}</span>
        <span class="count"><b>${c}</b></span>
      </button>`;
  }).join('');

  const findingsHtml = SEV_ORDER.map((sev) => {
    const items = r.findings.filter((f) => f.severity === sev);
    if (items.length === 0) return '';
    return `
      <div class="sev-group sev-${sev}" data-sev-group="${sev}">
        <div class="sev-group-head">
          <span class="sev-dot"></span>
          <h3>${SEV_LABEL[sev]}</h3>
          <span class="sev-group-count">${items.length} hallazgo${items.length === 1 ? '' : 's'}</span>
        </div>
        ${items
          .map((f) => {
            const url = p.endpointUrl(f, r.target);
            const refsRow = renderRefsRow(f, p);
            return `
        <article class="finding" data-severity="${f.severity}">
          <header class="finding-head">
            <span class="finding-sev sev-${f.severity}">${SEV_LABEL[f.severity]}</span>
            <h4 class="finding-title">${escapeHtml(f.title)}</h4>
            <span class="finding-cat">${escapeHtml(f.category)}</span>
          </header>
          ${refsRow}
          <div class="finding-body">
            <div class="finding-row">
              <div class="row-label">Detalle</div>
              <div class="row-value">${escapeHtml(f.detail)}</div>
            </div>
            ${
              url
                ? `<div class="finding-row">
                    <div class="row-label">Endpoint</div>
                    <div class="row-value"><a class="endpoint-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)} <span class="ext">↗</span></a></div>
                  </div>`
                : ''
            }
            ${
              f.evidence
                ? `<div class="finding-row">
                    <div class="row-label">Evidencia</div>
                    <div class="row-value"><pre><code>${escapeHtml(f.evidence)}</code></pre></div>
                  </div>`
                : ''
            }
            <div class="finding-row">
              <div class="row-label">Recomendación</div>
              <div class="row-value">${escapeHtml(f.recommendation)}</div>
            </div>
          </div>
        </article>`;
          })
          .join('')}
      </div>`;
  }).join('');

  const versionLabel = `Versión ${cmsLabel}`;
  const extraRowsHtml = (p.extraMetadata ?? [])
    .map(
      (row) =>
        `<div><dt>${escapeHtml(row.label)}</dt><dd>${row.mono ? `<code>${escapeHtml(row.value)}</code>` : escapeHtml(row.value)}</dd></div>`
    )
    .join('');

  const metadataRows = [
    `<div><dt>HTTPS</dt><dd>${p.isHttps ? 'Sí' : 'No'}</dd></div>`,
    p.version
      ? `<div><dt>${escapeHtml(versionLabel)}</dt><dd><code>${escapeHtml(p.version)}</code></dd></div>`
      : '',
    p.poweredBy
      ? `<div><dt>X-Powered-By</dt><dd><code>${escapeHtml(p.poweredBy)}</code></dd></div>`
      : '',
    extraRowsHtml,
    `<div><dt>Modo de análisis</dt><dd>Pasivo (GET / HEAD) — sin payloads</dd></div>`,
    `<div><dt>Duración</dt><dd>${r.durationMs} ms</dd></div>`,
  ]
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Informe de Auditoría ${cmsLabel} — ${targetSafe}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>${HTML_STYLE}</style>
</head>
<body>
  <div class="ember-rule"></div>
  <main class="page">
    <header class="report-head">
      <div>
        <div class="brand-row">
          <span class="brand-mark">pwn<span class="brand-mark-em">Vader</span></span>
          <span class="brand-divider"></span>
          <span>CMS Security Audit · ${cmsLabel}</span>
        </div>
        <h1 class="report-title">Informe de Auditoría — ${cmsLabel}</h1>
        <p class="report-subtitle">Análisis pasivo de configuración expuesta y superficie de ataque</p>
      </div>
      <dl class="report-meta">
        <div><dt>Target</dt><dd><a href="${targetSafe}" target="_blank" rel="noopener noreferrer">${targetSafe}</a></dd></div>
        <div><dt>Generado</dt><dd>${fmtDate(r.startedAt)}</dd></div>
        <div><dt>Duración</dt><dd>${r.durationMs} ms</dd></div>
        <div><dt>Hallazgos</dt><dd>${total}</dd></div>
      </dl>
    </header>

    <section>
      <div class="section-head">
        <h2>Resumen ejecutivo</h2>
        <span class="section-sub">Visión general de la postura de seguridad</span>
      </div>
      <div class="exec-card">
        <div class="exec-score">
          <div class="ring-wrap">
            ${scoreRingSvg(r.score, color)}
            <div class="ring-center">
              <div class="ring-num">${r.score}</div>
              <div class="ring-denom">de 100</div>
            </div>
          </div>
          <div class="risk-badge risk-${rk}">Riesgo · ${escapeHtml(r.riskLabel)}</div>
        </div>
        <div class="exec-text">
          <p class="exec-lead">${narrative}</p>
          <div class="exec-stats">
            <div class="stat">
              <span class="stat-num">${total}</span>
              <span class="stat-label">hallazgos totales</span>
            </div>
            <div class="stat">
              <span class="stat-num">${critHigh}</span>
              <span class="stat-label">alto o crítico</span>
            </div>
            <div class="stat">
              <span class="stat-num">${cats.size}</span>
              <span class="stat-label">categorías afectadas</span>
            </div>
            <div class="stat">
              <span class="stat-num">${p.isHttps ? 'Sí' : 'No'}</span>
              <span class="stat-label">HTTPS</span>
            </div>
          </div>
        </div>
      </div>

      <div class="risk-scale">
        <div class="scale-top">
          <span class="scale-title">Escala de riesgo</span>
          <span class="scale-value"><strong>${r.score}</strong> / 100 — ${escapeHtml(r.riskLabel)}</span>
        </div>
        <div class="scale-track">
          <div class="scale-band band-critical"></div>
          <div class="scale-band band-high"></div>
          <div class="scale-band band-medium"></div>
          <div class="scale-band band-low"></div>
          <div class="scale-pointer" style="left: ${Math.max(0, Math.min(100, r.score))}%"></div>
        </div>
        <div class="scale-axis">
          <span>Crítico</span>
          <span>Alto</span>
          <span>Medio</span>
          <span>Bajo</span>
        </div>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>Metadata técnica</h2>
        <span class="section-sub">Headers, fingerprinting y entorno detectado</span>
      </div>
      <dl class="meta-grid">${metadataRows}</dl>
    </section>

    <section>
      <div class="section-head">
        <h2>Hallazgos detallados</h2>
        <span class="section-sub">${total} hallazgo${total === 1 ? '' : 's'} · filtra por severidad</span>
      </div>

      ${
        total === 0
          ? `<div class="no-findings">
              <div class="ok-mark">✓</div>
              <div><strong>Sin hallazgos.</strong> El sitio pasó todos los checks pasivos del scanner.</div>
            </div>`
          : `<div class="filter-bar">
              <span class="filter-label">Filtrar</span>
              ${filterPills}
              <button type="button" class="filter-reset" data-reset>Reset</button>
            </div>
            <div class="empty-filter" data-empty style="display:none">
              Ningún hallazgo coincide con los filtros activos.
            </div>
            ${findingsHtml}`
      }
    </section>

    <footer class="report-footer">
      <p>Reporte 100% pasivo · No se enviaron credenciales ni se modificó el sistema objetivo</p>
      <p class="footer-small">
        Generado por <a href="https://hacking.pwnvader.com">hacking.pwnvader.com</a>
        · metodologías y walkthroughs en <a href="https://docs.pwnvader.com">docs.pwnvader.com</a>
        · perfil en <a href="https://pwnvader.com">pwnvader.com</a>
      </p>
    </footer>
  </main>
  <script>${FILTER_SCRIPT}</script>
</body>
</html>`;
}

// ────────────────────────── utilities ──────────────────────────

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printHtmlReport(html: string) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('El navegador bloqueó la ventana emergente. Permite popups para hacking.pwnvader.com.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

export function sanitizeFilename(s: string): string {
  return s.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
}
