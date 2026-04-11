import { RuntimeMessage } from '../services/messaging/messages';
import { scheduler } from '../services/scheduling/scheduler';
import { storageService } from '../services/storage/storage';

const ALARM_PREFIX = 'brandops:task:';

const alarmNameForTask = (taskId: string) => `${ALARM_PREFIX}${taskId}`;
const taskIdFromAlarm = (alarmName: string) => alarmName.replace(ALARM_PREFIX, '');

const scheduleAlarms = async () => {
  const data = await storageService.getData();
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
  const data = await storageService.getData();
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

chrome.runtime.onInstalled.addListener(async () => {
  await scheduleAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  await scheduleAlarms();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  void (async () => {
    await sendReminderNotification(taskIdFromAlarm(alarm.name));
    await scheduleAlarms();
  })();
});

chrome.notifications?.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith('reminder:')) return;
  void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    if (message.type === 'GET_DATA') {
      sendResponse(await storageService.getData());
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
  })();

  return true;
});
