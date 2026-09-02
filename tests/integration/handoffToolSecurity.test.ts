/**
 * The agent-facing side of handoffs, and the two ways it could be abused.
 *
 * The service enforces that a handoff only narrows. That guarantee is computed
 * from the *source session*, so the entire rule rests on one question: who does
 * the tool believe is delegating?
 *
 * If the handler took a `sourceSessionId` from its arguments, any agent could
 * delegate as any other session — naming that session's capabilities, not its
 * own — and every check in `handoffs.ts` would faithfully validate the wrong
 * session. The narrowing rule would be handed to whoever writes the arguments.
 * So the source is the authenticated session and nothing else, and the first
 * test here passes a contradicting `sourceSessionId` to prove it is ignored.
 *
 * The second is the mirror: answering a delegation addressed to someone else.
 * Accepting on another session's behalf would make `effectiveCapabilities`
 * intersect against the wrong session, which is the same escalation from the
 * other end.
 *
 * These drive `runBuilderHandler` rather than the service, because the service
 * was already proven correct in `agentHandoffs.test.ts`. What is unproven — and
 * what an attacker actually reaches — is the argument handling in front of it.
 */
import { describe, expect, it } from 'vitest';
import { runBuilderHandler } from '../../src/services/interop/mcp/builderToolHandlers';
import { listHandoffs } from '../../src/services/interop/handoffs';
import { withDefaults } from '../../src/services/storage/storage';
import { populatedWorkspace } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';
import type { AgentCapabilityId, ExternalAgentSession } from '../../src/types/agentInterop';

function session(
  id: string,
  capabilities: AgentCapabilityId[] = ['context.read', 'builder.handoffs.propose']
): ExternalAgentSession {
  return {
    id,
    ownerUserId: 'local-user',
    workspaceId: 'local-workspace',
    clientKind: 'claude-code',
    clientName: id,
    tokenHash: `hash-${id}`,
    status: 'active',
    grantedBundles: ['PUBLIC_IDENTITY'],
    grantedCapabilities: capabilities,
    createdAt: '2026-06-01T06:00:00.000Z',
    lastActivityAt: '2026-06-01T06:00:00.000Z'
  };
}

/**
 * `low` holds only `context.read`; `high` also holds `twin.propose_update`.
 * The escalation the tests probe for is `low` obtaining the latter.
 */
function threeSessions(): BrandOpsData {
  const base = withDefaults(populatedWorkspace());
  return {
    ...base,
    externalAgentSessions: {
      ...(base.externalAgentSessions ?? {}),
      entries: [
        session('session-low', ['context.read', 'builder.handoffs.propose']),
        session('session-high', [
          'context.read',
          'twin.propose_update',
          'builder.handoffs.propose'
        ]),
        session('session-third', ['context.read', 'builder.handoffs.decide'])
      ]
    }
  } as BrandOpsData;
}

type Result = {
  workspace: BrandOpsData;
  ok: boolean;
  errorCode?: string;
  data: Record<string, unknown>;
};

function call(
  workspace: BrandOpsData,
  as: string,
  capability: string,
  args: Record<string, unknown>
): Result {
  const caller = (workspace.externalAgentSessions?.entries ?? []).find((e) => e.id === as);
  if (!caller) throw new Error(`no such session: ${as}`);
  return runBuilderHandler(
    workspace,
    caller,
    capability as AgentCapabilityId,
    args
  ) as unknown as Result;
}

const baseArgs = {
  targetSessionId: 'session-third',
  objective: 'Summarise the release',
  minimumContext: ['PUBLIC_IDENTITY'],
  expectedOutput: 'A summary'
};

