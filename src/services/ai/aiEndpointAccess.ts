import { normalizeOpenAiCompatibleEndpointOrigin } from './aiSecretsAccess';

export interface AiEndpointAccessResult {
  granted: boolean;
  requestedOrigins: string[];
}

const hasChromePermissionsApi = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.permissions);

/** Converts a configured endpoint into the narrowest Chrome host-permission match pattern. */
export function toChromeOriginPattern(endpointBaseUrl: string): string {
  const origin = normalizeOpenAiCompatibleEndpointOrigin(endpointBaseUrl);
  const parsed = new URL(origin);
  return `${parsed.protocol}//${parsed.hostname}/*`;
}

/**
 * Web/Capacitor rely on provider CORS. MV3 asks for exact optional host origins from a user click.
 * Required OpenAI/Azure origins are already granted and therefore pass `contains` without prompting.
 */
export async function ensureAiEndpointAccess(
  endpointBaseUrls: string[]
): Promise<AiEndpointAccessResult> {
  const requestedOrigins = Array.from(
    new Set(
      endpointBaseUrls
        .map((url) => url.trim())
        .filter(Boolean)
        .map(toChromeOriginPattern)
    )
  );
  if (requestedOrigins.length === 0 || !hasChromePermissionsApi()) {
    return { granted: true, requestedOrigins };
  }

  const permissions = { origins: requestedOrigins };
  if (await chrome.permissions.contains(permissions)) {
    return { granted: true, requestedOrigins };
  }
  const granted = await chrome.permissions.request(permissions);
  return { granted, requestedOrigins };
}
