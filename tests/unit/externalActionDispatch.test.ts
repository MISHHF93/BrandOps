/**
 * The step between an approved external action and the world — and the false
 * statement that used to stand in for it.
 *
 * Approving `send-email` marked the proposal `approved`, wrote a checkpoint
 * reading `agent.proposal_approved/COMPLETED`, and performed nothing. No
 * connector, no receipt, no failure. The user was told their approval completed
 * while nothing had been sent.
 *
 * A COMPLETED checkpoint for work that never ran is fabricated verification,
 * which the healing directive lists as a hard release gate. So the first test
 * here is not about executing anything. It is about refusing to claim it.
 */
import { describe, expect, it } from 'vitest';
import { createAgentSession } from '../../src/services/interop/sessions';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import {
  approveAndDispatchExternalAction,
  decideAgentProposal
} from '../../src/services/interop/proposals';
import { dispatchExternalAction } from '../../src/services/execution/externalActionDispatch';
import type { ExternalActionConnector } from '../../src/services/execution/externalActionDispatch';
import { createWebhookConnector } from '../../src/services/execution/connectors/webhookConnector';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const INTENT = { objective: 'follow up with Sarah', reason: 'the user asked me to send the notes' };

/** Requests a real `send-email` external action through the gateway. */
async function pendingAction(action = 'send-email') {
  const created = await createAgentSession(populatedWorkspace(), {
    clientKind: 'claude-code',
    clientName: 'Claude Code',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [],
    grantedCapabilities: ['action.request']
  });
  const requested = await executeAgentToolCall({
    workspace: created.workspace,
    token: created.token,
    call: {
      toolName: 'brandops_request_action',
      args: {
        action,
        target: 'sarah@example.invalid',
        summary: 'Send the architecture notes.',
        intent: INTENT
      }
    }
  });
  return {
    workspace: requested.workspace,
    proposalId: (requested.result.data as { proposalId: string }).proposalId
  };
}

const checkpointsFor = (workspace: BrandOpsData, proposalId: string) =>
  (workspace.checkpoints?.entries ?? []).filter((entry) => entry.receiptRef === proposalId);

function stubConnector(result: { ok: boolean; verification?: string; error?: string }) {
  return {
    id: 'stub',
    label: 'Stub connector',
    actions: ['send-email'],
    execute: async () => result
  } satisfies ExternalActionConnector;
}

describe('approved external actions', () => {
  it('does not claim completion when nothing performed the action', async () => {
    const { workspace, proposalId } = await pendingAction();
    const approved = decideAgentProposal(workspace, { proposalId, decision: 'approved' });

    const states = checkpointsFor(approved, proposalId).map((c) => c.state);
    // The regression: this used to be COMPLETED, for an email nobody sent.
    expect(states).toContain('BLOCKED');
    const blocked = checkpointsFor(approved, proposalId).find((c) => c.state === 'BLOCKED')!;
    expect(blocked.summary).toContain('did not send anything');
    expect(blocked.summary).toContain('send-email');
  });

  it('still records the approval — the user did approve it', async () => {
    const { workspace, proposalId } = await pendingAction();
    const approved = decideAgentProposal(workspace, { proposalId, decision: 'approved' });
    expect(approved.agentProposals?.entries.find((e) => e.id === proposalId)?.status).toBe(
      'approved'
    );
  });

  it('records BLOCKED when no connector is registered for the action', async () => {
    const { workspace, proposalId } = await pendingAction();
    const result = await approveAndDispatchExternalAction(workspace, proposalId, []);
    expect(result.outcome).toBe('no_connector');
    expect(result.message).toContain('no connector is registered');
    expect(checkpointsFor(result.workspace, proposalId).map((c) => c.state)).toContain('BLOCKED');
  });

  it('records COMPLETED with a receipt when a connector succeeds', async () => {
    const { workspace, proposalId } = await pendingAction();
    const before = (workspace.planWorkspace?.receipts ?? []).length;
    const result = await approveAndDispatchExternalAction(workspace, proposalId, [
      stubConnector({ ok: true, verification: 'provider-message-id-42' })
    ]);
    expect(result.outcome).toBe('executed');
    expect(checkpointsFor(result.workspace, proposalId).map((c) => c.state)).toContain('COMPLETED');
    // A receipt is what lets a person answer "did BrandOps actually do this?".
    expect((result.workspace.planWorkspace?.receipts ?? []).length).toBe(before + 1);
    expect(result.message).toContain('provider-message-id-42');
  });

  it('says so when a connector succeeds but cannot prove it', async () => {
    const { workspace, proposalId } = await pendingAction();
    const result = await approveAndDispatchExternalAction(workspace, proposalId, [
      stubConnector({ ok: true })
    ]);
    expect(result.outcome).toBe('executed');
    // "It worked" and "it worked and here is the evidence" are different claims.
    expect(result.message).toContain('no independent verification');
  });

  it('records FAILED, not COMPLETED, when a connector reports failure', async () => {
    const { workspace, proposalId } = await pendingAction();
    const result = await approveAndDispatchExternalAction(workspace, proposalId, [
      stubConnector({ ok: false, error: 'mailbox full' })
    ]);
    expect(result.outcome).toBe('failed');
    const states = checkpointsFor(result.workspace, proposalId).map((c) => c.state);
    expect(states).toContain('FAILED');
    expect(states).not.toContain('COMPLETED');
    expect(result.message).toContain('mailbox full');
  });

  it('treats a connector that throws as a failure, never a success', async () => {
    const { workspace, proposalId } = await pendingAction();
    const result = await approveAndDispatchExternalAction(workspace, proposalId, [
      {
        id: 'boom',
        label: 'Exploding connector',
        actions: ['send-email'],
        execute: async () => {
          throw new Error('ECONNRESET');
        }
      }
    ]);
    expect(result.outcome).toBe('failed');
    expect(result.message).toContain('ECONNRESET');
  });

  it('refuses to dispatch a proposal that is not pending', async () => {
    const { workspace, proposalId } = await pendingAction();
    const once = await approveAndDispatchExternalAction(workspace, proposalId, [
      stubConnector({ ok: true, verification: 'first' })
    ]);
    const twice = await approveAndDispatchExternalAction(once.workspace, proposalId, [
      stubConnector({ ok: true, verification: 'second' })
    ]);
    // Irreversible work must not be performable twice from one approval.
    expect(twice.message).toContain('No pending proposal');
  });
});

