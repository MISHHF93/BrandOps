/**
 * AI Integration Suite — provider/model/task taxonomy, routing policies, and pipeline runs.
 * Persist only operator preferences + run metadata in workspace JSON — never API secrets.
 */

export type AiOperatorMode =
  | 'fast'
  | 'balanced'
  | 'deep_reasoning'
  | 'private_local'
  | 'best_evidence';

/** Logical jobs the router can optimize for (maps to scoring dimensions). */
export type AITaskType =
  | 'hosted_assistant'
  | 'reasoning'
  | 'drafting'
  | 'summarization'
  | 'rag_retrieval'
  | 'classification'
  | 'embeddings'
  | 'vision'
  | 'audio'
  | 'browser_automation_support'
  | 'governance_review'
  | 'hallucination_check'
  | 'local_offline_task'
  | 'linkedin_content'
  | 'source_grounded_answer'
  | 'document_summary'
  | 'workspace_audit_report'
  | 'integration_sync_analysis'
  | 'citation_validation'
  | 'multimodal_artifact';

/** Semantic capability scores for a concrete model id (0–1 when set). */
export interface AIModelCapability {
  reasoning?: number;
  drafting?: number;
  summarization?: number;
  rag_retrieval?: number;
  classification?: number;
  embeddings?: number;
  vision?: number;
  audio?: number;
  browser_automation_support?: number;
  governance_review?: number;
  hallucination_check?: number;
  local_offline?: number;
  citation_support?: number;
  structured_output?: number;
  /** Higher = faster / lower latency preference */
  latency_score?: number;
  /** Higher = cheaper preference */
  cost_score?: number;
  /** Higher = more dependable for operators */
  reliability_score?: number;
}

/** Named routing recipe for an operator mode × task. */
export interface AIRoutingPolicy {
  policy_id: string;
  label: string;
  mode: AiOperatorMode;
  primary_task: AITaskType;
  /** Relative weights for scoring (names align with AIModelCapability + latency/cost/reliability). */
  weights: Partial<
    Record<keyof AIModelCapability | 'latency_score' | 'cost_score' | 'reliability_score', number>
  >;
  /** Lower index = higher fallback priority when scores tie */
  fallback_priority: string[];
}

export type PipelineStepKind =
  | 'validate_inputs'
  | 'deterministic_digest'
  | 'hosted_completion'
  | 'governance_checkpoint'
  | 'human_review_gate'
  | 'export_audit_metadata';

export interface AIPipelineStep {
  step_id: string;
  kind: PipelineStepKind;
  label: string;
  /** Soft requirement — runner may skip with note when deps missing */
  task_hint?: AITaskType;
  requires_human_ok?: boolean;
}

export interface AIPipeline {
  pipeline_id: string;
  label: string;
  description: string;
  task_family: AITaskType;
  steps: AIPipelineStep[];
}

export type PipelineStepRunStatus = 'pending' | 'running' | 'success' | 'failure' | 'skipped';

export interface PipelineStepRun {
  step_id: string;
  status: PipelineStepRunStatus;
  started_at?: string;
  ended_at?: string;
  detail?: string;
}

export type PipelineRunStatus = 'running' | 'success' | 'failure' | 'partial';

export interface PipelineRun {
  run_id: string;
  pipeline_id: string;
  schema_version: string;
  started_at: string;
  ended_at?: string;
  status: PipelineRunStatus;
  operator_mode?: AiOperatorMode;
  selected_model_id?: string;
  steps: PipelineStepRun[];
  error_message?: string;
  /** Compact routing / QA hooks for exports */
  audit_tags?: string[];
}

/** Lightweight rubric output for future evaluator hooks / provider comparison. */
export interface ModelEvaluationResult {
  model_id: string;
  task_type: AITaskType;
  rubric_version: string;
  scores: Partial<
    Record<'groundedness' | 'helpfulness' | 'concision' | 'format_compliance', number>
  >;
  notes?: string[];
}

export const AI_PIPELINE_RUN_SCHEMA_VERSION = '1.0.0';

export interface AiPipelineRunLogState {
  schema_version: string;
  entries: PipelineRun[];
}
