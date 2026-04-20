import type { DashboardSectionId } from '../config/dashboardNavigation';
import { buildDashboardUrl, PAGE } from './extensionLinks';
import { resolveExtensionUrl } from './extensionRuntime';

export type ExtensionSurfaceTarget = 'dashboard' | 'options' | 'integration-hub' | 'help';

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
 * Opens another extension HTML surface (options, help, or dashboard with optional section query).
 */
export function openExtensionSurface(surface: ExtensionSurfaceTarget, section?: DashboardSectionId) {
  if (surface === 'options') {
    openPackagedPageInNewTab(PAGE.options);
    return;
  }

  if (surface === 'help') {
    openPackagedPageInNewTab(PAGE.help);
    return;
  }

  let surfacePath: string;
  if (surface === 'integration-hub') {
    surfacePath = buildDashboardUrl({ section: 'connections' });
  } else {
    surfacePath = section ? buildDashboardUrl({ section }) : buildDashboardUrl();
  }

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
