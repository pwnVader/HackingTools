/**
 * Generadores de reporte para el auditor de WordPress.
 * Cuatro formatos: JSON (ya disponible), Markdown, HTML standalone, PDF (print).
 */

import type { AuditResult, Severity } from './wpAudit';

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

// ──────────────────────────── markdown ────────────────────────────

export function toMarkdown(r: AuditResult): string {
  const lines: string[] = [];
  lines.push(`# Auditoría WordPress — ${r.target}`);
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
  if (r.metadata.wpVersion) lines.push(`| Versión WP | \`${r.metadata.wpVersion}\` |`);
  if (r.metadata.server) lines.push(`| Server | \`${r.metadata.server}\` |`);
  if (r.metadata.poweredBy) lines.push(`| X-Powered-By | \`${r.metadata.poweredBy}\` |`);
  if (r.metadata.wafDetected) lines.push(`| WAF | ${r.metadata.wafDetected} |`);
  lines.push(`| HTTPS | ${r.metadata.isHttps ? 'sí' : 'no'} |`);
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
  lines.push('_Reporte generado de forma pasiva — solo se observaron respuestas HTTP, sin ejecutar exploits ni modificar nada en el sistema objetivo._');

  return lines.join('\n');
}

// ──────────────────────────── html ────────────────────────────

const HTML_STYLE = `
  :root {
    --bg: #0a0e14; --bg-soft: #10151c; --bg-card: #141a22; --bg-line: #1c2530;
    --fg: #d7e0ea; --fg-muted: #7a8794; --fg-dim: #4f5b68;
    --green: #2bd57c; --blue: #3aa6ff; --yellow: #f5c542; --red: #ff5566; --purple: #c678dd;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 24px; background: var(--bg); color: var(--fg);
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.55;
  }
  .container { max-width: 960px; margin: 0 auto; }
  h1 { color: var(--green); font-size: 28px; margin: 0 0 8px; }
  h2 { color: var(--fg); font-size: 20px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--bg-line); }
  h3 { font-size: 16px; margin: 24px 0 8px; }
  h4 { font-size: 14px; margin: 16px 0 6px; }
  .meta { color: var(--fg-muted); font-size: 13px; margin-bottom: 24px; }
  .badge { display: inline-block; padding: 2px 8px; border: 1px solid currentColor; border-radius: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .sev-critical { color: var(--red); }
  .sev-high { color: var(--purple); }
  .sev-medium { color: var(--yellow); }
  .sev-low { color: var(--blue); }
  .sev-info { color: var(--fg-muted); }
  .score-box { display: flex; gap: 24px; align-items: center; padding: 20px; background: var(--bg-card); border: 1px solid var(--bg-line); border-radius: 8px; margin: 20px 0; }
  .score { font-size: 56px; font-weight: 700; }
  .score-info { flex: 1; }
  .kv { display: grid; grid-template-columns: 160px 1fr; gap: 12px; font-size: 13px; padding: 4px 0; }
  .kv > span:first-child { color: var(--fg-muted); text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; }
  .finding { background: var(--bg-card); border: 1px solid var(--bg-line); border-radius: 8px; padding: 16px; margin: 12px 0; }
  .finding-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
  .finding-title { font-weight: 600; }
  .finding-row { margin: 6px 0; font-size: 13px; }
  .finding-row strong { color: var(--fg-muted); text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; display: inline-block; min-width: 110px; }
  pre, code { font-family: inherit; background: var(--bg-soft); border: 1px solid var(--bg-line); border-radius: 4px; padding: 2px 6px; font-size: 12px; color: var(--green); }
  pre { padding: 10px; white-space: pre-wrap; word-break: break-word; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--bg-line); color: var(--fg-dim); font-size: 11px; text-align: center; }
  a { color: var(--blue); }
  @media print {
    body { background: white; color: #111; }
    .container { max-width: 100%; }
    h1 { color: #0a7f3f; }
    .score-box, .finding { background: #f7f7f7; border-color: #ddd; }
    pre, code { background: #f0f0f0; color: #0a7f3f; border-color: #ddd; }
    .sev-critical { color: #b00020; }
    .sev-high { color: #6a1b9a; }
    .sev-medium { color: #a06000; }
    .sev-low { color: #1565c0; }
    .sev-info { color: #555; }
    footer { color: #888; border-color: #ccc; }
    h2 { border-color: #ccc; }
    .kv > span:first-child, .finding-row strong { color: #555; }
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

export function toHtml(r: AuditResult): string {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of r.findings) counts[f.severity]++;

  const scoreColor =
    r.score >= 80 ? '#2bd57c' : r.score >= 50 ? '#f5c542' : r.score >= 25 ? '#c678dd' : '#ff5566';

  const findingsHtml = SEV_ORDER.map((sev) => {
    const items = r.findings.filter((f) => f.severity === sev);
    if (items.length === 0) return '';
    return `
      <h3 class="sev-${sev}">${SEV_LABEL[sev]} <span style="color:var(--fg-dim)">(${items.length})</span></h3>
      ${items
        .map(
          (f) => `
        <div class="finding">
          <div class="finding-head">
            <span class="badge sev-${f.severity}">${SEV_LABEL[f.severity]}</span>
            <span class="finding-title">${escapeHtml(f.title)}</span>
            <span style="margin-left:auto;color:var(--fg-dim);font-size:11px">[${f.category}]</span>
          </div>
          <div class="finding-row"><strong>Detalle</strong> ${escapeHtml(f.detail)}</div>
          ${f.evidence ? `<div class="finding-row"><strong>Evidencia</strong></div><pre>${escapeHtml(f.evidence)}</pre>` : ''}
          <div class="finding-row"><strong>Recomendación</strong> ${escapeHtml(f.recommendation)}</div>
        </div>
      `
        )
        .join('')}
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auditoría WordPress — ${escapeHtml(r.target)}</title>
  <style>${HTML_STYLE}</style>
