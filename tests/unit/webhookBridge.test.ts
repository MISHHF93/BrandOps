import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  signWebhookBridgeEnvelope,
  toRuntimeWebhookMessage,
  verifyWebhookBridgeEnvelope
} from '../../src/services/agent/webhookBridge';

describe('webhookBridge', () => {
  beforeAll(() => {
    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: webcrypto,
        configurable: true
      });
    }
  });

  it('signs and verifies a valid envelope', async () => {
    const unsignedEnvelope = {
      version: 'v1' as const,
      platform: 'telegram' as const,
      timestamp: '2026-04-22T09:00:00.000Z',
      nonce: 'nonce-123',
      payload: {
        message: { text: 'add note: check campaign pipeline' }
      }
    };
    const secret = 'super-secret-bridge-key';
    const signature = await signWebhookBridgeEnvelope(secret, unsignedEnvelope);
    const envelope = { ...unsignedEnvelope, signature };

    const verification = await verifyWebhookBridgeEnvelope(secret, envelope, {
      now: new Date('2026-04-22T09:03:00.000Z')
    });
    expect(verification).toEqual({ valid: true });
  });

  it('rejects envelope with bad signature', async () => {
    const envelope = {
      version: 'v1' as const,
      platform: 'whatsapp' as const,
      timestamp: '2026-04-22T09:00:00.000Z',
      nonce: 'nonce-456',
      payload: {
        entry: []
      },
      signature: 'abcd'
    };

    const verification = await verifyWebhookBridgeEnvelope('secret', envelope, {
      now: new Date('2026-04-22T09:02:00.000Z')
    });
    expect(verification.valid).toBe(false);
  });

  it('rejects stale envelope timestamps', async () => {
    const unsignedEnvelope = {
      version: 'v1' as const,
      platform: 'telegram' as const,
      timestamp: '2026-04-22T09:00:00.000Z',
      nonce: 'nonce-789',
      payload: {
        message: { text: 'reschedule posts to friday 11am' }
      }
    };
    const secret = 'bridge-secret';
    const signature = await signWebhookBridgeEnvelope(secret, unsignedEnvelope);
    const envelope = { ...unsignedEnvelope, signature };

    const verification = await verifyWebhookBridgeEnvelope(secret, envelope, {
      now: new Date('2026-04-22T09:10:30.000Z'),
      maxClockSkewMs: 5 * 60 * 1000
    });
    expect(verification.valid).toBe(false);
  });

  it('maps envelope to runtime webhook message', () => {
    const envelope = {
      version: 'v1' as const,
      platform: 'telegram' as const,
      timestamp: '2026-04-22T09:00:00.000Z',
      nonce: 'nonce-000',
      payload: { message: { text: 'add source: notion' } },
      signature: 'ffeedd'
    };

    const runtimeMessage = toRuntimeWebhookMessage(envelope);
    expect(runtimeMessage).toEqual({
      type: 'AGENT_CHANNEL_WEBHOOK',
      payload: {
        platform: 'telegram',
        raw: { message: { text: 'add source: notion' } }
      }
    });
  });
});
