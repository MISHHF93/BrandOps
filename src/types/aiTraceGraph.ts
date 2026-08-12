/**
 * AI I/O provenance graph primitives — auditable linkage between prompts, model runs,
 * retrieval chunks, workspace surfaces, and assistant output (local-first JSON only; no secrets).
 *
 * See {@link BrandOpsData.aiTraceGraph} in domain.ts (optional persisted index).
 */
import type { AiAssistantTraceSurface, AiCitationChunk } from './domain';

export const AI_TRACE_GRAPH_SCHEMA_VERSION = '1.0.0';

export type HallucinationRiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type EvidenceCompleteness = 'full' | 'partial' | 'none';

/** Structured extras models MAY attach beside citations inside `brandOpsAiProvenance`. */
export interface BrandOpsAiProvenanceGovernanceMeta {
  governance_tags?: string[];
  hallucination_risk?: HallucinationRiskLevel;
  evidence_completeness?: EvidenceCompleteness;
  missing_evidence_notes?: string[];
  reproduction_notes?: string;
}

export type RetrievalChunk = AiCitationChunk;

/** Canonical citation alias used by provenance graphs and exporters. */
export type AICitation = RetrievalChunk;

export type AIArtifactKind =
  | 'user_prompt'
  | 'assistant_output'
  | 'retrieval_chunk'
  | 'workspace_entity_ref'
  | 'integration_record_ref'
  | 'help_topic_ref'
  | 'content_library_ref'
  | 'tool_call'
  | 'model_invocation_anchor';

export interface AIArtifact {
  artifact_id: string;
  trace_id: string;
  kind: AIArtifactKind;
  parent_artifact_id?: string;
  created_at: string;
  modality?: string;
  workspace_entity_id?: string;
  chunk_id?: string | number;
  message_id?: string;
  agent_step_id?: string;
  url?: string;
  source?: string;
  source_type?: string;
  page?: number | string;
  governance_tags?: string[];
  /** Bounded non-sensitive preview only */
  content_preview?: string;
}

export interface ModelInvocation {
  invocation_id: string;
  trace_id: string;
  created_at: string;
  model?: string;
  provider?: string;
  /** Non-cryptographic deterministic fingerprint (see fingerprintTextSnippet). */
  prompt_hash?: string;
  output_hash?: string;
  duration_ms?: number;
}

export interface EvidenceLink {
  link_id: string;
  trace_id: string;
  from_artifact_id: string;
  to_artifact_id: string;
  relation:
    | 'triggered_by'
    | 'retrieved_from'
    | 'produced'
    | 'cites'
    | 'affects_workspace'
    | 'derived_from';
}

/** Slim trace header (subset of full bundle). */
export interface AITrace {
  trace_id: string;
  created_at: string;
  surface: AiAssistantTraceSurface | 'help_center' | 'integration_hub' | 'linkedin_overlay';
  root_message_id?: string;
}

/** Compact summary embedded in chat transcript JSON (no secrets). */
export interface AssistantAskTraceSummaryUI {
  trace_id: string;
  prompt_hash?: string;
  output_hash?: string;
  model?: string;
  provider?: string;
  governance_tags?: string[];
  hallucination_risk?: HallucinationRiskLevel;
  evidence_completeness?: EvidenceCompleteness;
  missing_evidence_notes?: string[];
}

/** Full persisted bundle — capped count in storage normalization. */
export interface TraceBundle extends AITrace {
  schema_version: string;
  message_id?: string;
  worker_id?: string;
  artifacts: AIArtifact[];
  links: EvidenceLink[];
  invocations: ModelInvocation[];
  retrieval_chunks: RetrievalChunk[];
  orphan_inline_markers?: string[];
  governance_meta?: BrandOpsAiProvenanceGovernanceMeta;
}

export interface AIWorkspaceTraceIndexState {
  schema_version: string;
  bundles: TraceBundle[];
}
