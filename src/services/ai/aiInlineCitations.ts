import type { AiCitationChunk } from '../../types/domain';

/** Matches `[cite: 12]`, `[cite: ISO_42001.pdf]`, etc. */
export const INLINE_CITATION_PATTERN = /\[cite:\s*([^\]]+?)\]/gi;

export type InlineCitationSegment =
  | { type: 'text'; text: string }
  | { type: 'cite'; marker: string; raw: string };

export function sanitizeEvidenceAnchorPrefix(prefix: string): string {
  const t = prefix.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return t.length > 0 ? t.slice(0, 64) : 'msg';
}

/** Stable DOM id shared by inline cite controls and evidence `<details>`. */
export function evidenceDetailDomId(
  messageAnchorPrefix: string,
  c: AiCitationChunk,
  citationIndex: number
): string {
  const p = sanitizeEvidenceAnchorPrefix(messageAnchorPrefix);
  const slug =
    c.chunk_id !== undefined && c.chunk_id !== null
      ? String(c.chunk_id)
          .replace(/[^a-zA-Z0-9_.-]+/g, '_')
          .slice(0, 56)
      : `idx${citationIndex}`;
  return `bo-ev-${p}-${slug}`;
}

/** Map marker strings from `[cite: …]` to citation rows (chunk_id match + optional idx:N alias). */
export function buildCitationLookupMap(citations: AiCitationChunk[]): Map<string, AiCitationChunk> {
  const m = new Map<string, AiCitationChunk>();
  citations.forEach((c, i) => {
    if (c.chunk_id !== undefined && c.chunk_id !== null) {
      const k = String(c.chunk_id).trim();
      if (k.length && !m.has(k)) m.set(k, c);
    }
    const alias = `idx:${i + 1}`;
    if (!m.has(alias)) m.set(alias, c);
  });
  return m;
}

export function normalizeCitationMarkerToken(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function resolveCitationMarker(
  marker: string,
  lookup: Map<string, AiCitationChunk>
): AiCitationChunk | undefined {
  const t = normalizeCitationMarkerToken(marker);
  if (!t.length) return undefined;
  return lookup.get(t);
}

/** Markers in prose that do not resolve to any citation record (audit / QA). */
export function findOrphanInlineCitationMarkers(
  body: string,
  citations: AiCitationChunk[]
): string[] {
  const lookup = buildCitationLookupMap(citations);
  const raw: string[] = [];
  const re = new RegExp(INLINE_CITATION_PATTERN.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const marker = m[1].trim();
    if (!resolveCitationMarker(marker, lookup)) raw.push(marker);
  }
  return [...new Set(raw)];
}

export function splitInlineCitationSegments(body: string): InlineCitationSegment[] {
  const segments: InlineCitationSegment[] = [];
  const re = new RegExp(INLINE_CITATION_PATTERN.source, 'gi');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', text: body.slice(last, m.index) });
    }
    segments.push({ type: 'cite', marker: m[1].trim(), raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    segments.push({ type: 'text', text: body.slice(last) });
  }
  return segments.length ? segments : [{ type: 'text', text: body }];
}

export function sanitizeOrphanInlineMarkers(markers: string[]): string[] {
  const out: string[] = [];
  for (const x of markers) {
    if (typeof x !== 'string') continue;
    const t = x.trim().slice(0, 80);
    if (t) out.push(t);
    if (out.length >= 16) break;
  }
  return out;
}

/** Scroll to evidence card and expand `<details>`. */
export function focusEvidenceElement(targetId: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(targetId);
  if (!el) return;
  if (el instanceof HTMLDetailsElement) {
    el.open = true;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
