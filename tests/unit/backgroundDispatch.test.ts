import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { dispatchRuntimeMessage } from '../../src/background/backgroundDispatch';
import type { AgentWorkspaceResult } from '../../src/services/agent/agentWorkspaceEngine';
import { signWebhookBridgeEnvelope } from '../../src/services/agent/webhookBridge';

const agentResult = (partial?: Partial<AgentWorkspaceResult>): AgentWorkspaceResult => ({
  ok: true,
  action: 'unsupported',
  summary: 'stub',
  ...partial
});

describe('dispatchRuntimeMessage', () => {
  beforeAll(() => {
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: webcrypto,
        configurable: true
      });
    }
  });

  it('handles SYNC_SCHEDULER', async () => {
    const scheduleAlarms = vi.fn(async () => {});
    const executeAgentWorkspaceCommand = vi.fn();
    const isBridgeNonceReplayed = vi.fn();

    const result = await dispatchRuntimeMessage({ type: 'SYNC_SCHEDULER' }, {
      scheduleAlarms,
      executeAgentWorkspaceCommand,
      isBridgeNonceReplayed,
      bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
    });

    expect(result).toEqual({ ok: true });
    expect(scheduleAlarms).toHaveBeenCalledOnce();
    expect(executeAgentWorkspaceCommand).not.toHaveBeenCalled();
  });

  it('runs AGENT_CHANNEL_EVENT then reschedules alarms', async () => {
    const scheduleAlarms = vi.fn(async () => {});
    const executeAgentWorkspaceCommand = vi.fn(async () => agentResult({ action: 'add-note' }));

    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_CHANNEL_EVENT',
        payload: {
          platform: 'telegram',
          text: 'add note: hello',
          actorId: 'u1',
          actorName: 'Ada'
        }
      },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        isBridgeNonceReplayed: vi.fn(),
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(executeAgentWorkspaceCommand).toHaveBeenCalledWith({
      text: 'add note: hello',
      actorName: 'Ada',
      source: 'telegram'
    });
    expect(scheduleAlarms).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: true, action: 'add-note' });
  });

  it('returns normalization error for invalid AGENT_CHANNEL_WEBHOOK payloads', async () => {
    const scheduleAlarms = vi.fn(async () => {});
    const executeAgentWorkspaceCommand = vi.fn();

    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_CHANNEL_WEBHOOK',
        payload: { platform: 'telegram', raw: { update_id: 1 } }
      },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        isBridgeNonceReplayed: vi.fn(),
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(result).toEqual({
      ok: false,
      error: 'Webhook payload could not be normalized for telegram.'
    });
    expect(executeAgentWorkspaceCommand).not.toHaveBeenCalled();
    expect(scheduleAlarms).not.toHaveBeenCalled();
  });

  it('accepts valid webhook payloads and echoes agent outcome', async () => {
    const scheduleAlarms = vi.fn(async () => {});
    const executeAgentWorkspaceCommand = vi.fn(async () =>
      agentResult({ ok: false, action: 'unsupported', summary: 'nope' })
    );

    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_CHANNEL_WEBHOOK',
        payload: {
          platform: 'telegram',
          raw: {
            message: { text: 'pipeline health', from: { id: 9, first_name: 'Bo' } }
          }
        }
      },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        isBridgeNonceReplayed: vi.fn(),
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(scheduleAlarms).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      ok: false,
      action: 'unsupported',
      summary: 'nope'
    });
    expect(result).toMatchObject({
      normalized: expect.objectContaining({
        platform: 'telegram',
        text: 'pipeline health'
      })
    });
  });

  it('rejects replayed bridge nonces', async () => {
    const scheduleAlarms = vi.fn(async () => {});
    const executeAgentWorkspaceCommand = vi.fn();
    const registerAndCheckReplay = vi.fn(() => true);

    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_BRIDGE_ENVELOPE',
        payload: {
          secret: 'ignored',
          envelope: {
            version: 'v1',
            platform: 'telegram',
            timestamp: '2026-05-02T12:00:00.000Z',
            nonce: 'nonce-z',
            payload: {},
            signature: 'x'
          }
        }
      },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        isBridgeNonceReplayed: vi.fn(async () => {
          throw new Error('storage unavailable');
        }),
        bridgeReplayFallback: { registerAndCheckReplay }
      }
    );

    expect(registerAndCheckReplay).toHaveBeenCalledWith('nonce-z');
    expect(result).toEqual({
      ok: false,
      error: 'Bridge envelope rejected: replayed nonce.'
    });
    expect(executeAgentWorkspaceCommand).not.toHaveBeenCalled();
  });

  it('verifies signed bridge envelopes before executing agent command', async () => {
    const secret = 'bridge-secret';
    const now = new Date();
    const unsignedEnvelope = {
      version: 'v1' as const,
      platform: 'telegram' as const,
      timestamp: now.toISOString(),
      nonce: 'nonce-bridge-test',
      payload: {
        message: { text: 'add note: signed bridge' }
      }
    };
    const signature = await signWebhookBridgeEnvelope(secret, unsignedEnvelope);
    const envelope = { ...unsignedEnvelope, signature };

    const scheduleAlarms = vi.fn(async () => {});
    const executeAgentWorkspaceCommand = vi.fn(async () =>
      agentResult({ action: 'add-note', summary: 'saved' })
    );

    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_BRIDGE_ENVELOPE',
        payload: { secret, envelope }
      },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        isBridgeNonceReplayed: vi.fn(async () => false),
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(executeAgentWorkspaceCommand).toHaveBeenCalled();
    expect(scheduleAlarms).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: true, action: 'add-note' });
  });

  it('rejects unknown message types', async () => {
    const result = await dispatchRuntimeMessage({ type: 'UNSUPPORTED' as never }, {
      scheduleAlarms: vi.fn(),
      executeAgentWorkspaceCommand: vi.fn(),
      isBridgeNonceReplayed: vi.fn(),
      bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
    });

    expect(result).toEqual({ ok: false, error: 'Unsupported runtime message.' });
  });
});
