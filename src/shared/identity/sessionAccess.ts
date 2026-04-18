import type { BrandOpsData } from '../../types/domain';

/** At least one IdP (Google, GitHub, LinkedIn) is connected with a live OAuth session. */
export function hasFederatedSession(data: BrandOpsData): boolean {
  const hub = data.settings.syncHub;
  return [hub.google, hub.github, hub.linkedin].some((row) => row.connectionStatus === 'connected');
}

/**
 * Opt-in demo/preview builds (e.g. `VITE_DEMO_BYPASS=1` on Vercel). Enables guest session without OAuth.
 * **Do not** set for Chrome Web Store / real production extension builds.
 */
export function isDemoBypassBuild(): boolean {
  const v = import.meta.env.VITE_DEMO_BYPASS;
  return v === '1' || v === 'true';
}

/** Local guest session: dev server, or demo-bypass preview build. */
function hasGuestDemoSession(data: BrandOpsData): boolean {
  return Boolean((import.meta.env.DEV || isDemoBypassBuild()) && data.seed.guestSessionAt);
}

/** User may open the main app surfaces (e.g. Dashboard) only with a connected IdP session. */
export function canAccessApp(data: BrandOpsData): boolean {
  return hasFederatedSession(data) || hasGuestDemoSession(data);
}
