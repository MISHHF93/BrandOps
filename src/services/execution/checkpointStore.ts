import type { BrandOpsData } from '../../types/domain';
import type {
  Checkpoint,
  CheckpointActionType,
  CheckpointType,
  ExecutionState
} from '../../types/executionState';

export const MAX_CHECKPOINT_ENTRIES = 600;

const MAX_SUMMARY_LEN = 240;
const MAX_ID_LEN = 160;

export type CheckpointInput = Omit<Checkpoint, 'id' | 'at'> & {
  id?: string;
  at?: string;
};

function clamp(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function buildCheckpoint(input: CheckpointInput): Checkpoint {
  const id = input.id ?? `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const at = input.at ?? new Date().toISOString();
  const checkpoint: Checkpoint = {
    id: clamp(id, MAX_ID_LEN),
    conversationId: clamp(input.conversationId, MAX_ID_LEN),
    type: input.type,
    state: input.state,
    at,
    summary: clamp(input.summary, MAX_SUMMARY_LEN),
    source: input.source
  };
  if (input.parentCheckpointId)
    checkpoint.parentCheckpointId = clamp(input.parentCheckpointId, MAX_ID_LEN);
  if (input.sourceMessageId) checkpoint.sourceMessageId = clamp(input.sourceMessageId, MAX_ID_LEN);
  if (input.generatedArtifactRef) {
    checkpoint.generatedArtifactRef = {
      kind: input.generatedArtifactRef.kind,
      id: clamp(input.generatedArtifactRef.id, MAX_ID_LEN)
    };
  }
  if (input.associatedPlanRef) {
    checkpoint.associatedPlanRef = {
      id: clamp(input.associatedPlanRef.id, MAX_ID_LEN),
      kind: input.associatedPlanRef.kind
    };
  }
  if (input.associatedTwinId)
    checkpoint.associatedTwinId = clamp(input.associatedTwinId, MAX_ID_LEN);
  if (input.toolRef) {
    const toolRef: Checkpoint['toolRef'] = {};
    if (input.toolRef.expertId) toolRef.expertId = input.toolRef.expertId;
    if (input.toolRef.integrationSourceId) {
      toolRef.integrationSourceId = clamp(input.toolRef.integrationSourceId, MAX_ID_LEN);
    }
    if (Object.keys(toolRef).length > 0) checkpoint.toolRef = toolRef;
  }
  if (input.approvalStatus) checkpoint.approvalStatus = input.approvalStatus;
  if (input.errorState) {
    checkpoint.errorState = {
      code: clamp(input.errorState.code, 80),
      message: clamp(input.errorState.message, 500),
      recoveryActions: input.errorState.recoveryActions.slice(0, 6)
    };
  }
  if (input.receiptRef) checkpoint.receiptRef = clamp(input.receiptRef, MAX_ID_LEN);
  return checkpoint;
}

/**
 * Prepend a checkpoint. Unlike `prependOperatorTrace`, this is **unconditional** —
 * approval-gating UI must not silently vanish when the user has turned off
 * trace collection (`settings.operatorTraceCollectionEnabled`).
 */
export function prependCheckpoint(data: BrandOpsData, input: CheckpointInput): BrandOpsData {
  const entry = buildCheckpoint(input);
  const prior = data.checkpoints?.entries ?? [];
  return {
    ...data,
    checkpoints: {
      entries: [entry, ...prior].slice(0, MAX_CHECKPOINT_ENTRIES)
    }
  };
}

export function findCheckpointsByConversation(
  data: BrandOpsData,
  conversationId: string
): Checkpoint[] {
  return (data.checkpoints?.entries ?? []).filter((c) => c.conversationId === conversationId);
}

/**
 * Walks a checkpoint's `parentCheckpointId` chain up to its root — used by
 * "Retry" to recover the original Ask question text (the root `ask.question`
 * checkpoint's `summary`) from a `FAILED` leaf several hops down the chain.
 *
 * Normal creation order makes a real cycle impossible (a checkpoint's parent
 * always already exists when the checkpoint is built), but a hand-edited or
 * corrupted imported workspace JSON could introduce one — the visited guard
 * stops that from hanging the tab instead of trusting the invariant blindly.
 */
export function findCheckpointChainRoot(
  data: BrandOpsData,
  checkpointId: string
): Checkpoint | null {
  const entries = data.checkpoints?.entries ?? [];
  const byId = new Map(entries.map((c) => [c.id, c]));
  const visited = new Set<string>();
  let current = byId.get(checkpointId) ?? null;
  while (current?.parentCheckpointId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    const parent = byId.get(current.parentCheckpointId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

/**
 * `Checkpoint.state` is immutable history (the state AT THE TIME that row was
 * recorded) — a chain's root stays `UNDERSTANDING` forever even after the
 * turn completes. So "is this operation still active/pending" must look at
 * the leaf (most recent, childless) checkpoint of each chain, not every row.
 */
function isLeafCheckpoint(entries: Checkpoint[], checkpoint: Checkpoint): boolean {
  return !entries.some((c) => c.parentCheckpointId === checkpoint.id);
}

/** Returns leaf checkpoints in a non-terminal, in-flight state — feeds `BackgroundOperationsIndicator`. */
export function findActiveCheckpoints(data: BrandOpsData): Checkpoint[] {
  const entries = data.checkpoints?.entries ?? [];
  const activeStates: ExecutionState[] = [
    'UNDERSTANDING',
    'PLANNING',
    'WORKING',
    'EXECUTING',
    'VERIFYING'
  ];
  return entries.filter((c) => activeStates.includes(c.state) && isLeafCheckpoint(entries, c));
}

/** Leaf checkpoints still awaiting a decision — a `plan.approval_requested` row that already has an approve/reject child no longer counts. */
export function findPendingApprovalCheckpoints(data: BrandOpsData): Checkpoint[] {
  const entries = data.checkpoints?.entries ?? [];
  return entries.filter((c) => c.state === 'NEEDS_APPROVAL' && isLeafCheckpoint(entries, c));
}

/** Default recovery actions for a failure checkpoint — retry is always safe when a checkpoint has a parent to resume from. */
export function defaultFailureRecoveryActions(hasParent: boolean): CheckpointActionType[] {
  return hasParent ? ['retry', 'inspect'] : ['inspect'];
}

export function checkpointTypeLabel(type: CheckpointType): string {
  switch (type) {
    case 'ask.question':
      return 'Question asked';
    case 'ask.response':
      return 'Response received';
    case 'ask.artifact_generated':
      return 'Artifact generated';
    case 'ask.convert_to_plan_requested':
      return 'Convert to Plan requested';
    case 'plan.draft_created':
      return 'Plan draft created';
    case 'plan.saved':
      return 'Plan saved';
    case 'plan.approval_requested':
      return 'Approval requested';
    case 'plan.approval_granted':
      return 'Approval granted';
    case 'plan.approval_rejected':
      return 'Approval rejected';
    case 'plan.execution_started':
      return 'Execution started';
    case 'plan.step_executed':
      return 'Step executed';
    case 'plan.execution_completed':
      return 'Execution completed';
    case 'plan.execution_blocked':
      return 'Execution blocked';
    case 'plan.verified':
      return 'Plan verified';
    case 'tool.invocation':
      return 'Tool invoked';
    case 'background.operation':
      return 'Background operation';
    case 'agent.session_connected':
      return 'Agent connected';
    case 'agent.event_ingested':
      return 'Agent event ingested';
    case 'agent.achievement_detected':
      return 'Achievement detected';
    case 'agent.achievement_verified':
      return 'Achievement verified';
    case 'agent.achievement_promoted':
      return 'Achievement added to Twin';
    case 'agent.context_supplied':
      return 'Context supplied to agent';
    case 'agent.artifact_proposed':
      return 'Artifact proposed';
    case 'agent.opportunity_detected':
      return 'Opportunity detected';
    case 'agent.action_requested':
      return 'External action requested';
    default:
      return type;
  }
}
