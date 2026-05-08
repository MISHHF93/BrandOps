import type { AiCitationChunk, BrandOpsData } from '../../types/domain';
import type {
  AssistantAskTraceSummaryUI,
  BrandOpsAiProvenanceGovernanceMeta,
  EvidenceLink,
  ModelInvocation,
  TraceBundle,
  AIArtifact,
  RetrievalChunk
} from '../../types/aiTraceGraph';
import { AI_TRACE_GRAPH_SCHEMA_VERSION } from '../../types/aiTraceGraph';
import { governanceMetaNonEmpty } from './aiIoProvenance';
import { fingerprintTextSnippet } from './llmStructuredApply';
import { discoverWorkspaceArtifactsForTrace } from './workspaceArtifactDiscovery';

function uidSuffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeClientGovernanceFallback(
  modelGov: BrandOpsAiProvenanceGovernanceMeta | undefined,
  citationsLen: number,
  orphanCount: number
): BrandOpsAiProvenanceGovernanceMeta | undefined {
  const base: BrandOpsAiProvenanceGovernanceMeta = { ...(modelGov ?? {}) };
  if (base.evidence_completeness === undefined) {
    base.evidence_completeness = citationsLen ? 'partial' : 'none';
  }
  if (base.evidence_completeness === 'full' && citationsLen === 0) {
    base.evidence_completeness = 'none';
  }
  if (base.hallucination_risk === undefined) {
    base.hallucination_risk = 'unknown';
  }
  if (orphanCount > 0) {
    const lines = [...(base.missing_evidence_notes ?? [])];
    lines.push(`${orphanCount} inline marker(s) did not resolve to a citation row.`);
    base.missing_evidence_notes = lines.slice(0, 8);
  }
  return governanceMetaNonEmpty(base) ? base : undefined;
}

export function toAssistantAskTraceSummaryUI(b: TraceBundle): AssistantAskTraceSummaryUI {
  const inv = b.invocations[0];
  const gm = b.governance_meta;
  return {
    trace_id: b.trace_id,
    prompt_hash: inv?.prompt_hash,
    output_hash: inv?.output_hash,
    model: inv?.model,
    provider: inv?.provider,
    governance_tags: gm?.governance_tags,
    hallucination_risk: gm?.hallucination_risk,
    evidence_completeness: gm?.evidence_completeness,
    missing_evidence_notes: gm?.missing_evidence_notes
  };
}

export function buildAssistantAskTraceBundle(args: {
  brandData: BrandOpsData;
  traceId?: string;
  question: string;
  assistantMessageId: string;
  displayText: string;
  citations: AiCitationChunk[];
  governanceMeta?: BrandOpsAiProvenanceGovernanceMeta;
  orphanInlineMarkers: string[];
  modelId: string;
  providerHint?: string;
  workerId?: string | null;
  durationMs: number;
}): TraceBundle {
  const trace_id = args.traceId ?? `trace-${uidSuffix()}`;
  const created_at = new Date().toISOString();
  const surface = 'assistant_chat';

  const promptPreview = args.question.trim().slice(0, 2800);
  const outputPreview = args.displayText.trim().slice(0, 2800);
  const prompt_hash = fingerprintTextSnippet(promptPreview);
  const output_hash = fingerprintTextSnippet(outputPreview);

  const userArtifactId = `${trace_id}:input:user_prompt`;
  const outArtifactId = `${trace_id}:output:assistant`;
  const invArtifactId = `${trace_id}:anchor:invocation`;
  const invModelId = `${trace_id}:inv:model`;

  const artifacts: AIArtifact[] = [
    {
      artifact_id: userArtifactId,
      trace_id,
      kind: 'user_prompt',
      created_at,
      modality: 'text',
      message_id: args.assistantMessageId,
      content_preview: promptPreview.slice(0, 220)
    },
    {
      artifact_id: outArtifactId,
      trace_id,
      kind: 'assistant_output',
      parent_artifact_id: userArtifactId,
      created_at,
      modality: 'text',
      message_id: args.assistantMessageId,
      content_preview: outputPreview.slice(0, 220)
    },
    {
      artifact_id: invArtifactId,
      trace_id,
      kind: 'model_invocation_anchor',
      parent_artifact_id: userArtifactId,
      created_at,
      modality: 'text'
    }
  ];

  const retrieval_chunks: RetrievalChunk[] = args.citations.map((c) => ({ ...c }));

  args.citations.forEach((c, i) => {
    const id = `${trace_id}:retrieval:${i}`;
    artifacts.push({
      artifact_id: id,
      trace_id,
      kind: 'retrieval_chunk',
      parent_artifact_id: invArtifactId,
      created_at,
      chunk_id: c.chunk_id,
      source: c.source,
      source_type: c.source_type,
      page: c.page,
      modality: c.multimodal?.modality ?? 'text',
      workspace_entity_id: c.workspace_entity_id,
      content_preview: c.excerpt?.slice(0, 160)
    });
  });

  const workspaceRefs = discoverWorkspaceArtifactsForTrace(args.brandData, trace_id, {
    max: 20
  });
  artifacts.push(...workspaceRefs);

  const invocations: ModelInvocation[] = [
    {
      invocation_id: invModelId,
      trace_id,
      created_at,
      model: args.modelId,
      provider: args.providerHint,
      prompt_hash,
      output_hash,
      duration_ms: args.durationMs
    }
  ];

  const links: EvidenceLink[] = [
    {
      link_id: `${trace_id}:l1`,
      trace_id,
      from_artifact_id: invModelId,
      to_artifact_id: userArtifactId,
      relation: 'triggered_by'
    },
    {
      link_id: `${trace_id}:l2`,
      trace_id,
      from_artifact_id: invModelId,
      to_artifact_id: outArtifactId,
      relation: 'produced'
    },
    {
      link_id: `${trace_id}:l3`,
      trace_id,
      from_artifact_id: invArtifactId,
      to_artifact_id: invModelId,
      relation: 'derived_from'
    }
  ];

  args.citations.forEach((_, i) => {
    links.push({
      link_id: `${trace_id}:lc:${i}`,
      trace_id,
      from_artifact_id: `${trace_id}:retrieval:${i}`,
      to_artifact_id: outArtifactId,
      relation: 'cites'
    });
  });

  for (const ref of workspaceRefs) {
    links.push({
      link_id: `${trace_id}:lw:${ref.artifact_id}`,
      trace_id,
      from_artifact_id: ref.artifact_id,
      to_artifact_id: outArtifactId,
      relation: 'affects_workspace'
    });
  }

  const governance_meta = mergeClientGovernanceFallback(
    args.governanceMeta,
    args.citations.length,
    args.orphanInlineMarkers.length
  );

  return {
    trace_id,
    schema_version: AI_TRACE_GRAPH_SCHEMA_VERSION,
    created_at,
    surface,
    root_message_id: args.assistantMessageId,
    message_id: args.assistantMessageId,
    worker_id: args.workerId ?? undefined,
    artifacts,
    links,
    invocations,
    retrieval_chunks,
    orphan_inline_markers: args.orphanInlineMarkers.length ? args.orphanInlineMarkers : undefined,
    governance_meta
  };
}
