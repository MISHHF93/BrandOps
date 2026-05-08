/**
 * Canonical BrandOps AI & Plan primitives — **aliases and documentation only**.
 * Persisted shapes remain in `domain.ts`, `aiIntegrationSuite.ts`, and `aiTraceGraph.ts`.
 *
 * Two-page product layout:
 * - **Ask** — conversation, citations, routing, trust/evidence signals.
 * - **Plan** — execution, pipelines, audits, reviews, integrations, settings hub.
 */
import type {
  AgentAuditEntry,
  AgentAuditState,
  AiAssistantTraceLogState,
  AiAssistantTurnTrace,
  AiCitationChunk,
  BrandProfile,
  OperatorTraceEntry
} from './domain';
import type {
  AiPipelineRunLogState,
  AIPipeline,
  AIPipelineStep,
  ModelEvaluationResult,
  PipelineRun,
  PipelineStepRun
} from './aiIntegrationSuite';
import type {
  AIArtifact,
  AICitation,
  AITrace,
  AIWorkspaceTraceIndexState,
  AssistantAskTraceSummaryUI,
  BrandOpsAiProvenanceGovernanceMeta,
  EvidenceLink,
  ModelInvocation,
  RetrievalChunk,
  TraceBundle
} from './aiTraceGraph';

/** Canonical citation row for Assistant output — same persistence as workspace JSON. */
export type { AiCitationChunk as CanonicalAiCitationChunk };
export type { AICitation, RetrievalChunk };

/** Graph bundle persisted under `BrandOpsData.aiTraceGraph.bundles`. */
export type { TraceBundle as CanonicalTraceBundle };

/** Slim trace headers used inside bundles and indexes. */
export type { AITrace };

/** One Assistant turn with citations — `BrandOpsData.aiAssistantTraces.entries`. */
export type { AiAssistantTurnTrace as AiConversationTurnTrace };

export type { AiAssistantTraceLogState };

/** Declarative automation template — alias of integration-suite pipeline definition. */
export type AgentPlan = AIPipeline;
export type AgentPlanStep = AIPipelineStep;

/** Single execution audit row — `BrandOpsData.aiPipelineRuns`. */
export type { PipelineRun as CanonicalPipelineRun };
export type { PipelineStepRun };
export type { AiPipelineRunLogState };

/** Rubric hook — extend when evaluation lab wires to hosted runs. */
export interface EvaluationRun {
  run_id: string;
  created_at: string;
  task_label: string;
  result: ModelEvaluationResult;
}

/** Operator-side review intent — maps to `OperatorTraceEntry` when `reviewStatus` is set. */
export type ReviewRequest = Pick<
  OperatorTraceEntry,
  'id' | 'at' | 'verb' | 'surface' | 'reviewStatus' | 'annotatorNote'
>;

/** Lightweight policy row for Plan summaries — derived from packaged rules, not a second rules engine. */
export interface GovernancePolicy {
  policy_id: string;
  label: string;
  schema_version: number;
}

/** Voice/positioning snapshot — subset of `BrandProfile` for panels that must not drag vault lists. */
export type BrandVoiceProfile = Pick<
  BrandProfile,
  'operatorName' | 'positioning' | 'primaryOffer' | 'voiceGuide'
>;

/** Projection node for memory-graph summaries (no parallel graph store). */
export type MemoryNode = Pick<
  AIArtifact,
  'artifact_id' | 'kind' | 'content_preview' | 'created_at'
>;

export type MemoryEdge = Pick<
  EvidenceLink,
  'link_id' | 'relation' | 'from_artifact_id' | 'to_artifact_id'
>;

/** Agent command audit — canonical storage `BrandOpsData.agentAudit`. */
export type AgentAuditTrailEntry = AgentAuditEntry;
export type { AgentAuditState };

export type AiTraceGraphIndex = AIWorkspaceTraceIndexState;

export type {
  AssistantAskTraceSummaryUI,
  BrandOpsAiProvenanceGovernanceMeta,
  EvidenceLink,
  ModelInvocation,
  AIArtifact
};
