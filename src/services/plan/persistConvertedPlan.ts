/**
 * The single persistence contract for converting a source into a saved PLAN:
 * canonical draft generation (`convertAskResponseToPlan`) → validated save with
 * receipt (`savePlanDraftToWorkspace`) → the standard Convert-to-Plan
 * checkpoint chain. All surfaces (Ask drawer, agent proposal/event, predictive
 * cards) call this instead of re-implementing save/checkpoint logic.
 */
import type {
  BrandOpsData,
  Plan,
  PlanPreset,
  PlanReceipt,
  PlanSourceSurface
} from '../../types/domain';
import { convertAskResponseToPlan, savePlanDraftToWorkspace } from './askPlanConversion';
import { planConversionCheckpointChain } from '../execution/planExecutionCheckpoints';
import { prependCheckpoint } from '../execution/checkpointStore';

export interface PersistConvertedPlanInput {
  workspace: BrandOpsData;
  conversationId: string;
  messageId: string;
  responseText: string;
  userIntent: string;
  activeTwinId?: string | null;
  planPreset: PlanPreset;
  sourceSurface?: PlanSourceSurface;
  convertedFromLabel?: string;
  verifiedFactsUsed?: string[];
  unverifiedMissingFacts?: string[];
}

export interface PersistConvertedPlanResult {
  workspace: BrandOpsData;
  plan: Plan;
  receipt: PlanReceipt;
}

export function persistConvertedPlan(input: PersistConvertedPlanInput): PersistConvertedPlanResult {
  const draftResult = convertAskResponseToPlan({
    conversationId: input.conversationId,
    messageId: input.messageId,
    responseText: input.responseText,
    userIntent: input.userIntent,
    activeTwinId: input.activeTwinId,
    planPreset: input.planPreset,
    workspaceContext: input.workspace,
    sourceSurface: input.sourceSurface,
    verifiedFactsUsed: input.verifiedFactsUsed,
    unverifiedMissingFacts: input.unverifiedMissingFacts
  });
  if (!draftResult.ok) {
    throw new Error(`${draftResult.error} ${draftResult.issues.join(' ')}`.trim());
  }

  const saved = savePlanDraftToWorkspace({
    workspace: input.workspace,
    draft: draftResult.draft,
    userAction: 'save-plan',
    convertedFromLabel: input.convertedFromLabel
  });
  const chain = planConversionCheckpointChain({
    conversationId: input.conversationId,
    planId: saved.plan.id,
    planTitle: saved.plan.title,
    requiresApproval: saved.plan.status === 'pending-approval',
    receiptId: saved.receipt.id
  });
  let next = saved.workspace;
  for (const checkpoint of chain) next = prependCheckpoint(next, checkpoint);
  return { workspace: next, plan: saved.plan, receipt: saved.receipt };
}

/** Maps an operational card kind to the closest canonical plan preset. */
export function planPresetForOperationalKind(
  kind:
    | 'workflow'
    | 'outreach'
    | 'content-calendar'
    | 'execution-sequence'
    | 'action-queue'
    | 'approval-flow'
): PlanPreset {
  switch (kind) {
    case 'outreach':
      return 'outreach-plan';
    case 'content-calendar':
      return 'content-plan';
    case 'workflow':
      return 'workflow-plan';
    default:
      return 'custom-plan';
  }
}
