import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import {
  createAgentSession,
  diagnoseAgentToken,
  revokeAgentSession
} from '../../src/services/interop/sessions';
import type { BrandOpsData } from '../../src/types/domain';

function withPastExpiry(workspace: BrandOpsData, sessionId: string): BrandOpsData {
  const entries = (workspace.externalAgentSessions?.entries ?? []).map((entry) =>
    entry.id === sessionId
      ? { ...entry, expiresAt: new Date(Date.now() - 60_000).toISOString() }
      : entry
  );
  return {
    ...workspace,
    externalAgentSessions: {
      entries,
      updatedAt: workspace.externalAgentSessions?.updatedAt ?? ''
    }
  };
}

describe('diagnoseAgentToken', () => {
  it('reports no-sessions on a workspace with no sessions', async () => {
    const diagnostic = await diagnoseAgentToken(cloneSeedData(), 'any-token');
    expect(diagnostic.resolved).toBe(false);
    expect(diagnostic.reason).toBe('no-sessions');
    expect(diagnostic.activeSessionCount).toBe(0);
    expect(diagnostic.tokenHashPrefix).toHaveLength(8);
  });

  it('resolves the matching raw token against a created session', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['context.read']
    });
    const diagnostic = await diagnoseAgentToken(created.workspace, created.token);
    expect(diagnostic.resolved).toBe(true);
    expect(diagnostic.reason).toBe('resolved');
    expect(diagnostic.activeSessionCount).toBe(1);
  });

  it('reports not-found for a token that matches no session hash', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['context.read']
    });
    const diagnostic = await diagnoseAgentToken(created.workspace, 'wrong-token');
    expect(diagnostic.resolved).toBe(false);
    expect(diagnostic.reason).toBe('not-found');
    expect(diagnostic.tokenHashPrefix).not.toBe(
      created.workspace.externalAgentSessions?.entries[0].tokenHash.slice(0, 8)
    );
  });

  it('reports revoked when the matching session was revoked', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'codex',
      clientName: 'Codex',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['context.read']
    });
    const revoked = revokeAgentSession(created.workspace, created.session.id);
    const diagnostic = await diagnoseAgentToken(revoked, created.token);
    expect(diagnostic.resolved).toBe(false);
    expect(diagnostic.reason).toBe('revoked');
    expect(diagnostic.activeSessionCount).toBe(0);
  });

  it('reports expired when the matching session TTL has passed', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['context.read']
    });
    const expired = withPastExpiry(created.workspace, created.session.id);
    const diagnostic = await diagnoseAgentToken(expired, created.token);
    expect(diagnostic.resolved).toBe(false);
    expect(diagnostic.reason).toBe('expired');
  });
});
