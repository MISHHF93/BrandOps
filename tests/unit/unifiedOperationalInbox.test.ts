import { describe, expect, it } from 'vitest';

import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { buildUnifiedOperationalInbox } from '../../src/services/plan/unifiedOperationalInbox';
import { cloneSeedData } from '../helpers/fixtures';

describe('Unified Operational Inbox', () => {
  it('aggregates approvals, notifications, alerts, AI opportunities, and pending drafts', () => {
    const workspace = cloneSeedData();
    workspace.operatorTraces = {
      entries: [
        {
          id: 'trace-approval',
          at: '2026-05-28T00:00:00.000Z',
          source: 'assistant',
          verb: 'draft_external_outreach',
          surface: 'plan',
          reviewStatus: 'pending',
          details: { commandPreview: 'draft outreach' }
        }
      ]
    };
    workspace.integrationHub.liveFeed = [
      {
        id: 'feed-warning',
        source: 'Slack',
        title: 'Workflow alert captured',
        detail: 'Approved summary needs follow-up.',
        level: 'warning',
        happenedAt: '2026-05-28T00:05:00.000Z'
      }
    ];
    workspace.scheduler.tasks = [
      {
        id: 'task-due',
        sourceId: 'follow-up-001',
        sourceType: 'follow-up',
        title: 'Follow up with founder',
        detail: 'Reply is due today.',
        dueAt: '2026-05-28T12:00:00.000Z',
        remindAt: '2026-05-28T11:00:00.000Z',
        status: 'due',
        snoozeCount: 0,
        createdAt: '2026-05-28T00:00:00.000Z',
        updatedAt: '2026-05-28T00:00:00.000Z'
      }
    ];
    workspace.outreachDrafts = [
      {
        id: 'draft-founder',
        category: 'founder intro',
        targetName: 'Ari Founder',
        company: 'Orbit Labs',
        role: 'Founder',
        messageBody: 'Draft message.',
        outreachGoal: 'Book a founder intro call.',
        tone: 'warm strategic',
        status: 'ready',
        notes: 'Needs approval before sending.',
        createdAt: '2026-05-28T00:00:00.000Z',
        updatedAt: '2026-05-28T00:10:00.000Z'
      }
    ];

    const inbox = buildUnifiedOperationalInbox(workspace);

    expect(inbox.totalCount).toBeGreaterThan(0);
    expect(inbox.countsByKind.approval).toBeGreaterThan(0);
    expect(inbox.countsByKind.notification).toBeGreaterThan(0);
    expect(inbox.countsByKind['workflow-alert']).toBeGreaterThan(0);
    expect(inbox.countsByKind['pending-draft']).toBeGreaterThan(0);
    expect(inbox.headline).toContain('operational item');
    expect(inbox.items[0]?.priority).toBe('critical');
  });

  it('exposes the unified inbox on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(cloneSeedData());

    expect(snapshot.unifiedOperationalInbox.totalCount).toBe(
      snapshot.unifiedOperationalInbox.items.length
    );
    expect(snapshot.unifiedOperationalInbox.countsByKind.approval).toEqual(expect.any(Number));
  });
});
