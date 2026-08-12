/**
 * Canonical observable execution state machine — the operational graph behind
 * Ask/Plan/approvals. See docs on the individual services under
 * `src/services/execution/` for how these types get populated.
 */
import type { OperatorTraceActor, OperatorTraceReviewStatus } from './domain';
import type { OperationalExpertId, OperationalExpertTask } from '../services/ai/expertRegistry';

export type ExecutionState =
  | 'IDLE'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'WORKING'
  | 'NEEDS_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

export const EXECUTION_STATE_TERMINAL: ReadonlySet<ExecutionState> = new Set([
  'COMPLETED',
  'FAILED',
  'REJECTED',
  'CANCELLED'
]);

/** Adjacency list of legal next states. Not exhaustive-enforced by the compiler; used defensively at emission sites. */
const EXECUTION_STATE_TRANSITIONS: Readonly<Record<ExecutionState, readonly ExecutionState[]>> = {
  IDLE: ['UNDERSTANDING'],
  UNDERSTANDING: ['PLANNING', 'WORKING', 'BLOCKED', 'FAILED', 'CANCELLED'],
  PLANNING: ['WORKING', 'NEEDS_APPROVAL', 'BLOCKED', 'FAILED', 'CANCELLED'],
  WORKING: ['NEEDS_APPROVAL', 'EXECUTING', 'COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED'],
  NEEDS_APPROVAL: ['EXECUTING', 'REJECTED', 'CANCELLED'],
  EXECUTING: ['VERIFYING', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED'],
  VERIFYING: ['COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  BLOCKED: ['UNDERSTANDING', 'PLANNING', 'WORKING', 'CANCELLED'],
  FAILED: [],
  REJECTED: [],
  CANCELLED: []
};

export function isValidExecutionTransition(from: ExecutionState, to: ExecutionState): boolean {
  if (from === to) return false;
  return EXECUTION_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export type CheckpointType =
  | 'ask.question'
  | 'ask.response'
  | 'ask.artifact_generated'
  | 'ask.convert_to_plan_requested'
  | 'plan.draft_created'
  | 'plan.saved'
  | 'plan.approval_requested'
  | 'plan.approval_granted'
  | 'plan.approval_rejected'
  | 'plan.execution_started'
  | 'plan.step_executed'
  | 'plan.execution_completed'
  | 'plan.execution_blocked'
  | 'plan.verified'
  | 'tool.invocation'
  /** Reserved — no real background/concurrent execution exists yet. */
  | 'background.operation'
  /** External agent (Claude Code / Codex / VS Code / MCP client) interoperability chain. */
  | 'agent.session_connected'
  | 'agent.event_ingested'
  | 'agent.achievement_detected'
  | 'agent.achievement_verified'
  | 'agent.achievement_promoted'
  | 'agent.context_supplied'
  | 'agent.artifact_proposed'
  | 'agent.opportunity_detected'
  | 'agent.action_requested'
  | 'agent.proposal_created'
  | 'agent.proposal_approved'
  | 'agent.proposal_rejected'
  | 'agent.proposal_converted';

export type CheckpointActionType =
  | 'continue'
  | 'branch'
  | 'retry'
  | 'inspect'
  | 'save'
  | 'pin'
  | 'convert_to_plan'
  | 'open_plan'
  | 'approve'
  | 'reject'
  | 'edit'
  | 'cancel'
  /** Reserved — never rendered/enabled; no safe versioned-snapshot mechanism exists to restore to. */
  | 'restore';

export interface CheckpointToolRef {
  expertId?: OperationalExpertId;
  integrationSourceId?: string;
}

export interface CheckpointErrorState {
  code: string;
  message: string;
  recoveryActions: CheckpointActionType[];
}

export interface CheckpointArtifactRef {
  kind: 'ai_core_artifact' | 'trace_bundle';
  id: string;
}

export interface CheckpointPlanRef {
  id: string;
  kind: 'draft' | 'saved';
}

export interface Checkpoint {
  id: string;
  conversationId: string;
  parentCheckpointId?: string;
  type: CheckpointType;
  state: ExecutionState;
  at: string;
  summary: string;
  /** For `ask.question` — the originating `ChatMessage.id`, so Retry can recover the full untruncated question text instead of the display-clamped `summary`. */
  sourceMessageId?: string;
  source: OperatorTraceActor;
  generatedArtifactRef?: CheckpointArtifactRef;
  associatedPlanRef?: CheckpointPlanRef;
  associatedTwinId?: string;
  toolRef?: CheckpointToolRef;
  approvalStatus?: OperatorTraceReviewStatus;
  errorState?: CheckpointErrorState;
  receiptRef?: string;
}

export interface CheckpointLogState {
  entries: Checkpoint[];
}

/**
 * Live UI signal for the current turn — replaces the old boolean
 * `commandLoading` flag with an observable {checkpoint, state, label}.
 */
export interface ActiveExecution {
  /** Unset for the first instant of a turn, before its root Checkpoint exists yet. */
  checkpointId?: string;
  state: ExecutionState;
  label: string;
}

/**
 * Five-tier permission model extending the existing ASK/PLAN/OPERATE split in
 * `expertOperatorIntegration.ts`. `EXTERNAL_ACTION`/`SENSITIVE_ACTION` label
 * what a task *would* require — nothing in the repo executes real external
 * side effects yet (see plan doc §2 / "Explicitly NOT built").
 */
export type PermissionTier =
  | 'READ'
  | 'GENERATE'
  | 'PREPARE'
  | 'EXTERNAL_ACTION'
  | 'SENSITIVE_ACTION';

const OPERATIONAL_TASK_TIER: Readonly<Record<OperationalExpertTask, PermissionTier>> = {
  positioning_strategy: 'GENERATE',
  message_refinement: 'GENERATE',
  audience_definition: 'PREPARE',
  outreach_drafting: 'GENERATE',
  relationship_follow_up: 'EXTERNAL_ACTION',
  reply_strategy: 'GENERATE',
  content_ideation: 'GENERATE',
  content_drafting: 'GENERATE',
  content_repurposing: 'GENERATE',
  plan_generation: 'PREPARE',
  plan_prioritization: 'PREPARE',
  execution_readiness: 'READ',
  opportunity_scoring: 'READ',
  pipeline_movement: 'READ',
  deal_risk_review: 'READ',
  behavior_prediction: 'READ',
  cadence_optimization: 'PREPARE',
  habit_signal_review: 'READ',
  integration_mapping: 'PREPARE',
  artifact_sync_review: 'READ',
  source_health_review: 'READ',
  memory_retrieval: 'READ',
  twin_grounding: 'READ',
  missing_info_detection: 'READ'
};

export function classifyOperationalTaskTier(task: OperationalExpertTask): PermissionTier {
  return OPERATIONAL_TASK_TIER[task] ?? 'PREPARE';
}

/** `READ`/`GENERATE`/`PREPARE` may run automatically; the other two require approval before executing. */
export function permissionTierRequiresApproval(tier: PermissionTier): boolean {
  return tier === 'EXTERNAL_ACTION' || tier === 'SENSITIVE_ACTION';
}
