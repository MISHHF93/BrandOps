import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dailyNotificationCenter } from '../../src/services/intelligence/dailyNotificationCenter';
import { cloneDemoSampleData, cloneSeedData } from '../helpers/fixtures';

describe('dailyNotificationCenter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a disabled digest when the notification center is off', () => {
    const data = cloneSeedData();
    data.settings.notificationCenter.enabled = false;

    const digest = dailyNotificationCenter.build(data);

    expect(digest.headline).toContain('disabled');
    expect(digest.promptPreview).toContain('disabled');
    expect(digest.schedule).toHaveLength(0);
    expect(digest.managerialActions).toHaveLength(0);
  });

  it('builds managerial, technical, and dataset guidance with prompt interpolation', () => {
    const data = cloneDemoSampleData();

    data.settings.notificationCenter.managerialWeight = 65;
    data.settings.notificationCenter.maxDailyTasks = 2;
    data.settings.notificationCenter.workdayStartHour = 8;
    data.settings.notificationCenter.workdayEndHour = 18;
    data.settings.notificationCenter.roleContext =
      'AI operator covering technical and managerial execution.';
    data.settings.notificationCenter.promptTemplate = [
      'Role={{role_context}}',
      'Model={{preferred_model}}',
      'Managerial={{managerial_focus_percent}}',
      'Technical={{technical_focus_percent}}',
      'Managerial tasks:',
      '{{managerial_tasks}}',
      'Technical tasks:',
      '{{technical_tasks}}',
      'Dataset tasks:',
      '{{dataset_tasks}}'
    ].join('\n');

    data.followUps[0].dueAt = '2026-04-10T10:00:00.000Z';
    data.followUps[0].completed = false;
    data.contentLibrary[0].tags = [];
    data.integrationHub.sshTargets = [
      {
        id: 'ssh-1',
        name: 'Production node',
        host: 'prod.example.internal',
        port: 22,
        username: 'deploy',
        authMode: 'ssh-key',
        description: 'Critical environment',
        tags: ['prod'],
        commandHints: ['ssh deploy@prod.example.internal'],
        createdAt: '2026-04-11T08:00:00.000Z'
      }
    ];
    const digest = dailyNotificationCenter.build(data);
    const scheduledHours = digest.schedule.reduce(
      (total, block) => total + (block.endHour - block.startHour),
      0
    );

    expect(digest.managerialWeight).toBe(65);
    expect(digest.technicalWeight).toBe(35);
    expect(digest.headline).toBe(digest.managerialActions[0].title);
    expect(digest.managerialActions.length).toBeLessThanOrEqual(2);
    expect(digest.technicalActions.length).toBeLessThanOrEqual(2);
    expect(digest.datasetActions.length).toBeGreaterThan(0);
    expect(scheduledHours).toBe(10);
    expect(digest.promptPreview).toContain(
      'AI operator covering technical and managerial execution.'
    );
    expect(digest.promptPreview).toContain('Managerial=65');
    expect(digest.promptPreview).toContain('Technical=35');
    expect(digest.promptPreview).not.toContain('{{');
    expect(digest.promptPreview).toContain('Operator name (how to address this person):');
    expect(digest.promptPreview).toContain('Workspace brand (ground truth');
  });

  it('skips dataset actions when dataset review is disabled', () => {
    const data = cloneSeedData();
    data.settings.notificationCenter.datasetReviewEnabled = false;

    const digest = dailyNotificationCenter.build(data);

    expect(digest.datasetActions).toEqual([]);
  });
});
