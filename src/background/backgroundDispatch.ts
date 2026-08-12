import type {
  AgentWorkspaceCommand,
  AgentWorkspaceResult
} from '../services/agent/agentWorkspaceEngine';
import { normalizeChannelWebhookPayload } from '../services/agent/channelPayloadAdapters';
import type { BridgeReplayGuard } from '../services/agent/bridgeReplayGuard';
import { isBridgeNonceReplayed } from '../services/agent/bridgeNonceStore';
import type { RuntimeMessage } from '../services/messaging/messages';
import { verifyWebhookBridgeEnvelope } from '../services/agent/webhookBridge';

export type BackgroundDispatchDeps = {
  scheduleAlarms: () => Promise<void>;
  executeAgentWorkspaceCommand: (command: AgentWorkspaceCommand) => Promise<AgentWorkspaceResult>;
  getBridgeSharedSecret: () => Promise<string | null>;
  getBridgeAllowedActorIds: (platform: 'telegram' | 'whatsapp') => Promise<string[]>;
  isBridgeNonceReplayed: typeof isBridgeNonceReplayed;
  bridgeReplayFallback: Pick<BridgeReplayGuard, 'registerAndCheckReplay'>;
};

async function executeAndRespondFromWebhookPayload(
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

  const allowedActorIds = await deps.getBridgeAllowedActorIds(normalized.platform);
  if (!normalized.actorId || !allowedActorIds.includes(normalized.actorId)) {
    return {
      ok: false,
      error: `Bridge actor is not authorized for ${normalized.platform}.`,
      normalized
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

  if (message.type === 'AGENT_BRIDGE_ENVELOPE') {
    const trustedSecret = await deps.getBridgeSharedSecret();
    if (!trustedSecret) {
      return {
        ok: false,
        error: 'Bridge envelope rejected: receiver shared secret is not configured.'
      };
    }

    const verification = await verifyWebhookBridgeEnvelope(trustedSecret, message.payload.envelope);
    if (!verification.valid) {
      return {
        ok: false,
        error: verification.reason ?? 'Bridge envelope verification failed.'
      };
    }

    // Register a nonce only after authentication so invalid messages cannot poison the replay cache.
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

    return executeAndRespondFromWebhookPayload(
      deps,
      {
        platform: message.payload.envelope.platform,
        payload: message.payload.envelope.payload
      },
      `Signed bridge payload could not be normalized for ${message.payload.envelope.platform}.`
    );
  }

  return { ok: false, error: 'Unsupported runtime message.' };
}
