import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { createAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { decideAgentProposal } from '../../src/services/interop/proposals';
import {
  applyTaskInputResponses,
  cancelTask,
  resolveTask
} from '../../src/services/interop/mcp/tasks';
import {
  clientSupportsTasks,
  createTaskResult,
  listMcpTools,
  taskGetResult,
  TASKS_EXTENSION
} from '../../src/services/interop/mcp/server';
import { withDefaults } from '../../src/services/storage/storage';
import type { AgentCapabilityId, McpTask } from '../../src/types/agentInterop';
import type { BrandOpsData, Plan } from '../../src/types/domain';

const INTENT = {
  objective: 'Execute the launch plan.',
  reason: 'The user approved the launch sequence and asked for it to be run.'
};

/** Shaped to survive `normalizePlan` — which drops any plan lacking `sourceResponseId` or steps. */
function planFixture(id: string, overrides: Partial<Plan> = {}): Plan {
  const now = new Date().toISOString();
  const step = (suffix: string, title: string, description: string) => ({
    id: `${id}-${suffix}`,
    title,
    description,
    owner: 'User',
    requiredInput: 'None.',
    approvalRequired: false,
    status: 'todo' as const
  });
  return {
    id,
    title: 'Launch plan',
    summary: 'Prepare the launch.',
    objective: 'Ship the launch',
    planType: 'launch-plan',
    status: 'approved',
    confidenceScore: 70,
    sourceResponseId: `${id}-source`,
    assumptions: [],
    missingInputs: [],
    requiredApprovals: [],
    steps: [
      step('s1', 'Draft the announcement copy', 'Write the announcement draft.'),
      step('s2', 'Review the draft internally', 'Read it through and tighten the wording.')
    ],
    timeline: [],
    outputsAssets: [],
    savedAt: now,
    receiptId: `${id}-receipt`,
    ...overrides
  } as Plan;
}

function workspaceWithPlan(plan = planFixture('plan-exec-1')): BrandOpsData {
  const base = cloneSeedData();
  return withDefaults({
    ...base,
    planWorkspace: {
      plans: [plan, ...(base.planWorkspace?.plans ?? [])],
      receipts: base.planWorkspace?.receipts ?? [],
      updatedAt: new Date().toISOString()
    }
  });
}

async function sessionFor(
  workspace: BrandOpsData,
  grantedCapabilities: AgentCapabilityId[],
  clientKind: 'claude-code' | 'codex' = 'claude-code'
) {
  const created = await createAgentSession(workspace, {
    clientKind,
    clientName: clientKind,
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [],
    grantedCapabilities
  });
  return { workspace: created.workspace, token: created.token, session: created.session };
}

/** Request execution and hand back the workspace plus the minted task handle. */
async function requestExecution(planId = 'plan-exec-1') {
  const seeded = workspaceWithPlan(planFixture(planId));
  const { workspace, token, session } = await sessionFor(seeded, [
    'execution.request',
    'execution.read',
    'execution.cancel'
  ]);
  const res = await executeAgentToolCall({
    workspace,
    token,
    call: {
      capabilityId: 'execution.request',
      args: { planId, summary: 'Run the launch plan.', intent: INTENT }
    }
  });
  return { res, token, session };
}

describe('MCP durable execution: requesting work', () => {
  it('returns a task handle that opens at the approval boundary, not at a running job', async () => {
    const { res } = await requestExecution();

    expect(res.result.ok).toBe(true);
    expect(res.result.approvalRequired).toBe(true);
    const taskId = res.result.data.taskId as string;
    expect(taskId).toMatch(/^br_task_/);

    const task = res.result.data.task as McpTask;
    expect(task.status).toBe('input_required');
    expect(task.ttlMs).toBeNull();
    expect(task.inputRequests?.approval).toBeTruthy();
    // The pending input is explicitly a human decision.
    expect(task.inputRequests?.approval.params.resolvableBy).toBe('user');

    // Nothing ran: the plan is untouched and a pending proposal exists.
    const plan = res.workspace.planWorkspace?.plans.find((p) => p.id === 'plan-exec-1');
    expect(plan?.steps.every((s) => s.status === 'todo')).toBe(true);
    expect((res.workspace.agentProposals?.entries ?? [])[0]?.status).toBe('pending');
  });

  it('states the real risk tier on the approval surface', async () => {
    const { res } = await requestExecution();
    const proposal = (res.workspace.agentProposals?.entries ?? [])[0];
    // Whoever approves this must see EXTERNAL_ACTION, not a milder tier.
    expect(proposal.tier).toBe('EXTERNAL_ACTION');
    expect(proposal.rationale).toContain('Nothing runs until approved');
  });

  it('rejects a request for a plan that does not exist', async () => {
    const seeded = workspaceWithPlan();
    const { workspace, token } = await sessionFor(seeded, ['execution.request']);
    const res = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'execution.request', args: { planId: 'nope', intent: INTENT } }
    });
    expect(res.result.ok).toBe(false);
    expect(res.result.errorCode).toBe('plan_not_found');
  });

  it('requires a declared intent contract — it is an EXTERNAL_ACTION', async () => {
    const seeded = workspaceWithPlan();
    const { workspace, token } = await sessionFor(seeded, ['execution.request']);
    const res = await executeAgentToolCall({
      workspace,
      token,
      call: { capabilityId: 'execution.request', args: { planId: 'plan-exec-1' } }
    });
    expect(res.result.ok).toBe(false);
    expect(res.result.errorCode).toBe('intent_contract_required');
  });
});

