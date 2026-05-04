import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultAppSettings } from '../../src/config/workspaceDefaults';
import type { AppSettings } from '../../src/types/domain';

vi.mock('../../src/services/ai/aiSecretsAccess', () => ({
  BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY: 'brandops_ai_openai_compat_key',
  getOpenAiCompatibleApiKey: vi.fn()
}));

import { getOpenAiCompatibleApiKey } from '../../src/services/ai/aiSecretsAccess';
import {
  joinOpenAiCompatibleUrl,
  runChatCompletion,
  runEmbeddings
} from '../../src/services/ai/nlpInferenceGateway';

function gatewaySettings(patch: Partial<AppSettings>): AppSettings {
  const s = structuredClone(defaultAppSettings);
  Object.assign(s, patch);
  if (patch.aiBridge) Object.assign(s.aiBridge, patch.aiBridge);
  return s;
}

describe('joinOpenAiCompatibleUrl', () => {
  it('normalizes slashes between base and segment', () => {
    expect(joinOpenAiCompatibleUrl('https://api.example.com/v1/', '/chat/completions')).toBe(
      'https://api.example.com/v1/chat/completions'
    );
    expect(joinOpenAiCompatibleUrl('https://api.example.com/v1', 'chat/completions')).toBe(
      'https://api.example.com/v1/chat/completions'
    );
  });
});

describe('runChatCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getOpenAiCompatibleApiKey).mockReset();
  });

  it('returns adapter_disabled when aiAdapterMode is disabled', async () => {
    const r = await runChatCompletion(gatewaySettings({}), {
      messages: [{ role: 'user', content: 'hi' }]
    });
    expect(r).toMatchObject({ ok: false, code: 'adapter_disabled' });
  });

  it('returns missing_endpoint when inference URL is empty', async () => {
    const r = await runChatCompletion(gatewaySettings({ aiAdapterMode: 'external-opt-in' }), {
      messages: [{ role: 'user', content: 'hi' }]
    });
    expect(r).toMatchObject({ ok: false, code: 'missing_endpoint' });
  });

  it('returns missing_api_key when extension secret is unset', async () => {
    vi.mocked(getOpenAiCompatibleApiKey).mockResolvedValue(null);
    const r = await runChatCompletion(
      gatewaySettings({
        aiAdapterMode: 'external-opt-in',
        aiBridge: { inferenceBaseUrl: 'https://api.openai.com/v1' }
      }),
      { messages: [{ role: 'user', content: 'hi' }] }
    );
    expect(r).toMatchObject({ ok: false, code: 'missing_api_key' });
  });

  it('returns trimmed assistant text on HTTP success', async () => {
    vi.mocked(getOpenAiCompatibleApiKey).mockResolvedValue('sk-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: ' Hello ' } }] })
      })
    );

    const r = await runChatCompletion(
      gatewaySettings({
        aiAdapterMode: 'external-opt-in',
        aiBridge: { inferenceBaseUrl: 'https://api.openai.com/v1', chatModelId: 'gpt-4o-mini' }
      }),
      { messages: [{ role: 'user', content: 'hi' }] }
    );

    expect(r).toEqual({
      ok: true,
      text: 'Hello',
      raw: { choices: [{ message: { content: ' Hello ' } }] }
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test'
        })
      })
    );
  });

  it('includes response_format json_object when requested', async () => {
    vi.mocked(getOpenAiCompatibleApiKey).mockResolvedValue('sk-test');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{}' } }] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await runChatCompletion(
      gatewaySettings({
        aiAdapterMode: 'external-opt-in',
        aiBridge: { inferenceBaseUrl: 'https://api.openai.com/v1' }
      }),
      {
        messages: [{ role: 'user', content: 'hi' }],
        responseFormatJsonObject: true
      }
    );

    const init = fetchMock.mock.calls[0][1] as { body?: string };
    const body = JSON.parse(init.body ?? '{}');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
});

describe('runEmbeddings', () => {
  beforeEach(() => {
    vi.mocked(getOpenAiCompatibleApiKey).mockResolvedValue('sk-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }]
        })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getOpenAiCompatibleApiKey).mockReset();
  });

  it('posts to embeddings under inference URL when embedding URL unset', async () => {
    const r = await runEmbeddings(
      gatewaySettings({
        aiAdapterMode: 'external-opt-in',
        aiBridge: {
          inferenceBaseUrl: 'https://api.example.com/v1',
          embeddingBaseUrl: '',
          embeddingModelId: 'text-embedding-3-small'
        }
      }),
      { texts: ['a', 'b'] }
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.embeddings).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/embeddings',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('uses dedicated embedding base when set', async () => {
    await runEmbeddings(
      gatewaySettings({
        aiAdapterMode: 'external-opt-in',
        aiBridge: {
          inferenceBaseUrl: 'https://chat.example.com/v1',
          embeddingBaseUrl: 'https://embed.example.com/v1',
          embeddingModelId: 'm'
        }
      }),
      { texts: ['x', 'y'] }
    );

    expect(fetch).toHaveBeenCalledWith(
      'https://embed.example.com/v1/embeddings',
      expect.any(Object)
    );
  });
});
