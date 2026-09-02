import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import {
  createAgentSession,
  resolveAgentSession,
  revokeAgentSession
} from '../../src/services/interop/sessions';
import {
  AGENT_CAPABILITY_REGISTRY,
  capabilityRequiresApproval
} from '../../src/services/interop/capabilityRegistry';
import {
  ingestAgentEvent,
  reviewAgentEvent,
  promoteAgentEventToTwin
} from '../../src/services/interop/events';
import {
  createAgentProposal,
  createContentOpportunity,
  decideAgentProposal
} from '../../src/services/interop/proposals';
import { convertOpportunityProposalToPlan } from '../../src/services/interop/convertToPlan';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { createDigitalTwinFromText } from '../../src/services/digitalTwin/digitalTwin';
import { CONTEXT_BUNDLE_IDS, AGENT_CAPABILITY_IDS } from '../../src/types/agentInterop';
import type { BrandOpsData } from '../../src/types/domain';

function workspaceWithTwin(): BrandOpsData {
  let data = cloneSeedData();
  const { twin } = createDigitalTwinFromText({
    workspace: data,
    rawText: 'Founder of Acme. I build auth systems and write technical posts.',
    sourceType: 'profile'
  });
  data = { ...data, digitalTwins: { activeTwinId: twin.id, twins: [twin] } };
  return data;
}

describe('agent interop: sessions', () => {
  it('stores only a token hash; resolution requires the raw token', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ['context.read', 'achievement.record']
    });
    const persisted = created.workspace.externalAgentSessions?.entries[0];
    expect(persisted).toBeTruthy();
    expect(persisted?.tokenHash).toBeTruthy();
    expect(persisted?.tokenHash).not.toBe(created.token);
    expect(persisted?.tokenHash).toHaveLength(64);

    const resolved = await resolveAgentSession(created.workspace, created.token);
    expect(resolved?.id).toBe(persisted?.id);

    const wrong = await resolveAgentSession(created.workspace, 'not-the-token');
    expect(wrong).toBeNull();
  });

  it('revocation is immediate and permanent', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'codex',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['context.read']
    });
    const revoked = revokeAgentSession(created.workspace, created.session.id);
    const resolved = await resolveAgentSession(revoked, created.token);
    expect(resolved).toBeNull();
  });

  it('read-only sessions cannot be granted write capabilities', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'cli',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: [...AGENT_CAPABILITY_IDS],
      readOnly: true
    });
    // Read-only is decided by the registry's `readOnly` flag, not by the shape
    // of the id — a capability that only reads is safe whether it is named
    // `.read` or `.list`, and least-privilege must not hinge on naming luck.
    expect(
      created.session.grantedCapabilities.every(
        (cap) => AGENT_CAPABILITY_REGISTRY[cap].readOnly === true
      )
    ).toBe(true);
    expect(created.session.grantedCapabilities).toContain('builder.receipts.list');
    expect(created.session.grantedCapabilities).not.toContain('action.request');
    expect(created.session.grantedCapabilities).not.toContain('builder.sessions.revoke');
  });

  it('session creation emits an agent.session_connected checkpoint and trace', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ['context.read', 'achievement.record']
    });
    const connected = created.workspace.checkpoints?.entries.find(
      (c) => c.type === 'agent.session_connected'
    );
    expect(connected).toBeDefined();
    expect(connected?.state).toBe('COMPLETED');
    expect(connected?.summary).toContain('claude-code');
    expect(connected?.summary).toContain('Token issued');
    const trace = created.workspace.operatorTraces?.entries[0];
    expect(trace?.verb).toBe('agent.session_connected');
    expect(trace?.entityType).toBe('agent-session');
    expect(trace?.sessionId).toBe(created.session.id);
  });
});