describe('MCP durable execution: the task tracks real state', () => {
  it('advances through approval into a terminal state the agent can read', async () => {
    const { res, token, session } = await requestExecution();
    const taskId = res.result.data.taskId as string;
    const proposalId = res.result.data.proposalId as string;

    // The user approves inside BrandOps — the only way past the boundary.
    const approved = decideAgentProposal(res.workspace, {
      proposalId,
      decision: 'approved',
      note: 'Go ahead.'
    });

    const view = resolveTask(approved, taskId, session.id);
    expect(view.ok).toBe(true);
    // Approval ran the plan through the canonical executor, so the task moved on
    // from `working` to a real outcome rather than stalling forever.
    expect(view.task?.status).not.toBe('input_required');
    expect(['completed', 'failed', 'working']).toContain(view.task?.status);

    const read = await executeAgentToolCall({
      workspace: approved,
      token,
      call: { capabilityId: 'execution.read', args: { taskId } }
    });
    expect(read.result.ok).toBe(true);
    expect((read.result.data.task as McpTask).taskId).toBe(taskId);
  });

  it('reports a completed run with a citable result', async () => {
    const { res, session } = await requestExecution();
    const taskId = res.result.data.taskId as string;
    const approved = decideAgentProposal(res.workspace, {
      proposalId: res.result.data.proposalId as string,
      decision: 'approved'
    });
    const task = resolveTask(approved, taskId, session.id).task as McpTask;
    if (task.status === 'completed') {
      expect(task.result?.planId).toBe('plan-exec-1');
      expect(task.result?.totalSteps).toBe(2);
    } else {
      // Blocked steps surface as a recovery input request, never as silence.
      expect(task.status).toBe('input_required');
      expect(task.inputRequests?.recovery).toBeTruthy();
    }
  });

  it('surfaces a blocked plan as input_required with the blocker named', async () => {
    // "Send" marks a step as an external side effect the executor refuses to perform.
    const blocking = planFixture('plan-exec-blocked', {
      steps: [
        {
          id: 'b1',
          title: 'Send the launch email to the list',
          description: 'Email everyone.',
          owner: 'User',
          requiredInput: 'None.',
          approvalRequired: false,
          status: 'todo'
        }
      ]
    } as Partial<Plan>);
    const seeded = workspaceWithPlan(blocking);
    const { workspace, token, session } = await sessionFor(seeded, ['execution.request']);
    const res = await executeAgentToolCall({
      workspace,
      token,
      call: {
        capabilityId: 'execution.request',
        args: { planId: 'plan-exec-blocked', intent: INTENT }
      }
    });
    const approved = decideAgentProposal(res.workspace, {
      proposalId: res.result.data.proposalId as string,
      decision: 'approved'
    });
    const task = resolveTask(approved, res.result.data.taskId as string, session.id)
      .task as McpTask;
    expect(task.status).toBe('input_required');
    expect(task.inputRequests?.recovery.params.blocker).toBeTruthy();
  });
});

describe('MCP durable execution: cancellation', () => {
  it('withdrawing an unapproved request cancels the task through the decision path', async () => {
    const { res, token, session } = await requestExecution();
    const taskId = res.result.data.taskId as string;

    const cancelled = await executeAgentToolCall({
      workspace: res.workspace,
      token,
      call: {
        capabilityId: 'execution.cancel',
        args: { taskId, reason: 'User changed their mind.' }
      }
    });
    expect(cancelled.result.ok).toBe(true);
    expect((cancelled.result.data.task as McpTask).status).toBe('cancelled');

    // The withdrawal is on the record as a rejected proposal, not a silent drop.
    const proposal = (cancelled.workspace.agentProposals?.entries ?? [])[0];
    expect(proposal.status).toBe('rejected');
    expect(proposal.decisionNote).toContain('User changed their mind');

    // And it cannot be cancelled twice.
    const again = cancelTask(cancelled.workspace, taskId, session.id);
    expect(again.ok).toBe(false);
    expect(again.errorCode).toBe('task_terminal');
  });

  it('cancelling an unknown task fails cleanly', async () => {
    const { res, token } = await requestExecution();
    const out = await executeAgentToolCall({
      workspace: res.workspace,
      token,
      call: { capabilityId: 'execution.cancel', args: { taskId: 'br_task_nope' } }
    });
    expect(out.result.ok).toBe(false);
    expect(out.result.errorCode).toBe('task_not_found');
  });
});