describe('webhook connector', () => {
  const request = {
    action: 'notify',
    target: 'ops',
    summary: 'Something happened.',
    proposalId: 'p1'
  };

  it('posts the action and reports the delivery status as verification', async () => {
    const seen: Array<{ url: string; body: string }> = [];
    const connector = createWebhookConnector({
      url: 'https://hooks.example.invalid/abc',
      fetchImpl: async (url, init) => {
        seen.push({ url, body: init.body });
        return { ok: true, status: 202, text: async () => '' };
      }
    });
    const result = await connector.execute(request);
    expect(result.ok).toBe(true);
    expect(result.verification).toContain('HTTP 202');
    expect(JSON.parse(seen[0].body)).toMatchObject({ action: 'notify', target: 'ops' });
  });

  it('reports a non-2xx as a failure with the body', async () => {
    const connector = createWebhookConnector({
      url: 'https://hooks.example.invalid/abc',
      fetchImpl: async () => ({ ok: false, status: 500, text: async () => 'upstream down' })
    });
    const result = await connector.execute(request);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
    expect(result.error).toContain('upstream down');
  });

  it('refuses a URL that is not http(s) or that embeds credentials', async () => {
    const fetchImpl = async () => {
      throw new Error('should never be called');
    };
    for (const url of [
      'file:///etc/passwd',
      'https://user:pass@example.invalid/hook',
      'not-a-url'
    ]) {
      const connector = createWebhookConnector({ url, fetchImpl });
      const result = await connector.execute(request);
      expect(result.ok, url).toBe(false);
    }
  });

  it('turns a network error into a failure rather than an exception', async () => {
    const connector = createWebhookConnector({
      url: 'https://hooks.example.invalid/abc',
      fetchImpl: async () => {
        throw new Error('ENOTFOUND');
      }
    });
    const result = await connector.execute(request);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ENOTFOUND');
  });

  it('only accepts the actions it was registered for', async () => {
    const connector = createWebhookConnector({
      url: 'https://hooks.example.invalid/abc',
      fetchImpl: async () => ({ ok: true, status: 200, text: async () => '' }),
      actions: ['notify']
    });
    const { workspace, proposalId } = await pendingAction('send-email');
    const approved = decideAgentProposal(workspace, {
      proposalId,
      decision: 'approved',
      deferExternalDispatch: true
    });
    const proposal = approved.agentProposals!.entries.find((e) => e.id === proposalId)!;
    const result = await dispatchExternalAction(approved, proposal, [connector]);
    // Registered for `notify`; asked to send email. Not its job.
    expect(result.outcome).toBe('no_connector');
  });
});
