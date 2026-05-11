import type { BrandOpsData } from '../../types/domain';
import type {
  AIArtifact,
  AIArtifactKind,
  AssistantAskTraceSummaryUI,
  BrandOpsAiProvenanceGovernanceMeta,
  EvidenceLink,
  ModelInvocation,
  TraceBundle
} from '../../types/aiTraceGraph';
import { AI_TRACE_GRAPH_SCHEMA_VERSION } from '../../types/aiTraceGraph';
import { sanitizeAiCitationChunks } from './aiIoProvenance';
import { sanitizeOrphanInlineMarkers } from './aiInlineCitations';

export const MAX_AI_TRACE_BUNDLES = 120;
const MAX_ARTIFACTS = 200;
const MAX_LINKS = 400;
const MAX_ORPHAN_MARKERS = 24;
const MAX_ID_LEN = 160;
const MAX_PREVIEW = 280;

const ARTIFACT_KINDS = new Set<AIArtifactKind>([
  'user_prompt',
  'assistant_output',
  'retrieval_chunk',
  'workspace_entity_ref',
  'integration_record_ref',
  'help_topic_ref',
  'content_library_ref',
  'tool_call',
  'model_invocation_anchor'
]);

function clipStr(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function sanitizeArtifact(raw: unknown, fallbackTraceId: string): AIArtifact | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const artifact_id = clipStr(o.artifact_id, MAX_ID_LEN);
  const trace_id = clipStr(o.trace_id, MAX_ID_LEN) ?? fallbackTraceId;
  const kindRaw = clipStr(o.kind, 48);
  const created_at = clipStr(o.created_at, 64);
  if (!artifact_id || !kindRaw || !created_at) return null;
  if (!ARTIFACT_KINDS.has(kindRaw as AIArtifactKind)) return null;
  const kind = kindRaw as AIArtifactKind;
  const a: AIArtifact = {
    artifact_id,
    trace_id,
    kind,
    created_at
  };
  const parent = clipStr(o.parent_artifact_id, MAX_ID_LEN);
  if (parent) a.parent_artifact_id = parent;
  const modality = clipStr(o.modality, 32);
  if (modality) a.modality = modality;
  const workspace_entity_id = clipStr(o.workspace_entity_id, MAX_ID_LEN);
  if (workspace_entity_id) a.workspace_entity_id = workspace_entity_id;
  const chunk_id = o.chunk_id;
  if (typeof chunk_id === 'number' && Number.isFinite(chunk_id)) a.chunk_id = chunk_id;
  else {
    const cs = clipStr(chunk_id, 120);
    if (cs) a.chunk_id = cs;
  }
  const message_id = clipStr(o.message_id, MAX_ID_LEN);
  if (message_id) a.message_id = message_id;
  const agent_step_id = clipStr(o.agent_step_id, MAX_ID_LEN);
  if (agent_step_id) a.agent_step_id = agent_step_id;
  const url = clipStr(o.url, 400);
  if (url) a.url = url;
  const source = clipStr(o.source, 240);
  if (source) a.source = source;
  const source_type = clipStr(o.source_type, 96);
  if (source_type) a.source_type = source_type;
  if (typeof o.page === 'number' && Number.isFinite(o.page)) a.page = Math.round(o.page);
  else {
    const pg = clipStr(o.page, 64);
    if (pg) a.page = pg;
  }
  const tags = Array.isArray(o.governance_tags)
    ? o.governance_tags
        .filter((x): x is string => typeof x === 'string')
        .map((t) => t.trim().slice(0, 64))
        .filter(Boolean)
        .slice(0, 24)
    : [];
  if (tags.length) a.governance_tags = tags;
  const preview = clipStr(o.content_preview, MAX_PREVIEW);
  if (preview) a.content_preview = preview;
  return a;
}

