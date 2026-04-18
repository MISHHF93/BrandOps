import type { DashboardSectionId } from '../config/dashboardNavigation';
import { buildDashboardUrl, PAGE } from './extensionLinks';
import { resolveExtensionUrl } from './extensionRuntime';

export type ExtensionSurfaceTarget = 'dashboard' | 'options' | 'integration-hub' | 'help';

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
  if (
    surface === 'options' &&
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime?.openOptionsPage === 'function'
  ) {
    void chrome.runtime.openOptionsPage();
    return;
  }

  if (surface === 'help') {
    const surfacePath = PAGE.help;
    const targetUrl = resolveExtensionUrl(surfacePath);

    if (typeof chrome !== 'undefined' && typeof chrome.tabs?.create === 'function') {
      void chrome.tabs.create({ url: targetUrl });
      return;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  let surfacePath: string;
  if (surface === 'options') {
    surfacePath = PAGE.options;
  } else if (surface === 'integration-hub') {
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
