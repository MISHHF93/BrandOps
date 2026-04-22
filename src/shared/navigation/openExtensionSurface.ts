import type { DashboardSectionId } from '../config/dashboardNavigation';
import { buildMobileCockpitUrl, buildMobileShellUrl, PAGE } from './extensionLinks';
import { resolveExtensionUrl } from './extensionRuntime';

export type ExtensionSurfaceTarget = 'dashboard' | 'integrations' | 'integration-hub' | 'help';

/** Opens a bundled extension HTML page in a new tab (or window fallback) — reliable for MV3 even when `openOptionsPage` is a no-op. */
function openPackagedPageInNewTab(spec: string) {
  const targetUrl = resolveExtensionUrl(spec);
  if (typeof chrome !== 'undefined' && typeof chrome.tabs?.create === 'function') {
    void chrome.tabs.create({ url: targetUrl });
    return;
  }
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

const transitionDurationMs = () => {
  const motion = document.documentElement.getAttribute('data-motion-mode');
  if (motion === 'off') return 0;
  if (motion === 'wild') return 190;
  return 130;
};

/**
 * Opens another extension HTML surface. Integrations and help use a new tab when possible.
 * `dashboard` + `section` → **mobile.html?section=…** (Cockpit workstream).
 * Bare `dashboard` → **mobile.html?section=chat** (primary app, Chat tab) — not `dashboard.html`.
 */
export function openExtensionSurface(surface: ExtensionSurfaceTarget, section?: DashboardSectionId) {
  if (surface === 'integrations' || surface === 'integration-hub') {
    openPackagedPageInNewTab(PAGE.integrations);
    return;
  }

  if (surface === 'help') {
    openPackagedPageInNewTab(PAGE.help);
    return;
  }

  const surfacePath = section
    ? buildMobileCockpitUrl({ section })
    : buildMobileShellUrl({ tab: 'chat' });

  const targetUrl = resolveExtensionUrl(surfacePath);

  const waitMs = transitionDurationMs();
  if (waitMs <= 0) {
    window.location.assign(targetUrl);
    return;
  }

  document.body.classList.add('bo-retro-surface-enter');
  try {
    const forStorage = surfacePath.replace(/[?#].*$/, '') || surfacePath;
    window.sessionStorage.setItem('bo:surface-transition', forStorage);
  } catch {
    // Ignore storage restrictions; transition still runs locally.
  }

  window.setTimeout(() => {
    window.location.assign(targetUrl);
  }, waitMs);
}