</head>
<body>
  <div class="container">
    <h1>Auditoría WordPress</h1>
    <div class="meta">
      <strong>${escapeHtml(r.target)}</strong> · Generado el ${fmtDate(r.startedAt)} ·
      Duración ${r.durationMs} ms · <a href="https://hacking.pwnvader.com">hacking.pwnvader.com</a>
    </div>

    <div class="score-box">
      <div class="score" style="color:${scoreColor}">${r.score}</div>
      <div class="score-info">
        <div style="color:${scoreColor};font-size:18px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">${r.riskLabel}</div>
        <div style="color:var(--fg-muted);font-size:12px;margin-top:4px">
          ${SEV_ORDER.filter((s) => counts[s] > 0)
            .map((s) => `<span class="sev-${s}">${SEV_LABEL[s]}:${counts[s]}</span>`)
            .join(' · ')}
          ${r.findings.length === 0 ? 'Sin hallazgos' : ''}
        </div>
      </div>
    </div>

    <h2>Metadata</h2>
    <div class="kv"><span>HTTPS</span><span>${r.metadata.isHttps ? 'sí' : 'no'}</span></div>
    ${r.metadata.wpVersion ? `<div class="kv"><span>Versión WP</span><span><code>${escapeHtml(r.metadata.wpVersion)}</code></span></div>` : ''}
    ${r.metadata.server ? `<div class="kv"><span>Server</span><span><code>${escapeHtml(r.metadata.server)}</code></span></div>` : ''}
    ${r.metadata.poweredBy ? `<div class="kv"><span>X-Powered-By</span><span><code>${escapeHtml(r.metadata.poweredBy)}</code></span></div>` : ''}
    ${r.metadata.wafDetected ? `<div class="kv"><span>WAF</span><span>${escapeHtml(r.metadata.wafDetected)}</span></div>` : ''}

    <h2>Hallazgos</h2>
    ${r.findings.length === 0 ? '<p style="color:var(--green)">✓ Sin hallazgos. El sitio pasó todos los checks pasivos.</p>' : findingsHtml}

    <footer>
      Reporte 100% pasivo. No se ejecutaron exploits ni se modificó el sistema objetivo.<br/>
      Generado por <a href="https://hacking.pwnvader.com">hacking.pwnvader.com</a> · pwnVader
    </footer>
  </div>
</body>
</html>`;
}

// ──────────────────────────── descarga ────────────────────────────

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
  // Abre la versión HTML en una ventana nueva y dispara print → el usuario elige "Guardar como PDF"
  const win = window.open('', '_blank');
  if (!win) {
    alert('El navegador bloqueó la ventana emergente. Permite popups para hacking.pwnvader.com.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Espera a que cargue antes de imprimir
  win.onload = () => {
    win.focus();
    win.print();
  };
}

export function sanitizeFilename(s: string): string {
  return s.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
}
