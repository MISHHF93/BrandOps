/**
 * MCP Tasks extension (`io.modelcontextprotocol/tasks`) projected onto canonical
 * BrandOps state.
 *
 * The central rule: **BrandOps runs no second task engine.** A protocol task is
 * a read-only *view* over state that already exists — the execution-request
 * proposal (who asked, under which session, with what intent), the Plan it
 * points at, and that plan's checkpoint history. Nothing here stores progress of
 * its own, so the task can never disagree with the execution it describes.
 *
 * State mapping, `ExecutionState` → task status:
 *
 *   IDLE / UNDERSTANDING / PLANNING / WORKING / EXECUTING / VERIFYING → working
 *   NEEDS_APPROVAL                                                    → input_required
 *   BLOCKED                                                           → input_required
 *   COMPLETED                                                         → completed
 *   FAILED                                                            → failed
 *   REJECTED / CANCELLED                                              → cancelled
 *
 * `NEEDS_APPROVAL → input_required` is the important one: BrandOps' human
 * approval boundary becomes the protocol's own "waiting on input" state, so a
 * remote agent sees the boundary as a first-class task state instead of a
 * mysterious stall. It still cannot cross it — see `applyTaskInputResponses`.
 */
import type {
  AgentProposal,
  McpTask,
  McpTaskInputRequest,
  McpTaskStatus
} from '../../../types/agentInterop';
import type { BrandOpsData } from '../../../types/domain';
import type { Checkpoint } from '../../../types/executionState';
import { decideAgentProposal } from '../proposals';

/** Suggested client poll cadence. Plan execution is not sub-second work. */
const POLL_INTERVAL_MS = 5000;

export interface TaskLookup {
  ok: boolean;
  task?: McpTask;
  errorCode?: 'task_not_found' | 'task_not_owned';
  error?: string;
}

