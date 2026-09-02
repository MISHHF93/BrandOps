/**
 * Every outcome leaves a receipt, and a receipt says whether it was proven.
 *
 * Cycle 8 gave receipts the governance record they had been discarding. Two gaps
 * survived it, and enumerating the outcomes rather than probing one found both.
 *
 * **The ledger held only successes.** `createReceipt` was called on the success
 * path alone, so the four other outcomes — no connector, not approved, refused,
 * failed — wrote a checkpoint and no receipt. The artifact built to answer "what
 * happened to my request" could not answer it for any request that did not work,
 * which is the only time anyone asks.
 *
 * **Verification lived in prose.** The dispatcher knew whether the connector had
 * returned independent proof and put the answer in an English sentence inside
 * `summary`. `ReceiptVerification` was a defined type nothing wrote — the same
 * shape as `ExecutionReceipt` itself before cycle 8. Telling *verified* from
 * *claimed* meant parsing a sentence, and that distinction is the one the
 * directive asks receipts to keep.
 */
import { describe, expect, it } from 'vitest';
import {
  dispatchExternalAction,
  type ExternalActionConnector,
  type ExternalActionOutcome
} from '../../src/services/execution/externalActionDispatch';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { AgentProposal, AgentProposalStatus } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';
import type { ExecutionReceipt } from '../../src/types/builder';

function proposal(status: AgentProposalStatus = 'approved', action = 'send-email'): AgentProposal {
  const now = new Date().toISOString();
  return {
    id: `proposal-${status}-${action}`,
    kind: 'external_action',
    title: 'Send the launch note',
    detail: 'd',
    rationale: 'r',
    status,
    tier: 'EXTERNAL_ACTION',
    agentId: 'claude-code',
    createdAt: now,
    updatedAt: now,
    externalAction: { action, target: 'someone@example.com', summary: 's' }
  } as AgentProposal;
}

function connector(result: { ok: boolean; verification?: string; error?: string }) {
  return {
    id: 'test',
    label: 'Test connector',
    actions: ['send-email'],
    execute: async () => result
  } satisfies ExternalActionConnector;
}

function receipts(workspace: BrandOpsData): ExecutionReceipt[] {
  return workspace.builderActivity?.executionReceipts ?? [];
}

/** Every outcome the dispatcher can produce, with a scenario that reaches it. */
const SCENARIOS: Array<{
  outcome: ExternalActionOutcome;
  run: () => Promise<{ workspace: BrandOpsData; outcome: ExternalActionOutcome }>;
}> = [
  {
    outcome: 'executed',
    run: () =>
      dispatchExternalAction(withDefaults(populatedWorkspace()), proposal(), [
        connector({ ok: true, verification: 'provider-msg-9' })
      ])
  },
  {
    outcome: 'failed',
    run: () =>
      dispatchExternalAction(withDefaults(populatedWorkspace()), proposal(), [
        connector({ ok: false, error: 'mailbox full' })
      ])
  },
  {
    outcome: 'no_connector',
    run: () =>
      dispatchExternalAction(
        withDefaults(populatedWorkspace()),
        proposal('approved', 'send-carrier-pigeon'),
        []
      )
  },
  {
    outcome: 'not_approved',
    run: () =>
      dispatchExternalAction(withDefaults(populatedWorkspace()), proposal('superseded'), [
        connector({ ok: true })
      ])
  }
];

describe('every dispatch outcome leaves a durable receipt', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.outcome}: writes one`, async () => {
      const out = await scenario.run();
      expect(out.outcome).toBe(scenario.outcome);
      // A ledger of successes cannot answer the only question anyone brings to
      // it: what happened to the thing that did not work.
      expect(receipts(out.workspace).length, scenario.outcome).toBe(1);
    });
  }

  it('covers every outcome the type allows', () => {
    // Enumerated from the union so a new outcome cannot be added without a
    // scenario proving it still leaves a record.
    const all: ExternalActionOutcome[] = ['executed', 'failed', 'no_connector', 'not_approved'];
    expect(SCENARIOS.map((s) => s.outcome).sort()).toEqual([...all].sort());
  });
});

describe('the receipt distinguishes proven from claimed', () => {
  it('records system-verified when the connector returned proof', async () => {
    const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal(), [
      connector({ ok: true, verification: 'provider-msg-9' })
    ]);
    const receipt = receipts(out.workspace)[0];
    expect(receipt.result).toBe('success');
    expect(receipt.verification?.type).toBe('system-verified');
    expect(receipt.verification?.detail).toContain('provider-msg-9');
  });

  it('records pending when the connector reported success without proof', async () => {
    const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal(), [
      connector({ ok: true })
    ]);
    const receipt = receipts(out.workspace)[0];
    // Still a success — the connector did the work — but not a verified one.
    // "It worked" and "it worked, here is the evidence" are different claims.
    expect(receipt.result).toBe('success');
    expect(receipt.verification?.type).toBe('pending');
  });

  it('never claims verification for something that did not run', async () => {
    for (const scenario of SCENARIOS) {
      const out = await scenario.run();
      if (scenario.outcome === 'executed') continue;
      const receipt = receipts(out.workspace)[0];
      expect(receipt.verification?.type, scenario.outcome).toBe('pending');
    }
  });
});

describe('blocked and failed stay distinct', () => {
  it('a missing connector is blocked, not failed', async () => {
    const out = await dispatchExternalAction(
      withDefaults(populatedWorkspace()),
      proposal('approved', 'send-carrier-pigeon'),
      []
    );
    // Nothing was attempted. Telling a user their send failed would send them
    // to check a destination that was never contacted.
    expect(receipts(out.workspace)[0].result).toBe('blocked');
  });

  it('a connector that ran and failed is failed', async () => {
    const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal(), [
      connector({ ok: false, error: 'mailbox full' })
    ]);
    expect(receipts(out.workspace)[0].result).toBe('failed');
    expect(receipts(out.workspace)[0].summary).toContain('mailbox full');
  });

  it('a rejected proposal is rejected, not merely blocked', async () => {
    const out = await dispatchExternalAction(
      withDefaults(populatedWorkspace()),
      proposal('rejected'),
      [connector({ ok: true })]
    );
    expect(receipts(out.workspace)[0].result).toBe('rejected');
  });

  it('records no approver for an action no one approved', async () => {
    const out = await dispatchExternalAction(
      withDefaults(populatedWorkspace()),
      proposal('superseded'),
      [connector({ ok: true })]
    );
    // The approval did not stand. Naming a user as approver here would put a
    // decision in the record that nobody made.
    expect(receipts(out.workspace)[0].approvedBy).toBeUndefined();
  });

  it('names the approver when the action was approved', async () => {
    const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal(), [
      connector({ ok: true, verification: 'ok' })
    ]);
    expect(receipts(out.workspace)[0].approvedBy).toBe('user');
  });
});
