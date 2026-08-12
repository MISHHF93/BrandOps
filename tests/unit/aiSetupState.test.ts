import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeAiSetupState } from '../../src/services/ai/aiSetupState';
import { defaultAiBridgeSettings } from '../../src/config/workspaceDefaults';
import type { AppSettings } from '../../src/types/domain';

vi.mock('../../src/services/ai/aiSecretsAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/ai/aiSecretsAccess')>();
  return { ...actual, hasOpenAiCompatibleApiKey: vi.fn() };
});

import { hasOpenAiCompatibleApiKey } from '../../src/services/ai/aiSecretsAccess';

const keyMock = vi.mocked(hasOpenAiCompatibleApiKey);

function settingsWith(overrides: Partial<AppSettings>): AppSettings {
  return {
    ...({
      aiAdapterMode: 'disabled',
      aiBridge: defaultAiBridgeSettings
    } as AppSettings),
    ...overrides
  };
}

describe('describeAiSetupState', () => {
  beforeEach(() => {
    keyMock.mockReset();
  });

  it('flags adapter_disabled with actionable guidance when the adapter is disabled', async () => {
    const state = await describeAiSetupState(settingsWith({}));
    expect(state.needsSetup).toBe(true);
    expect(state.reason).toBe('adapter_disabled');
    expect(state.guidance).toContain('AI bridge');
  });

  it('flags adapter_disabled for local-only mode without consulting the key', async () => {
    const state = await describeAiSetupState(settingsWith({ aiAdapterMode: 'local-only' }));
    expect(state.needsSetup).toBe(true);
    expect(state.reason).toBe('adapter_disabled');
    expect(state.guidance).toContain('Hosted API');
    expect(keyMock).not.toHaveBeenCalled();
  });

  it('flags missing_endpoint when no inference base URL is set', async () => {
    const state = await describeAiSetupState(settingsWith({ aiAdapterMode: 'external-opt-in' }));
    expect(state.needsSetup).toBe(true);
    expect(state.reason).toBe('missing_endpoint');
    expect(state.guidance).toContain('endpoint');
    expect(keyMock).not.toHaveBeenCalled();
  });

  it('flags missing_api_key when the endpoint is set but no key is stored', async () => {
    keyMock.mockResolvedValue(false);
    const state = await describeAiSetupState(
      settingsWith({
        aiAdapterMode: 'external-opt-in',
        aiBridge: { ...defaultAiBridgeSettings, inferenceBaseUrl: 'https://api.openai.com/v1' }
      })
    );
    expect(state.needsSetup).toBe(true);
    expect(state.reason).toBe('missing_api_key');
    expect(state.guidance).toContain('API key');
  });

  it('reports ready when mode, endpoint, and key are all present', async () => {
    keyMock.mockResolvedValue(true);
    const state = await describeAiSetupState(
      settingsWith({
        aiAdapterMode: 'external-opt-in',
        aiBridge: { ...defaultAiBridgeSettings, inferenceBaseUrl: 'https://api.openai.com/v1' }
      })
    );
    expect(state.needsSetup).toBe(false);
  });
});
