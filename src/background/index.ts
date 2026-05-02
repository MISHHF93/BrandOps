import type { BrandOpsData } from '../types/domain';
import { RuntimeMessage } from '../services/messaging/messages';
import { scheduler } from '../services/scheduling/scheduler';
import { storageService } from '../services/storage/storage';
import { executeAgentWorkspaceCommand } from '../services/agent/agentWorkspaceEngine';
import { BridgeReplayGuard } from '../services/agent/bridgeReplayGuard';
import { isBridgeNonceReplayed } from '../services/agent/bridgeNonceStore';
import { hasFederatedSession } from '../shared/identity/sessionAccess';
import { readLaunchAccessStateForRuntime } from '../shared/account/launchAccess';
import { canOpenLaunchWorkspace } from '../shared/account/launchLifecycleGate';
import { initIntelligenceRulesFromRemote } from '../rules/intelligenceRulesRuntime';
import {
  BRANDOPS_ALARM_PREFIX,
  loadWorkspaceSafely,
  scheduleBrandOpsAlarms,
  sendTaskReminderNotification,
  taskIdFromAlarm
} from './backgroundCore';
import { dispatchRuntimeMessage } from './backgroundDispatch';

const bridgeReplayFallback = new BridgeReplayGuard();

const reconcileWorkspace = (data: BrandOpsData) => ({
  ...data,
  scheduler: scheduler.reconcile(data)
});

const scheduleAlarms = () =>
  scheduleBrandOpsAlarms({
    storage: storageService,
    alarms: chrome.alarms,
    reconcileWorkspace
  });

type NotificationCreateFixed = (
  notificationId: string,
  options: {
    type: 'basic';
    iconUrl: string;
    title: string;
    message: string;
    priority: number;
  }
) => Promise<string>;

const notificationAdapter =
  chrome.notifications?.create != null
    ? {
        create: (
          notificationId: string,
          options: {
            type: 'basic';
            iconUrl: string;
            title: string;
            message: string;
            priority: number;
          }
        ) => void (chrome.notifications!.create as NotificationCreateFixed)(notificationId, options)
      }
    : undefined;

const sendReminderNotification = (taskId: string) =>
  sendTaskReminderNotification({
    storage: storageService,
    notifications: notificationAdapter,
    reconcileWorkspace,
    markNotified: (state, id) => scheduler.markNotified(state, id),
    taskId
  });

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    await initIntelligenceRulesFromRemote();
  } catch (error) {
    console.error('[BrandOps] Intelligence rules init failed on install.', error);
  }
  try {
    await scheduleAlarms();
  } catch (error) {
    console.error('[BrandOps] Failed to schedule alarms on install.', error);
  }

  if (details.reason === 'install' && chrome.runtime.getURL) {
    try {
      const data = await loadWorkspaceSafely(storageService, reconcileWorkspace);
      const launchAccess = await readLaunchAccessStateForRuntime();
      if (!canOpenLaunchWorkspace(launchAccess) && !hasFederatedSession(data)) {
        await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
      }
    } catch (error) {
      console.error('[BrandOps] Failed to open welcome tab on install.', error);
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await initIntelligenceRulesFromRemote();
  } catch (error) {
    console.error('[BrandOps] Intelligence rules init failed on startup.', error);
  }
  try {
    await scheduleAlarms();
  } catch (error) {
    console.error('[BrandOps] Failed to schedule alarms on startup.', error);
  }
});

chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('mobile.html') });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(BRANDOPS_ALARM_PREFIX)) return;
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
  void chrome.tabs.create({ url: chrome.runtime.getURL('mobile.html') });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      const result = await dispatchRuntimeMessage(message, {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        isBridgeNonceReplayed,
        bridgeReplayFallback
      });
      sendResponse(result);
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