describe('agent interop: events', () => {
  it('ingests as AGENT_REPORTED/proposed and never auto-promotes', () => {
    let data = cloneSeedData();
    const { workspace, event, deduplicated } = ingestAgentEvent(data, {
      sessionId: 's1',
      clientKind: 'claude-code',
      kind: 'feature_completed',
      title: 'Shipped token-scoped auth',
      detail: 'Ship scope guardrails for the ingest endpoint.',
      evidence: [{ ref: 'git:acme/app@abc123', kind: 'git', label: 'auth commit' }],
      dedupeKey: 'git:acme/app@abc123'
    });
    expect(deduplicated).toBe(false);
    expect(event.status).toBe('proposed');
    expect(event.trustTier).toBe('AGENT_REPORTED');
    expect(workspace.externalAgentEvents?.entries[0]?.originCheckpointId).toBeTruthy();
    const trace = workspace.operatorTraces?.entries[0];
    expect(trace?.verb).toBe('agent.event_ingested');
    expect(trace?.capabilityId).toBe('achievement.record');
    data = workspace;
    expect(data.externalAgentEvents?.entries[0]?.id).toBe(event.id);
  });

  it('dedupes repeated ingestions by dedupeKey', () => {
    let data = cloneSeedData();
    const first = ingestAgentEvent(data, {
      sessionId: 's1',
      clientKind: 'claude-code',
      kind: 'feature_completed',
      title: 'Ship guardrails',
      detail: 'Same work reported twice.',
      dedupeKey: 'git:acme/app@abc123'
    });
    const second = ingestAgentEvent(first.workspace, {
      sessionId: 's1',
      clientKind: 'claude-code',
      kind: 'feature_completed',
      title: 'Ship guardrails',
      detail: 'Same work reported twice.',
      dedupeKey: 'git:acme/app@abc123'
    });
    expect(second.deduplicated).toBe(true);
    expect(second.event.id).toBe(first.event.id);
    expect(second.workspace.externalAgentEvents?.entries.length).toBe(1);
  });

  it('promotion is user-gated: rejected stays out of the Twin, verified promotes with USER_VERIFIED', () => {
    let data = workspaceWithTwin();
    data = ingestAgentEvent(data, {
      sessionId: 's1',
      clientKind: 'codex',
      kind: 'open_source_contribution',
      title: 'Upstreamed JSON patch',
      detail: 'Accepted into a public library.',
      dedupeKey: 'oss:json-patch'
    }).workspace;
    const eventId = data.externalAgentEvents?.entries[0]?.id ?? '';

    const blocked = promoteAgentEventToTwin(data, eventId);
    expect(blocked.externalAgentEvents?.entries[0]?.status).toBe('proposed');

    data = reviewAgentEvent(data, { eventId, decision: 'rejected', note: 'Not sure yet.' });
    expect(data.externalAgentEvents?.entries[0]?.status).toBe('rejected');

    data = ingestAgentEvent(data, {
      sessionId: 's1',
      clientKind: 'codex',
      kind: 'open_source_contribution',
      title: 'Upstreamed JSON patch',
      detail: 'Accepted into a public library.',
      dedupeKey: 'oss:json-patch-2'
    }).workspace;
    const verifiedId = data.externalAgentEvents?.entries[0]?.id ?? '';
    data = reviewAgentEvent(data, { eventId: verifiedId, decision: 'verified' });
    data = promoteAgentEventToTwin(data, verifiedId);
    const promoted = data.externalAgentEvents?.entries[0];
    expect(promoted?.status).toBe('promoted');
    expect(promoted?.trustTier).toBe('USER_VERIFIED');
    const twin =
      data.digitalTwins.twins.find((t) => t.id === data.digitalTwins.activeTwinId) ??
      data.digitalTwins.twins[0];
    const promotedAt = (data.checkpoints?.entries ?? []).find(
      (c) => c.type === 'agent.achievement_promoted'
    );
    expect(twin.memory.approvedClaims.some((c) => c.includes('Upstreamed JSON patch'))).toBe(true);
    expect(promotedAt).toBeTruthy();
  });
});

