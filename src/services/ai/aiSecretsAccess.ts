import { getBrandOpsHostKind } from '../../shared/platform/hostEnvironment';
import { browserLocalStorage } from '../../shared/storage/browserStorage';

/**
 * Stores secrets OUTSIDE workspace JSON (BrandOpsData).
 * Uses the same {@link browserLocalStorage} adapter as workspace data:
 * Chrome MV3 → `chrome.storage.local`; Capacitor/Web → scoped `localStorage`; tests → memory.
 * This is device-local separation, not encrypted native keychain storage.
 */
export const BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY = 'brandops_ai_openai_compat_key';

interface OpenAiCompatibleCredentialRecordV1 {
  version: 1;
  apiKey: string;
  /** Explicitly approved origins. Workspace imports cannot silently redirect this credential. */
  allowedOrigins: string[];
  updatedAt: string;
}

const isCredentialRecord = (value: unknown): value is OpenAiCompatibleCredentialRecordV1 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<OpenAiCompatibleCredentialRecordV1>;
  return (
    candidate.version === 1 &&
    typeof candidate.apiKey === 'string' &&
    Array.isArray(candidate.allowedOrigins)
  );
};

const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

/** HTTPS is required except for an explicitly configured loopback development endpoint. */
export function normalizeOpenAiCompatibleEndpointOrigin(endpointBaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(endpointBaseUrl.trim());
  } catch {
    throw new Error('Hosted AI endpoint must be a valid absolute URL.');
  }
  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname))
  ) {
    throw new Error(
      'Hosted AI endpoint must use HTTPS (HTTP is allowed only for loopback development).'
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error('Hosted AI endpoint must not contain URL credentials.');
  }
  return parsed.origin;
}

const uniqueApprovedOrigins = (endpointBaseUrls: string[]): string[] =>
  Array.from(
    new Set(
      endpointBaseUrls
        .map((endpoint) => endpoint.trim())
        .filter(Boolean)
        .map(normalizeOpenAiCompatibleEndpointOrigin)
    )
  );

const builtInLegacyOrigin = (origin: string): boolean => {
  const hostname = new URL(origin).hostname;
  return hostname === 'api.openai.com' || hostname.endsWith('.openai.azure.com');
};

/** User-facing hint for where to configure the hosted API key (Play Store vs Chrome Web Store). */
export function describeAiSecretsStorageHint(): string {
  switch (getBrandOpsHostKind()) {
    case 'chrome-extension':
      return `chrome.storage.local["${BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY}"] (or BrandOps Settings)`;
    case 'capacitor-android':
      return 'BrandOps Settings on device (device-local WebView storage; not native keychain)';
    case 'capacitor-ios':
      return 'BrandOps Settings on device (device-local WebView storage; not native keychain)';
    default:
      return `browser storage key "${BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY}" (BrandOps Settings)`;
  }
}

/**
 * Bearer token for OpenAI-compatible `/v1/chat/completions` + `/v1/embeddings`.
 * When an endpoint is supplied, the origin must have been approved during an explicit Settings save.
 */
export async function getOpenAiCompatibleApiKey(endpointBaseUrl?: string): Promise<string | null> {
  try {
    const value = await browserLocalStorage.get<unknown>(BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY);
    const requestedOrigin = endpointBaseUrl
      ? normalizeOpenAiCompatibleEndpointOrigin(endpointBaseUrl)
      : null;

    // Compatibility for keys manually stored by older builds: only the two packaged trusted hosts.
    if (typeof value === 'string') {
      const apiKey = value.trim();
      if (!apiKey) return null;
      if (requestedOrigin && !builtInLegacyOrigin(requestedOrigin)) return null;
      return apiKey;
    }
    if (!isCredentialRecord(value)) return null;
    const apiKey = value.apiKey.trim();
    if (!apiKey) return null;
    if (requestedOrigin && !value.allowedOrigins.includes(requestedOrigin)) return null;
    return apiKey;
  } catch {
    return null;
  }
}

/** True without revealing the stored credential to UI code. */
export async function hasOpenAiCompatibleApiKey(): Promise<boolean> {
  try {
    const value = await browserLocalStorage.get<unknown>(BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY);
    return (
      (typeof value === 'string' && value.trim().length > 0) ||
      (isCredentialRecord(value) && value.apiKey.trim().length > 0)
    );
  } catch {
    return false;
  }
}

/**
 * Saves or re-binds the device-local key to origins the operator explicitly approved in Settings.
 * Omitting `apiKey` reuses the existing key without returning it to the UI.
 */
export async function configureOpenAiCompatibleCredentials(input: {
  endpointBaseUrls: string[];
  apiKey?: string;
}): Promise<void> {
  const allowedOrigins = uniqueApprovedOrigins(input.endpointBaseUrls);
  if (allowedOrigins.length === 0) throw new Error('Configure at least one Hosted AI endpoint.');

  const supplied = input.apiKey?.trim() ?? '';
  const existing = supplied ? null : await getOpenAiCompatibleApiKey();
  const apiKey = supplied || existing;
  if (!apiKey) throw new Error('Enter an API key before enabling Hosted AI.');

  const record: OpenAiCompatibleCredentialRecordV1 = {
    version: 1,
    apiKey,
    allowedOrigins,
    updatedAt: new Date().toISOString()
  };
  await browserLocalStorage.set(BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY, record);
}

export async function clearOpenAiCompatibleApiKey(): Promise<void> {
  await browserLocalStorage.remove(BRANDOPS_AI_OPENAI_COMPAT_STORAGE_KEY);
}
