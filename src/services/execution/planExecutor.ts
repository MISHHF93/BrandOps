import type { BrandOpsData, PlanStep } from '../../types/domain';
import { prependCheckpoint } from './checkpointStore';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import { updatePlanStatus } from './planStore';

export interface BlockedStep {
  stepId: string;
  title: string;
  reason: string;
}

export interface ExecutePlanResult {
  workspace: BrandOpsData;
  executed: boolean;
  blockedSteps: BlockedStep[];
  summary: string;
}

/**
 * Step titles/descriptions that signal an external side effect even when the
 * step carries no `platform` or `approvalRequired` flag. Anything matching is
 * treated as not-executable by BrandOps (no external side effects are ever
 * performed — see the plan doc "Explicitly NOT built").
 */
const EXTERNAL_ACTION_MARKERS = [
  'publish',
  'post',
  'send',
  'email',
  'outreach',
  'launch',
  'schedule',
  'connect',
  'integrat',
  'upload',
  'share',
  'comment',
  'invite',
  'reach out'
];

function stepRequiresExternalAction(step: PlanStep): boolean {
  if (step.platform) return true;
  if (step.approvalRequired) return true;
  const text = `${step.title} ${step.description}`.toLowerCase();
  return EXTERNAL_ACTION_MARKERS.some((marker) => text.includes(marker));
}

function reasonForStep(step: PlanStep): string {
  if (step.platform) {
    return `Step targets ${step.platform}, which requires a supported integration. BrandOps performs no external side effects.`;
  }
  if (step.approvalRequired) {
    return 'Step requires approval before it can run externally. BrandOps performs no external side effects.';
  }
  return 'External action required. BrandOps performs no external side effects without a supported integration.';
}

/**
 * The P0-1 plan executor. Executing means recording execution: it walks the
 * plan's steps, emits `plan.execution_started` / `plan.step_executed` /
 * `plan.execution_completed`|`plan.execution_blocked` checkpoints, and sets
 * `Plan.status` to `executed` only when every step can be processed without an
 * external side effect. Steps that need a platform, require approval, or
 * describe an external action are marked `BLOCKED` (with an
 * `errorState` code of `external_action_required`) and are never performed —
 * `executed` does not mean successful, and this executor never performs real
 * external side effects.
 *
 * Returns the (possibly mutated) workspace plus a machine-readable
 * `blockedSteps` list and a human `summary`. Mirrors the approval flow's
 * checkpoint + operator-trace fan-out so the timeline, feed, and
 * `BackgroundOperationsIndicator` all observe real `EXECUTING`/`COMPLETED`/
 * `BLOCKED` rows.
 */
export function executePlan(data: BrandOpsData, planId: string): ExecutePlanResult {
  const plan = data.planWorkspace?.plans.find((p) => p.id === planId);
  if (!plan) {
    return { workspace: data, executed: false, blockedSteps: [], summary: 'Plan not found.' };
  }
  if (plan.status !== 'approved') {
    return {
      workspace: data,
      executed: false,
      blockedSteps: [],
      summary: `Plan "${plan.title}" is not approved for execution (status: ${plan.status}). Approve it first.`
    };
  }

  const conversationId = plan.source.conversationId || planId;

  const started = prependCheckpoint(data, {
    conversationId,
    type: 'plan.execution_started',
    state: 'EXECUTING',
    summary: `Execution started for "${plan.title}".`,
    source: 'automation',
    associatedPlanRef: { id: planId, kind: 'saved' }
  });
  const startedId = started.checkpoints?.entries[0]?.id ?? '';

  const blockedSteps: BlockedStep[] = [];
  let cursor = started;
  let previousId = startedId;

  for (const step of plan.steps) {
    const blocked = stepRequiresExternalAction(step);
    if (blocked) {
      const reason = reasonForStep(step);
      blockedSteps.push({ stepId: step.id, title: step.title, reason });
      cursor = prependCheckpoint(cursor, {
        conversationId,
        parentCheckpointId: previousId,
        type: 'plan.step_executed',
        state: 'BLOCKED',
        summary: `Blocked: ${step.title} — external action required, not performed.`,
        source: 'automation',
        associatedPlanRef: { id: planId, kind: 'saved' },
        errorState: {
          code: 'external_action_required',
          message: reason,
          recoveryActions: ['inspect']
        }
      });
    } else {
      cursor = prependCheckpoint(cursor, {
        conversationId,
        parentCheckpointId: previousId,
        type: 'plan.step_executed',
        state: 'COMPLETED',
        summary: `Recorded (internal): ${step.title} — no external side effect performed.`,
        source: 'automation',
        associatedPlanRef: { id: planId, kind: 'saved' }
      });
    }
    previousId = cursor.checkpoints?.entries[0]?.id ?? previousId;
  }

  if (blockedSteps.length > 0) {
    const first = blockedSteps[0];
    const final = prependCheckpoint(cursor, {
      conversationId,
      parentCheckpointId: previousId,
      type: 'plan.execution_blocked',
      state: 'BLOCKED',
      summary:
        `Execution blocked on ${blockedSteps.length} of ${plan.steps.length} steps. ` +
        `${first.title} — BrandOps performs no external side effects without a supported integration. ` +
        `Plan status remains approved.`,
      source: 'automation',
      associatedPlanRef: { id: planId, kind: 'saved' },
      errorState: {
        code: 'execution_blocked',
        message: first.reason,
        recoveryActions: ['inspect']
      }
    });
    const traced = prependOperatorTrace(final, {
      source: 'automation',
      surface: 'workspace_automation',
      verb: 'plan.execution_blocked',
      sessionId: conversationId,
      entityType: 'plan',
      entityId: planId,
      outcome: 'failure',
      details: {
        planId,
        blockedSteps: blockedSteps.length,
        firstBlockedStep: first.title
      }
    });
    return {
      workspace: traced,
      executed: false,
      blockedSteps,
      summary: `Execution blocked: ${blockedSteps.length} step(s) require external side effects.`
    };
  }

  const withStatus = updatePlanStatus(cursor, planId, 'executed');
  const completed = prependCheckpoint(withStatus, {
    conversationId,
    parentCheckpointId: previousId,
    type: 'plan.execution_completed',
    state: 'COMPLETED',
    summary:
      `Execution recorded for "${plan.title}": ${plan.steps.length} step(s) processed internally. ` +
      'No external side effects were performed.',
    source: 'automation',
    associatedPlanRef: { id: planId, kind: 'saved' }
  });
  const traced = prependOperatorTrace(completed, {
    source: 'automation',
    surface: 'workspace_automation',
    verb: 'plan.execution_completed',
    sessionId: conversationId,
    entityType: 'plan',
    entityId: planId,
    outcome: 'success',
    details: {
      planId,
      internalSteps: plan.steps.length
    }
  });
  return {
    workspace: traced,
    executed: true,
    blockedSteps: [],
    summary:
      'Execution recorded; all steps processed internally. No external side effects performed.'
  };
}
