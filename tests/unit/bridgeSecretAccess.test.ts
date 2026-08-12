import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearAgentBridgeReceiver,
  configureAgentBridgeReceiver,
  getAgentBridgeAllowedActorIds,
  getAgentBridgeAllowedActors,
  getAgentBridgeSharedSecret,
  hasAgentBridgeSharedSecret
} from '../../src/services/agent/bridgeSecretAccess';

describe('agent bridge receiver access', () => {
  beforeEach(async () => {
    await clearAgentBridgeReceiver();
  });

  afterEach(async () => {
    await clearAgentBridgeReceiver();
  });

  it('stores a trimmed receiver secret and normalized actor allowlists', async () => {
    await configureAgentBridgeReceiver({
      sharedSecret: '  receiver-shared-secret-at-least-24  ',
      telegramActorIds: [' 42 ', '42', '  77'],
      whatsappActorIds: ['15551234567', '']
    });

    await expect(getAgentBridgeSharedSecret()).resolves.toBe('receiver-shared-secret-at-least-24');
    await expect(hasAgentBridgeSharedSecret()).resolves.toBe(true);
    await expect(getAgentBridgeAllowedActors()).resolves.toEqual({
      telegram: ['42', '77'],
      whatsapp: ['15551234567']
    });
    await expect(getAgentBridgeAllowedActorIds('telegram')).resolves.toEqual(['42', '77']);
  });

  it('requires a strong secret and at least one explicitly allowed actor', async () => {
    await expect(
      configureAgentBridgeReceiver({
        sharedSecret: 'too-short',
        telegramActorIds: ['42'],
        whatsappActorIds: []
      })
    ).rejects.toThrow('at least 24 characters');

    await expect(
      configureAgentBridgeReceiver({
        sharedSecret: 'receiver-shared-secret-at-least-24',
        telegramActorIds: [],
        whatsappActorIds: []
      })
    ).rejects.toThrow('Allow at least one');
  });

  it('can update allowlists without exposing or re-entering the stored secret', async () => {
    await configureAgentBridgeReceiver({
      sharedSecret: 'receiver-shared-secret-at-least-24',
      telegramActorIds: ['42'],
      whatsappActorIds: []
    });
    await configureAgentBridgeReceiver({
      telegramActorIds: [],
      whatsappActorIds: ['15550001111']
    });

    await expect(getAgentBridgeAllowedActors()).resolves.toEqual({
      telegram: [],
      whatsapp: ['15550001111']
    });
  });
});
