/**
 * Wrapper específico de Drupal sobre el generador genérico cmsExport.
 * Mismo reporte profesional que WordPress, parametrizado con la
 * versión, refs y resolución de endpoint URL propias de Drupal.
 */

import type { AuditResult } from './drupalAudit';
import {
  toMarkdown as toMarkdownGeneric,
  toHtml as toHtmlGeneric,
  downloadFile as df,
  printHtmlReport as phr,
  sanitizeFilename as sf,
} from './cmsExport';
import { endpointUrl, getSecRefs, cveSearchUrl, isVersionRelated } from './cmsRefs';

function profile(r: AuditResult) {
  return {
    cms: 'drupal' as const,
    version: r.metadata.drupalVersion,
    poweredBy: r.metadata.poweredBy,
    isHttps: r.metadata.isHttps,
    endpointUrl: (f: { id: string; category: string }, t: string) =>
      endpointUrl(f, t, 'drupal'),
    refs: (f: { id: string; category: string }) => getSecRefs(f, 'drupal'),
    cveSearchUrl: (v: string) => cveSearchUrl('drupal', v),
    isVersionRelated,
  };
}

export function toMarkdown(r: AuditResult): string {
  return toMarkdownGeneric(r, profile(r));
}

export function toHtml(r: AuditResult): string {
  return toHtmlGeneric(r, profile(r));
}

export const downloadFile = df;
export const printHtmlReport = phr;
export const sanitizeFilename = sf;
