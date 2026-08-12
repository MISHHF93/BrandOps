import type { BrandOpsData, SavedPlanStatus } from '../../types/domain';
import type { Checkpoint } from '../../types/executionState';
import { prependCheckpoint } from './checkpointStore';
import { approveOperatorTraceEntry, rejectOperatorTraceEntry } from '../plan/reviewQueue';

function findPendingPlanCheckpoint(data: BrandOpsData, planId: string): Checkpoint | null {
  const entries = data.checkpoints?.entries ?? [];
  return (
    entries.find((c) => c.associatedPlanRef?.id === planId && c.state === 'NEEDS_APPROVAL') ?? null
  );
}

function updatePlanStatus(
  data: BrandOpsData,
  planId: string,
  status: SavedPlanStatus
): BrandOpsData {
  const plans = data.planWorkspace?.plans ?? [];
  const index = plans.findIndex((p) => p.id === planId);
  if (index === -1) return data;
  const nextPlans = plans.slice();
  nextPlans[index] = { ...nextPlans[index], status };
  return {
    ...data,
    planWorkspace: {
      plans: nextPlans,
      receipts: data.planWorkspace?.receipts ?? [],
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Approve a pending review, keyed by the existing `OperatorTraceEntry.id`
 * (still the review-queue UI's key). `Checkpoint` is the real source of
 * truth going forward: when the trace is linked to a Plan
 * (`entityType === 'plan'`), this fans out to `Plan.status` and appends a
 * checkpoint recording the decision. `operatorTraces` stays updated too, as
 * a derived mirror for the existing review-queue UI — not an independent
 * decision anymore.
 *
 * Returns `null` if the trace id doesn't exist, or the same `data` reference
 * if the trace wasn't pending (matches `approveOperatorTraceEntry`'s contract).
 */
export function approveCheckpointForTrace(
  data: BrandOpsData,
  traceId: string
): BrandOpsData | null {
  const traced = approveOperatorTraceEntry(data, traceId);
  if (traced === null || traced === data) return traced;
  const entry = traced.operatorTraces?.entries.find((e) => e.id === traceId);
  if (!entry || entry.entityType !== 'plan' || !entry.entityId) return traced;

  const planId = entry.entityId;
  const withPlanStatus = updatePlanStatus(traced, planId, 'approved');
  const pending = findPendingPlanCheckpoint(withPlanStatus, planId);
  const approved = prependCheckpoint(withPlanStatus, {
    conversationId: pending?.conversationId ?? planId,
    ...(pending ? { parentCheckpointId: pending.id } : {}),
    type: 'plan.approval_granted',
    state: 'COMPLETED',
    summary: 'Approved for execution.',
    source: 'user',
    associatedPlanRef: { id: planId, kind: 'saved' },
    approvalStatus: 'approved'
  });
  const plan = approved.planWorkspace?.plans.find((p) => p.id === planId);
  return prependCheckpoint(approved, {
    conversationId: pending?.conversationId ?? planId,
    parentCheckpointId: approved.checkpoints?.entries[0]?.id,
    type: 'plan.verified',
    state: 'COMPLETED',
    summary:
      `Verification: approval recorded, plan "${plan?.title ?? planId}" status set to approved, and no ` +
      'external side effects were performed. Executing the plan requires a supported integration and a separate, explicit execute action.',
    source: 'automation',
    associatedPlanRef: { id: planId, kind: 'saved' },
    approvalStatus: 'approved'
  });
}

/** Reject a pending review — see {@link approveCheckpointForTrace} for the shared contract and fan-out behavior. */
export function rejectCheckpointForTrace(
  data: BrandOpsData,
  traceId: string,
  note?: string
): BrandOpsData | null {
  const traced = rejectOperatorTraceEntry(data, traceId, note);
  if (traced === null || traced === data) return traced;
  const entry = traced.operatorTraces?.entries.find((e) => e.id === traceId);
  if (!entry || entry.entityType !== 'plan' || !entry.entityId) return traced;

  const planId = entry.entityId;
  const withPlanStatus = updatePlanStatus(traced, planId, 'rejected');
  const pending = findPendingPlanCheckpoint(withPlanStatus, planId);
  return prependCheckpoint(withPlanStatus, {
    conversationId: pending?.conversationId ?? planId,
    ...(pending ? { parentCheckpointId: pending.id } : {}),
    type: 'plan.approval_rejected',
    state: 'REJECTED',
    summary: note?.trim() || 'Rejected. No external action executed.',
    source: 'user',
    associatedPlanRef: { id: planId, kind: 'saved' },
    approvalStatus: 'rejected'
  });
}

function findPendingTraceIdForPlan(data: BrandOpsData, planId: string): string | null {
  const entry = (data.operatorTraces?.entries ?? []).find(
    (e) => e.entityType === 'plan' && e.entityId === planId && e.reviewStatus === 'pending'
  );
  return entry?.id ?? null;
}

/**
 * Approve/reject keyed by `Plan.id` instead of the trace id — for callers
 * that only have a `Checkpoint` (which carries `associatedPlanRef.id`, not a
 * trace id) in hand, e.g. an `ApprovalCheckpoint` rendered inline in Ask's
 * own checkpoint timeline. Delegates to the trace-keyed functions above so
 * there is exactly one approval code path either way. Returns `null` when no
 * pending review is linked to that plan.
 */
export function approveCheckpointForPlan(data: BrandOpsData, planId: string): BrandOpsData | null {
  const traceId = findPendingTraceIdForPlan(data, planId);
  if (!traceId) return null;
  return approveCheckpointForTrace(data, traceId);
}

export function rejectCheckpointForPlan(
  data: BrandOpsData,
  planId: string,
  note?: string
): BrandOpsData | null {
  const traceId = findPendingTraceIdForPlan(data, planId);
  if (!traceId) return null;
  return rejectCheckpointForTrace(data, traceId, note);
}
