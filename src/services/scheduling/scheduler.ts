import {
  BrandOpsData,
  SchedulerState,
  SchedulerTask,
  SchedulerTaskStatus
} from '../../types/domain';

const DUE_SOON_WINDOW_MS = 6 * 60 * 60 * 1000;
const MISSED_WINDOW_MS = 30 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

const createTaskId = (sourceType: SchedulerTask['sourceType'], sourceId: string) =>
  `${sourceType}:${sourceId}`;

const toDateMs = (value: string | undefined, fallbackMs: number) => {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallbackMs;
};

const toIso = (valueMs: number) => new Date(valueMs).toISOString();

const statusForTime = (task: SchedulerTask, nowMs: number): SchedulerTaskStatus => {
  if (task.status === 'completed' || task.status === 'cancelled') return task.status;

  const dueMs = toDateMs(task.dueAt, nowMs + DUE_SOON_WINDOW_MS + 1);
  if (nowMs >= dueMs + MISSED_WINDOW_MS) return 'missed';
  if (nowMs >= dueMs) return 'due';
  if (dueMs - nowMs <= DUE_SOON_WINDOW_MS) return 'due-soon';
  return task.status === 'snoozed' ? 'snoozed' : 'scheduled';
};

const nextReminderAt = (dueAt: string, leadMinutes: number) =>
  toIso(toDateMs(dueAt, Date.now()) - Math.max(0, Math.round(leadMinutes)) * MINUTE_MS);

const normalizeTask = (task: SchedulerTask, nowIso: string): SchedulerTask => {
  const nowMs = new Date(nowIso).getTime();
  const dueMs = toDateMs(task.dueAt, nowMs + MINUTE_MS);
  const remindMs = toDateMs(task.remindAt, dueMs - 30 * MINUTE_MS);
  const normalizedLead = Math.max(0, Math.round((dueMs - remindMs) / MINUTE_MS));
  const safeDueAt = toIso(dueMs);
  return {
    ...task,
    dueAt: safeDueAt,
    remindAt: nextReminderAt(safeDueAt, normalizedLead),
    updatedAt: nowIso
  };
};

const buildSeedTasks = (data: BrandOpsData, nowIso: string): SchedulerTask[] => {
  const nowMs = new Date(nowIso).getTime();
  const publishingTasks: SchedulerTask[] = data.publishingQueue
    .filter((item) => item.status !== 'posted' && item.status !== 'skipped' && item.scheduledFor)
    .map((item) => {
      const dueAt = toIso(toDateMs(item.scheduledFor, nowMs + 60 * MINUTE_MS));
      const lead = item.reminderLeadMinutes ?? 60;
      return {
        id: createTaskId('publishing', item.id),
        sourceId: item.id,
        sourceType: 'publishing',
        title: item.title,
        detail: item.checklist ?? 'Prepare post and publish manually.',
        dueAt,
        remindAt: item.reminderAt ?? nextReminderAt(dueAt, lead),
        status: 'scheduled',
        snoozeCount: 0,
        createdAt: item.createdAt,
        updatedAt: nowIso
      };
    });

  const followUpTasks: SchedulerTask[] = data.followUps
    .filter((item) => !item.completed)
    .map((item) => ({
      id: createTaskId('follow-up', item.id),
      sourceId: item.id,
      sourceType: 'follow-up',
      title: 'Outreach follow-up',
      detail: item.reason,
      dueAt: toIso(toDateMs(item.dueAt, nowMs + 30 * MINUTE_MS)),
      remindAt: nextReminderAt(toIso(toDateMs(item.dueAt, nowMs + 30 * MINUTE_MS)), 30),
      status: 'scheduled',
      recurrence: item.recurrence,
      snoozeCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso
    }));

  const crmTasks: SchedulerTask[] = data.opportunities
    .filter((item) => !item.archivedAt && Boolean(item.followUpDate))
    .map((item) => ({
      id: createTaskId('crm', item.id),
      sourceId: item.id,
      sourceType: 'crm',
      title: `${item.company}: ${item.nextAction}`,
      detail: `Stage: ${item.status}`,
      dueAt: toIso(toDateMs(item.followUpDate, nowMs + 2 * 60 * MINUTE_MS)),
      remindAt: nextReminderAt(toIso(toDateMs(item.followUpDate, nowMs + 2 * 60 * MINUTE_MS)), 60),
      status: 'scheduled',
      snoozeCount: 0,
      createdAt: item.createdAt,
      updatedAt: nowIso
    }));

  return [...publishingTasks, ...followUpTasks, ...crmTasks];
};

