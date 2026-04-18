import { describe, expect, it } from 'vitest';

import { scheduler } from '../../src/services/scheduling/scheduler';
import { SchedulerState } from '../../src/types/domain';
import { cloneDemoSampleData } from '../helpers/fixtures';

describe('scheduler', () => {
  it('reconciles seeded work into time-aware task states', () => {
    const now = new Date('2026-04-11T15:00:00.000Z');
    const data = cloneDemoSampleData();

    data.scheduler.tasks = [];
    data.publishingQueue = [
      {
        ...data.publishingQueue[0],
        id: 'pub-due-soon',
        status: 'queued',
        scheduledFor: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        reminderAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
      },
      {
        ...data.publishingQueue[1],
        id: 'pub-scheduled',
        status: 'queued',
        scheduledFor: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
        reminderAt: new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString()
      }
    ];
    data.followUps = [
      {
        ...data.followUps[0],
        id: 'fu-due',
        dueAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        completed: false
      },
      {
        ...data.followUps[1],
        id: 'fu-missed',
        dueAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        completed: false
      }
    ];
    data.opportunities = [
      {
        ...data.opportunities[0],
        id: 'opp-due-soon',
        followUpDate: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        archivedAt: undefined
      },
      {
        ...data.opportunities[1],
        id: 'opp-scheduled',
        followUpDate: new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString(),
        archivedAt: undefined
      }
    ];

    const state = scheduler.reconcile(data, now);
    const tasks = new Map(state.tasks.map((task) => [task.id, task]));

    expect(state.tasks).toHaveLength(6);
    expect(tasks.get('publishing:pub-due-soon')?.status).toBe('due-soon');
    expect(tasks.get('publishing:pub-scheduled')?.status).toBe('scheduled');
    expect(tasks.get('follow-up:fu-due')?.status).toBe('due');
    expect(tasks.get('follow-up:fu-missed')?.status).toBe('missed');
    expect(tasks.get('follow-up:fu-missed')?.missedAt).toBe(now.toISOString());
    expect(tasks.get('crm:opp-due-soon')?.status).toBe('due-soon');
    expect(tasks.get('crm:opp-scheduled')?.status).toBe('scheduled');
  });

  it('preserves previous metadata when reconciling existing tasks', () => {
    const now = new Date('2026-04-11T15:00:00.000Z');
    const data = cloneDemoSampleData();
    const dueAt = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();

    data.followUps = [
      {
        ...data.followUps[0],
        id: 'fu-existing',
        dueAt,
        completed: false
      }
    ];
    data.publishingQueue = [];
    data.opportunities = [];
    data.scheduler.tasks = [
      {
        id: 'follow-up:fu-existing',
        sourceId: 'fu-existing',
        sourceType: 'follow-up',
        title: 'Outreach follow-up',
        detail: 'Existing state',
        dueAt,
        remindAt: new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
        status: 'snoozed',
        snoozeCount: 2,
        lastNotifiedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    const state = scheduler.reconcile(data, now);
    const task = state.tasks[0];

    expect(task.snoozeCount).toBe(2);
    expect(task.lastNotifiedAt).toBe(data.scheduler.tasks[0].lastNotifiedAt);
    expect(task.status).toBe('due-soon');
  });

  it('snoozes and marks notifications on a task', () => {
    const now = new Date('2026-04-11T15:00:00.000Z');
    const state: SchedulerState = {
      tasks: [
        {
          id: 'task-1',
          sourceId: 'task-1',
          sourceType: 'publishing',
          title: 'Check publish window',
          detail: 'Review CTA',
          dueAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
          remindAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
          status: 'due-soon',
          snoozeCount: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }
      ],
      updatedAt: now.toISOString(),
      lastHydratedAt: now.toISOString()
    };

    const snoozed = scheduler.snooze(state, 'task-1', 45, now);
    const notified = scheduler.markNotified(snoozed, 'task-1', now);
    const task = notified.tasks[0];

    expect(task.dueAt).toBe(new Date(now.getTime() + 75 * 60 * 1000).toISOString());
    expect(task.remindAt).toBe(new Date(now.getTime() + 60 * 1000).toISOString());
    expect(task.status).toBe('snoozed');
    expect(task.snoozeCount).toBe(1);
    expect(task.lastNotifiedAt).toBe(now.toISOString());
  });

  it('rolls recurring tasks forward and groups active work', () => {
    const now = new Date('2026-04-11T15:00:00.000Z');
    const state: SchedulerState = {
      tasks: [
        {
          id: 'daily',
          sourceId: 'daily',
          sourceType: 'follow-up',
          title: 'Daily check-in',
          detail: 'Send update',
          dueAt: '2026-04-11T18:00:00.000Z',
          remindAt: '2026-04-11T17:30:00.000Z',
          status: 'due-soon',
          recurrence: {
            interval: 'daily',
            every: 1
          },
          snoozeCount: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: 'missed',
          sourceId: 'missed',
          sourceType: 'crm',
          title: 'Proposal follow-up',
          detail: 'Call back',
          dueAt: '2026-04-11T10:00:00.000Z',
          remindAt: '2026-04-11T09:00:00.000Z',
          status: 'missed',
          snoozeCount: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          missedAt: now.toISOString()
        }
      ],
      updatedAt: now.toISOString(),
      lastHydratedAt: now.toISOString()
    };

    const completed = scheduler.complete(state, 'daily', now);
    const rolledTask = completed.tasks.find((task) => task.id === 'daily');
    const groups = scheduler.groups(completed, now);

    expect(rolledTask?.status).toBe('scheduled');
    expect(rolledTask?.dueAt).toBe('2026-04-12T18:00:00.000Z');
    expect(rolledTask?.completedAt).toBeUndefined();
    expect(groups.missed.map((task) => task.id)).toContain('missed');
    expect(groups.thisWeek.map((task) => task.id)).toContain('daily');
  });

  it('recovers gracefully from invalid timestamps and non-finite snooze input', () => {
    const now = new Date('2026-04-11T15:00:00.000Z');
    const data = cloneDemoSampleData();

    data.publishingQueue = [
      {
        ...data.publishingQueue[0],
        id: 'pub-invalid-time',
        scheduledFor: 'invalid-date',
        reminderAt: 'still-invalid'
      }
    ];
    data.followUps = [
      {
        ...data.followUps[0],
        id: 'fu-invalid-time',
        dueAt: 'invalid-date'
      }
    ];
    data.opportunities = [
      {
        ...data.opportunities[0],
        id: 'opp-invalid-time',
        followUpDate: 'invalid-date'
      }
    ];
    data.scheduler.tasks = [
      {
        id: 'publishing:pub-invalid-time',
        sourceId: 'pub-invalid-time',
        sourceType: 'publishing',
        title: 'Malformed task',
        detail: 'Should recover',
        dueAt: 'invalid-date',
        remindAt: 'invalid-date',
        status: 'scheduled',
        snoozeCount: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ];

    const reconciled = scheduler.reconcile(data, now);
    expect(reconciled.tasks.length).toBe(3);
    reconciled.tasks.forEach((task) => {
      expect(Number.isFinite(new Date(task.dueAt).getTime())).toBe(true);
      expect(Number.isFinite(new Date(task.remindAt).getTime())).toBe(true);
    });

    const targetTaskId = reconciled.tasks[0].id;
    const snoozed = scheduler.snooze(reconciled, targetTaskId, Number.NaN as number, now);
    const updatedTask = snoozed.tasks.find((task) => task.id === targetTaskId);

    expect(updatedTask).toBeDefined();
    expect(Number.isFinite(new Date(updatedTask!.dueAt).getTime())).toBe(true);
    expect(updatedTask!.status).toBe('snoozed');
  });
});
