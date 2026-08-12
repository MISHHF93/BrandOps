import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStorage = new Map<string, unknown>();

vi.mock('../../src/shared/storage/browserStorage', () => ({
  browserLocalStorage: {
    get: vi.fn(async (key: string) => memoryStorage.get(key)),
    set: vi.fn(async (key: string, value: unknown) => {
      memoryStorage.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      memoryStorage.delete(key);
    })
  }
}));

import {
  BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY,
  clearOpenAiCompatibleApiKey,
  configureOpenAiCompatibleCredentials,
  getOpenAiCompatibleApiKey,
  hasOpenAiCompatibleApiKey,
  normalizeOpenAiCompatibleEndpointOrigin
} from '../../src/services/ai/aiSecretsAccess';

describe('AI secret access', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('binds a configured key to explicitly approved endpoint origins', async () => {
    await configureOpenAiCompatibleCredentials({
      endpointBaseUrls: ['https://api.example.com/v1', 'https://embeddings.example.com/v1/'],
      apiKey: 'sk-device-local'
    });

    expect(await hasOpenAiCompatibleApiKey()).toBe(true);
    expect(await getOpenAiCompatibleApiKey('https://api.example.com/v1/chat/completions')).toBe(
      'sk-device-local'
    );
    expect(await getOpenAiCompatibleApiKey('https://embeddings.example.com/v1')).toBe(
      'sk-device-local'
    );
    expect(await getOpenAiCompatibleApiKey('https://attacker.example/v1')).toBeNull();
  });

  it('re-binds an existing key only through an explicit configure call', async () => {
    await configureOpenAiCompatibleCredentials({
      endpointBaseUrls: ['https://first.example/v1'],
      apiKey: 'sk-existing'
    });
    await configureOpenAiCompatibleCredentials({
      endpointBaseUrls: ['https://second.example/v1']
    });

    expect(await getOpenAiCompatibleApiKey('https://first.example/v1')).toBeNull();
    expect(await getOpenAiCompatibleApiKey('https://second.example/v1')).toBe('sk-existing');
  });

  it('requires HTTPS except for loopback development endpoints', () => {
    expect(normalizeOpenAiCompatibleEndpointOrigin('http://127.0.0.1:11434/v1')).toBe(
      'http://127.0.0.1:11434'
    );
    expect(() => normalizeOpenAiCompatibleEndpointOrigin('http://api.example.com/v1')).toThrow(
      /HTTPS/
    );
    expect(() => normalizeOpenAiCompatibleEndpointOrigin('not a url')).toThrow(
      /valid absolute URL/
    );
  });

  it('only honors a legacy string key for packaged OpenAI or Azure origins', async () => {
    memoryStorage.set(BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY, 'sk-legacy');

    expect(await getOpenAiCompatibleApiKey('https://api.openai.com/v1')).toBe('sk-legacy');
    expect(
      await getOpenAiCompatibleApiKey('https://team.openai.azure.com/openai/deployments/x')
    ).toBe('sk-legacy');
    expect(await getOpenAiCompatibleApiKey('https://custom.example/v1')).toBeNull();
  });

  it('clears the credential without touching workspace JSON', async () => {
    await configureOpenAiCompatibleCredentials({
      endpointBaseUrls: ['https://api.openai.com/v1'],
      apiKey: 'sk-delete-me'
    });
    await clearOpenAiCompatibleApiKey();

    expect(await hasOpenAiCompatibleApiKey()).toBe(false);
  });
});