describe('agent interop: proposals', () => {
  it('content opportunities are pending proposals that can be approved and converted', () => {
    let data = cloneSeedData();
    data = createContentOpportunity(data, {
      title: 'Write a technical post about token scoping',
      detail: 'The shipped auth work maps directly to a strong engineering write-up.',
      rationale: 'High-signal shipped work with a concrete narrative.',
      proposedState: { contentOpportunity: { format: 'blog-post', whyNow: 'just shipped' } }
    });
    const proposal = data.agentProposals?.entries[0];
    expect(proposal?.kind).toBe('content_opportunity');
    expect(proposal?.status).toBe('pending');
    const approval = data.checkpoints?.entries.find((c) => c.receiptRef === proposal?.id);
    expect(approval?.state).toBe('NEEDS_APPROVAL');

    data = decideAgentProposal(data, { proposalId: proposal?.id ?? '', decision: 'approved' });
    expect(data.agentProposals?.entries[0]?.status).toBe('approved');

    const converted = convertOpportunityProposalToPlan(data, proposal?.id ?? '');
    expect(converted).not.toBeNull();
    expect(converted?.plan.planType).toBe('content-plan');
    expect(converted?.workspace.planWorkspace?.plans.some((p) => p.id === converted?.plan.id)).toBe(
      true
    );
    expect(converted?.workspace.agentProposals?.entries[0]?.planId).toBe(converted?.plan.id);
  });

  it('approved twin_update applies the claim to the active Twin; rejected closes it', () => {
    let data = workspaceWithTwin();
    data = createAgentProposal(data, {
      kind: 'twin_update',
      title: 'Twin update: I work on auth systems',
      detail: 'Ship a positioning refinement from agent work.',
      rationale: 'Repeated evidence of auth specialization.',
      proposedState: {
        twinMemoryType: 'approvedClaims',
        approvedClaimText: 'I specialize in auth systems.'
      }
    });
    const proposalId = data.agentProposals?.entries[0]?.id ?? '';
    data = decideAgentProposal(data, { proposalId, decision: 'approved' });
    const after =
      data.digitalTwins.twins.find((t) => t.id === data.digitalTwins.activeTwinId) ??
      data.digitalTwins.twins[0];
    expect(after.memory.approvedClaims.some((c) => c.includes('auth systems'))).toBe(true);

    data = createAgentProposal(data, {
      kind: 'twin_update',
      title: 'Twin update: ghost claim',
      detail: 'Should be rejected.',
      rationale: 'Not grounded in any evidence.',
      proposedState: { twinMemoryType: 'approvedClaims', approvedClaimText: 'I am a ghost.' }
    });
    const secondId = data.agentProposals?.entries[0]?.id ?? '';
    data = decideAgentProposal(data, { proposalId: secondId, decision: 'rejected' });
    expect(data.agentProposals?.entries[0]?.status).toBe('rejected');
    const checkpoints = data.checkpoints?.entries ?? [];
    expect(checkpoints.some((c) => c.type === 'agent.proposal_rejected')).toBe(true);
  });

  it('approved artifact proposal materializes into the integration hub under agent-ingest', () => {
    let data = cloneSeedData();
    data = createAgentProposal(data, {
      kind: 'artifact',
      title: 'Weekly metrics rollup',
      detail: 'Compiled export of the last week.',
      rationale: 'Useful reference artifact.',
      proposedState: {
        artifact: {
          title: 'Weekly metrics rollup',
          artifactType: 'report',
          summary: 'A report.',
          tags: ['metrics']
        }
      }
    });
    const proposalId = data.agentProposals?.entries[0]?.id ?? '';
    data = decideAgentProposal(data, { proposalId, decision: 'approved' });
    const hub = data.integrationHub;
    expect(
      hub.artifacts.some(
        (a) => a.sourceId === 'agent-ingest' && a.title === 'Weekly metrics rollup'
      )
    ).toBe(true);
    expect(hub.sources.some((s) => s.id === 'agent-ingest')).toBe(true);
  });

  it('an external_action proposal is recorded as agent.action_requested, not a generic proposal', () => {
    const data = createAgentProposal(cloneSeedData(), {
      kind: 'external_action',
      title: 'Send follow-up to Acme',
      detail: 'Agent requests an external outreach action.',
      rationale: 'Requested outreach.',
      proposedState: {
        externalAction: {
          action: 'send_follow_up',
          target: 'acme',
          summary: 'Follow up on the auth migration thread.'
        }
      }
    });
    const approval = data.checkpoints?.entries.find(
      (c) => c.receiptRef === data.agentProposals?.entries[0]?.id
    );
    expect(approval?.type).toBe('agent.action_requested');
    expect(approval?.state).toBe('NEEDS_APPROVAL');
  });
});

