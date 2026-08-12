import type { BrandOpsData } from '../../types/domain';
import type { Checkpoint } from '../../types/executionState';
import type { ExecutionReceiptData } from '../../shared/ui/execution/ExecutionReceipt';
import { buildPlanReceiptDetail } from '../../pages/mobile/buildWorkspaceSnapshot';

/**
 * Resolves a checkpoint's `receiptRef` against the one real, persisted,
 * id-addressable receipt type in the repo today (`planWorkspace.receipts` —
 * see plan doc §8/"Receipts"), reusing the same `buildPlanReceiptDetail`
 * shaping the dedicated Plan "Execution receipts" section already uses
 * (`PlanExecutionReceipts.tsx` via `buildWorkspaceSnapshot.ts`) rather than a
 * second, thinner view of the same data. `BrandOpsAIAuditReceipt` is nested
 * per-artifact rather than independently addressable — extending this
 * resolver to it is future work, not faked here.
 */
export function resolveExecutionReceipt(
  data: BrandOpsData,
  checkpoint: Checkpoint
): ExecutionReceiptData | null {
  if (!checkpoint.receiptRef) return null;
  const planReceipt = data.planWorkspace?.receipts.find((r) => r.id === checkpoint.receiptRef);
  if (!planReceipt) return null;
  const detail = buildPlanReceiptDetail(data, planReceipt);
  const plan = data.planWorkspace?.plans.find((p) => p.id === planReceipt.planId);
  return {
    id: planReceipt.id,
    summary: detail.reasoningSummary,
    timestamp: detail.startedAt,
    planTitle: plan?.title,
    /** `approvedInputs` means facts/data already approved for use as input — that's `sourceFactsUsed`, not `detail.approvals` (a list of gates still *requiring* approval, the opposite of "approved"; that belongs on the checkpoint's own NEEDS_APPROVAL card, not mislabeled here as already granted). */
    approvedInputs: detail.sourceFactsUsed,
    result: detail.warningsErrors.length
      ? `${detail.generatedOutputs.join(', ') || 'No output recorded'} — ${detail.warningsErrors.join('; ')}`
      : detail.generatedOutputs.join(', ') || 'No output recorded',
    status: detail.executionStatus
  };
}
