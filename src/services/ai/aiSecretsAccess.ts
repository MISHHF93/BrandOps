/**
 * Stores secrets OUTSIDE workspace JSON (BrandOpsData) — MV3 `chrome.storage.local`.
 * Keys are never synced from workspace export/import by default.
 */
export const BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY = 'brandops_ai_openai_compat_key';

/** Bearer token for OpenAI-compatible `/v1/chat/completions` + `/v1/embeddings`. */
export async function getOpenAiCompatibleApiKey(): Promise<string | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local?.get) return null;
    return await new Promise((resolve) => {
      chrome.storage.local.get([BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY], (items) => {
        if (chrome.runtime?.lastError) {
          resolve(null);
          return;
        }
        const v = items[BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY];
        resolve(typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);
      });
    });
  } catch {
    return null;
  }
}
