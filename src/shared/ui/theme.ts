import type { AppSettings, BrandOpsData, UiTheme } from '../../types/domain';

/** Web dev (`browserLocalStorage`) key — same as `browserStorage` scoped local key for `brandops:data`. */
const WEB_LOCAL_DATA_KEY = 'brandops:local:brandops:data';

/**
 * Hex values for `meta name="theme-color"` — must stay aligned with `--color-bg` in `src/styles/index.css`
 * (`:root` dark and `:root[data-theme="light"]`).
 */
export const THEME_COLOR_HEX: Record<'dark' | 'light', string> = {
  /** Cyber grey-green canvas (near-black for OLED; aligned with `--color-bg` dark tokens). */
  dark: '#090e0c',
  /** Mint-white paper (aligned with `--color-bg` light tokens). */
  light: '#f8faf8'
};

/** Keep browser / PWA chrome in sync with `data-theme` (static HTML defaults are dark). */
function syncMetaThemeColor(resolved: 'dark' | 'light'): void {
  if (typeof document === 'undefined' || !document.head) return;
  const content = THEME_COLOR_HEX[resolved];
  let meta = document.head.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  if (meta.getAttribute('content') !== content) {
    meta.setAttribute('content', content);
  }
}

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
    applyDocumentTheme(parsed.settings.theme);
  } catch {
    // Corrupt or legacy payload — default :root tokens apply until store init.
  }
}

/** Apply light/dark plus the unified BrandOps appearance contract. */
export const applyDocumentThemeFromAppSettings = (settings: AppSettings): void => {
  applyDocumentTheme(settings.theme);
};

const applyDocumentTheme = (theme: UiTheme) => {
  const resolved = theme === 'light' ? 'light' : 'dark';
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
  syncMetaThemeColor(resolved);
  root.setAttribute('data-visual-mode', 'brandops');
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const effectiveMotionMode = prefersReducedMotion ? 'off' : 'balanced';
  root.setAttribute('data-motion-mode', effectiveMotionMode);
  root.setAttribute('data-ambient-fx', 'off');

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
