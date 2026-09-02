/**
 * Delegation between agents, and the fact that it can only narrow.
 *
 * `agentHandoffs` sat on `BrandOpsData` as a fully specified type — required
 * capabilities, minimum context, allowed and prohibited actions, budgets,
 * expiry, a seven-state lifecycle — with **nothing implementing it**. A sweep
 * for workspace fields no reader touches found it: a promise in the schema.
 *
 * Delegation is where authority grows by accident, so the tests here are mostly
 * about what a handoff *cannot* do. The rule is that a handoff never grants, it
 * only narrows, and it is enforced twice:
 *
 * - at proposal, against the **source**: you cannot write down a capability you
 *   were never given;
 * - at use, against the **target**: what the handoff confers is intersected with
 *   what that session holds *now*.
 *
 * Both are needed, and each has its own test below saying why. One without the
 * other leaves either a laundering route (mint a handoff naming scope you never
 * had, hand it to someone privileged) or a frozen grant that outlives the
 * revocation it should have respected.
 */
import { describe, expect, it } from 'vitest';
import {
  cancelHandoff,
  completeHandoff,
  decideHandoff,
  effectiveCapabilities,
  expireHandoffs,
  getHandoffById,
  listHandoffs,
  proposeHandoff,
  recordHandoffUsage,
  startHandoff
} from '../../src/services/interop/handoffs';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';
import type {
  AgentCapabilityId,
  ContextBundleId,
  ExternalAgentSession
} from '../../src/types/agentInterop';

const NOW = '2026-06-01T12:00:00.000Z';
const LATER = '2026-06-01T18:00:00.000Z';
const EARLIER = '2026-06-01T06:00:00.000Z';

function session(
  id: string,
  capabilities: AgentCapabilityId[],
  bundles: ContextBundleId[],
  status: 'active' | 'revoked' = 'active'
): ExternalAgentSession {
  return {
    id,
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    clientKind: 'claude-code',
    clientName: id,
    tokenHash: `hash-${id}`,
    status,
    grantedBundles: bundles,
    grantedCapabilities: capabilities,
    createdAt: EARLIER,
    lastActivityAt: EARLIER
  };
}

/** A senior session that can delegate, and a junior one that can be delegated to. */
function twoSessions(
  sourceCaps: AgentCapabilityId[] = ['context.read', 'plans.read'],
  targetCaps: AgentCapabilityId[] = ['context.read', 'plans.read'],
  targetStatus: 'active' | 'revoked' = 'active'
): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    externalAgentSessions: {
      ...(base.externalAgentSessions ?? {}),
      entries: [
        session('session-source', sourceCaps, ['PUBLIC_IDENTITY', 'BUILDER_CONTEXT']),
        session('session-target', targetCaps, ['PUBLIC_IDENTITY'], targetStatus)
      ]
    }
  } as BrandOpsData;
}

const validInput = {
  sourceSessionId: 'session-source',
  targetSessionId: 'session-target',
  objective: 'Draft the release notes',
  requiredCapabilities: ['context.read'] as string[],
  minimumContext: ['PUBLIC_IDENTITY'] as ContextBundleId[],
  expectedOutput: 'A markdown summary of the change set'
};

/** Propose, accept, start — the ordinary route to a usable handoff. */
function running(workspace: BrandOpsData) {
  const proposed = proposeHandoff(workspace, validInput, NOW);
  const accepted = decideHandoff(proposed.workspace, proposed.handoff!.id, 'accepted', NOW);
  const started = startHandoff(accepted.workspace, proposed.handoff!.id, NOW);
  return { workspace: started.workspace, id: proposed.handoff!.id };
}

