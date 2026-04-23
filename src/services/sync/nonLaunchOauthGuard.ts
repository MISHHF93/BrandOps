/**
 * Legacy OAuth sync connectors are not part of the launch auth/membership flow.
 * They are quarantined behind an explicit flag for controlled testing only.
 */
const LEGACY_OAUTH_FLAG = 'VITE_ENABLE_LEGACY_OAUTH_SYNC';

const readFlag = (): boolean => {
  const env = typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, unknown>) : {};
  return env[LEGACY_OAUTH_FLAG] === '1' || env[LEGACY_OAUTH_FLAG] === true;
};

export const isLegacyOAuthSyncEnabled = (): boolean => readFlag();

export function assertLegacyOAuthSyncEnabled(moduleName: string): void {
  if (isLegacyOAuthSyncEnabled()) return;
  throw new Error(
    `[BrandOps] ${moduleName} is quarantined for launch. Set ${LEGACY_OAUTH_FLAG}=1 only for explicit non-launch testing.`
  );
}