export function generateTaskId(): string {
  return `br_task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function findProposalByTaskId(workspace: BrandOpsData, taskId: string): AgentProposal | undefined {
  return (workspace.agentProposals?.entries ?? []).find((entry) => entry.taskId === taskId);
}

/**
 * Checkpoints for a plan, newest first.
 *
 * A whole execution can emit its checkpoints inside one millisecond, so sorting
 * on `at` alone leaves ties in arbitrary order and can surface
 * `plan.execution_started` as the "latest" state of a finished run. The log is
 * maintained newest-first by `prependCheckpoint`, so position breaks the tie.
 */
function planCheckpoints(workspace: BrandOpsData, planId: string): Checkpoint[] {
  return (workspace.checkpoints?.entries ?? [])
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.associatedPlanRef?.id === planId)
    .sort((a, b) =>
      a.entry.at === b.entry.at ? a.index - b.index : a.entry.at < b.entry.at ? 1 : -1
    )
    .map(({ entry }) => entry);
}

function statusFromExecutionState(state: Checkpoint['state']): McpTaskStatus {
  switch (state) {
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'REJECTED':
    case 'CANCELLED':
      return 'cancelled';
    case 'NEEDS_APPROVAL':
    case 'BLOCKED':
      return 'input_required';
    default:
      return 'working';
  }
}

function approvalInputRequest(proposal: AgentProposal): Record<string, McpTaskInputRequest> {
  return {
    approval: {
      method: 'brandops/approval',
      params: {
        proposalId: proposal.id,
        title: proposal.title,
        detail: proposal.detail,
        rationale: proposal.rationale,
        tier: proposal.tier,
        // Stated plainly so a client does not model this as something it can satisfy.
        resolvableBy: 'user',
        note: 'A person approves this inside BrandOps. An agent may decline it, never accept it.'
      }
    }
  };
}

/**
 * Project one task. `sessionId` is required: a task belongs to the session that
 * requested it, so guessing or replaying a handle from another session resolves
 * to `task_not_owned` rather than leaking execution state.
 */
export function resolveTask(
  workspace: BrandOpsData,
  taskId: string,
  sessionId: string
): TaskLookup {
  const proposal = findProposalByTaskId(workspace, taskId);
  if (!proposal) {
    return { ok: false, errorCode: 'task_not_found', error: `No task with id ${taskId}.` };
  }
  if (proposal.sessionId && proposal.sessionId !== sessionId) {
    return {
      ok: false,
      errorCode: 'task_not_owned',
      error: 'This task belongs to a different agent session.'
    };
  }

  const planId = proposal.planId;
  const plan = planId
    ? (workspace.planWorkspace?.plans ?? []).find((entry) => entry.id === planId)
    : undefined;
  const checkpoints = planId ? planCheckpoints(workspace, planId) : [];
  const latest = checkpoints[0];

  const base = {
    taskId,
    createdAt: proposal.createdAt,
    lastUpdatedAt: proposal.updatedAt,
    ttlMs: null,
    pollIntervalMs: POLL_INTERVAL_MS
  } satisfies Pick<McpTask, 'taskId' | 'createdAt' | 'lastUpdatedAt' | 'ttlMs' | 'pollIntervalMs'>;

  // Withdrawn or rejected: terminal, regardless of what the plan says.
  if (proposal.status === 'rejected') {
    return {
      ok: true,
      task: {
        ...base,
        status: 'cancelled',
        statusMessage: proposal.decisionNote || 'Execution request was declined.'
      }
    };
  }

  // Still awaiting the human decision — the approval boundary itself.
  if (proposal.status === 'pending') {
    return {
      ok: true,
      task: {
        ...base,
        status: 'input_required',
        statusMessage: 'Waiting for user approval before anything executes.',
        inputRequests: approvalInputRequest(proposal)
      }
    };
  }

  /**
   * A task whose plan is gone is finished, not working.
   *
   * Failure injection found this: delete the plan an approved task points at and
   * the projection reported `working` forever, because with no checkpoints the
   * fallback was `working` regardless of whether anything could still happen. An
   * agent polling `tasks/get` waits indefinitely on a job that cannot start —
   * the "indefinite spinner", one layer below the interface.
   *
   * The plan can vanish legitimately: a workspace restored from an older export,
   * a plan deleted in the app after execution was requested. So this is a real
   * state to report, not an impossible one to guard against.
   */
  if (planId && !plan) {
    return {
      ok: true,
      task: {
        ...base,
        status: 'failed',
        statusMessage: `Plan ${planId} no longer exists in this workspace.`,
        error: {
          code: 'plan_missing',
          message: `The plan this task was approved to execute (${planId}) is no longer in the workspace. Nothing will run.`
        }
      }
    };
  }

  // Approved: the task now tracks the plan's real execution state.
  const status: McpTaskStatus = latest ? statusFromExecutionState(latest.state) : 'working';
  const task: McpTask = {
    ...base,
    lastUpdatedAt: latest?.at ?? proposal.updatedAt,
    status,
    statusMessage:
      latest?.summary ??
      (plan ? `Plan ${plan.id} approved (${plan.status}); execution not started.` : undefined)
  };

  if (status === 'completed') {
    const receipt = planId
      ? (workspace.planWorkspace?.receipts ?? []).find((entry) => entry.planId === planId)
      : undefined;
    task.result = {
      planId,
      planStatus: plan?.status,
      completedSteps: (plan?.steps ?? []).filter((step) => step.status === 'done').length,
      totalSteps: (plan?.steps ?? []).length,
      receiptId: receipt?.id,
      checkpointId: latest?.id
    };
  } else if (status === 'failed') {
    task.error = {
      code: latest?.errorState?.code ?? 'execution_failed',
      message: latest?.errorState?.message ?? latest?.summary ?? 'Execution failed.'
    };
  } else if (status === 'input_required') {
    task.inputRequests = {
      recovery: {
        method: 'brandops/recovery',
        params: {
          planId,
          checkpointId: latest?.id,
          blocker: latest?.summary ?? 'Execution is blocked.',
          recoveryActions: latest?.errorState?.recoveryActions ?? [],
          resolvableBy: 'user'
        }
      }
    };
  }

  return { ok: true, task };
}

export interface TaskMutationResult {
  ok: boolean;
  workspace: BrandOpsData;
  task?: McpTask;
  errorCode?: 'task_not_found' | 'task_not_owned' | 'task_terminal' | 'approval_not_delegable';
  error?: string;
}

/**
 * Cancel a task. Cancelling an unapproved request withdraws it; cancelling
 * approved work records a cancellation against the plan. Stopping is always the
 * safe direction, so cancel never needs its own approval — but it also never
 * un-terminates a task that already finished.
 */
export function cancelTask(
  workspace: BrandOpsData,
  taskId: string,
  sessionId: string,
  note?: string
): TaskMutationResult {
  const lookup = resolveTask(workspace, taskId, sessionId);
  if (!lookup.ok || !lookup.task) {
    return {
      ok: false,
      workspace,
      errorCode: lookup.errorCode,
      error: lookup.error
    };
  }
  if (
    lookup.task.status === 'completed' ||
    lookup.task.status === 'failed' ||
    lookup.task.status === 'cancelled'
  ) {
    return {
      ok: false,
      workspace,
      errorCode: 'task_terminal',
      error: `Task ${taskId} is already ${lookup.task.status}; there is nothing to cancel.`
    };
  }

  const proposal = findProposalByTaskId(workspace, taskId);
  if (!proposal) {
    return { ok: false, workspace, errorCode: 'task_not_found', error: 'Task vanished.' };
  }

  // Withdrawing an execution request is exactly a rejection of its proposal —
  // it flows through the canonical decision path so it lands in the audit trail.
  const next = decideAgentProposal(workspace, {
    proposalId: proposal.id,
    decision: 'rejected',
    note: note || 'Cancelled by the requesting agent.'
  });

  const after = resolveTask(next, taskId, sessionId);
  return { ok: true, workspace: next, task: after.task };
}

/**
 * `tasks/update` — respond to a pending input request.
 *
 * `decline` withdraws the request. `accept` is refused, always: the pending
 * input on a BrandOps execution task is a *human* approval, and letting the
 * requesting agent satisfy it over the protocol would hand it the exact
 * authority the approval boundary exists to withhold.
 */
export function applyTaskInputResponses(
  workspace: BrandOpsData,
  taskId: string,
  sessionId: string,
  inputResponses: Record<string, { action?: string; content?: unknown }>
): TaskMutationResult {
  const lookup = resolveTask(workspace, taskId, sessionId);
  if (!lookup.ok || !lookup.task) {
    return { ok: false, workspace, errorCode: lookup.errorCode, error: lookup.error };
  }

  const responses = Object.values(inputResponses ?? {});
  if (responses.some((response) => response?.action === 'accept')) {
    return {
      ok: false,
      workspace,
      errorCode: 'approval_not_delegable',
      error:
        'This task is waiting on a user approval. An agent cannot accept it over the protocol; ' +
        'a person approves it inside BrandOps. You may decline to withdraw the request.'
    };
  }

  if (responses.some((response) => response?.action === 'decline')) {
    return cancelTask(workspace, taskId, sessionId, 'Declined by the requesting agent.');
  }

  return {
    ok: true,
    workspace,
    task: lookup.task
  };
}
