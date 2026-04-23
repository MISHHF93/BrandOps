import type { BrandOpsData } from '../../types/domain';

/** At least one IdP (Google, GitHub, LinkedIn) is connected with a live OAuth session. */
export function hasFederatedSession(data: BrandOpsData): boolean {
  const hub = data.settings.syncHub;
  return [hub.google, hub.github, hub.linkedin].some((row) => row.connectionStatus === 'connected');
}
