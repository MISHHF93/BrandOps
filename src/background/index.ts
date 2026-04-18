import { RuntimeMessage } from '../services/messaging/messages';
import { scheduler } from '../services/scheduling/scheduler';
import { storageService } from '../services/storage/storage';
import { hasFederatedSession } from '../shared/identity/sessionAccess';

const ALARM_PREFIX = 'brandops:task:';

const alarmNameForTask = (taskId: string) => `${ALARM_PREFIX}${taskId}`;
const taskIdFromAlarm = (alarmName: string) => alarmName.replace(ALARM_PREFIX, '');

const loadWorkspaceSafely = async () => {
  try {
    return await storageService.getData();
  } catch (error) {
    console.error('[BrandOps] Failed to load workspace state. Restoring seeded workspace.', error);
    const seeded = await storageService.resetToSeed();
    const reconciled = { ...seeded, scheduler: scheduler.reconcile(seeded) };
    await storageService.setData(reconciled);
    return reconciled;
  }
};

const scheduleAlarms = async () => {
  const data = await loadWorkspaceSafely();
  const nextData = { ...data, scheduler: scheduler.reconcile(data) };

  const existing = await chrome.alarms.getAll();
  await Promise.all(
    existing
      .filter((alarm) => alarm.name.startsWith(ALARM_PREFIX))
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );

  const now = Date.now();
  await Promise.all(
    nextData.scheduler.tasks
      .filter((task) => ['scheduled', 'due-soon', 'snoozed'].includes(task.status))
      .map((task) => {
        const when = Math.max(now + 5_000, new Date(task.remindAt).getTime());
        return chrome.alarms.create(alarmNameForTask(task.id), { when });
      })
  );

  await storageService.setData(nextData);
};

const sendReminderNotification = async (taskId: string) => {
  const data = await loadWorkspaceSafely();
  const reconciled = { ...data, scheduler: scheduler.reconcile(data) };
  const task = reconciled.scheduler.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const shouldNotify = task.status === 'due-soon' || task.status === 'due' || task.status === 'missed';
  if (!shouldNotify) {
    await storageService.setData(reconciled);
    return;
  }

  if (chrome.notifications?.create) {
    await chrome.notifications.create(`reminder:${task.id}`, {
      type: 'basic',
      iconUrl: 'icons/128.png',
      title: `BrandOps reminder: ${task.title}`,
      message: `${task.detail}\nDue ${new Date(task.dueAt).toLocaleString()}`,
      priority: 2
    });
  }

  const next = { ...reconciled, scheduler: scheduler.markNotified(reconciled.scheduler, task.id) };
  await storageService.setData(next);
};

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    await scheduleAlarms();
  } catch (error) {
    console.error('[BrandOps] Failed to schedule alarms on install.', error);
  }

  if (details.reason === 'install' && chrome.runtime.getURL) {
    try {
      const data = await loadWorkspaceSafely();
      if (!hasFederatedSession(data)) {
        await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
      }
    } catch (error) {
      console.error('[BrandOps] Failed to open welcome tab on install.', error);
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await scheduleAlarms();
  } catch (error) {
    console.error('[BrandOps] Failed to schedule alarms on startup.', error);
  }
});

chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  void (async () => {
    try {
      await sendReminderNotification(taskIdFromAlarm(alarm.name));
      await scheduleAlarms();
    } catch (error) {
      console.error('[BrandOps] Alarm processing failed.', error);
    }
  })();
});

chrome.notifications?.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith('reminder:')) return;
  void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'GET_DATA') {
        sendResponse(await loadWorkspaceSafely());
        return;
      }

      if (message.type === 'RESET_DATA') {
        const data = await storageService.resetToSeed();
        const next = { ...data, scheduler: scheduler.reconcile(data) };
        await storageService.setData(next);
        await scheduleAlarms();
        sendResponse(next);
        return;
      }

      if (message.type === 'OPEN_DASHBOARD') {
        await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'SYNC_SCHEDULER') {
        await scheduleAlarms();
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: message.type === 'PING' });
    } catch (error) {
      console.error('[BrandOps] Runtime message handler failed.', message.type, error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown runtime error.'
      });
    }
  })();

  return true;
});