describe('proposing a handoff', () => {
  it('records one when the delegator holds everything it names', () => {
    const result = proposeHandoff(twoSessions(), validInput, NOW);

    expect(result.ok).toBe(true);
    expect(result.handoff?.status).toBe('proposed');
    expect(listHandoffs(result.workspace)).toHaveLength(1);
    expect(result.handoff?.usage).toEqual({ tokens: 0, elapsedMs: 0, toolCalls: 0, cost: 0 });
  });

  it('refuses to name a capability the delegator does not hold', () => {
    /**
     * The laundering route, closed. Without this a session granted only
     * `context.read` could write a handoff naming `twin.propose_update`, hand it to a
     * session that *does* hold it, and produce a document asserting a scope it
     * was never given.
     */
    const result = proposeHandoff(
      twoSessions(['context.read']),
      { ...validInput, requiredCapabilities: ['context.read', 'twin.propose_update'] },
      NOW
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('capability_not_held');
    expect(listHandoffs(result.workspace), 'the refused handoff was stored anyway').toHaveLength(0);
  });

  it('refuses to pass on context the delegator cannot read', () => {
    // The same rule for bundles: `session-source` holds PUBLIC_IDENTITY and
    // BUILDER_CONTEXT, and cannot hand on PROJECT_CONTEXT.
    const result = proposeHandoff(
      twoSessions(),
      { ...validInput, minimumContext: ['PROJECT_CONTEXT'] },
      NOW
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('bundle_not_held');
  });

  it('refuses a revoked delegator', () => {
    const base = twoSessions();
    const revoked = {
      ...base,
      externalAgentSessions: {
        ...base.externalAgentSessions!,
        entries: base.externalAgentSessions!.entries.map((e) =>
          e.id === 'session-source' ? { ...e, status: 'revoked' as const } : e
        )
      }
    } as BrandOpsData;

    expect(proposeHandoff(revoked, validInput, NOW).errorCode).toBe('source_revoked');
  });

  it('refuses a revoked target', () => {
    const result = proposeHandoff(twoSessions(undefined, undefined, 'revoked'), validInput, NOW);
    expect(result.errorCode).toBe('target_revoked');
  });

  it('refuses an action that is both allowed and prohibited', () => {
    /**
     * Refused rather than resolved. Choosing a winner would decide, on the
     * delegator's behalf, whether they meant to permit or forbid — and either
     * reading is a scope decision nobody actually made.
     */
    const result = proposeHandoff(
      twoSessions(),
      { ...validInput, allowedActions: ['publish'], prohibitedActions: ['publish'] },
      NOW
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('contradictory_actions');
  });

  it('refuses an expiry that has already passed', () => {
    const result = proposeHandoff(twoSessions(), { ...validInput, expiration: EARLIER }, NOW);
    expect(result.errorCode).toBe('already_expired');
  });

  it('refuses a capability that is not a capability', () => {
    const result = proposeHandoff(
      twoSessions(),
      { ...validInput, requiredCapabilities: ['everything'] },
      NOW
    );
    expect(result.errorCode).toBe('invalid_input');
  });

  it('needs an objective and an expected output', () => {
    // Without both, nothing can later judge whether the work was done.
    expect(proposeHandoff(twoSessions(), { ...validInput, objective: '  ' }, NOW).errorCode).toBe(
      'invalid_input'
    );
    expect(
      proposeHandoff(twoSessions(), { ...validInput, expectedOutput: '' }, NOW).errorCode
    ).toBe('invalid_input');
  });
});

describe('what a handoff actually confers', () => {
  it('gives the intersection, not the union', () => {
    /**
     * The heart of it. The delegator holds both capabilities and names both; the
     * target holds only one. What the handoff confers is the overlap — it cannot
     * teach a session a capability that session was never granted.
     */
    const workspace = twoSessions(['context.read', 'plans.read'], ['context.read']);
    const proposed = proposeHandoff(
      workspace,
      { ...validInput, requiredCapabilities: ['context.read', 'plans.read'] },
      NOW
    );
    const accepted = decideHandoff(proposed.workspace, proposed.handoff!.id, 'accepted', NOW);
    const started = startHandoff(accepted.workspace, proposed.handoff!.id, NOW);

    expect(proposed.ok, 'the delegator could not even propose it').toBe(true);
    expect(effectiveCapabilities(started.workspace, proposed.handoff!.id, NOW)).toEqual([
      'context.read'
    ]);
  });

  it('confers nothing once the target is revoked', () => {
    /**
     * Why the check at use is needed as well as the one at proposal. The handoff
     * was written while the target was privileged; revoking that session has to
     * take effect immediately, not at the next proposal.
     */
    const { workspace, id } = running(twoSessions());
    expect(effectiveCapabilities(workspace, id, NOW)).toEqual(['context.read']);

    const revoked = {
      ...workspace,
      externalAgentSessions: {
        ...workspace.externalAgentSessions!,
        entries: workspace.externalAgentSessions!.entries.map((e) =>
          e.id === 'session-target' ? { ...e, status: 'revoked' as const } : e
        )
      }
    } as BrandOpsData;

    expect(effectiveCapabilities(revoked, id, NOW)).toEqual([]);
  });

  it('confers nothing before it is accepted', () => {
    const proposed = proposeHandoff(twoSessions(), validInput, NOW);
    expect(effectiveCapabilities(proposed.workspace, proposed.handoff!.id, NOW)).toEqual([]);
  });

  it('confers nothing after it expires', () => {
    const workspace = twoSessions();
    const proposed = proposeHandoff(workspace, { ...validInput, expiration: LATER }, NOW);
    const accepted = decideHandoff(proposed.workspace, proposed.handoff!.id, 'accepted', NOW);

    expect(effectiveCapabilities(accepted.workspace, proposed.handoff!.id, NOW)).toEqual([
      'context.read'
    ]);
    // One second past the expiry.
    expect(
      effectiveCapabilities(accepted.workspace, proposed.handoff!.id, '2026-06-01T18:00:01.000Z')
    ).toEqual([]);
  });

  it('confers nothing for a handoff that does not exist', () => {
    // Returns empty rather than throwing, so a caller that mishandles the id
    // gets nothing instead of everything.
    expect(effectiveCapabilities(twoSessions(), 'handoff-nope', NOW)).toEqual([]);
  });
});

describe('the lifecycle', () => {
  it('runs proposed to accepted to in progress to completed', () => {
    const { workspace, id } = running(twoSessions());
    expect(getHandoffById(workspace, id)?.status).toBe('in_progress');

    const done = completeHandoff(workspace, id, 'Notes drafted.', LATER);
    expect(done.ok).toBe(true);
    expect(done.handoff?.status).toBe('completed');
    expect(done.handoff?.result).toBe('Notes drafted.');
  });

  it('cannot start what was never accepted', () => {
    const proposed = proposeHandoff(twoSessions(), validInput, NOW);
    expect(startHandoff(proposed.workspace, proposed.handoff!.id, NOW).errorCode).toBe(
      'wrong_state'
    );
  });

  it('cannot decide the same handoff twice', () => {
    const proposed = proposeHandoff(twoSessions(), validInput, NOW);
    const accepted = decideHandoff(proposed.workspace, proposed.handoff!.id, 'accepted', NOW);

    expect(decideHandoff(accepted.workspace, proposed.handoff!.id, 'rejected', NOW).errorCode).toBe(
      'wrong_state'
    );
  });

  it('records an expiry that lapsed before acceptance instead of ignoring it', () => {
    const workspace = twoSessions();
    const proposed = proposeHandoff(workspace, { ...validInput, expiration: LATER }, NOW);
    const late = decideHandoff(
      proposed.workspace,
      proposed.handoff!.id,
      'accepted',
      '2026-06-02T00:00:00.000Z'
    );

    expect(late.ok).toBe(false);
    expect(late.errorCode).toBe('already_expired');
    // Stored as expired, so the list tells the truth without anyone retrying it.
    expect(getHandoffById(late.workspace, proposed.handoff!.id)?.status).toBe('expired');
  });

  it('cannot cancel something already finished', () => {
    const { workspace, id } = running(twoSessions());
    const done = completeHandoff(workspace, id, 'Done.', LATER);

    expect(cancelHandoff(done.workspace, id, LATER).errorCode).toBe('wrong_state');
  });

  it('sweeps lapsed handoffs into expired', () => {
    const workspace = twoSessions();
    const proposed = proposeHandoff(workspace, { ...validInput, expiration: LATER }, NOW);

    const swept = expireHandoffs(proposed.workspace, '2026-06-02T00:00:00.000Z');
    expect(getHandoffById(swept, proposed.handoff!.id)?.status).toBe('expired');
  });

  it('leaves a finished handoff alone when sweeping', () => {
    // The counter-case: a sweep that rewrote terminal states would erase the
    // record of what actually happened.
    const { workspace, id } = running(twoSessions());
    const done = completeHandoff(workspace, id, 'Done.', LATER);

    expect(
      getHandoffById(expireHandoffs(done.workspace, '2027-01-01T00:00:00.000Z'), id)?.status
    ).toBe('completed');
  });
});

describe('budgets', () => {
  const withBudget = (workspace: BrandOpsData) => {
    const proposed = proposeHandoff(
      workspace,
      { ...validInput, budget: { toolCallLimit: 3, tokenLimit: 1000 } },
      NOW
    );
    const accepted = decideHandoff(proposed.workspace, proposed.handoff!.id, 'accepted', NOW);
    const started = startHandoff(accepted.workspace, proposed.handoff!.id, NOW);
    return { workspace: started.workspace, id: proposed.handoff!.id };
  };

  it('counts what was spent', () => {
    const { workspace, id } = withBudget(twoSessions());
    const after = recordHandoffUsage(workspace, id, { toolCalls: 2, tokens: 400 }, NOW);

    expect(after.ok).toBe(true);
    expect(after.handoff?.usage.toolCalls).toBe(2);
    expect(after.handoff?.usage.tokens).toBe(400);
  });

  it('refuses the spend that would cross the limit, not the one after it', () => {
    /**
     * The distinction that makes it a budget. Two calls then two more would sit
     * at four against a limit of three; the second call is refused and the
     * usage stays where it was, because a limit discovered after the spend is
     * not a limit.
     */
    const { workspace, id } = withBudget(twoSessions());
    const first = recordHandoffUsage(workspace, id, { toolCalls: 2 }, NOW);
    const second = recordHandoffUsage(first.workspace, id, { toolCalls: 2 }, NOW);

    expect(second.ok).toBe(false);
    expect(second.errorCode).toBe('budget_exhausted');
    expect(second.handoff?.usage.toolCalls, 'the refused spend was counted anyway').toBe(2);
  });

  it('closes the handoff when the budget runs out', () => {
    const { workspace, id } = withBudget(twoSessions());
    const over = recordHandoffUsage(workspace, id, { toolCalls: 99 }, NOW);

    expect(getHandoffById(over.workspace, id)?.status).toBe('completed');
    expect(effectiveCapabilities(over.workspace, id, NOW), 'still conferring after close').toEqual(
      []
    );
  });

  it('allows spending right up to the limit', () => {
    // The counter-case for an off-by-one that would refuse the legal spend.
    const { workspace, id } = withBudget(twoSessions());
    const exact = recordHandoffUsage(workspace, id, { toolCalls: 3 }, NOW);

    expect(exact.ok).toBe(true);
    expect(exact.handoff?.status).toBe('in_progress');
  });

  it('does not limit what the budget did not set', () => {
    const workspace = twoSessions();
    const proposed = proposeHandoff(workspace, { ...validInput, budget: {} }, NOW);
    const accepted = decideHandoff(proposed.workspace, proposed.handoff!.id, 'accepted', NOW);
    const started = startHandoff(accepted.workspace, proposed.handoff!.id, NOW);

    expect(
      recordHandoffUsage(started.workspace, proposed.handoff!.id, { tokens: 10_000_000 }, NOW).ok
    ).toBe(true);
  });
});

describe('as stored data', () => {
  it('survives the round trip a workspace makes', () => {
    const { workspace, id } = running(twoSessions());
    const reloaded = withDefaults(JSON.parse(JSON.stringify(workspace)) as BrandOpsData);

    expect(getHandoffById(reloaded, id)?.status).toBe('in_progress');
    expect(effectiveCapabilities(reloaded, id, NOW)).toEqual(['context.read']);
  });

  it('is absent on a workspace that has never delegated', () => {
    // Optional by design, so a workspace written before this existed loads
    // unchanged rather than gaining an empty state it never had.
    expect(withDefaults(populatedWorkspace()).agentHandoffs).toBeUndefined();
    expect(listHandoffs(withDefaults(populatedWorkspace()))).toEqual([]);
  });
});