function sanitizeEvidenceLink(raw: unknown, fallbackTraceId: string): EvidenceLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const link_id = clipStr(o.link_id, MAX_ID_LEN);
  const trace_id = clipStr(o.trace_id, MAX_ID_LEN) ?? fallbackTraceId;
  const from_artifact_id = clipStr(o.from_artifact_id, MAX_ID_LEN);
  const to_artifact_id = clipStr(o.to_artifact_id, MAX_ID_LEN);
  const rel = clipStr(o.relation, 32);
  const allowed = new Set<EvidenceLink['relation']>([
    'triggered_by',
    'retrieved_from',
    'produced',
    'cites',
    'affects_workspace',
    'derived_from'
  ]);
  if (
    !link_id ||
    !from_artifact_id ||
    !to_artifact_id ||
    !rel ||
    !allowed.has(rel as EvidenceLink['relation'])
  )
    return null;
  return {
    link_id,
    trace_id,
    from_artifact_id,
    to_artifact_id,
    relation: rel as EvidenceLink['relation']
  };
}

function sanitizeModelInvocation(raw: unknown, fallbackTraceId: string): ModelInvocation | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const invocation_id = clipStr(o.invocation_id, MAX_ID_LEN);
  const trace_id = clipStr(o.trace_id, MAX_ID_LEN) ?? fallbackTraceId;
  const created_at = clipStr(o.created_at, 64);
  if (!invocation_id || !created_at) return null;
  const inv: ModelInvocation = {
    invocation_id,
    trace_id,
    created_at
  };
  const model = clipStr(o.model, 160);
  if (model) inv.model = model;
  const provider = clipStr(o.provider, 160);
  if (provider) inv.provider = provider;
  const prompt_hash = clipStr(o.prompt_hash, 96);
  if (prompt_hash) inv.prompt_hash = prompt_hash;
  const output_hash = clipStr(o.output_hash, 96);
  if (output_hash) inv.output_hash = output_hash;
  if (typeof o.duration_ms === 'number' && Number.isFinite(o.duration_ms)) {
    inv.duration_ms = Math.round(o.duration_ms);
  }
  return inv;
}

/** Clamp and strip unsafe fields from a trace bundle before persistence or export. */
export function sanitizeTraceBundle(input: TraceBundle): TraceBundle {
  const trace_id = clipStr(input.trace_id, MAX_ID_LEN) ?? `trace-${Date.now().toString(36)}`;
  const created_at = clipStr(input.created_at, 64) ?? new Date().toISOString();
  const s = input.surface;
  const surface =
    s === 'assistant_chat' ||
    s === 'linkedin_overlay' ||
    s === 'workspace_automation' ||
    s === 'help_center' ||
    s === 'integration_hub'
      ? s
      : 'assistant_chat';
  const schema_version = clipStr(input.schema_version, 48) ?? AI_TRACE_GRAPH_SCHEMA_VERSION;

  const artifacts: AIArtifact[] = [];
  for (const raw of input.artifacts ?? []) {
    const a = sanitizeArtifact(raw, trace_id);
    if (a) artifacts.push(a);
    if (artifacts.length >= MAX_ARTIFACTS) break;
  }

  const links: EvidenceLink[] = [];
  for (const raw of input.links ?? []) {
    const l = sanitizeEvidenceLink(raw, trace_id);
    if (l) links.push(l);
    if (links.length >= MAX_LINKS) break;
  }

  const invocations: ModelInvocation[] = [];
  for (const raw of input.invocations ?? []) {
    const inv = sanitizeModelInvocation(raw, trace_id);
    if (inv) invocations.push(inv);
    if (invocations.length >= 32) break;
  }

  const retrieval_chunks = sanitizeAiCitationChunks(input.retrieval_chunks);

  const orphan_inline_markers = sanitizeOrphanInlineMarkers(
    Array.isArray(input.orphan_inline_markers)
      ? input.orphan_inline_markers.filter((x): x is string => typeof x === 'string')
      : []
  ).slice(0, MAX_ORPHAN_MARKERS);

  let governance_meta: BrandOpsAiProvenanceGovernanceMeta | undefined;
  const gmRaw = input.governance_meta;
  if (gmRaw && typeof gmRaw === 'object') {
    const g = gmRaw as Record<string, unknown>;
    const next: BrandOpsAiProvenanceGovernanceMeta = {};
    if (Array.isArray(g.governance_tags)) {
      const governance_tags = g.governance_tags
        .filter((x): x is string => typeof x === 'string')
        .map((t) => t.trim().slice(0, 64))
        .filter(Boolean)
        .slice(0, 24);
      if (governance_tags.length) next.governance_tags = governance_tags;
    }
    const hr = g.hallucination_risk;
    if (hr === 'low' || hr === 'medium' || hr === 'high' || hr === 'unknown') {
      next.hallucination_risk = hr;
    }
    const ec = g.evidence_completeness;
    if (ec === 'full' || ec === 'partial' || ec === 'none') {
      next.evidence_completeness = ec;
    }
    if (Array.isArray(g.missing_evidence_notes)) {
      const missing_evidence_notes = g.missing_evidence_notes
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim().slice(0, 220))
        .filter(Boolean)
        .slice(0, 8);
      if (missing_evidence_notes.length) next.missing_evidence_notes = missing_evidence_notes;
    }
    if (typeof g.reproduction_notes === 'string' && g.reproduction_notes.trim()) {
      next.reproduction_notes = g.reproduction_notes.trim().slice(0, 600);
    }
    governance_meta = Object.keys(next).length ? next : undefined;
  }

  const root_message_id = clipStr(input.root_message_id, MAX_ID_LEN);
  const message_id = clipStr(input.message_id, MAX_ID_LEN);
  const worker_id = clipStr(input.worker_id, MAX_ID_LEN);

  const bundle: TraceBundle = {
    trace_id,
    schema_version,
    created_at,
    surface,
    ...(root_message_id ? { root_message_id } : {}),
    ...(message_id ? { message_id } : {}),
    ...(worker_id ? { worker_id } : {}),
    artifacts,
    links,
    invocations,
    retrieval_chunks,
    ...(orphan_inline_markers.length ? { orphan_inline_markers } : {}),
    ...(governance_meta ? { governance_meta } : {})
  };
  return bundle;
}

