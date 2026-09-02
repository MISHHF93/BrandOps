/**
 * Agent Identity & Trust Levels — tests for P0-2.
 *
 * Tests deriveTrustLevel, buildAgentIdentity, buildAgentIdentityRegistry,
 * getAgentIdentityById, and getIdentitiesRequiringAttention.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveTrustLevel,
  buildAgentIdentity,
  buildAgentIdentityRegistry,
  getAgentIdentityById,
  getIdentitiesRequiringAttention,
  trustLevelLabel,
  trustLevelAllowsProposals,
  trustLevelAllowsActions,
  trustLevelAllowsContext
} from '../../src/services/agentIdentity/agentIdentity';
import type { AgentCapabilityId, ExternalAgentSession } from '../../src/types/agentInterop';

function makeSession(overrides: Partial<ExternalAgentSession> = {}): ExternalAgentSession {
  return {
    id: 'sess-1',
    clientKind: 'claude-code',
    clientName: 'Claude Code',
    ownerUserId: 'user-1',
    workspaceId: 'ws-1',
    status: 'active',
    tokenHash: 'hash',
    grantedCapabilities: ['context.read', 'goals.read'],
    grantedBundles: [],
    createdAt: '2026-01-01T00:00:00Z',
    lastActivityAt: '2026-01-15T00:00:00Z',
    revokedAt: undefined,
    expiresAt: undefined,
    ...overrides
  };
}

describe('Agent Identity — Trust Level Derivation', () => {
  it('derives READ_ONLY for context.read only', () => {
    const session = makeSession({ grantedCapabilities: ['context.read'] });
    expect(deriveTrustLevel(session)).toBe('READ_ONLY');
  });

  it('derives READ_ONLY for goals.read only', () => {
    const session = makeSession({ grantedCapabilities: ['goals.read'] });
    expect(deriveTrustLevel(session)).toBe('READ_ONLY');
  });

  it('derives READ_ONLY for a read-only builder capability', () => {
    // Changed 2026-08-31: derivation now comes from the capability registry, and
    // `builder.context.read` is `readOnly: true`. Calling it CONTEXT_CONSUMER told
    // a person something the gateway does not enforce — it gates this at READ_ONLY.
    const session = makeSession({ grantedCapabilities: ['builder.context.read'] });
    expect(deriveTrustLevel(session)).toBe('READ_ONLY');
  });

  it('derives PROPOSER for achievement.record capability', () => {
    const session = makeSession({ grantedCapabilities: ['achievement.record'] });
    expect(deriveTrustLevel(session)).toBe('PROPOSER');
  });

  it('derives PROPOSER for artifact.create capability', () => {
    const session = makeSession({ grantedCapabilities: ['artifact.create'] });
    expect(deriveTrustLevel(session)).toBe('PROPOSER');
  });

  it('derives PROPOSER for twin.propose_update capability', () => {
    const session = makeSession({ grantedCapabilities: ['twin.propose_update'] });
    expect(deriveTrustLevel(session)).toBe('PROPOSER');
  });

  it('derives PROPOSER for opportunity.create capability', () => {
    const session = makeSession({ grantedCapabilities: ['opportunity.create'] });
    expect(deriveTrustLevel(session)).toBe('PROPOSER');
  });

  it('derives ACTION_REQUESTER for action.request capability', () => {
    const session = makeSession({ grantedCapabilities: ['action.request'] });
    expect(deriveTrustLevel(session)).toBe('ACTION_REQUESTER');
  });

  it('derives ACTION_REQUESTER when both action.request and proposal caps present', () => {
    const session = makeSession({ grantedCapabilities: ['action.request', 'artifact.create'] });
    expect(deriveTrustLevel(session)).toBe('ACTION_REQUESTER');
  });

  it('derives NONE for revoked session', () => {
    const session = makeSession({ status: 'revoked' });
    expect(deriveTrustLevel(session)).toBe('NONE');
  });

  it('derives NONE for null session', () => {
    expect(deriveTrustLevel(null)).toBe('NONE');
  });

  it('derives NONE for undefined session', () => {
    expect(deriveTrustLevel(undefined)).toBe('NONE');
  });

  it('derives NONE for a capability that is not in the registry', () => {
    // An id the registry does not know confers no trust at all. It used to confer
    // READ_ONLY, which is backwards: an unrecognized grant is not a small grant.
    const session = makeSession({
      grantedCapabilities: ['custom.capability' as AgentCapabilityId]
    });
    expect(deriveTrustLevel(session)).toBe('NONE');
  });

  it('derives NONE when session has no capabilities', () => {
    const session = makeSession({ grantedCapabilities: [] });
    expect(deriveTrustLevel(session)).toBe('NONE');
  });
});

describe('Agent Identity — Trust Level Labels and Permissions', () => {
  it('returns correct label for each trust level', () => {
    expect(trustLevelLabel('READ_ONLY')).toBe('Read Only — can view context only');
    expect(trustLevelLabel('CONTEXT_CONSUMER')).toBe(
      'Context Consumer — can view builder context and projects'
    );
    expect(trustLevelLabel('PROPOSER')).toBe(
      'Proposer — can propose achievements, artifacts, twin updates, and opportunities'
    );
    expect(trustLevelLabel('ACTION_REQUESTER')).toBe(
      'Action Requester — can request external actions (approval required)'
    );
    expect(trustLevelLabel('NONE')).toBe('No active session');
  });

  it('PROPOSER and ACTION_REQUESTER allow proposals', () => {
    expect(trustLevelAllowsProposals('PROPOSER')).toBe(true);
    expect(trustLevelAllowsProposals('ACTION_REQUESTER')).toBe(true);
    expect(trustLevelAllowsProposals('READ_ONLY')).toBe(false);
    expect(trustLevelAllowsProposals('CONTEXT_CONSUMER')).toBe(false);
  });

  it('only ACTION_REQUESTER allows actions', () => {
    expect(trustLevelAllowsActions('ACTION_REQUESTER')).toBe(true);
    expect(trustLevelAllowsActions('PROPOSER')).toBe(false);
    expect(trustLevelAllowsActions('READ_ONLY')).toBe(false);
  });

  it('all non-NONE levels allow context reading', () => {
    expect(trustLevelAllowsContext('READ_ONLY')).toBe(true);
    expect(trustLevelAllowsContext('CONTEXT_CONSUMER')).toBe(true);
    expect(trustLevelAllowsContext('PROPOSER')).toBe(true);
    expect(trustLevelAllowsContext('ACTION_REQUESTER')).toBe(true);
  });
});

describe('Agent Identity — Build Agent Identity', () => {
  it('builds identity from active session', () => {
    const session = makeSession({
      grantedCapabilities: ['context.read', 'artifact.create'],
      lastActivityAt: '2026-01-15T10:00:00Z'
    });
    const identity = buildAgentIdentity(session);

    expect(identity.sessionId).toBe('sess-1');
    expect(identity.trustLevel).toBe('PROPOSER');
    expect(identity.clientKind).toBe('claude-code');
    expect(identity.clientName).toBe('Claude Code');
    expect(identity.ownerUserId).toBe('user-1');
    expect(identity.workspaceId).toBe('ws-1');
    expect(identity.capabilities).toEqual(['context.read', 'artifact.create']);
    expect(identity.authenticationStatus).toBe('authenticated');
    expect(identity.isActive).toBe(true);
    expect(identity.revokedAt).toBeNull();
    expect(identity.expiresAt).toBeNull();
  });

  it('marks identity as expired when expiresAt is in the past', () => {
    const session = makeSession({
      grantedCapabilities: ['context.read'],
      expiresAt: '2025-01-01T00:00:00Z'
    });
    const identity = buildAgentIdentity(session);
    expect(identity.authenticationStatus).toBe('expired');
    expect(identity.isActive).toBe(false);
  });

  it('marks identity as revoked when status is revoked', () => {
    const session = makeSession({ status: 'revoked', revokedAt: '2026-01-01T00:00:00Z' });
    const identity = buildAgentIdentity(session);
    expect(identity.authenticationStatus).toBe('revoked');
    expect(identity.isActive).toBe(false);
    expect(identity.revokedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('formats lastActivityAge correctly', () => {
    const session = makeSession({ lastActivityAt: new Date(Date.now() - 5 * 60000).toISOString() });
    const identity = buildAgentIdentity(session);
    expect(identity.lastActivityAge).toMatch(/^\d+m ago$/);

    const session2 = makeSession({
      lastActivityAt: new Date(Date.now() - 2 * 3600000).toISOString()
    });
    const identity2 = buildAgentIdentity(session2);
    expect(identity2.lastActivityAge).toMatch(/^\d+h ago$/);

    const session3 = makeSession({
      lastActivityAt: new Date(Date.now() - 5 * 86400000).toISOString()
    });
    const identity3 = buildAgentIdentity(session3);
    expect(identity3.lastActivityAge).toMatch(/^\d+d ago$/);
  });
});

describe('Agent Identity — Registry', () => {
  it('builds registry from workspace data', () => {
    const data = {
      externalAgentSessions: {
        entries: [
          makeSession({
            id: 's1',
            grantedCapabilities: ['context.read'],
            clientKind: 'claude-code'
          }),
          makeSession({
            id: 's2',
            grantedCapabilities: ['artifact.create'],
            clientKind: 'codex',
            status: 'revoked'
          })
        ]
      }
    } as any;

    const registry = buildAgentIdentityRegistry(data);

    expect(registry.totalCount).toBe(2);
    expect(registry.activeCount).toBe(1);
    expect(registry.identities.length).toBe(2);
    expect(registry.activeIdentities.length).toBe(1);
    expect(registry.byTrustLevel['READ_ONLY'].length).toBe(1);
    // s2 holds `artifact.create` but is revoked, so it displays NONE rather than
    // PROPOSER. A revoked agent is not a proposer that happens to be switched off.
    expect(registry.byTrustLevel['PROPOSER'].length).toBe(0);
    expect(registry.byTrustLevel['NONE'].length).toBe(1);
    // Every level has a key even when empty — the type promises a total map.
    expect(registry.byTrustLevel['ACTION_REQUESTER']).toEqual([]);
    expect(registry.byClientKind['claude-code'].length).toBe(1);
    expect(registry.byClientKind['codex'].length).toBe(1);
  });

  it('returns undefined for non-existent session id', () => {
    const data = {
      externalAgentSessions: { entries: [makeSession({ id: 's1' })] }
    } as any;
    const registry = buildAgentIdentityRegistry(data);
    expect(getAgentIdentityById(registry, 'missing')).toBeUndefined();
  });

  it('returns identity for existing session id', () => {
    const data = {
      externalAgentSessions: { entries: [makeSession({ id: 's1' })] }
    } as any;
    const registry = buildAgentIdentityRegistry(data);
    const identity = getAgentIdentityById(registry, 's1');
    expect(identity).toBeDefined();
    expect(identity!.sessionId).toBe('s1');
  });

  it('identifies identities requiring attention', () => {
    const data = {
      externalAgentSessions: {
        entries: [
          makeSession({
            id: 's1',
            status: 'active',
            lastActivityAt: new Date(Date.now() - 40 * 86400000).toISOString()
          }),
          makeSession({ id: 's2', status: 'revoked' }),
          makeSession({ id: 's3', status: 'active', expiresAt: '2025-01-01T00:00:00Z' }),
          makeSession({ id: 's4', status: 'active', lastActivityAt: new Date().toISOString() })
        ]
      }
    } as any;
    const registry = buildAgentIdentityRegistry(data);
    const attention = getIdentitiesRequiringAttention(registry);

    expect(attention).toHaveLength(3);
    expect(attention.map((a) => a.sessionId)).toContain('s1');
    expect(attention.map((a) => a.sessionId)).toContain('s2');
    expect(attention.map((a) => a.sessionId)).toContain('s3');
    expect(attention.map((a) => a.sessionId)).not.toContain('s4');
  });

  it('empty sessions produce empty registry', () => {
    const data = { externalAgentSessions: { entries: [] } } as any;
    const registry = buildAgentIdentityRegistry(data);
    expect(registry.totalCount).toBe(0);
    expect(registry.activeCount).toBe(0);
    expect(registry.identities).toHaveLength(0);
  });
});
