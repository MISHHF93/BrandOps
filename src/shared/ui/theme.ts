import type { AppSettings, BrandOpsData, UiTheme } from '../../types/domain';

/** Web dev (`browserLocalStorage`) key — same as `browserStorage` scoped local key for `brandops:data`. */
const WEB_LOCAL_DATA_KEY = 'brandops:local:brandops:data';

/**
 * Apply theme from persisted web LocalStorage before React paints (dev / `vite`).
 * Extension builds use `chrome.storage` async paths; this is a no-op there.
 */
export function bootstrapDocumentThemeFromWebStorage(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(WEB_LOCAL_DATA_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as BrandOpsData;
    if (!parsed?.settings) return;
    applyDocumentTheme(parsed.settings.theme, {
      visualMode: parsed.settings.visualMode,
      motionMode: parsed.settings.motionMode,
      ambientFxEnabled: parsed.settings.ambientFxEnabled
    });
  } catch {
    // Corrupt or legacy payload — default :root tokens apply until store init.
  }
}

/** Apply light/dark and motion/visual/ambient from persisted `AppSettings` (e.g. after `storageService.getData`). */
export const applyDocumentThemeFromAppSettings = (settings: AppSettings): void => {
  applyDocumentTheme(settings.theme, {
    visualMode: settings.visualMode,
    motionMode: settings.motionMode,
    ambientFxEnabled: settings.ambientFxEnabled
  });
};

export const applyDocumentTheme = (
  theme: UiTheme,
  visual?: Pick<BrandOpsData['settings'], 'visualMode' | 'motionMode' | 'ambientFxEnabled'>
) => {
  const resolved = theme === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
  root.setAttribute('data-visual-mode', visual?.visualMode ?? 'classic');
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const effectiveMotionMode = prefersReducedMotion ? 'off' : (visual?.motionMode ?? 'balanced');
  root.setAttribute('data-motion-mode', effectiveMotionMode);
  root.setAttribute('data-ambient-fx', visual?.ambientFxEnabled ? 'on' : 'off');

  try {
    const transitionTarget = window.sessionStorage.getItem('bo:surface-transition');
    const path = window.location.pathname.split('/').pop() ?? '';
    if (transitionTarget && transitionTarget.endsWith(path)) {
      document.body.classList.add('bo-retro-surface-enter');
      window.setTimeout(() => {
        document.body.classList.remove('bo-retro-surface-enter');
      }, 480);
      window.sessionStorage.removeItem('bo:surface-transition');
    }
  } catch {
    // Storage can be unavailable in hardened contexts.
  }
};
