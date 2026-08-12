import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import { withDefaults } from '../../src/services/storage/storage';
import { createAgentSession, resolveAgentSession } from '../../src/services/interop/sessions';
import { ingestAgentEvent } from '../../src/services/interop/events';
import { createContentOpportunity } from '../../src/services/interop/proposals';
import { executeAgentToolCall } from '../../src/services/interop/gateway';
import { CONTEXT_BUNDLE_IDS } from '../../src/types/agentInterop';

/** Persist through the storage normalizer, then reload — the normalizers must preserve the interop states. */
describe('agent interop storage round-trip', () => {
  it('preserves sessions, events, proposals, and audit through withDefaults', async () => {
    let data = cloneSeedData();

    const session = await createAgentSession(data, {
      clientKind: 'claude-code',
      clientName: 'Claude Code',
      ownerUserId: 'local-user',
      workspaceId: 'local-workspace',
      grantedBundles: [...CONTEXT_BUNDLE_IDS],
      grantedCapabilities: ['context.read', 'achievement.record', 'opportunity.create']
    });
    data = session.workspace;

    const event = ingestAgentEvent(data, {
      sessionId: session.session.id,
      clientKind: 'claude-code',
      kind: 'feature_completed',
      title: 'Round-trip event',
      detail: 'Proves normalization preserves agent interop state.',
      dedupeKey: 'round-trip:event'
    });
    data = event.workspace;
    const eventId = event.event.id;

    data = createContentOpportunity(data, {
      title: 'Round-trip opportunity',
      detail: 'Should survive persistence.',
      rationale: 'Regression guard for the proposal normalizer.',
      proposedState: { contentOpportunity: { format: 'blog-post' } }
    });
    const proposalId = data.agentProposals?.entries[0]?.id ?? '';

    const call = await executeAgentToolCall({
      workspace: data,
      token: session.token,
      call: {
        toolName: 'brandops_record_achievement',
        args: { kind: 'feature_completed', title: 'Via gateway', detail: 'Audit row survives.' }
      }
    });
    data = call.workspace;

    const reloaded = withDefaults(data);

    const sessions = reloaded.externalAgentSessions?.entries ?? [];
    expect(sessions.length).toBe(1);
    expect(sessions[0]?.clientKind).toBe('claude-code');
    const resolved = await resolveAgentSession(reloaded, session.token);
    expect(resolved?.id).toBe(session.session.id);

    const events = reloaded.externalAgentEvents?.entries ?? [];
    expect(events.length).toBe(2);
    const persistedEvent = events.find((e) => e.id === eventId);
    expect(persistedEvent).toBeTruthy();
    expect(persistedEvent?.status).toBe('proposed');
    expect(persistedEvent?.trustTier).toBe('AGENT_REPORTED');
    expect(persistedEvent?.evidence[0]).toBeUndefined();
    expect(persistedEvent?.dedupeKey).toBe('round-trip:event');

    const proposals = reloaded.agentProposals?.entries ?? [];
    expect(proposals.length).toBe(1);
    expect(proposals[0]?.id).toBe(proposalId);
    expect(proposals[0]?.kind).toBe('content_opportunity');
    expect(proposals[0]?.rationale).toBe('Regression guard for the proposal normalizer.');

    const audit = reloaded.externalAgentAudit?.entries ?? [];
    expect(audit.length).toBe(1);
    expect(audit[0]?.capabilityId).toBe('achievement.record');
    expect(audit[0]?.ok).toBe(true);
  });
});
