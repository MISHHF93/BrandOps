import type { BrandOpsData } from '../../types/domain';

/** At least one IdP (Google, GitHub, LinkedIn) is connected with a live OAuth session. */
export function hasFederatedSession(data: BrandOpsData): boolean {
  const hub = data.settings.syncHub;
  return [hub.google, hub.github, hub.linkedin].some((row) => row.connectionStatus === 'connected');
}

/** DEV-only local demo bypass. Never used in production builds. */
function hasDevDemoSession(data: BrandOpsData): boolean {
  return Boolean(import.meta.env.DEV && data.seed.guestSessionAt);
}

/** User may open the main app surfaces (e.g. Dashboard) only with a connected IdP session. */
export function canAccessApp(data: BrandOpsData): boolean {
  return hasFederatedSession(data) || hasDevDemoSession(data);
}