describe('agent interop: gateway', () => {
  it('rejects unknown/revoked tokens', async () => {
    const workspace = cloneSeedData();
    await expect(
      executeAgentToolCall({
        workspace,
        token: 'bogus',
        call: { toolName: 'brandops_get_current_goals', args: {} }
      })
    ).rejects.toThrow(/E_UNAUTHORIZED/);
  });

  it('blocks capabilities not granted to the session and records an audit row', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'claude-code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['context.read']
    });
    const { workspace, result } = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: {
        toolName: 'brandops_record_achievement',
        args: { kind: 'feature_completed', title: 'x', detail: 'y' }
      }
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('capability_not_granted');
    expect(workspace.externalAgentAudit?.entries[0]?.ok).toBe(false);
    expect(workspace.externalAgentAudit?.entries[0]?.capabilityId).toBe('achievement.record');
  });

  it('writes an achievement event and audit through the gateway, then replays idempotently', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'codex',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['achievement.record']
    });
    const call = {
      toolName: 'brandops_record_achievement',
      args: {
        kind: 'feature_completed',
        title: 'Gateway shipped',
        detail: 'End-to-end tool dispatch works.'
      },
      idempotencyKey: 'k-123'
    };
    const first = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call
    });
    expect(first.result.ok).toBe(true);
    expect(first.workspace.externalAgentEvents?.entries.length).toBe(1);
    expect(first.workspace.externalAgentAudit?.entries.length).toBe(1);

    const second = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call
    });
    expect(second.result.deduplicated).toBe(true);
    expect(first.workspace.externalAgentEvents?.entries.length).toBe(1);
  });

  it('approval-access capabilities only produce approval-gated requests and report approvalRequired', async () => {
    const seeded = cloneSeedData();
    const created = await createAgentSession(seeded, {
      clientKind: 'claude-code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [],
      grantedCapabilities: ['action.request']
    });
    const { workspace, result } = await executeAgentToolCall({
      workspace: created.workspace,
      token: created.token,
      call: {
        capabilityId: 'action.request',
        args: {
          action: 'publish',
          target: 'linkedin',
          summary: 'Post the shipped-auth write-up.',
          intent: {
            objective: 'Publish the shipped-auth write-up to LinkedIn.',
            reason: 'The user asked for the launch to be announced once auth shipped.'
          }
        }
      }
    });
    expect(result.ok).toBe(true);
    expect(result.approvalRequired).toBe(true);
    const proposalId = result.data.proposalId as string;
    const proposal = workspace.agentProposals?.entries.find((p) => p.id === proposalId);
    expect(proposal?.kind).toBe('external_action');
    expect(proposal?.status).toBe('pending');
    const pending = workspace.checkpoints?.entries.some(
      (c) => c.receiptRef === proposalId && c.state === 'NEEDS_APPROVAL'
    );
    expect(pending).toBe(true);
    expect(workspace.externalAgentAudit?.entries[0]?.summary).toContain('nothing executed');
  });

  it('the approval gate predicate matches the declared access and only action.request requires approval', () => {
    for (const [id] of Object.entries(AGENT_CAPABILITY_REGISTRY) as Array<
      [
        keyof typeof AGENT_CAPABILITY_REGISTRY,
        (typeof AGENT_CAPABILITY_REGISTRY)[keyof typeof AGENT_CAPABILITY_REGISTRY]
      ]
    >) {
      if (id === 'action.request') {
        expect(capabilityRequiresApproval(id)).toBe(true);
        continue;
      }
      /**
       * The rest of the approval-gated set.
       *
       * `execution.request` is gated because requesting execution IS requesting
       * approval — the task handle it returns opens at the boundary, never at a
       * running job.
       *
       * `builder.achievements.verify` and `builder.twin-proposals.accept` were
       * added 2026-08-31. Both are *promote* operations — one turns an
       * agent-reported signal into professional evidence, the other writes the
       * Digital Twin — and both ran as `auto`, so an agent could accept its own
       * Twin proposal. That is the fourth invariant inverted.
       */
      if (
        id === 'builder.sessions.revoke' ||
        id === 'builder.activity.ingest-session-summary' ||
        id === 'execution.request' ||
        id === 'builder.achievements.verify' ||
        id === 'builder.twin-proposals.accept'
      ) {
        expect(capabilityRequiresApproval(id)).toBe(true);
        continue;
      }
      expect(capabilityRequiresApproval(id)).toBe(false);
    }
    // The approval-gated set is small and deliberate. It growing is a design
    // decision; it growing *silently* is how a promote path opens.
    expect(
      Object.values(AGENT_CAPABILITY_REGISTRY)
        .filter((def) => def.access === 'approval')
        .map((def) => def.id)
        .sort()
    ).toEqual([
      'action.request',
      'builder.achievements.verify',
      'builder.activity.ingest-session-summary',
      'builder.sessions.revoke',
      'builder.twin-proposals.accept',
      'execution.request'
    ]);
  });
});
