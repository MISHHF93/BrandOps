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
  'getData' | 'resetToSeed' | 'setData' | 'withWorkspaceMutation'
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

const toFiniteTime = (value?: string): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const hasNotifiedForCurrentReminderWindow = (task: SchedulerState['tasks'][number]): boolean => {
  const notifiedAt = toFiniteTime(task.lastNotifiedAt);
  const remindAt = toFiniteTime(task.remindAt);
  return notifiedAt !== null && remindAt !== null && notifiedAt >= remindAt;
};

export async function loadWorkspaceSafely(
  storage: WorkspaceStorage,
  _reconcileWorkspace: (data: BrandOpsData) => BrandOpsData
): Promise<BrandOpsData> {
  try {
    return await storage.getData();
  } catch (error) {
    console.error('[BrandOps] Failed to load workspace state. Preserving stored data.', error);
    throw error;
  }
}

export async function scheduleBrandOpsAlarms(options: {
  storage: WorkspaceStorage;
  alarms: AlarmSchedulingApi;
  reconcileWorkspace: (data: BrandOpsData) => BrandOpsData;
  nowMs?: number;
}): Promise<void> {
  const { storage, alarms, reconcileWorkspace, nowMs = Date.now() } = options;
  let nextData: BrandOpsData;
  try {
    const mutation = await storage.withWorkspaceMutation((current) => reconcileWorkspace(current));
    nextData = mutation.data;
  } catch (error) {
    console.error('[BrandOps] Failed to reconcile workspace state. Preserving stored data.', error);
    throw error;
  }

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
      .filter((task) => !hasNotifiedForCurrentReminderWindow(task))
      .map((task) => {
        const when = Math.max(now + 5_000, new Date(task.remindAt).getTime());
        return alarms.create(alarmNameForTask(task.id), { when });
      })
  );
}

export async function sendTaskReminderNotification(options: {
  storage: WorkspaceStorage;
  notifications?: NotificationApi;
  reconcileWorkspace: (data: BrandOpsData) => BrandOpsData;
  markNotified: (state: SchedulerState, taskId: string) => SchedulerState;
  taskId: string;
}): Promise<void> {
  const { storage, notifications, reconcileWorkspace, markNotified, taskId } = options;
  const { data } = await storage.withWorkspaceMutation((current) => reconcileWorkspace(current));
  const task = data.scheduler.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const shouldNotify =
    (task.status === 'due-soon' || task.status === 'due' || task.status === 'missed') &&
    !hasNotifiedForCurrentReminderWindow(task);
  if (!shouldNotify) return;

  if (notifications?.create) {
    await notifications.create(`reminder:${task.id}`, {
      type: 'basic',
      iconUrl: 'icons/128.png',
      title: `BrandOps reminder: ${task.title}`,
      message: `${task.detail}\nDue ${new Date(task.dueAt).toLocaleString()}`,
      priority: 2
    });
  }

  await storage.withWorkspaceMutation((current) => {
    const reconciled = reconcileWorkspace(current);
    const currentTask = reconciled.scheduler.tasks.find((item) => item.id === taskId);
    if (
      !currentTask ||
      (currentTask.status !== 'due-soon' &&
        currentTask.status !== 'due' &&
        currentTask.status !== 'missed') ||
      hasNotifiedForCurrentReminderWindow(currentTask)
    ) {
      return current;
    }
    return { ...reconciled, scheduler: markNotified(reconciled.scheduler, taskId) };
  });
}
