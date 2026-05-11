import type {
  AiCitationChunk,
  AiCitationModality,
  AiCitationSourceType,
  AiMultimodalContextRef
} from '../../types/domain';
import type { BrandOpsAiProvenanceGovernanceMeta } from '../../types/aiTraceGraph';

/** Workspace JSON + export contract version for Assistant citation traces. */
export const AI_IO_TRACE_SCHEMA_VERSION = '1.0.0';

const MAX_EXCERPT_LEN = 360;
const MAX_STRING_FIELD = 512;
const MAX_CHUNK_ID_LEN = 160;
const MAX_URI_HINT_LEN = 400;
const MAX_CITATIONS_TOTAL = 32;

const SOURCE_TYPES = new Set<AiCitationSourceType>([
  'workspace_entity',
  'integration_hub',
  'linked_document',
  'web_retrieval',
  'browser_overlay',
  'user_attachment',
  'audio',
  'image',
  'video',
  'document',
  'unknown'
]);

const MODALITIES = new Set<AiCitationModality>([
  'text',
  'audio',
  'image',
  'video',
  'document',
  'browser_overlay'
]);

function clipStr(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function clampConfidence(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.min(1, Math.max(0, v));
}

function coercePage(v: unknown): number | string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return clipStr(v, 64);
}

function coerceChunkId(v: unknown): string | number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return clipStr(v, MAX_CHUNK_ID_LEN);
}

function parseSourceType(v: unknown): AiCitationSourceType | undefined {
  const s = clipStr(v, 64);
  if (!s) return undefined;
  return SOURCE_TYPES.has(s as AiCitationSourceType) ? (s as AiCitationSourceType) : 'unknown';
}

function parseModality(v: unknown): AiCitationModality | undefined {
  const s = clipStr(v, 32);
  if (!s) return undefined;
  return MODALITIES.has(s as AiCitationModality) ? (s as AiCitationModality) : undefined;
}

function sanitizeMultimodal(raw: unknown): AiMultimodalContextRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const modality = parseModality(o.modality ?? o.modality_type);
  const mime_type = clipStr(o.mime_type ?? o.mimeType, 128);
  const uri_hint = clipStr(o.uri_hint ?? o.uriHint ?? o.href, MAX_URI_HINT_LEN);
  const duration_ms =
    typeof o.duration_ms === 'number' && Number.isFinite(o.duration_ms)
      ? Math.round(o.duration_ms)
      : typeof o.durationMs === 'number' && Number.isFinite(o.durationMs)
        ? Math.round(o.durationMs)
        : undefined;
  let dimensions: { w?: number; h?: number } | undefined;
  const dim = o.dimensions ?? o.size;
  if (dim && typeof dim === 'object') {
    const d = dim as Record<string, unknown>;
    const w = typeof d.w === 'number' && Number.isFinite(d.w) ? Math.round(d.w) : undefined;
    const h = typeof d.h === 'number' && Number.isFinite(d.h) ? Math.round(d.h) : undefined;
    if (w !== undefined || h !== undefined) dimensions = { w, h };
  }
  let transcript_span: { start_ms?: number; end_ms?: number } | undefined;
  const ts = o.transcript_span ?? o.transcriptSpan;
  if (ts && typeof ts === 'object') {
    const t = ts as Record<string, unknown>;
    const start_ms =
      typeof t.start_ms === 'number' && Number.isFinite(t.start_ms)
        ? Math.round(t.start_ms)
        : typeof t.startMs === 'number' && Number.isFinite(t.startMs)
          ? Math.round(t.startMs)
          : undefined;
    const end_ms =
      typeof t.end_ms === 'number' && Number.isFinite(t.end_ms)
        ? Math.round(t.end_ms)
        : typeof t.endMs === 'number' && Number.isFinite(t.endMs)
          ? Math.round(t.endMs)
          : undefined;
    if (start_ms !== undefined || end_ms !== undefined) transcript_span = { start_ms, end_ms };
  }
  const out: AiMultimodalContextRef = {};
  if (modality) out.modality = modality;
  if (mime_type) out.mime_type = mime_type;
  if (uri_hint) out.uri_hint = uri_hint.replace(/\bBearer\s+\S+/gi, '[redacted]');
  if (duration_ms !== undefined) out.duration_ms = duration_ms;
  if (dimensions) out.dimensions = dimensions;
  if (transcript_span) out.transcript_span = transcript_span;
  return Object.keys(out).length ? out : undefined;
}

