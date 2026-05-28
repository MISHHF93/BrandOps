import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildPlatformActionCards } from '../../src/services/plan/platformActionCards';
import { cloneSeedData } from '../helpers/fixtures';

function emptyPlatformWorkspace() {
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
  return workspace;
}

describe('Platform Action Cards', () => {
  it('does not show action cards for unsupported or disconnected platforms', () => {
    const cards = buildPlatformActionCards(emptyPlatformWorkspace());

    expect(cards).toHaveLength(0);
  });

  it('builds requested platform actions only from grounded connected context', () => {
    const workspace = emptyPlatformWorkspace();
    workspace.integrationHub.sources = [
      {
        id: 'source-google',
        name: 'Google Workspace',
        kind: 'google-workspace',
        status: 'connected',
        artifactTypes: ['calendar-event', 'email-thread-summary'],
        tags: ['gmail', 'calendar'],
        notes: 'Approved email and calendar summaries only.',
        createdAt: '2026-05-28T00:00:00.000Z'
      },
      {
        id: 'source-linkedin',
        name: 'LinkedIn profile',
        kind: 'linkedin-marketing',
        status: 'connected',
        artifactTypes: ['profile-summary'],
        tags: ['linkedin'],
        notes: 'Approved LinkedIn profile summary.',
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
      },
      {
        id: 'source-slack',
        name: 'Slack workspace',
        kind: 'slack',
        status: 'connected',
        artifactTypes: ['approved-thread-summary'],
        tags: ['slack'],
        notes: 'Approved Slack summaries only.',
        createdAt: '2026-05-28T00:00:00.000Z'
      }
    ];
    workspace.integrationHub.artifacts = [
      {
        id: 'artifact-gmail',
        sourceId: 'source-google',
        title: 'Gmail founder summary',
        artifactType: 'email-thread-summary',
        summary: 'Founder asked for a follow-up.',
        tags: ['gmail'],
        createdAt: '2026-05-28T00:00:00.000Z',
        updatedAt: '2026-05-28T00:00:00.000Z'
      }
    ];

    const cards = buildPlatformActionCards(workspace);
    const titles = cards.map((card) => `${card.platform}: ${card.title}`);

    expect(titles).toEqual(
      expect.arrayContaining([
        'Gmail: Draft reply',
        'Gmail: Schedule follow-up',
        'LinkedIn: Draft outreach',
        'LinkedIn: Generate positioning',
        'Google Calendar: Summarize day',
        'Google Calendar: Prep meeting notes',
        'Notion: Generate plan from notes',
        'Slack: Summarize discussions',
        'Slack: Create operational tasks'
      ])
    );
    expect(cards.every((card) => card.command.startsWith('ask:'))).toBe(true);
    expect(cards.every((card) => card.approvalRequirement.includes('Human approval'))).toBe(true);
  });

  it('exposes platform action cards on the workspace snapshot', () => {
    const workspace = emptyPlatformWorkspace();
    workspace.integrationHub.sources = [
      {
        id: 'source-slack',
        name: 'Slack workspace',
        kind: 'slack',
        status: 'connected',
        artifactTypes: ['approved-thread-summary'],
        tags: ['slack'],
        notes: 'Approved summaries only.',
        createdAt: '2026-05-28T00:00:00.000Z'
      }
    ];

    const snapshot = buildWorkspaceSnapshot(workspace);

    expect(snapshot.platformActionCards.map((card) => card.platform)).toContain('Slack');
  });
});
