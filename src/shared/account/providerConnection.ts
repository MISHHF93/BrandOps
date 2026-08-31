/**
 * Provider connection status management.
 * Gives a legitimate write path for the `'connected'` status that
 * 10+ consumers branch on but nothing previously could produce.
 */
import type { BrandOpsData, IdentityProviderId } from '../../types/domain';

/**
 * Mark a provider (google, github, linkedin) as connected.
 * Sets `connectionStatus = 'connected'` and records `lastConnectedAt`.
 * Returns a new workspace — does not mutate the input.
 */
export function markProviderConnected(
  data: BrandOpsData,
  provider: IdentityProviderId
): BrandOpsData {
  const hub = data.settings?.syncHub;
  if (!hub) return data;

  const now = new Date().toISOString();
  const current = hub[provider];
  if (!current) return data;

  return {
    ...data,
    settings: {
      ...data.settings,
      syncHub: {
        ...hub,
        [provider]: {
          ...current,
          connectionStatus: 'connected' as const,
          lastConnectedAt: now,
          lastError: undefined
        }
      }
    }
  };
}

/**
 * Mark a provider as disconnected.
 * Returns a new workspace — does not mutate the input.
 */
export function markProviderDisconnected(
  data: BrandOpsData,
  provider: IdentityProviderId
): BrandOpsData {
  const hub = data.settings?.syncHub;
  if (!hub) return data;

  const current = hub[provider];
  if (!current) return data;

  return {
    ...data,
    settings: {
      ...data.settings,
      syncHub: {
        ...hub,
        [provider]: {
          ...current,
          connectionStatus: 'disconnected' as const,
          lastError: undefined
        }
      }
    }
  };
}

/**
 * Mark a provider as errored.
 * Returns a new workspace — does not mutate the input.
 */
export function markProviderError(
  data: BrandOpsData,
  provider: IdentityProviderId,
  error: string
): BrandOpsData {
  const hub = data.settings?.syncHub;
  if (!hub) return data;

  const current = hub[provider];
  if (!current) return data;

  return {
    ...data,
    settings: {
      ...data.settings,
      syncHub: {
        ...hub,
        [provider]: {
          ...current,
          connectionStatus: 'error' as const,
          lastError: error
        }
      }
    }
  };
}
