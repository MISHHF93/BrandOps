import { describe, expect, it, vi } from 'vitest';

import {
  alarmNameForTask,
  BRANDOPS_ALARM_PREFIX,
  loadWorkspaceSafely,
  scheduleBrandOpsAlarms,
  sendTaskReminderNotification,
  taskIdFromAlarm
} from '../../src/background/backgroundCore';
import type { BrandOpsData, SchedulerTask } from '../../src/types/domain';
import { cloneSeedData } from '../helpers/fixtures';

const iso = '2026-05-02T12:00:00.000Z';

const baseTask = (partial: Partial<SchedulerTask> & Pick<SchedulerTask, 'id' | 'status'>): SchedulerTask => ({
  sourceId: 'src-1',
  sourceType: 'publishing',
  title: 'Test task',
  detail: 'Detail',
  dueAt: iso,
  remindAt: iso,
  snoozeCount: 0,
  createdAt: iso,
  updatedAt: iso,
  ...partial
});

describe('backgroundCore alarm helpers', () => {
  it('builds alarm names under brandops:task: prefix', () => {
    expect(BRANDOPS_ALARM_PREFIX).toBe('brandops:task:');
    expect(alarmNameForTask('publishing:pub-1')).toBe('brandops:task:publishing:pub-1');
    expect(taskIdFromAlarm('brandops:task:publishing:pub-1')).toBe('publishing:pub-1');
  });
});

describe('loadWorkspaceSafely', () => {
  it('restores seeded workspace when getData throws', async () => {
    const seeded = cloneSeedData();
    const reconciled: BrandOpsData = {
      ...seeded,
      scheduler: { ...seeded.scheduler, tasks: [], updatedAt: iso, lastHydratedAt: iso }
    };

    const getData = vi.fn().mockRejectedValueOnce(new Error('corrupt'));
    const resetToSeed = vi.fn(async () => seeded);
    const setData = vi.fn(async (d: BrandOpsData) => d);
    const reconcileWorkspace = vi.fn(() => reconciled);

    const result = await loadWorkspaceSafely({ getData, resetToSeed, setData }, reconcileWorkspace);

    expect(result).toBe(reconciled);
    expect(resetToSeed).toHaveBeenCalledOnce();
    expect(reconcileWorkspace).toHaveBeenCalledWith(seeded);
    expect(setData).toHaveBeenCalledWith(reconciled);
  });
});

describe('scheduleBrandOpsAlarms', () => {
  it('clears only brandops task alarms and schedules eligible tasks', async () => {
    const fixedNow = new Date('2026-05-02T12:00:00.000Z').getTime();
    const workspace = cloneSeedData();

    const clears: string[] = [];
    const creates: Array<{ name: string; when: number }> = [];

    const alarms = {
      getAll: vi.fn(async () => [
        { name: `${BRANDOPS_ALARM_PREFIX}stale` },
        { name: 'other-system:keep-me' }
      ]),
      clear: vi.fn(async (name: string) => {
        clears.push(name);
      }),
      create: vi.fn(async (name: string, info: { when: number }) => {
        creates.push({ name, when: info.when });
      })
    };

    const reconcileWorkspace = (_data: BrandOpsData) => ({
      ...workspace,
      scheduler: {
        tasks: [
          baseTask({ id: 't-scheduled', status: 'scheduled' }),
          baseTask({ id: 't-soon', status: 'due-soon' }),
          baseTask({ id: 't-snoozed', status: 'snoozed' }),
          baseTask({ id: 't-done', status: 'completed' }),
          baseTask({ id: 't-missed', status: 'missed' })
        ],
        updatedAt: iso,
        lastHydratedAt: iso
      }
    });

    const setSnapshots: BrandOpsData[] = [];
    const storage = {
      getData: vi.fn(async () => workspace),
      resetToSeed: vi.fn(async () => workspace),
      setData: vi.fn(async (d: BrandOpsData) => {
        setSnapshots.push(d);
        return d;
      })
    };

    await scheduleBrandOpsAlarms({
      storage,
      alarms,
      reconcileWorkspace,
      nowMs: fixedNow
    });

    expect(clears).toEqual([`${BRANDOPS_ALARM_PREFIX}stale`]);
    expect(creates.map((c) => c.name).sort()).toEqual(
      [
        alarmNameForTask('t-scheduled'),
        alarmNameForTask('t-soon'),
        alarmNameForTask('t-snoozed')
      ].sort()
    );
    const minWhen = fixedNow + 5_000;
    for (const entry of creates) {
      expect(entry.when).toBeGreaterThanOrEqual(minWhen);
    }
    expect(setSnapshots).toHaveLength(1);
    expect(setSnapshots[0]?.scheduler.tasks).toHaveLength(5);
  });
});

describe('sendTaskReminderNotification', () => {
  it('persists reconciled state without notifying when task is not due-facing', async () => {
    const workspace = cloneSeedData();
    const task = baseTask({ id: 't-scheduled', status: 'scheduled' });

    const reconcileWorkspace = (_data: BrandOpsData) => ({
      ...workspace,
      scheduler: {
        tasks: [task],
        updatedAt: iso,
        lastHydratedAt: iso
      }
    });

    const notifications = { create: vi.fn() };
    const markNotified = vi.fn((state: BrandOpsData['scheduler']) => state);

    await sendTaskReminderNotification({
      storage: {
        getData: vi.fn(async () => workspace),
        resetToSeed: vi.fn(async () => workspace),
        setData: vi.fn(async (d) => d)
      },
      notifications,
      reconcileWorkspace,
      markNotified,
      taskId: 't-scheduled'
    });

    expect(notifications.create).not.toHaveBeenCalled();
    expect(markNotified).not.toHaveBeenCalled();
  });

  it('fires notification and marks notified for due-soon tasks', async () => {
    const workspace = cloneSeedData();
    const task = baseTask({ id: 't-soon', status: 'due-soon', title: 'Ping', detail: 'Do thing' });

    const reconcileWorkspace = (_data: BrandOpsData) => ({
      ...workspace,
      scheduler: {
        tasks: [task],
        updatedAt: iso,
        lastHydratedAt: iso
      }
    });

    const notifications = { create: vi.fn(async () => {}) };
    const markNotified = vi.fn((state: BrandOpsData['scheduler'], taskId: string) => ({
      ...state,
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, lastNotifiedAt: iso } : t
      ),
      updatedAt: iso,
      lastHydratedAt: iso
    }));

    const setData = vi.fn(async (d: BrandOpsData) => d);

    await sendTaskReminderNotification({
      storage: {
        getData: vi.fn(async () => workspace),
        resetToSeed: vi.fn(async () => workspace),
        setData
      },
      notifications,
      reconcileWorkspace,
      markNotified,
      taskId: 't-soon'
    });

    expect(notifications.create).toHaveBeenCalledWith(`reminder:${task.id}`, expect.objectContaining({
      type: 'basic',
      title: `BrandOps reminder: ${task.title}`
    }));
    expect(markNotified).toHaveBeenCalled();
    expect(setData).toHaveBeenCalled();
  });
});