/** Normalize one citation record from model JSON or persisted workspace rows. */
export function sanitizeAiCitationChunk(raw: unknown): AiCitationChunk | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const out: AiCitationChunk = {};

  const chunk_id = coerceChunkId(o.chunk_id ?? o.chunkId);
  const source = clipStr(o.source ?? o.source_name ?? o.title, MAX_STRING_FIELD);
  const page = coercePage(o.page ?? o.page_number ?? o.pageNumber);
  const source_type = parseSourceType(o.source_type ?? o.sourceType);
  const retrieval_timestamp = clipStr(
    o.retrieval_timestamp ?? o.retrievalTimestamp ?? o.retrieved_at,
    64
  );
  const confidence = clampConfidence(o.confidence ?? o.score);
  const embedding_region = clipStr(o.embedding_region ?? o.embeddingRegion, 120);
  const workspace_entity_id = clipStr(
    o.workspace_entity_id ?? o.workspaceEntityId ?? o.entity_id,
    MAX_CHUNK_ID_LEN
  );
  const message_id = clipStr(o.message_id ?? o.messageId, MAX_CHUNK_ID_LEN);
  const agent_step_id = clipStr(o.agent_step_id ?? o.agentStepId, MAX_CHUNK_ID_LEN);
  const excerpt = clipStr(o.excerpt ?? o.snippet ?? o.text_span, MAX_EXCERPT_LEN);
  const multimodal = sanitizeMultimodal(o.multimodal);

  if (
    chunk_id !== undefined &&
    chunk_id !== null &&
    !(typeof chunk_id === 'string' && chunk_id.length === 0)
  ) {
    out.chunk_id = chunk_id;
  }
  if (source) out.source = source;
  if (page !== undefined) out.page = page;
  if (source_type) out.source_type = source_type;
  if (retrieval_timestamp) out.retrieval_timestamp = retrieval_timestamp;
  if (confidence !== undefined) out.confidence = confidence;
  if (embedding_region) out.embedding_region = embedding_region;
  if (workspace_entity_id) out.workspace_entity_id = workspace_entity_id;
  if (message_id) out.message_id = message_id;
  if (agent_step_id) out.agent_step_id = agent_step_id;
  if (excerpt) out.excerpt = excerpt;
  if (multimodal) out.multimodal = multimodal;

  return Object.keys(out).length ? out : null;
}

export function sanitizeAiCitationChunks(raw: unknown): AiCitationChunk[] {
  if (!Array.isArray(raw)) return [];
  const out: AiCitationChunk[] = [];
  for (const item of raw) {
    const c = sanitizeAiCitationChunk(item);
    if (c) out.push(c);
    if (out.length >= MAX_CITATIONS_TOTAL) break;
  }
  return out;
}

function collectCitationsFromJsonRoot(
  root: Record<string, unknown>,
  into: AiCitationChunk[]
): void {
  const prov = root.brandOpsAiProvenance ?? root.brand_ops_ai_provenance;
  if (prov && typeof prov === 'object') {
    const p = prov as Record<string, unknown>;
    into.push(...sanitizeAiCitationChunks(p.citations ?? p.evidence ?? p.chunks));
  }
  if (Array.isArray(root.citations)) {
    into.push(...sanitizeAiCitationChunks(root.citations));
  }
}

