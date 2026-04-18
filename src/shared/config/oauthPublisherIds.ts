import type { BrandOpsData } from '../../types/domain';

function envString(key: 'VITE_GOOGLE_CLIENT_ID' | 'VITE_GITHUB_CLIENT_ID' | 'VITE_LINKEDIN_CLIENT_ID'): string {
  const v = import.meta.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** Build-time OAuth client ID from the publisher’s Google Cloud / Chrome Web Store app (optional). */
export function getPublisherGoogleClientId(): string {
  return envString('VITE_GOOGLE_CLIENT_ID');
}

/** Build-time OAuth client ID from the publisher’s GitHub OAuth App (optional). */
export function getPublisherGitHubClientId(): string {
  return envString('VITE_GITHUB_CLIENT_ID');
}

/** Build-time OAuth client ID from the publisher’s LinkedIn app (optional). */
export function getPublisherLinkedInClientId(): string {
  return envString('VITE_LINKEDIN_CLIENT_ID');
}

/** Prefer publisher env, then value saved in Settings. */
export function getEffectiveGoogleClientId(data: BrandOpsData): string {
  const pub = getPublisherGoogleClientId();
  if (pub) return pub;
  return data.settings.syncHub.google.clientId.trim();
}

export function getEffectiveGitHubClientId(data: BrandOpsData): string {
  const pub = getPublisherGitHubClientId();
  if (pub) return pub;
  return data.settings.syncHub.github.clientId.trim();
}

export function getEffectiveLinkedInClientId(data: BrandOpsData): string {
  const pub = getPublisherLinkedInClientId();
  if (pub) return pub;
  return data.settings.syncHub.linkedin.clientId.trim();
}

/**
 * Snapshot of workspace data with effective client IDs applied to syncHub (for OAuth connect flows).
 * Does not persist; identity modules read `clientId` from this object.
 */
export function withEffectiveOAuthClientIds(data: BrandOpsData): BrandOpsData {
  return {
    ...data,
    settings: {
      ...data.settings,
      syncHub: {
        ...data.settings.syncHub,
        google: {
          ...data.settings.syncHub.google,
          clientId: getEffectiveGoogleClientId(data)
        },
        github: {
          ...data.settings.syncHub.github,
          clientId: getEffectiveGitHubClientId(data)
        },
        linkedin: {
          ...data.settings.syncHub.linkedin,
          clientId: getEffectiveLinkedInClientId(data)
        }
      }
    }
  };
}
