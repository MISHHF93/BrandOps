/**
 * The invariants, asserted over the whole surface rather than at one handler.
 *
 * Ten cycles of adversarial probing produced a consistent finding: the defects
 * are in the seams, and the most expensive one was self-inflicted. Cycle 9 gave
 * the decision path a way to refuse an approval; the dispatcher one layer up was
 * never told, so for one cycle a connector ran to completion for a proposal
 * whose approval had just been withheld. The refusal existed. Nothing asked it.
 *
 * Every suite in this repository tests a layer. That is what let a repair open a
 * hard gate: no test asserted the property *across* the layers, so nothing
 * failed when one of them stopped agreeing with the others.
 *
 * These do. They are deliberately written to enumerate — every capability in the
 * registry, every value of the proposal-status union — so that adding a
 * capability or a status puts it in scope automatically. A sweep that lists the
 * cases it knows about is a sweep that goes stale the first time someone adds
 * one, which is the failure mode this file exists to prevent.
 */
import { describe, expect, it } from 'vitest';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { createAgentSession } from '../../src/services/interop/sessions';
import { AGENT_CAPABILITY_REGISTRY } from '../../src/services/interop/capabilityRegistry';
import { dispatchExternalAction } from '../../src/services/execution/externalActionDispatch';
import { createActivityEvent } from '../../src/services/builder/activityGraph';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';
import type { AgentProposal, AgentProposalStatus } from '../../src/types/agentInterop';

const CAPABILITY_IDS = Object.keys(AGENT_CAPABILITY_REGISTRY) as Array<
  keyof typeof AGENT_CAPABILITY_REGISTRY
>;

/** A session holding everything, so nothing is skipped for want of a grant. */
async function fullyGrantedSession() {
  const workspace = withDefaults(populatedWorkspace());
  return createAgentSession(workspace, {
    clientKind: 'claude-code',
    clientName: 'Invariant Sweep',
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    grantedBundles: [],
    grantedCapabilities: [...CAPABILITY_IDS]
  });
}

/** Trust tiers that assert a fact about the user rather than a claim about one. */
const VERIFIED_TIERS = ['USER_VERIFIED', 'BRANDOPS_VERIFIED'];

function verifiedActivityTitles(workspace: BrandOpsData): string[] {
  return (workspace.builderActivity?.events ?? [])
    .filter((event) => VERIFIED_TIERS.includes(String(event.trustTier)))
    .map((event) => event.title);
}

describe('every capability answers, and every call is recorded', () => {
  it('no capability throws out of the gateway', async () => {
    const created = await fullyGrantedSession();
    const failures: string[] = [];

    for (const id of CAPABILITY_IDS) {
      try {
        const out = await executeAgentToolCall({
          workspace: created.workspace,
          token: created.token,
          // Deliberately empty. A capability that only behaves when handed
          // well-formed arguments is one an adversary drives off the path.
          call: { capabilityId: id, args: {} }
        });
        if (!out.result) failures.push(`${id}: no envelope`);
        if (out.result && out.result.capabilityId !== id) {
          failures.push(`${id}: envelope claims ${out.result.capabilityId}`);
        }
      } catch (error) {
        failures.push(`${id}: threw ${(error as Error).message}`);
      }
    }

    expect(failures, failures.join('\n  ')).toEqual([]);
  });

  it('every call leaves an audit entry, refusals included', async () => {
    const created = await fullyGrantedSession();
    const missing: string[] = [];

    for (const id of CAPABILITY_IDS) {
      const out = await executeAgentToolCall({
        workspace: created.workspace,
        token: created.token,
        call: { capabilityId: id, args: {} }
      });
      const entries = out.workspace?.externalAgentAudit?.entries ?? [];
      // A refused call is the one most worth having in the trail: it is what an
      // attempt looks like.
      if (!entries.some((entry) => entry.capabilityId === id)) missing.push(id);
    }

    expect(missing, `capabilities with no audit entry:\n  ${missing.join('\n  ')}`).toEqual([]);
  });
});

describe('a connection is not an authorization', () => {
  it('never returns the session token in a response', async () => {
    const created = await fullyGrantedSession();
    const leaked: string[] = [];

    for (const id of CAPABILITY_IDS) {
      const out = await executeAgentToolCall({
        workspace: created.workspace,
        token: created.token,
        call: { capabilityId: id, args: {} }
      });
      // The bearer token is hashed for lookup and never stored; handing it back
      // in a result would undo that in one line.
      if (JSON.stringify(out.result ?? {}).includes(created.token)) leaked.push(id);
    }

    expect(leaked, `capabilities echoing the bearer token:\n  ${leaked.join('\n  ')}`).toEqual([]);
  });

  it('never returns a credential-shaped field', async () => {
    const created = await fullyGrantedSession();
    // The capability spec is explicit: do not expose credentials, do not return
    // OAuth tokens. Asserted on the wire rather than trusted to each handler.
    const forbidden =
      /"(access_?token|refresh_?token|client_?secret|api_?key|password|private_?key|authorization)"\s*:/i;
    const leaked: string[] = [];

    for (const id of CAPABILITY_IDS) {
      const out = await executeAgentToolCall({
        workspace: created.workspace,
        token: created.token,
        call: { capabilityId: id, args: {} }
      });
      if (forbidden.test(JSON.stringify(out.result ?? {}))) leaked.push(id);
    }

    expect(leaked, `capabilities returning credential fields:\n  ${leaked.join('\n  ')}`).toEqual(
      []
    );
  });
});

