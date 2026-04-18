import { AiProviderId } from './types';

export interface AiRuntimePolicy {
  externalProvidersEnabled: boolean;
  coreRequiresExternalProviders: boolean;
  allowUnsafeSiteAutomation: boolean;
  enabledProviders: readonly AiProviderId[];
}

const enabledProviders = ['local'] as const satisfies readonly AiProviderId[];

/**
 * BrandOps policy defaults:
 * - core workflows do not require external AI APIs
 * - local provider is the only enabled provider in MVP
 * - unsafe auto-click automation is explicitly disabled
 */
export const aiRuntimePolicy: AiRuntimePolicy = {
  externalProvidersEnabled: false,
  coreRequiresExternalProviders: false,
  allowUnsafeSiteAutomation: false,
  enabledProviders
};

export const isAiProviderEnabled = (providerId: AiProviderId): boolean =>
  aiRuntimePolicy.enabledProviders.includes(providerId);