export function prependAITraceBundle(data: BrandOpsData, bundle: TraceBundle): BrandOpsData {
  if (!data.settings.operatorTraceCollectionEnabled) return data;
  const sanitized = sanitizeTraceBundle(bundle);
  const prior = data.aiTraceGraph?.bundles ?? [];
  return {
    ...data,
    aiTraceGraph: {
      schema_version: AI_TRACE_GRAPH_SCHEMA_VERSION,
      bundles: [sanitized, ...prior].slice(0, MAX_AI_TRACE_BUNDLES)
    }
  };
}

export function sanitizeAssistantAskTraceSummaryUI(
  raw: unknown
): AssistantAskTraceSummaryUI | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const trace_id = clipStr(o.trace_id, MAX_ID_LEN);
  if (!trace_id) return undefined;
  const out: AssistantAskTraceSummaryUI = { trace_id };
  const prompt_hash = clipStr(o.prompt_hash, 96);
  if (prompt_hash) out.prompt_hash = prompt_hash;
  const output_hash = clipStr(o.output_hash, 96);
  if (output_hash) out.output_hash = output_hash;
  const model = clipStr(o.model, 160);
  if (model) out.model = model;
  const provider = clipStr(o.provider, 160);
  if (provider) out.provider = provider;
  if (Array.isArray(o.governance_tags)) {
    const tags = o.governance_tags
      .filter((x): x is string => typeof x === 'string')
      .map((t) => t.trim().slice(0, 64))
      .filter(Boolean)
      .slice(0, 24);
    if (tags.length) out.governance_tags = tags;
  }
  const hr = o.hallucination_risk;
  if (hr === 'low' || hr === 'medium' || hr === 'high' || hr === 'unknown') {
    out.hallucination_risk = hr;
  }
  const ec = o.evidence_completeness;
  if (ec === 'full' || ec === 'partial' || ec === 'none') {
    out.evidence_completeness = ec;
  }
  if (Array.isArray(o.missing_evidence_notes)) {
    const lines = o.missing_evidence_notes
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim().slice(0, 220))
      .filter(Boolean)
      .slice(0, 8);
    if (lines.length) out.missing_evidence_notes = lines;
  }
  return out;
}
