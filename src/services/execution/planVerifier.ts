import type { BrandOpsData, Plan } from '../../types/domain';
import { prependCheckpoint } from './checkpointStore';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import { updatePlanStatus } from './planStore';
import { recordLearningSignal, recordOutcome } from '../builder/outcomeLearning';

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
 * Closes the other half of Learn: agent-reported achievements already flow
 * into Twin memory once a human verifies them (`promoteAgentEventToTwin` in
 * `interop/events.ts`), but work the operator plans, executes, and verifies
 * themselves inside BrandOps did not — despite the operator's own "Achieved"
 * click already being a stronger trust signal than an external agent report.
 * No separate promotion gate is needed here for that reason: full outcome
 * verification (`allAchieved`) already *is* the human confirmation.
 * Mirrors `promoteAgentEventToTwin`'s claim shape/dedup/cap so the same
 * consumers (`opportunityEngine.ts`, `positioningIntelligence.ts`,
 * `predictiveContentIdeationEngine.ts`, `buyerPersonaIntelligence.ts`) pick
 * it up with no changes on their side.
 */
function recordVerifiedPlanOnTwin(
  data: BrandOpsData,
  plan: Plan,
  outcomeCounts: string
): BrandOpsData {
  const twinState = data.digitalTwins;
  if (!twinState?.twins.length) return data;
  const active = twinState.twins.find((t) => t.id === twinState.activeTwinId) ?? twinState.twins[0];
  const claim = `${plan.title} — completed and verified (${outcomeCounts}).`;
  const hasClaim = active.memory.approvedClaims.some(
    (c) => c.toLowerCase() === claim.toLowerCase()
  );
  const hasAchievement = active.resumeProfile.achievements.some(
    (a) => a.toLowerCase() === claim.toLowerCase()
  );
  if (hasClaim && hasAchievement) return data;

  const now = new Date().toISOString();
  const twins = twinState.twins.map((twin) => {
    if (twin.id !== active.id) return twin;
    return {
      ...twin,
      updatedAt: now,
      memory: {
        ...twin.memory,
        approvedClaims: hasClaim
          ? twin.memory.approvedClaims
          : [claim, ...twin.memory.approvedClaims].slice(0, 60)
      },
      resumeProfile: {
        ...twin.resumeProfile,
        achievements: hasAchievement
          ? twin.resumeProfile.achievements
          : [claim, ...twin.resumeProfile.achievements].slice(0, 120)
      }
    };
  });
  return { ...data, digitalTwins: { ...twinState, twins } };
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
  const notAchievedCount = plan.steps.filter(
    (step) => achievedByStep.get(step.id) === false
  ).length;
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

  const withTwinMemory = allAchieved
    ? recordVerifiedPlanOnTwin(traced, plan, outcomeCounts)
    : traced;

  /**
   * Outcome→Learning (XXII): record a durable, inspectable learning signal and
   * an outcome score once verification closes. All-achieved plans are a positive
   * plan-completion signal; partially-failed plans yield a negative signal and a
   * weaker outcome score. Signals carry a 90-day expiry and are never used to
   * silently mutate verified identity — they only bias future context/policy.
   */
  const completionRate = plan.steps.length
    ? (confirmedCount - notAchievedCount) / plan.steps.length
    : 0;
  let learned = recordOutcome({
    workspace: withTwinMemory,
    planId,
    dimension: 'plan-completion-rate',
    score: completionRate,
    evidence: [outcomeCounts],
    notedBy: 'operator-verification'
  });
  learned = recordLearningSignal({
    workspace: learned,
    signalType: allAchieved ? 'plan-completed-successfully' : 'plan-failed',
    source: 'planVerifier',
    detail: `${plan.title} — verified with ${confirmedCount}/${plan.steps.length} steps confirmed`,
    strength: allAchieved ? 0.8 : Math.max(0.3, 1 - completionRate)
  });

  return {
    workspace: learned,
    verified: true,
    allAchieved,
    summary: `Verification recorded: ${outcomeCounts}. Plan status set to verified.`,
    confirmedCount,
    notAchievedCount,
    unconfirmedStepIds
  };
}
