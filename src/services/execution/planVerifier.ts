import type { BrandOpsData, Plan } from '../../types/domain';
import { prependCheckpoint } from './checkpointStore';
import { prependOperatorTrace } from '../dataset/operatorTraces';

export interface VerifyStepOutcome {
  stepId: string;
  achieved: boolean;
  note?: string;
}

export interface VerifyPlanOutcomesInput {
  outcomes: VerifyStepOutcome[];
}

export interface VerifyPlanResult {
  workspace: BrandOpsData;
  /** True when verification was actually recorded (plan was in a verifiable state). */
  verified: boolean;
  /** True when every verifiable step was confirmed achieved. */
  allAchieved: boolean;
  summary: string;
  confirmedCount: number;
  notAchievedCount: number;
  unconfirmedStepIds: string[];
}

function updatePlanStatus(
  data: BrandOpsData,
  planId: string,
  status: Plan['status']
): BrandOpsData {
  const plans = data.planWorkspace?.plans ?? [];
  const index = plans.findIndex((p) => p.id === planId);
  if (index === -1) return data;
  const nextPlans = plans.slice();
  const plan = nextPlans[index];
  const stepStatusById = new Map(
    plan.steps.map((step) => [step.id, step.status])
  );
  nextPlans[index] = { ...plan, status };
  void stepStatusById;
  return {
    ...data,
    planWorkspace: {
      plans: nextPlans,
      receipts: data.planWorkspace?.receipts ?? [],
      updatedAt: new Date().toISOString()
    }
  };
}

function applyStepStatuses(
  data: BrandOpsData,
  planId: string,
  achievedByStep: Map<string, boolean>
): BrandOpsData {
  const plans = data.planWorkspace?.plans ?? [];
  const index = plans.findIndex((p) => p.id === planId);
  if (index === -1) return data;
  const nextPlans = plans.slice();
  const plan = nextPlans[index];
  nextPlans[index] = {
    ...plan,
    steps: plan.steps.map((step) => {
      if (!achievedByStep.has(step.id)) return step;
      const achieved = achievedByStep.get(step.id);
      return {
        ...step,
        status: achieved ? ('done' as const) : ('failed' as const)
      };
    })
  };
  return {
    ...data,
    planWorkspace: {
      plans: nextPlans,
      receipts: data.planWorkspace?.receipts ?? [],
      updatedAt: new Date().toISOString()
    }
  };
}

function findVerificationLeaf(data: BrandOpsData, planId: string) {
  const entries = data.checkpoints?.entries ?? [];
  const matching = entries
    .filter((c) => c.associatedPlanRef?.id === planId && c.type === 'plan.verified')
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  return matching[0] ?? null;
}

/**
 * The Verify/outcome-verification stage. Reachable only after execution
 * recorded the work (`Plan.status === 'executed'`, the leaf the executor now
 * leaves in `VERIFYING`). BrandOps performs no external side effects, so it
 * cannot observe real-world outcomes itself — the operator (the authorized
 * user) confirms each step's outcome explicitly. Nothing is auto-marked
 * achieved: every step must be passed in `outcomes`, and anything not
 * confirmed stays `unconfirmed`.
 *
 * Fan-out mirrors `planExecutor.ts`: a `plan.verified` VERIFYING start row (if
 * the plan was executed before this stage existed) then a `plan.verified`
 * COMPLETED leaf, per-step `done`/`failed` status, `Plan.status -> 'verified'`,
 * and an operator trace. Verification records operator-confirmed outcomes — it
 * never claims BrandOps observed them.
 */
export function verifyPlanOutcomes(
  data: BrandOpsData,
  planId: string,
  input: VerifyPlanOutcomesInput
): VerifyPlanResult {
  const plan = data.planWorkspace?.plans.find((p) => p.id === planId);
  if (!plan) {
    return {
      workspace: data,
      verified: false,
      allAchieved: false,
      summary: 'Plan not found.',
      confirmedCount: 0,
      notAchievedCount: 0,
      unconfirmedStepIds: []
    };
  }
  if (plan.status !== 'executed') {
    return {
      workspace: data,
      verified: false,
      allAchieved: false,
      summary:
        `Plan "${plan.title}" cannot be verified from status ${plan.status}. ` +
        'Execute it first — verification records operator-confirmed outcomes of executed work.',
      confirmedCount: 0,
      notAchievedCount: 0,
      unconfirmedStepIds: []
    };
  }

  const conversationId = plan.source.conversationId || planId;
  const achievedByStep = new Map<string, boolean>();
  for (const outcome of input.outcomes) {
    if (plan.steps.some((step) => step.id === outcome.stepId)) {
      achievedByStep.set(outcome.stepId, Boolean(outcome.achieved));
    }
  }
  const confirmed = plan.steps.filter((step) => achievedByStep.has(step.id));
  const confirmedCount = confirmed.length;
  const notAchievedCount = plan.steps.filter((step) => achievedByStep.get(step.id) === false).length;
  const unconfirmedStepIds = plan.steps
    .filter((step) => !achievedByStep.has(step.id))
    .map((step) => step.id);
  const allAchieved = confirmed.length > 0 && notAchievedCount === 0;

  let cursor = data;
  const existingLeaf = findVerificationLeaf(data, planId);
  if (!existingLeaf || existingLeaf.state !== 'VERIFYING') {
    const start = prependCheckpoint(cursor, {
      conversationId,
      type: 'plan.verified',
      state: 'VERIFYING',
      summary: `Outcome verification started for "${plan.title}". BrandOps recorded the execution; the operator confirms which outcomes were achieved.`,
      source: 'automation',
      associatedPlanRef: { id: planId, kind: 'saved' }
    });
    cursor = start;
  }

  const withSteps = applyStepStatuses(cursor, planId, achievedByStep);
  const withStatus = updatePlanStatus(withSteps, planId, 'verified');

  const outcomeCounts =
    `${confirmedCount}/${plan.steps.length} step(s) confirmed` +
    (notAchievedCount ? `, ${notAchievedCount} not achieved` : '') +
    (unconfirmedStepIds.length ? `, ${unconfirmedStepIds.length} unconfirmed` : '');

  const completed = prependCheckpoint(withStatus, {
    conversationId,
    parentCheckpointId:
      existingLeaf && existingLeaf.state === 'VERIFYING'
        ? existingLeaf.id
        : cursor.checkpoints?.entries[0]?.id,
    type: 'plan.verified',
    state: 'COMPLETED',
    summary:
      `Outcome verification complete for "${plan.title}": ${outcomeCounts}. ` +
      'Confirmed by the operator — BrandOps performed no external side effects.',
    source: 'user',
    associatedPlanRef: { id: planId, kind: 'saved' }
  });

  const traced = prependOperatorTrace(completed, {
    source: 'user',
    surface: 'workspace_automation',
    verb: 'plan.verified',
    sessionId: conversationId,
    entityType: 'plan',
    entityId: planId,
    outcome: allAchieved ? 'success' : 'failure',
    details: {
      planId,
      confirmedCount,
      notAchievedCount,
      unconfirmedCount: unconfirmedStepIds.length,
      allAchieved
    }
  });

  return {
    workspace: traced,
    verified: true,
    allAchieved,
    summary:
      `Verification recorded: ${outcomeCounts}. Plan status set to verified.`,
    confirmedCount,
    notAchievedCount,
    unconfirmedStepIds
  };
}
