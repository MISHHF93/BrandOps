import { describe, expect, it } from 'vitest';

import { buildCrossPlatformOperationalPlans } from '../../src/services/plan/crossPlatformPlanner';
import { buildWorkspaceSnapshot } from '../../src/pages/mobile/buildWorkspaceSnapshot';
import { cloneSeedData } from '../helpers/fixtures';

describe('cross-platform operational planner', () => {
  it('builds all required PLAN plan types with approval gates', () => {
    const workspace = cloneSeedData();
    const plans = buildCrossPlatformOperationalPlans(workspace);

    expect(plans.map((plan) => plan.kind)).toEqual([
      'communication',
      'content',
      'workflow',
      'outreach-sequence',
      'scheduling-timeline',
      'follow-up-queue'
    ]);
    expect(plans).toHaveLength(6);
    expect(
      plans.every((plan) =>
        plan.approvalRequirements.some((requirement) =>
          requirement.includes('Human approval required')
        )
      )
    ).toBe(true);
    expect(plans.every((plan) => plan.timeline.length > 0)).toBe(true);
    expect(plans.every((plan) => plan.receiptRefs.length > 0)).toBe(true);
  });

  it('marks connected platforms involved without inventing missing apps', () => {
    const workspace = cloneSeedData();
    workspace.integrationHub.sources = [
      {
        id: 'source-slack',
        name: 'Slack workspace',
        kind: 'slack',
        status: 'connected',
        artifactTypes: ['approved-thread-summary'],
        tags: ['slack'],
        notes: 'Approved thread summaries only.',
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

    const plans = buildCrossPlatformOperationalPlans(workspace);
    const workflow = plans.find((plan) => plan.kind === 'workflow');
    const communication = plans.find((plan) => plan.kind === 'communication');

    expect(workflow?.connectedPlatforms).toEqual(expect.arrayContaining(['Notion', 'Slack']));
    expect(communication?.connectedPlatforms).toContain('Slack');
    expect(communication?.connectedPlatforms).not.toContain('Gmail');
  });

  it('exposes cross-platform plans on the mobile workspace snapshot', () => {
    const snapshot = buildWorkspaceSnapshot(cloneSeedData());

    expect(snapshot.crossPlatformPlans).toHaveLength(6);
    expect(snapshot.crossPlatformPlans[0]?.previewCommand).toMatch(/^ask:/);
  });
});
