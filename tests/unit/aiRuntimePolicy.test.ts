import { describe, expect, it } from 'vitest';
import { aiRuntimePolicy, isAiProviderEnabled } from '../../src/services/aiAdapters/runtimePolicy';

describe('aiRuntimePolicy', () => {
  it('keeps core product independent from external AI providers', () => {
    expect(aiRuntimePolicy.coreRequiresExternalProviders).toBe(false);
    expect(aiRuntimePolicy.externalProvidersEnabled).toBe(false);
    expect(aiRuntimePolicy.enabledProviders).toEqual(['local']);
  });

  it('enables only local provider by default', () => {
    expect(isAiProviderEnabled('local')).toBe(true);
    expect(isAiProviderEnabled('openai')).toBe(false);
    expect(isAiProviderEnabled('anthropic')).toBe(false);
    expect(isAiProviderEnabled('custom')).toBe(false);
  });

  it('keeps unsafe automation disabled', () => {
    expect(aiRuntimePolicy.allowUnsafeSiteAutomation).toBe(false);
  });
});
