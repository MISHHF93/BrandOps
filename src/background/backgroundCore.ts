import type { BrandOpsData, SchedulerState } from '../types/domain';

/** Prefix for Chrome alarm names tied to scheduler reminders (`brandops:task:<taskId>`). */
export const BRANDOPS_ALARM_PREFIX = 'brandops:task:';

export function alarmNameForTask(taskId: string): string {
  return `${BRANDOPS_ALARM_PREFIX}${taskId}`;
}

export function taskIdFromAlarm(alarmName: string): string {
  return alarmName.replace(BRANDOPS_ALARM_PREFIX, '');
}

export type WorkspaceStorage = Pick<
  typeof import('../services/storage/storage').storageService,
  'getData' | 'resetToSeed' | 'setData'
>;

export type AlarmSchedulingApi = {
  getAll: () => Promise<Array<{ name: string }>>;
  /** Chrome returns `Promise<boolean>`; callers may ignore the result. */
  clear: (name: string) => unknown;
  create: (name: string, info: { when: number }) => unknown;
};

export type NotificationApi = {
  create: (
    notificationId: string,
    options: {
      type: 'basic';
      iconUrl: string;
      title: string;
      message: string;
      priority: number;
    }
  ) => Promise<void> | void;
};

export async function loadWorkspaceSafely(
  storage: WorkspaceStorage,
  reconcileWorkspace: (data: BrandOpsData) => BrandOpsData
): Promise<BrandOpsData> {
  try {
    return await storage.getData();
  } catch (error) {
    console.error('[BrandOps] Failed to load workspace state. Restoring seeded workspace.', error);
    const seeded = await storage.resetToSeed();
    const reconciled = reconcileWorkspace(seeded);
    await storage.setData(reconciled);
    return reconciled;
  }
}

export async function scheduleBrandOpsAlarms(options: {
  storage: WorkspaceStorage;
  alarms: AlarmSchedulingApi;
  reconcileWorkspace: (data: BrandOpsData) => BrandOpsData;
  nowMs?: number;
}): Promise<void> {
  const { storage, alarms, reconcileWorkspace, nowMs = Date.now() } = options;
  const data = await loadWorkspaceSafely(storage, reconcileWorkspace);
  const nextData = reconcileWorkspace(data);

  const existing = await alarms.getAll();
  await Promise.all(
    existing
      .filter((alarm) => alarm.name.startsWith(BRANDOPS_ALARM_PREFIX))
      .map((alarm) => alarms.clear(alarm.name))
  );

  const now = nowMs;
  await Promise.all(
    nextData.scheduler.tasks
      .filter((task) => ['scheduled', 'due-soon', 'snoozed'].includes(task.status))
      .map((task) => {
        const when = Math.max(now + 5_000, new Date(task.remindAt).getTime());
        return alarms.create(alarmNameForTask(task.id), { when });
      })
  );

  await storage.setData(nextData);
}

export async function sendTaskReminderNotification(options: {
  storage: WorkspaceStorage;
  notifications?: NotificationApi;
  reconcileWorkspace: (data: BrandOpsData) => BrandOpsData;
  markNotified: (state: SchedulerState, taskId: string) => SchedulerState;
  taskId: string;
}): Promise<void> {
  const { storage, notifications, reconcileWorkspace, markNotified, taskId } = options;
  const data = await loadWorkspaceSafely(storage, reconcileWorkspace);
  const reconciled = reconcileWorkspace(data);
  const task = reconciled.scheduler.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const shouldNotify =
    task.status === 'due-soon' || task.status === 'due' || task.status === 'missed';
  if (!shouldNotify) {
    await storage.setData(reconciled);
    return;
  }

  if (notifications?.create) {
    await notifications.create(`reminder:${task.id}`, {
      type: 'basic',
      iconUrl: 'icons/128.png',
      title: `BrandOps reminder: ${task.title}`,
      message: `${task.detail}\nDue ${new Date(task.dueAt).toLocaleString()}`,
      priority: 2
    });
  }

  const next = { ...reconciled, scheduler: markNotified(reconciled.scheduler, task.id) };
  await storage.setData(next);
}
