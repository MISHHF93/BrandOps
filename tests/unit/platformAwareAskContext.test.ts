import { describe, expect, it } from 'vitest';

import { buildPlatformAwareAskReadout } from '../../src/services/ai/platformAwareAskContext';
import { buildHostedAskMessages } from '../../src/services/ai/hostedAskTurn';
import { cloneSeedData } from '../helpers/fixtures';

describe('platform-aware ASK context', () => {
  it('marks requested platforms unavailable instead of implying access', () => {
    const workspace = cloneSeedData();
    workspace.integrationHub = {
      ...workspace.integrationHub,
      sources: [],
      artifacts: [],
      liveFeed: []
    };
    workspace.externalSync = { links: [], updatedAt: '2026-05-28T00:00:00.000Z' };
    workspace.settings.syncHub.google.connectionStatus = 'disconnected';
    workspace.settings.syncHub.linkedin.connectionStatus = 'disconnected';

    const readout = buildPlatformAwareAskReadout(workspace);

    expect(readout.connectedApps).not.toContain('Gmail');
    expect(readout.unavailableApps).toContain('Gmail');
    expect(readout.unavailableApps).toContain('Notion');
    expect(readout.contextBlock).toContain('do not hallucinate integrations');
    expect(readout.contextBlock).toContain('Gmail conversation context is unavailable');
  });

  it('uses connected apps and approved summaries as ASK evidence', () => {
    const workspace = cloneSeedData();
    workspace.integrationHub.sources = [
      {
        id: 'source-linkedin',
        name: 'LinkedIn profile',
        kind: 'linkedin-marketing',
        status: 'connected',
        artifactTypes: ['profile-summary'],
        tags: ['linkedin'],
        notes: 'Approved profile summaries only.',
        createdAt: '2026-05-28T00:00:00.000Z'
      },
      {
        id: 'source-notion',
        name: 'Notion notes',
        kind: 'notion',
        status: 'connected',
        artifactTypes: ['approved-note-summary'],
        tags: ['notion'],
        notes: 'Approved notes only.',
        createdAt: '2026-05-28T00:00:00.000Z'
      }
    ];
    workspace.integrationHub.artifacts = [
      {
        id: 'artifact-gmail-summary',
        sourceId: 'source-gmail',
        title: 'Gmail founder conversation summary',
        artifactType: 'email-summary',
        summary: 'Founder asked for a concise AI workflow operator proposal.',
        tags: ['gmail', 'approved-summary'],
        createdAt: '2026-05-28T00:00:00.000Z',
        updatedAt: '2026-05-28T00:00:00.000Z'
      }
    ];

    const readout = buildPlatformAwareAskReadout(workspace);

    expect(readout.connectedApps).toContain('LinkedIn');
    expect(readout.connectedApps).toContain('Notion');
    expect(readout.connectedApps).toContain('Gmail');
    expect(readout.contextBlock).toContain('Gmail founder conversation summary');
  });

  /**
   * Regression guard: platform-term matching used to be a plain substring
   * scan, so the platform term "notion" matched inside an unrelated *word*
   * containing that substring — "notional" (as in "notional value", common
   * finance phrasing) — flagging Notion as evidence-backed from a source
   * that has nothing to do with it. (Matching the standalone word "notion"
   * itself is correct and unaffected; this specifically guards the
   * substring-inside-another-word case.)
   */
  it('does not treat "notional" as evidence of the Notion platform', () => {
    const workspace = cloneSeedData();
    workspace.integrationHub.sources = [
      {
        id: 'source-generic',
        name: 'Generic finance doc',
        kind: 'custom-api',
        status: 'connected',
        artifactTypes: ['note'],
        tags: [],
        notes: 'Tracks notional value for hedging exercises, unrelated to any platform.',
        createdAt: '2026-05-28T00:00:00.000Z'
      }
    ];
    workspace.integrationHub.artifacts = [];
    workspace.externalSync = { links: [], updatedAt: '2026-05-28T00:00:00.000Z' };

    const readout = buildPlatformAwareAskReadout(workspace);

    expect(readout.connectedApps).not.toContain('Notion');
    expect(readout.unavailableApps).toContain('Notion');
  });

  it('injects platform guardrails into hosted ASK system prompts', () => {
    const workspace = cloneSeedData();
    workspace.integrationHub.sources = [];
    workspace.integrationHub.artifacts = [];

    const messages = buildHostedAskMessages(
      workspace,
      'Draft a LinkedIn outreach based on my recent Gmail conversations.',
      null
    );

    expect(messages[0].content).toContain('Platform-aware ASK context');
    expect(messages[0].content).toContain('Unavailable apps');
    expect(messages[0].content).toContain(
      'Gmail conversations: use only approved Gmail/email summaries'
    );
  });
});