describe('who the tool believes is delegating', () => {
  it('delegates as the caller, ignoring any sourceSessionId argument', () => {
    /**
     * The impersonation attempt. `session-low` claims to be `session-high` and
     * asks for a capability only `session-high` holds. If the argument were
     * honoured the handoff would be created; because the source is the
     * authenticated session, the request is refused as overreach by `low`.
     */
    const result = call(threeSessions(), 'session-low', 'builder.handoffs.propose', {
      ...baseArgs,
      sourceSessionId: 'session-high',
      requiredCapabilities: ['twin.propose_update']
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('capability_not_held');
    expect(listHandoffs(result.workspace), 'a handoff was created anyway').toHaveLength(0);
  });

  it('lets a session delegate what it does hold', () => {
    // The counter-case: the refusal above must be about scope, not about the
    // tool refusing everything.
    const result = call(threeSessions(), 'session-high', 'builder.handoffs.propose', {
      ...baseArgs,
      requiredCapabilities: ['twin.propose_update']
    });

    expect(result.ok).toBe(true);
    expect(listHandoffs(result.workspace)).toHaveLength(1);
    expect(listHandoffs(result.workspace)[0].sourceAgent).toBe('session-high');
  });

  it('records the caller as the source even when the argument agrees', () => {
    // Belt and braces: the field is derived, so it cannot be steered even by an
    // argument that happens to be correct today.
    const result = call(threeSessions(), 'session-low', 'builder.handoffs.propose', {
      ...baseArgs,
      sourceSessionId: 'session-low',
      requiredCapabilities: ['context.read']
    });

    expect(result.ok).toBe(true);
    expect(listHandoffs(result.workspace)[0].sourceAgent).toBe('session-low');
  });
});

describe('who may answer a delegation', () => {
  function delegated(): BrandOpsData {
    const proposed = call(threeSessions(), 'session-high', 'builder.handoffs.propose', {
      ...baseArgs,
      requiredCapabilities: ['context.read']
    });
    expect(proposed.ok).toBe(true);
    return proposed.workspace;
  }

  it('refuses a session accepting work addressed to someone else', () => {
    /**
     * The same escalation from the other end. Accepting on another session's
     * behalf would make the capability intersection compute against the wrong
     * session entirely.
     */
    const workspace = delegated();
    const handoffId = listHandoffs(workspace)[0].id;

    const result = call(workspace, 'session-low', 'builder.handoffs.decide', {
      handoffId,
      decision: 'accepted'
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('not_addressed_to_you');
    expect(listHandoffs(result.workspace)[0].status, 'it was accepted anyway').toBe('proposed');
  });

  it('lets the addressed session accept', () => {
    const workspace = delegated();
    const handoffId = listHandoffs(workspace)[0].id;

    const result = call(workspace, 'session-third', 'builder.handoffs.decide', {
      handoffId,
      decision: 'accepted'
    });

    expect(result.ok).toBe(true);
    expect(listHandoffs(result.workspace)[0].status).toBe('accepted');
  });

  it('refuses a stranger completing the work', () => {
    const workspace = delegated();
    const handoffId = listHandoffs(workspace)[0].id;
    const accepted = call(workspace, 'session-third', 'builder.handoffs.decide', {
      handoffId,
      decision: 'accepted'
    });

    const result = call(accepted.workspace, 'session-low', 'builder.handoffs.complete', {
      handoffId,
      result: 'I did it'
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('not_addressed_to_you');
  });
});

describe('what listing a handoff tells an agent', () => {
  it('reports the access it currently confers, not what was asked for', () => {
    /**
     * An agent reads this to decide what it may do. Reporting the stored
     * `requiredCapabilities` would be the frozen-grant bug delivered over the
     * wire: a proposed handoff confers nothing, and saying otherwise invites an
     * agent to act on authority it does not have.
     */
    const proposed = call(threeSessions(), 'session-high', 'builder.handoffs.propose', {
      ...baseArgs,
      requiredCapabilities: ['context.read']
    });
    const listed = call(proposed.workspace, 'session-third', 'builder.handoffs.list', {});
    const rows = listed.data.handoffs as Array<Record<string, unknown>>;

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('proposed');
    expect(rows[0].currentlyConfers, 'a proposed handoff already confers access').toEqual([]);
  });

  it('reports the access once it is live', () => {
    const proposed = call(threeSessions(), 'session-high', 'builder.handoffs.propose', {
      ...baseArgs,
      requiredCapabilities: ['context.read']
    });
    const handoffId = listHandoffs(proposed.workspace)[0].id;
    const accepted = call(proposed.workspace, 'session-third', 'builder.handoffs.decide', {
      handoffId,
      decision: 'accepted'
    });

    const listed = call(accepted.workspace, 'session-third', 'builder.handoffs.list', {});
    const rows = listed.data.handoffs as Array<Record<string, unknown>>;

    expect(rows[0].currentlyConfers).toEqual(['context.read']);
  });
});
