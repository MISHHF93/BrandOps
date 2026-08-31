import type { AppSettings } from '../../types/domain';
import { describeAiSecretsStorageHint, hasOpenAiCompatibleApiKey } from './aiSecretsAccess';

export type AiSetupNeed = 'adapter_disabled' | 'missing_endpoint' | 'missing_api_key';

export interface AiSetupState {
  needsSetup: boolean;
  reason?: AiSetupNeed;
  guidance?: string;
}

/** Mirrors `resolveChatPolicy` so Ask can fail fast with actionable setup guidance instead of a bare `adapter_disabled` error. */
export async function describeAiSetupState(settings: AppSettings): Promise<AiSetupState> {
  if (settings.aiAdapterMode === 'disabled') {
    return {
      needsSetup: true,
      reason: 'adapter_disabled',
      guidance:
        'Hosted AI is not enabled. Open Settings → Hosted AI, choose Hosted API, set an OpenAI-compatible endpoint and model, then save an API key on this device.'
    };
  }
  if (settings.aiAdapterMode === 'local-only') {
    return {
      needsSetup: true,
      reason: 'adapter_disabled',
      guidance:
        'Local-only mode is active, so Ask My Twin answers run without hosted AI. Switch to Hosted API in Settings → Hosted AI to enable hosted answers.'
    };
  }
  if (!settings.aiBridge.inferenceBaseUrl.trim()) {
    return {
      needsSetup: true,
      reason: 'missing_endpoint',
      guidance:
        'No OpenAI-compatible endpoint is configured. In Settings → Hosted AI, set an endpoint root (for example https://api.openai.com/v1) and a chat model.'
    };
  }
  const hasKey = await hasOpenAiCompatibleApiKey();
  if (!hasKey) {
    return {
      needsSetup: true,
      reason: 'missing_api_key',
      guidance: `No hosted API key is stored on this device (${describeAiSecretsStorageHint()}). Add one in Settings → Hosted AI to enable hosted answers.`
    };
  }
  return { needsSetup: false };
}
