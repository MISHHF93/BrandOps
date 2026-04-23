/**
 * BrandOps extension — URL & page hierarchy (single source of truth)
 *
 * **Knowledge Center:** `help.html` mounts the **Knowledge Center** (`KnowledgeCenterBody`), with
 * optional `?topic=` to scroll to a topic. `dashboard.html?overlay=...` is retired and redirected.
 * Use `buildHelpUrl` for canonical help navigation.
 *
 * **Settings / Integrations (two valid entry points):** Chrome MV3 `options_ui` points at `integrations.html`
 * (merged shell: Integrations tab default, Settings on the bar). In-app: `mobile.html?section=settings` for Settings only.
 *
 * **Programmatic navigation** (see `openExtensionSurface`):
 *   • `openExtensionSurface('integrations'|'help')` → new tab: `integrations.html` | `help.html`
 *   • `openExtensionSurface('dashboard', section?)` → `mobile.html?section=<workstream>` or, if no section,
 *     `mobile.html?section=chat` (not `dashboard.html`)
 *   • `openExtensionSurface('integration-hub')` → `integrations.html` (alias)
 * Build helpers: `buildDashboardUrl`, `buildMobileCockpitUrl`, `buildMobileShellUrl`, `buildHelpUrl`, `buildWelcome*`.
 * Link matrix for humans: `SurfaceNavLinks`, `src/shared/navigation/navigateCrownFromExtensionSurface`.
 *
 * Layer 0 — Peripheral (not `MobileApp`; OAuth redirect / legal):
 *   public/oauth/{google,github,linkedin}-brandops.html   OAuth callback UIs
 *   public/privacy-policy.html  → bundled legal; `getPrivacyPolicyHref` may point hosted URL
 *
 * Layer 1 — Shell / HTML surfaces (each is its own document):
 *   index.html          → site root; redirects to mobile.html (chatbot-first hosted preview entry)
 *   mobile.html         → primary AI chatbot application surface (`data-app-surface="mobile"`)
 *   welcome.html        → chatbot surface (`data-app-surface="welcome"`)
 *   dashboard.html      → chatbot surface; `?section` without `overlay` → redirect to `mobile.html`
 *   integrations.html  → same `MobileApp` shell (`options_ui` in manifest; `data-app-surface="integrations"`)
 *   help.html           → Knowledge Center manual (`data-app-surface="help"`)
 *   privacy-policy.html → static legal (bundled)
 *
 * Layer 2 — Welcome deep link (one optional query param):
 *   welcome.html                    → Sign in (default): same UI as “returning user”
 *   welcome.html?flow=signup        → Create account (copy + OAuth variant “sign up”)
 *
 * Legacy: ?auth=signup|signin is still read and normalized to ?flow= or a clean URL.
 *
 * Layer 3 — Other queries:
 *   mobile.html?section=<token>  → in-app `MobileApp` (see `parseMobileShellFromSearchParams` in `src/pages/mobile/mobileShellQuery.ts`):
 *     • Tab: `chat` | `settings` | `integrations` | `daily` | `cockpit` (Cockpit defaults workstream to today)
 *     • Workstream: `today` | `pipeline` | `brand-content` | `connections` and legacy names (`overview` → today, etc.)
 *   dashboard.html?section=   → legacy/compat; prefer mobile.html for workstream deep links
 *   dashboard.html?overlay=*         → retired contract; deterministic fallback routing
 *   help.html?topic=<id>            → scroll target in Knowledge (when implemented on that page)
 */
import type { DashboardSectionId } from '../config/dashboardNavigation';

export const PAGE = {
  welcome: 'welcome.html',
  mobile: 'mobile.html',
  dashboard: 'dashboard.html',
  help: 'help.html',
  integrations: 'integrations.html',
  privacyPolicy: 'privacy-policy.html',
  index: 'index.html'
} as const;

/** OAuth callback HTML under `public/`; not the main `MobileApp` shell. */
export const PERIPHERAL_OAUTH_CALLBACK_PAGES = [
  'public/oauth/google-brandops.html',
  'public/oauth/github-brandops.html',
  'public/oauth/linkedin-brandops.html'
] as const;

export const QUERY = {
  /** `signup` only. Omitted URL = sign-in flow (canonical: bare welcome.html). */
  welcomeFlow: 'flow',
  /** @deprecated Legacy; still read. Prefer `flow`. */
  welcomeAuthLegacy: 'auth',
  dashboardSection: 'section',
  /** @deprecated Retired dashboard overlay contract. */
  cockpitOverlay: 'overlay',
  helpTopic: 'topic'
} as const;

