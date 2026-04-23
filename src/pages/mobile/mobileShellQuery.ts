import {
  canonicalizeDashboardSectionId,
  DEFAULT_DASHBOARD_SECTION,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';

/**
 * Primary shell tabs in `MobileApp` (bottom nav). Kept in sync with {@link MOBILE_SHELL_NAV_TABS} in `mobileTabConfig.ts`.
 */
export type MobileShellTabId = 'pulse' | 'chat' | 'daily' | 'integrations' | 'settings';

/**
 * Reserved `?section=` values that select a **tab**, not a Cockpit workstream.
 * `daily` and `cockpit` open the Cockpit tab and default the workstream to `today` for highlight/scroll.
 * `timeline` is an alias for `pulse`.
 * Do not add strings that match {@link DashboardSectionId} for a different meaning.
 */
const RESERVED_SECTION_TAB = new Set([
  'pulse',
  'timeline',
  'chat',
  'settings',
  'integrations',
  'daily',
  'cockpit'
]);

export type ParsedMobileShellQuery = {
  tab: MobileShellTabId;
  /**
   * When `tab` is `daily`, the workstream to highlight/scroll. Null only when the URL encodes
   * a non-daily tab (workstream is unused).
   */
  workstream: DashboardSectionId | null;
};

/**
 * Read `?section=` on `mobile.html`: **tab tokens** (chat, settings, …) take precedence, then
 * **workstream** ids (`today` | `pipeline` | … and legacy keys).
 */
export function parseMobileShellFromSearchParams(
  sp: URLSearchParams,
  defaultTab: MobileShellTabId
): ParsedMobileShellQuery {
  const raw = sp.get('section')?.trim() ?? '';
  if (!raw) {
    return { tab: defaultTab, workstream: null };
  }
  const lower = raw.toLowerCase();
  if (RESERVED_SECTION_TAB.has(lower)) {
    if (lower === 'pulse' || lower === 'timeline') {
      return { tab: 'pulse', workstream: null };
    }
    if (lower === 'chat') {
      return { tab: 'chat', workstream: null };
    }
    if (lower === 'settings') {
      return { tab: 'settings', workstream: null };
    }
    if (lower === 'integrations') {
      return { tab: 'integrations', workstream: null };
    }
    if (lower === 'daily' || lower === 'cockpit') {
      return { tab: 'daily', workstream: 'today' };
    }
  }
  const workstream = canonicalizeDashboardSectionId(raw);
  if (workstream) {
    return { tab: 'daily', workstream };
  }
  return { tab: defaultTab, workstream: null };
}

/**
 * `?section=` value to store for the current shell (tab + optional Cockpit workstream).
 * On the Cockpit tab, use the workstream id (`today`, `pipeline`, …), not the `daily` token, once a workstream is active.
 */
export function sectionParamValueForShellState(
  tab: MobileShellTabId,
  workstream: DashboardSectionId
): string {
  if (tab === 'pulse') return 'pulse';
  if (tab === 'chat') return 'chat';
  if (tab === 'settings') return 'settings';
  if (tab === 'integrations') return 'integrations';
  return workstream;
}

/**
 * `mobile.html` and `integrations.html` host the same `MobileApp` and honor `?section=` for the bottom
 * bar and (on mobile) Cockpit workstream deep links.
 */
export function isAppShellWithSectionQuery(): boolean {
  if (typeof window === 'undefined') return false;
  return /\/(?:mobile|integrations)\.html$/i.test(window.location.pathname);
}

/** Update the address bar `section` (and preserve other search params) on the shell page. */
export function replaceMobileShellQueryInUrl(
  tab: MobileShellTabId,
  workstream: DashboardSectionId
) {
  if (typeof window === 'undefined') return;
  const value = sectionParamValueForShellState(tab, workstream);
  const url = new URL(window.location.href);
  url.searchParams.set('section', value);
  window.history.replaceState(null, '', url);
}

export { DEFAULT_DASHBOARD_SECTION };