describe('MCP durable execution: adversarial', () => {
  it('a task handle from another session is not readable — guessing it is not enough', async () => {
    const { res } = await requestExecution();
    const taskId = res.result.data.taskId as string;

    // A second session in the same workspace, holding the same capabilities.
    const other = await sessionFor(res.workspace, ['execution.read', 'execution.cancel'], 'codex');
    const view = resolveTask(other.workspace, taskId, other.session.id);
    expect(view.ok).toBe(false);
    expect(view.errorCode).toBe('task_not_owned');

    const readAttempt = await executeAgentToolCall({
      workspace: other.workspace,
      token: other.token,
      call: { capabilityId: 'execution.read', args: { taskId } }
    });
    expect(readAttempt.result.ok).toBe(false);
    expect(readAttempt.result.errorCode).toBe('task_not_owned');
  });

  it('another session cannot cancel a task it does not own', async () => {
    const { res } = await requestExecution();
    const taskId = res.result.data.taskId as string;
    const other = await sessionFor(res.workspace, ['execution.cancel'], 'codex');
    const out = cancelTask(other.workspace, taskId, other.session.id);
    expect(out.ok).toBe(false);
    expect(out.errorCode).toBe('task_not_owned');
    // The original request is untouched.
    expect((out.workspace.agentProposals?.entries ?? [])[0]?.status).toBe('pending');
  });

  it('tasks/update cannot be used to approve the agent past the approval boundary', async () => {
    const { res, session } = await requestExecution();
    const taskId = res.result.data.taskId as string;

    const attempt = applyTaskInputResponses(res.workspace, taskId, session.id, {
      approval: { action: 'accept' }
    });
    expect(attempt.ok).toBe(false);
    expect(attempt.errorCode).toBe('approval_not_delegable');
    // Still pending; nothing executed.
    expect((attempt.workspace.agentProposals?.entries ?? [])[0]?.status).toBe('pending');
    const plan = attempt.workspace.planWorkspace?.plans.find((p) => p.id === 'plan-exec-1');
    expect(plan?.steps.every((s) => s.status === 'todo')).toBe(true);
  });

  it('tasks/update decline withdraws the request', async () => {
    const { res, session } = await requestExecution();
    const taskId = res.result.data.taskId as string;
    const declined = applyTaskInputResponses(res.workspace, taskId, session.id, {
      approval: { action: 'decline' }
    });
    expect(declined.ok).toBe(true);
    expect(declined.task?.status).toBe('cancelled');
  });

  it('a task handle survives a workspace storage round trip', async () => {
    const { res, session } = await requestExecution();
    const taskId = res.result.data.taskId as string;
    // withDefaults is the normalizer every load goes through; a handle it drops
    // would strand an agent that is polling the task.
    const reloaded = withDefaults(JSON.parse(JSON.stringify(res.workspace)));
    const view = resolveTask(reloaded, taskId, session.id);
    expect(view.ok).toBe(true);
    expect(view.task?.taskId).toBe(taskId);
  });
});

describe('MCP durable execution: protocol shapes', () => {
  it('detects the tasks capability only when the client declares it in _meta', () => {
    expect(
      clientSupportsTasks({
        _meta: {
          'io.modelcontextprotocol/clientCapabilities': {
            extensions: { [TASKS_EXTENSION]: {} }
          }
        }
      })
    ).toBe(true);
    expect(clientSupportsTasks({})).toBe(false);
    expect(clientSupportsTasks(undefined)).toBe(false);
    // A client declaring some other extension does not opt into tasks.
    expect(
      clientSupportsTasks({
        _meta: {
          'io.modelcontextprotocol/clientCapabilities': { extensions: { 'other/ext': {} } }
        }
      })
    ).toBe(false);
  });

  it('CreateTaskResult and tasks/get carry the spec discriminators', async () => {
    const { res } = await requestExecution();
    const task = res.result.data.task as McpTask;

    const created = createTaskResult(task);
    expect(created.resultType).toBe('task');
    expect(created.taskId).toBe(task.taskId);
    expect(created.status).toBe('input_required');
    expect(created.ttlMs).toBeNull();

    const fetched = taskGetResult(task);
    expect(fetched.resultType).toBe('complete');
    expect(fetched.taskId).toBe(task.taskId);
  });

  it('the three execution tools are advertised with the right obligations', () => {
    const tools = listMcpTools();
    const request = tools.find((t) => t.name === 'brandops_request_plan_execution');
    expect(request?.inputSchema.required).toEqual(expect.arrayContaining(['planId', 'intent']));

    const get = tools.find((t) => t.name === 'brandops_get_execution');
    expect(get?.inputSchema.required).toContain('taskId');
    expect(get?.inputSchema.properties.intent).toBeUndefined();

    const cancel = tools.find((t) => t.name === 'brandops_cancel_execution');
    expect(cancel?.inputSchema.required).toContain('taskId');
    // Cancel is PREPARE: it carries a contract but does not demand one, because
    // stopping work must never be harder than starting it.
    expect(cancel?.inputSchema.properties.intent).toBeTruthy();
    expect(cancel?.inputSchema.required).not.toContain('intent');
  });
});
