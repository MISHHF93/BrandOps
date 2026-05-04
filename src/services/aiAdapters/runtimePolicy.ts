import { AiProviderId } from './types';

export interface AiRuntimePolicy {
  externalProvidersEnabled: boolean;
  /** Allow HTTPS calls to operator-configured OpenAI-compatible NLP endpoints when `aiAdapterMode` is `external-opt-in`. */
  externalNlpHttpEnabled: boolean;
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
 * - bundled NLP SDK adapters remain off (`externalProvidersEnabled`); hosted HTTP bridge is separate (`externalNlpHttpEnabled`).
 */
export const aiRuntimePolicy: AiRuntimePolicy = {
  externalProvidersEnabled: false,
  externalNlpHttpEnabled: true,
  coreRequiresExternalProviders: false,
  allowUnsafeSiteAutomation: false,
  enabledProviders
};

export const isAiProviderEnabled = (providerId: AiProviderId): boolean =>
  aiRuntimePolicy.enabledProviders.includes(providerId);