export type WelcomeFlowQueryValue = 'signup';

export const EXTENSION_ROUTE_CATALOG: Array<{ page: string; query: string; values: string; notes: string }> = [
  {
    page: PAGE.welcome,
    query: `${QUERY.welcomeFlow} (optional)`,
    values: 'signup',
    notes: 'Omit param = sign in at welcome.html; ?flow=signup = create account. Legacy ?auth= normalized on load.'
  },
  {
    page: PAGE.mobile,
    query: `${QUERY.dashboardSection} (optional)`,
    values:
      'Tab: pulse | timeline | chat | settings | integrations | daily | cockpit — Workstream: today | pipeline | brand-content | connections (+ legacy)',
    notes: 'One param: tab tokens for bottom nav; workstream ids open Cockpit and scroll. See `mobileShellQuery.ts`.'
  },
  {
    page: PAGE.dashboard,
    query: `${QUERY.dashboardSection} | ${QUERY.cockpitOverlay} (optional legacy)`,
    values: 'legacy section param; overlay is retired and redirected',
    notes: 'Compatibility entry only. Canonical routing is mobile/help surfaces.'
  },
  {
    page: PAGE.integrations,
    query: `${QUERY.dashboardSection} (optional)`,
    values: 'Same tab + Cockpit workstream tokens as mobile.html; default UI tab is Integrations',
    notes: 'Chrome `options_ui` page; `data-app-surface=integrations`.'
  },
  {
    page: PAGE.help,
    query: QUERY.helpTopic,
    values: 'topic ids (e.g. surfaces)',
    notes: 'Scroll target in Knowledge Center.'
  },
  {
    page: PAGE.privacyPolicy,
    query: '—',
    values: '—',
    notes: 'Bundled legal; hosted URL optional via VITE_PRIVACY_POLICY_URL.'
  },
  {
    page: PAGE.index,
    query: '—',
    values: '—',
    notes: 'Redirects to mobile.html preserving search/hash.'
  }
];

function withQuery(file: string, params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][];
  if (entries.length === 0) return file;
  const qs = new URLSearchParams(entries).toString();
  return `${file}?${qs}`;
}

/** Bare `welcome.html` — canonical sign-in entry. */
export function buildWelcomeSignInUrl(): string {
  return PAGE.welcome;
}

/** Create-account funnel only (`?flow=signup`). */
export function buildWelcomeSignUpUrl(): string {
  return withQuery(PAGE.welcome, { [QUERY.welcomeFlow]: 'signup' });
}

/**
 * @deprecated Use `buildWelcomeSignInUrl` or `buildWelcomeSignUpUrl`.
 * Kept for gradual migration of call sites.
 */
export function buildWelcomeUrl(opts?: { flow?: 'signup'; auth?: 'signup' | 'signin' }): string {
  if (opts?.flow === 'signup' || opts?.auth === 'signup') {
    return buildWelcomeSignUpUrl();
  }
  if (opts?.auth === 'signin') {
    return buildWelcomeSignInUrl();
  }
  return buildWelcomeSignInUrl();
}

export function buildDashboardUrl(opts?: {
  section?: DashboardSectionId;
}): string {
  const params: Record<string, string> = {};
  if (opts?.section) params[QUERY.dashboardSection] = opts.section;
  return withQuery(PAGE.dashboard, params);
}

/**
 * In-app `mobile.html` with `?section=` for either a **tab** or a **Cockpit workstream** (use `buildMobileCockpitUrl` / `{ workstream }` for the latter only).
 */
export function buildMobileShellUrl(
  opts:
    | { tab: 'pulse' | 'chat' | 'settings' | 'integrations' }
    | { tab: 'daily' | 'cockpit' }
    | { workstream: DashboardSectionId }
): string {
  if ('workstream' in opts) {
    return withQuery(PAGE.mobile, { [QUERY.dashboardSection]: opts.workstream });
  }
  return withQuery(PAGE.mobile, { [QUERY.dashboardSection]: opts.tab });
}

/**
 * Canonical workstream / Cockpit deep link. Same `MobileApp` as the primary chat surface;
 * `?section` is read on `mobile.html` to open the Cockpit tab and scroll.
 */
export function buildMobileCockpitUrl(opts: { section: DashboardSectionId }): string {
  return buildMobileShellUrl({ workstream: opts.section });
}

export function buildHelpUrl(opts?: { topic?: string }): string {
  return withQuery(PAGE.help, opts?.topic ? { [QUERY.helpTopic]: opts.topic } : {});
}

export function buildPrivacyPolicyUrl(): string {
  return PAGE.privacyPolicy;
}
