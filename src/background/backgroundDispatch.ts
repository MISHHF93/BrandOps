import type {
  AgentWorkspaceCommand,
  AgentWorkspaceResult
} from '../services/agent/agentWorkspaceEngine';
import { normalizeChannelWebhookPayload } from '../services/agent/channelPayloadAdapters';
import type { BridgeReplayGuard } from '../services/agent/bridgeReplayGuard';
import { isBridgeNonceReplayed } from '../services/agent/bridgeNonceStore';
import type { RuntimeMessage } from '../services/messaging/messages';
import {
  toRuntimeWebhookMessage,
  verifyWebhookBridgeEnvelope
} from '../services/agent/webhookBridge';

export type BackgroundDispatchDeps = {
  scheduleAlarms: () => Promise<void>;
  executeAgentWorkspaceCommand: (command: AgentWorkspaceCommand) => Promise<AgentWorkspaceResult>;
  isBridgeNonceReplayed: typeof isBridgeNonceReplayed;
  bridgeReplayFallback: Pick<BridgeReplayGuard, 'registerAndCheckReplay'>;
};

export async function executeAndRespondFromWebhookPayload(
  deps: BackgroundDispatchDeps,
  input: { platform: 'telegram' | 'whatsapp'; payload: unknown },
  invalidPayloadError: string
): Promise<{
  ok: boolean;
  action?: AgentWorkspaceResult['action'];
  summary?: string;
  normalized?: unknown;
  error?: string;
}> {
  const normalized = normalizeChannelWebhookPayload({
    platform: input.platform,
    payload: input.payload
  });
  if (!normalized) {
    return {
      ok: false,
      error: invalidPayloadError
    };
  }

  const result = await deps.executeAgentWorkspaceCommand({
    text: normalized.text,
    actorName: normalized.actorName ?? normalized.actorId,
    source: normalized.platform
  });
  await deps.scheduleAlarms();
  return {
    ok: result.ok,
    action: result.action,
    summary: result.summary,
    normalized
  };
}

export async function dispatchRuntimeMessage(
  message: RuntimeMessage,
  deps: BackgroundDispatchDeps
): Promise<unknown> {
  if (message.type === 'SYNC_SCHEDULER') {
    await deps.scheduleAlarms();
    return { ok: true };
  }

  if (message.type === 'AGENT_CHANNEL_EVENT') {
    const result = await deps.executeAgentWorkspaceCommand({
      text: message.payload.text,
      actorName: message.payload.actorName ?? message.payload.actorId,
      source: message.payload.platform
    });
    await deps.scheduleAlarms();
    return {
      ok: result.ok,
      action: result.action,
      summary: result.summary
    };
  }

  if (message.type === 'AGENT_CHANNEL_WEBHOOK') {
    return executeAndRespondFromWebhookPayload(
      deps,
      {
        platform: message.payload.platform,
        payload: message.payload.raw
      },
      `Webhook payload could not be normalized for ${message.payload.platform}.`
    );
  }

  if (message.type === 'AGENT_BRIDGE_ENVELOPE') {
    let replayed = false;
    try {
      replayed = await deps.isBridgeNonceReplayed(message.payload.envelope.nonce);
    } catch {
      replayed = deps.bridgeReplayFallback.registerAndCheckReplay(message.payload.envelope.nonce);
    }
    if (replayed) {
      return {
        ok: false,
        error: 'Bridge envelope rejected: replayed nonce.'
      };
    }

    const verification = await verifyWebhookBridgeEnvelope(
      message.payload.secret,
      message.payload.envelope
    );
    if (!verification.valid) {
      return {
        ok: false,
        error: verification.reason ?? 'Bridge envelope verification failed.'
      };
    }

    const runtimeWebhookMessage = toRuntimeWebhookMessage(message.payload.envelope);
    return executeAndRespondFromWebhookPayload(
      deps,
      {
        platform: runtimeWebhookMessage.payload.platform,
        payload: runtimeWebhookMessage.payload.raw
      },
      `Signed bridge payload could not be normalized for ${runtimeWebhookMessage.payload.platform}.`
    );
  }

  return { ok: false, error: 'Unsupported runtime message.' };
}
