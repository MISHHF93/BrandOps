import { getBrandOpsHostKind } from '../../shared/platform/hostEnvironment';
import { browserLocalStorage } from '../../shared/storage/browserStorage';

/**
 * Stores secrets OUTSIDE workspace JSON (BrandOpsData).
 * Uses the same {@link browserLocalStorage} adapter as workspace data:
 * Chrome MV3 → `chrome.storage.local`; Capacitor WebView → scoped `localStorage`; tests → memory.
 */
export const BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY = 'brandops_ai_openai_compat_key';

/** User-facing hint for where to configure the hosted API key (Play Store vs Chrome Web Store). */
export function describeAiSecretsStorageHint(): string {
  switch (getBrandOpsHostKind()) {
    case 'chrome-extension':
      return `chrome.storage.local["${BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY}"] (or BrandOps Settings)`;
    case 'capacitor-android':
      return 'BrandOps Settings on device (secure WebView storage namespace)';
    case 'capacitor-ios':
      return 'BrandOps Settings on device (secure WebView storage namespace)';
    default:
      return `browser storage key "${BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY}" (BrandOps Settings)`;
  }
}

/** Bearer token for OpenAI-compatible `/v1/chat/completions` + `/v1/embeddings`. */
export async function getOpenAiCompatibleApiKey(): Promise<string | null> {
  try {
    const v = await browserLocalStorage.get<string>(BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY);
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}
