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

    const result = await dispatchRuntimeMessage(
      { type: 'SYNC_SCHEDULER' },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        getBridgeSharedSecret: vi.fn(async () => null),
        getBridgeAllowedActorIds: vi.fn(async () => []),
        isBridgeNonceReplayed,
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(result).toEqual({ ok: true });
    expect(scheduleAlarms).toHaveBeenCalledOnce();
    expect(executeAgentWorkspaceCommand).not.toHaveBeenCalled();
  });

  it('rejects replayed bridge nonces', async () => {
    const secret = 'bridge-replay-secret';
    const scheduleAlarms = vi.fn(async () => {});
    const executeAgentWorkspaceCommand = vi.fn();
    const registerAndCheckReplay = vi.fn(() => true);
    const unsignedEnvelope = {
      version: 'v1' as const,
      platform: 'telegram' as const,
      timestamp: new Date().toISOString(),
      nonce: 'nonce-z',
      payload: {}
    };
    const signature = await signWebhookBridgeEnvelope(secret, unsignedEnvelope);

    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_BRIDGE_ENVELOPE',
        payload: {
          envelope: { ...unsignedEnvelope, signature }
        }
      },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        getBridgeSharedSecret: vi.fn(async () => secret),
        getBridgeAllowedActorIds: vi.fn(async () => []),
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
        message: { text: 'add note: signed bridge', from: { id: 42, first_name: 'Ada' } }
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
        payload: { envelope }
      },
      {
        scheduleAlarms,
        executeAgentWorkspaceCommand,
        getBridgeSharedSecret: vi.fn(async () => secret),
        getBridgeAllowedActorIds: vi.fn(async () => ['42']),
        isBridgeNonceReplayed: vi.fn(async () => false),
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(executeAgentWorkspaceCommand).toHaveBeenCalled();
    expect(scheduleAlarms).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: true, action: 'add-note' });
  });

  it('rejects a valid signed envelope when its actor is not allowlisted', async () => {
    const secret = 'bridge-actor-authorization-secret';
    const unsignedEnvelope = {
      version: 'v1' as const,
      platform: 'telegram' as const,
      timestamp: new Date().toISOString(),
      nonce: 'nonce-unauthorized-actor',
      payload: {
        message: { text: 'add note: should not run', from: { id: 99, first_name: 'Mallory' } }
      }
    };
    const signature = await signWebhookBridgeEnvelope(secret, unsignedEnvelope);
    const executeAgentWorkspaceCommand = vi.fn();

    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_BRIDGE_ENVELOPE',
        payload: { envelope: { ...unsignedEnvelope, signature } }
      },
      {
        scheduleAlarms: vi.fn(),
        executeAgentWorkspaceCommand,
        getBridgeSharedSecret: vi.fn(async () => secret),
        getBridgeAllowedActorIds: vi.fn(async () => ['42']),
        isBridgeNonceReplayed: vi.fn(async () => false),
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(result).toMatchObject({
      ok: false,
      error: 'Bridge actor is not authorized for telegram.'
    });
    expect(executeAgentWorkspaceCommand).not.toHaveBeenCalled();
  });

  it('rejects bridge envelopes when the receiver has no locally configured trust secret', async () => {
    const isBridgeNonceReplayed = vi.fn();
    const result = await dispatchRuntimeMessage(
      {
        type: 'AGENT_BRIDGE_ENVELOPE',
        payload: {
          envelope: {
            version: 'v1',
            platform: 'telegram',
            timestamp: new Date().toISOString(),
            nonce: 'untrusted-nonce',
            payload: {},
            signature: '0'.repeat(64)
          }
        }
      },
      {
        scheduleAlarms: vi.fn(),
        executeAgentWorkspaceCommand: vi.fn(),
        getBridgeSharedSecret: vi.fn(async () => null),
        getBridgeAllowedActorIds: vi.fn(async () => []),
        isBridgeNonceReplayed,
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(result).toEqual({
      ok: false,
      error: 'Bridge envelope rejected: receiver shared secret is not configured.'
    });
    expect(isBridgeNonceReplayed).not.toHaveBeenCalled();
  });

  it('rejects unknown message types', async () => {
    const result = await dispatchRuntimeMessage(
      { type: 'UNSUPPORTED' as never },
      {
        scheduleAlarms: vi.fn(),
        executeAgentWorkspaceCommand: vi.fn(),
        getBridgeSharedSecret: vi.fn(async () => null),
        getBridgeAllowedActorIds: vi.fn(async () => []),
        isBridgeNonceReplayed: vi.fn(),
        bridgeReplayFallback: { registerAndCheckReplay: vi.fn() }
      }
    );

    expect(result).toEqual({ ok: false, error: 'Unsupported runtime message.' });
  });
});