const applyRecurrence = (task: SchedulerTask, nowIso: string): SchedulerTask => {
  if (!task.recurrence) return task;

  const due = new Date(toDateMs(task.dueAt, new Date(nowIso).getTime()));
  if (task.recurrence.interval === 'daily') {
    due.setDate(due.getDate() + task.recurrence.every);
  } else {
    due.setDate(due.getDate() + task.recurrence.every * 7);
  }

  const dueAt = due.toISOString();
  return {
    ...task,
    dueAt,
    remindAt: nextReminderAt(dueAt, 30),
    status: 'scheduled',
    completedAt: undefined,
    missedAt: undefined,
    updatedAt: nowIso
  };
};

export const scheduler = {
  reconcile(data: BrandOpsData, now = new Date()): SchedulerState {
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const existing = new Map((data.scheduler?.tasks ?? []).map((task) => [task.id, task]));

    const merged = buildSeedTasks(data, nowIso).map((seedTask) => {
      const previous = existing.get(seedTask.id);
      const mergedTask = previous
        ? normalizeTask(
            {
              ...seedTask,
              snoozeCount: previous.snoozeCount,
              recurrence: previous.recurrence ?? seedTask.recurrence,
              lastNotifiedAt: previous.lastNotifiedAt,
              completedAt: previous.completedAt,
              missedAt: previous.missedAt,
              status: previous.status
            },
            nowIso
          )
        : seedTask;

      const nextStatus = statusForTime(mergedTask, nowMs);
      return {
        ...mergedTask,
        status: nextStatus,
        missedAt: nextStatus === 'missed' ? nowIso : mergedTask.missedAt,
        updatedAt: nowIso
      };
    });

    return {
      tasks: merged,
      updatedAt: nowIso,
      lastHydratedAt: nowIso
    };
  },

  snooze(state: SchedulerState, taskId: string, minutes: number, now = new Date()): SchedulerState {
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const boundedMinutes = Math.max(
      -7 * DAY_MINUTES,
      Math.min(30 * DAY_MINUTES, Math.round(Number.isFinite(minutes) ? minutes : 15))
    );
    return {
      ...state,
      updatedAt: nowIso,
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const currentDueMs = toDateMs(task.dueAt, nowMs + 15 * MINUTE_MS);
        const dueAt = toIso(currentDueMs + boundedMinutes * MINUTE_MS);
        return {
          ...task,
          dueAt,
          remindAt: toIso(nowMs + MINUTE_MS),
          status: 'snoozed',
          snoozeCount: task.snoozeCount + 1,
          updatedAt: nowIso
        };
      })
    };
  },

  complete(state: SchedulerState, taskId: string, now = new Date()): SchedulerState {
    const nowIso = now.toISOString();
    return {
      ...state,
      updatedAt: nowIso,
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const completed = {
          ...task,
          status: 'completed' as const,
          completedAt: nowIso,
          updatedAt: nowIso
        };
        return applyRecurrence(completed, nowIso);
      })
    };
  },

  markNotified(state: SchedulerState, taskId: string, now = new Date()): SchedulerState {
    const nowIso = now.toISOString();
    return {
      ...state,
      updatedAt: nowIso,
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              lastNotifiedAt: nowIso,
              updatedAt: nowIso
            }
          : task
      )
    };
  },

  groups(state: SchedulerState, now = new Date()) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const active = state.tasks.filter(
      (task) => task.status !== 'completed' && task.status !== 'cancelled'
    );

    return {
      dueSoon: active.filter((task) => task.status === 'due-soon' || task.status === 'due'),
      today: active.filter((task) => {
        const dueMs = toDateMs(task.dueAt, Number.POSITIVE_INFINITY);
        if (!Number.isFinite(dueMs)) return false;
        return (
          dueMs >= startOfToday.getTime() && dueMs < startOfToday.getTime() + 24 * 60 * 60 * 1000
        );
      }),
      thisWeek: active.filter((task) => {
        const dueMs = toDateMs(task.dueAt, Number.POSITIVE_INFINITY);
        if (!Number.isFinite(dueMs)) return false;
        return dueMs >= startOfToday.getTime() && dueMs < endOfWeek.getTime();
      }),
      missed: active.filter((task) => task.status === 'missed')
    };
  }
};
