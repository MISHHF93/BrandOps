import { RuntimeMessage } from '../services/messaging/messages';
import { scheduler } from '../services/scheduling/scheduler';
import { storageService } from '../services/storage/storage';
import { executeAgentWorkspaceCommand } from '../services/agent/agentWorkspaceEngine';
import { normalizeChannelWebhookPayload } from '../services/agent/channelPayloadAdapters';
import { BridgeReplayGuard } from '../services/agent/bridgeReplayGuard';
import { isBridgeNonceReplayed } from '../services/agent/bridgeNonceStore';
import {
  toRuntimeWebhookMessage,
  verifyWebhookBridgeEnvelope
} from '../services/agent/webhookBridge';
import { hasFederatedSession } from '../shared/identity/sessionAccess';
import { readLaunchAccessStateForRuntime } from '../shared/account/launchAccess';
import { canOpenLaunchWorkspace } from '../shared/account/launchLifecycleGate';
import { initIntelligenceRulesFromRemote } from '../rules/intelligenceRulesRuntime';

const ALARM_PREFIX = 'brandops:task:';
const bridgeReplayFallback = new BridgeReplayGuard();

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

  const shouldNotify =
    task.status === 'due-soon' || task.status === 'due' || task.status === 'missed';
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

const executeAndRespondFromWebhookPayload = async (
  input: { platform: 'telegram' | 'whatsapp'; payload: unknown },
  sendResponse: (response: unknown) => void,
  invalidPayloadError: string
) => {
  const normalized = normalizeChannelWebhookPayload({
    platform: input.platform,
    payload: input.payload
  });
  if (!normalized) {
    sendResponse({
      ok: false,
      error: invalidPayloadError
    });
    return;
  }

  const result = await executeAgentWorkspaceCommand({
    text: normalized.text,
    actorName: normalized.actorName ?? normalized.actorId,
    source: normalized.platform
  });
  await scheduleAlarms();
  sendResponse({
    ok: result.ok,
    action: result.action,
    summary: result.summary,
    normalized
  });
};

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
      const data = await loadWorkspaceSafely();
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
  void chrome.tabs.create({ url: chrome.runtime.getURL('mobile.html') });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'SYNC_SCHEDULER') {
        await scheduleAlarms();
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'AGENT_CHANNEL_EVENT') {
        const result = await executeAgentWorkspaceCommand({
          text: message.payload.text,
          actorName: message.payload.actorName ?? message.payload.actorId,
          source: message.payload.platform
        });
        await scheduleAlarms();
        sendResponse({
          ok: result.ok,
          action: result.action,
          summary: result.summary
        });
        return;
      }

      if (message.type === 'AGENT_CHANNEL_WEBHOOK') {
        await executeAndRespondFromWebhookPayload(
          {
            platform: message.payload.platform,
            payload: message.payload.raw
          },
          sendResponse,
          `Webhook payload could not be normalized for ${message.payload.platform}.`
        );
        return;
      }

      if (message.type === 'AGENT_BRIDGE_ENVELOPE') {
        let replayed = false;
        try {
          replayed = await isBridgeNonceReplayed(message.payload.envelope.nonce);
        } catch {
          replayed = bridgeReplayFallback.registerAndCheckReplay(message.payload.envelope.nonce);
        }
        if (replayed) {
          sendResponse({
            ok: false,
            error: 'Bridge envelope rejected: replayed nonce.'
          });
          return;
        }

        const verification = await verifyWebhookBridgeEnvelope(
          message.payload.secret,
          message.payload.envelope
        );
        if (!verification.valid) {
          sendResponse({
            ok: false,
            error: verification.reason ?? 'Bridge envelope verification failed.'
          });
          return;
        }

        const runtimeWebhookMessage = toRuntimeWebhookMessage(message.payload.envelope);
        await executeAndRespondFromWebhookPayload(
          {
            platform: runtimeWebhookMessage.payload.platform,
            payload: runtimeWebhookMessage.payload.raw
          },
          sendResponse,
          `Signed bridge payload could not be normalized for ${runtimeWebhookMessage.payload.platform}.`
        );
        return;
      }

      sendResponse({ ok: false, error: 'Unsupported runtime message.' });
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
