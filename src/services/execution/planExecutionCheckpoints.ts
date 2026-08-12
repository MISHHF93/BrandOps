import type { Checkpoint } from '../../types/executionState';
import { buildCheckpoint } from './checkpointStore';

/** Root of an Ask→Plan conversion chain — the user's "Convert to Plan" click. */
export function convertToPlanRequestedCheckpoint(args: {
  conversationId: string;
  planTitle: string;
}): Checkpoint {
  return buildCheckpoint({
    conversationId: args.conversationId,
    type: 'ask.convert_to_plan_requested',
    state: 'PLANNING',
    summary: `Convert to Plan: ${args.planTitle}`,
    source: 'user'
  });
}

export function planDraftCreatedCheckpoint(args: {
  conversationId: string;
  parentCheckpointId: string;
  planId: string;
  planTitle: string;
}): Checkpoint {
  return buildCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: args.parentCheckpointId,
    type: 'plan.draft_created',
    state: 'PLANNING',
    summary: args.planTitle,
    source: 'assistant',
    associatedPlanRef: { id: args.planId, kind: 'draft' }
  });
}

/** Terminal checkpoint of a save — `NEEDS_APPROVAL` when the plan requires review, `COMPLETED` otherwise. */
export function planSavedCheckpoint(args: {
  conversationId: string;
  parentCheckpointId: string;
  planId: string;
  planTitle: string;
  requiresApproval: boolean;
  receiptId?: string;
}): Checkpoint {
  return buildCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: args.parentCheckpointId,
    type: args.requiresApproval ? 'plan.approval_requested' : 'plan.saved',
    state: args.requiresApproval ? 'NEEDS_APPROVAL' : 'COMPLETED',
    summary: args.requiresApproval
      ? `Approval requested: ${args.planTitle}`
      : `Plan saved: ${args.planTitle}`,
    source: 'assistant',
    associatedPlanRef: { id: args.planId, kind: 'saved' },
    ...(args.requiresApproval ? { approvalStatus: 'pending' as const } : {}),
    ...(args.receiptId ? { receiptRef: args.receiptId } : {})
  });
}

/**
 * The canonical Convert-to-Plan checkpoint chain: requested → draft created →
 * saved (or approval requested). Every surface that persists a converted plan
 * (Ask drawer, agent proposal/event, predictive cards) attaches this exact
 * chain so the PLAN surface tells one consistent story.
 */
export function planConversionCheckpointChain(args: {
  conversationId: string;
  planId: string;
  planTitle: string;
  requiresApproval: boolean;
  receiptId?: string;
}): Checkpoint[] {
  const requested = convertToPlanRequestedCheckpoint({
    conversationId: args.conversationId,
    planTitle: args.planTitle
  });
  const draftCreated = planDraftCreatedCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: requested.id,
    planId: args.planId,
    planTitle: args.planTitle
  });
  const saved = planSavedCheckpoint({
    conversationId: args.conversationId,
    parentCheckpointId: draftCreated.id,
    planId: args.planId,
    planTitle: args.planTitle,
    requiresApproval: args.requiresApproval,
    ...(args.receiptId ? { receiptId: args.receiptId } : {})
  });
  return [requested, draftCreated, saved];
}