describe('external AI may propose, never promote', () => {
  it('no capability reachable without approval creates verified state', async () => {
    const created = await fullyGrantedSession();
    const before = verifiedActivityTitles(created.workspace);
    const promoted: string[] = [];

    for (const id of CAPABILITY_IDS) {
      const definition = AGENT_CAPABILITY_REGISTRY[id];
      if (definition.access !== 'auto' || definition.readOnly) continue;

      const out = await executeAgentToolCall({
        workspace: created.workspace,
        token: created.token,
        call: {
          capabilityId: id,
          // Everything an agent might say to claim its own work is verified.
          args: {
            kind: 'feature-built',
            title: `Promotion attempt via ${id}`,
            detail: 'Claimed by the agent, witnessed by nobody.',
            source: 'user-action',
            trustTier: 'USER_VERIFIED',
            verificationStatus: 'USER_VERIFIED',
            confidence: 1
          }
        }
      });

      const after = verifiedActivityTitles(out.workspace ?? created.workspace);
      const gained = after.filter((title) => !before.includes(title));
      if (gained.length) promoted.push(`${id}: ${gained.join(', ')}`);
    }

    expect(
      promoted,
      `auto-access capabilities that produced verified state:\n  ${promoted.join('\n  ')}`
    ).toEqual([]);
  });

  /**
   * The end-to-end sweep above cannot see this, and finding that out is the
   * reason it is here.
   *
   * Re-opening the cycle-8 trapdoor — deriving `USER_VERIFIED` from
   * `source === 'user-action'` — left all eleven tests in this file green,
   * because the one handler that reaches `createActivityEvent` pins the tier
   * explicitly and never falls through. The sweep tests the surface an agent can
   * actually drive today, which is right, and would have told me nothing about a
   * *new* handler that forgets to pin. That is precisely the scenario the
   * trapdoor was about.
   *
   * So this asserts the property at the boundary, across every source value
   * rather than the one that happened to be exploitable: with no tier supplied,
   * no input produces a verified one.
   */
  it('no source value produces a verified tier on its own', () => {
    const sources = [
      'user-action',
      'agent-reported',
      'integration-import',
      'skill-pack',
      'dev-hook',
      'session-to-brand',
      'manual',
      'USER-ACTION',
      '',
      'user-action ',
      'anything at all'
    ];

    const promoted = sources.filter((source) => {
      const event = createActivityEvent(
        {
          workspaceId: 'local-workspace',
          source: source as never,
          sourceId: `probe-${source}`,
          kind: 'feature-built',
          title: 'Claimed by the agent',
          detail: 'Witnessed by nobody.'
        },
        new Date().toISOString(),
        true
      );
      return VERIFIED_TIERS.includes(String(event.trustTier));
    });

    expect(promoted, `source values that promoted themselves: ${promoted.join(', ')}`).toEqual([]);
  });
});

describe('nothing reaches the outside world without a standing approval', () => {
  /**
   * Enumerated from the union, not from a list of statuses someone remembered.
   * A new status added to `AgentProposalStatus` lands here without anyone
   * choosing to add it — which is the only reason this catches the next one.
   */
  const ALL_STATUSES: AgentProposalStatus[] = ['pending', 'approved', 'rejected', 'superseded'];

  for (const status of ALL_STATUSES) {
    it(`${status}: connector runs only when approved`, async () => {
      const calls: unknown[] = [];
      const connector = {
        id: 'recorder',
        label: 'Recording connector',
        actions: ['send-email'],
        execute: async (request: unknown) => {
          calls.push(request);
          return { ok: true, verification: 'provider-1' };
        }
      };

      const proposal = {
        id: `proposal-${status}`,
        kind: 'external_action',
        title: 'Send it',
        detail: 'd',
        rationale: 'r',
        status,
        tier: 'EXTERNAL_ACTION',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        externalAction: { action: 'send-email', target: 'someone@example.com', summary: 's' }
      } as AgentProposal;

      const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal, [
        connector
      ]);

      expect(calls.length, status).toBe(status === 'approved' ? 1 : 0);
      if (status !== 'approved') expect(out.outcome, status).toBe('not_approved');
    });
  }
});

describe('a claim of success requires something to have run', () => {
  it('reports no connector as blocked, never as executed', async () => {
    const proposal = {
      id: 'proposal-nc',
      kind: 'external_action',
      title: 'Send it',
      detail: 'd',
      rationale: 'r',
      status: 'approved',
      tier: 'EXTERNAL_ACTION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      externalAction: { action: 'send-carrier-pigeon', target: 'x', summary: 's' }
    } as AgentProposal;

    const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal, []);
    // "Approved" and "done" are different facts. Conflating them is the
    // fabricated-verification gate.
    expect(out.outcome).toBe('no_connector');
    expect(out.workspace.checkpoints?.entries?.[0]?.state).toBe('BLOCKED');
  });

  it('reports a throwing connector as failed, never as executed', async () => {
    const proposal = {
      id: 'proposal-throw',
      kind: 'external_action',
      title: 'Send it',
      detail: 'd',
      rationale: 'r',
      status: 'approved',
      tier: 'EXTERNAL_ACTION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      externalAction: { action: 'send-email', target: 'x', summary: 's' }
    } as AgentProposal;

    const out = await dispatchExternalAction(withDefaults(populatedWorkspace()), proposal, [
      {
        id: 'broken',
        label: 'Broken connector',
        actions: ['send-email'],
        execute: async () => {
          throw new Error('provider unreachable');
        }
      }
    ]);
    expect(out.outcome).toBe('failed');
  });
});