function dedupeCitations(items: AiCitationChunk[]): AiCitationChunk[] {
  const seen = new Set<string>();
  const out: AiCitationChunk[] = [];
  for (const c of items) {
    const key = `${c.chunk_id === undefined || c.chunk_id === null ? '' : String(c.chunk_id)}|${c.source ?? ''}|${String(c.page ?? '')}|${c.workspace_entity_id ?? ''}|${c.excerpt ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= MAX_CITATIONS_TOTAL) break;
  }
  return out;
}

function mergeGovernanceFromJsonRoot(
  root: Record<string, unknown>,
  into: BrandOpsAiProvenanceGovernanceMeta
): void {
  const prov = root.brandOpsAiProvenance ?? root.brand_ops_ai_provenance;
  if (!prov || typeof prov !== 'object') return;
  mergeGovernanceMeta(into, prov as Record<string, unknown>);
}

function mergeGovernanceMeta(
  into: BrandOpsAiProvenanceGovernanceMeta,
  prov: Record<string, unknown>
): void {
  const tagsRaw = prov.governance_tags ?? prov.governanceTags;
  if (Array.isArray(tagsRaw)) {
    const next: string[] = [...(into.governance_tags ?? [])];
    for (const t of tagsRaw) {
      if (typeof t !== 'string') continue;
      const s = t.trim().slice(0, 64);
      if (s && !next.includes(s)) next.push(s);
      if (next.length >= 24) break;
    }
    if (next.length) into.governance_tags = next;
  }
  const hr = prov.hallucination_risk ?? prov.hallucinationRisk;
  if (hr === 'low' || hr === 'medium' || hr === 'high' || hr === 'unknown') {
    into.hallucination_risk = hr;
  }
  const ec = prov.evidence_completeness ?? prov.evidenceCompleteness;
  if (ec === 'full' || ec === 'partial' || ec === 'none') {
    into.evidence_completeness = ec;
  }
  const miss = prov.missing_evidence_notes ?? prov.missingEvidenceNotes;
  if (Array.isArray(miss)) {
    const lines: string[] = [];
    for (const x of miss) {
      if (typeof x !== 'string') continue;
      const s = x.trim().slice(0, 200);
      if (s) lines.push(s);
      if (lines.length >= 8) break;
    }
    if (lines.length) into.missing_evidence_notes = lines;
  }
  const repro = prov.reproduction_notes ?? prov.reproductionNotes;
  if (typeof repro === 'string' && repro.trim()) {
    into.reproduction_notes = repro.trim().slice(0, 600);
  }
}

export function governanceMetaNonEmpty(g: BrandOpsAiProvenanceGovernanceMeta): boolean {
  return Boolean(
    g.governance_tags?.length ||
    g.hallucination_risk ||
    g.evidence_completeness ||
    g.missing_evidence_notes?.length ||
    g.reproduction_notes
  );
}

/**
 * Remove machine envelopes (`brandOpsAiProvenance`, structured automation, JSON answer+citations blocks)
 * from visible transcript text. Fences with unrecognized JSON are left intact.
 */
export function stripAskStructuredJsonFences(modelText: string): string {
  const next = modelText.replace(/```(?:json)?\s*([\s\S]*?)```/gi, (_full, body: string) => {
    const trimmed = body.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) return _full;
    try {
      const o = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      if (
        o.brandOpsAiProvenance ||
        o.brand_ops_ai_provenance ||
        o.brandOpsStructuredApply ||
        o.brandOpsActionPipeline ||
        o.brand_ops_structured_apply ||
        o.brand_ops_action_pipeline ||
        (typeof o.answer === 'string' && (Array.isArray(o.citations) || o.brandOpsAiProvenance))
      ) {
        return '';
      }
    } catch {
      return _full;
    }
    return _full;
  });
  return next
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type ParsedHostedAskResponse = {
  displayText: string;
  citations: AiCitationChunk[];
  governanceMeta?: BrandOpsAiProvenanceGovernanceMeta;
};

/**
 * Split hosted model output into human-visible prose and structured citations.
 * Always parses automation JSON from the original string separately — callers should run
 * {@link parseAiExecutablePayload} on the raw body before relying on display text alone.
 */
export function parseHostedAskResponse(modelText: string): ParsedHostedAskResponse {
  const citations: AiCitationChunk[] = [];
  const governanceAccum: BrandOpsAiProvenanceGovernanceMeta = {};
  const mergedInto = () => dedupeCitations(citations);

  const trimmed = modelText.trim();
  if (trimmed.startsWith('{')) {
    try {
      const root = JSON.parse(trimmed) as Record<string, unknown>;
      collectCitationsFromJsonRoot(root, citations);
      mergeGovernanceFromJsonRoot(root, governanceAccum);
      if (typeof root.answer === 'string') {
        const governanceMeta = governanceMetaNonEmpty(governanceAccum)
          ? governanceAccum
          : undefined;
        return {
          displayText: root.answer.trim(),
          citations: mergedInto(),
          ...(governanceMeta ? { governanceMeta } : {})
        };
      }
    } catch {
      /* fall through */
    }
  }

  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(modelText)) !== null) {
    const inner = m[1].trim();
    const start = inner.indexOf('{');
    const end = inner.lastIndexOf('}');
    if (start === -1 || end <= start) continue;
    try {
      const root = JSON.parse(inner.slice(start, end + 1)) as Record<string, unknown>;
      collectCitationsFromJsonRoot(root, citations);
      mergeGovernanceFromJsonRoot(root, governanceAccum);
    } catch {
      /* skip bad fence */
    }
  }

  const stripped = stripAskStructuredJsonFences(modelText);
  const deduped = mergedInto();
  let displayText = stripped.length > 0 ? stripped : trimmed;
  if (!displayText.trim().length && deduped.length > 0) {
    displayText = 'Structured citations attached — expand Evidence below.';
  }
  const governanceMeta = governanceMetaNonEmpty(governanceAccum) ? governanceAccum : undefined;
  return {
    displayText,
    citations: deduped,
    ...(governanceMeta ? { governanceMeta } : {})
  };
}

/** Compact chip title for tests + UI consistency. */
export function formatEvidenceChipTitle(c: AiCitationChunk): string {
  const cid = c.chunk_id !== undefined && c.chunk_id !== null ? `#${String(c.chunk_id)}` : null;
  const src = c.source?.trim() || 'Source';
  const pg =
    c.page !== undefined ? (typeof c.page === 'number' ? `p.${c.page}` : String(c.page)) : null;
  const conf = typeof c.confidence === 'number' ? `${Math.round(c.confidence * 100)}%` : null;
  return [cid, src, pg, conf].filter(Boolean).join(' · ');
}
