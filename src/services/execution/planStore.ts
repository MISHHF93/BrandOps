import type { BrandOpsData, Plan, SavedPlanStatus } from '../../types/domain';

/**
 * Canonical plan-status updater. Every call site that mutates `Plan.status`
 * (approval, execution, verification) must go through this single function
 * to avoid dual-source-of-truth drift between `Plan.status` and the
 * checkpoint log.
 */
export function updatePlanStatus(
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
 * Derives the expected `Plan.status` from the checkpoint log. Used as a
 * consistency check at workspace load to detect dual-source-of-truth drift.
 * Returns the derived status, or the stored status if no checkpoint evidence
 * is found.
 */
export function derivePlanStatusFromCheckpoints(
  data: BrandOpsData,
  planId: string
): Plan['status'] | null {
  const entries = data.checkpoints?.entries ?? [];
  const planCheckpoints = entries
    .filter((c) => c.associatedPlanRef?.id === planId)
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  if (planCheckpoints.length === 0) return null;

  const latest = planCheckpoints[0];
  switch (latest.type) {
    case 'plan.approval_granted':
      return 'approved';
    case 'plan.approval_rejected':
      return 'rejected';
    case 'plan.execution_started':
      return 'executing';
    case 'plan.execution_completed':
      return 'executed';
    case 'plan.execution_blocked':
      return 'executed';
    case 'plan.verified':
      return latest.state === 'VERIFYING' ? 'executed' : 'verified';
    case 'plan.approval_requested':
      return 'pending-approval';
    default:
      return null;
  }
}
