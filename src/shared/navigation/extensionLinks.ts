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
 * Layer 0 — Peripheral (not `MobileApp`; inactive legacy callbacks / legal):
 *   public/oauth/{google,github,linkedin}-brandops.html   inactive callback placeholders; no OAuth runtime ships
 *   public/privacy-policy.html  → bundled legal; `getPrivacyPolicyHref` may point hosted URL
 *
 * Layer 1 — Shell / HTML surfaces (each is its own document):
 *   Product UX is **one `MobileApp` shell** — `welcome`, `mobile`, `dashboard`, and `integrations` HTML
 *   pages only vary `data-app-surface` for analytics/local-access context; bookmark **`mobile.html`** as canonical.
 *   index.html          → marketing site root (`data-app-surface="site"`, not the `MobileApp` shell);
 *                          Open-app links lead to welcome.html, the canonical local preview-access gateway
 *   mobile.html         → primary AI chatbot application surface (`data-app-surface="mobile"`)
 *   welcome.html        → chatbot surface (`data-app-surface="welcome"`); once local access is unlocked,
 *                          hands off to mobile.html
 *   dashboard.html      → chatbot surface; `?section` without `overlay` → redirect to `mobile.html`
 *   integrations.html  → same `MobileApp` shell (`options_ui` in manifest; `data-app-surface="integrations"`)
 *   help.html           → Knowledge Center manual (`data-app-surface="help"`)
 *   privacy-policy.html → static legal (bundled)
 *
 * Layer 2 — Welcome deep link (one optional query param):
 *   welcome.html                    → local preview-access selector
 *   welcome.html?flow=signup        → legacy URL variant; still the same local preview selector
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

export const QUERY = {
  /** Legacy `signup` route marker. Omitted URL = canonical bare welcome.html. */
  welcomeFlow: 'flow',
  /** @deprecated Legacy; still read. Prefer `flow`. */
  welcomeAuthLegacy: 'auth',
  dashboardSection: 'section',
  /** @deprecated Retired dashboard overlay contract. */
  cockpitOverlay: 'overlay',
  helpTopic: 'topic'
} as const;

function withQuery(file: string, params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [
    string,
    string
  ][];
  if (entries.length === 0) return file;
  const qs = new URLSearchParams(entries).toString();
  return `${file}?${qs}`;
}

/** Bare `welcome.html` — canonical local preview-access entry. */
export function buildWelcomeSignInUrl(): string {
  return PAGE.welcome;
}

/** Legacy create-account URL retained for compatible navigation; no remote account is created. */
export function buildWelcomeSignUpUrl(): string {
  return withQuery(PAGE.welcome, { [QUERY.welcomeFlow]: 'signup' });
}

export function buildDashboardUrl(opts?: { section?: DashboardSectionId }): string {
  const params: Record<string, string> = {};
  if (opts?.section) params[QUERY.dashboardSection] = opts.section;
  return withQuery(PAGE.dashboard, params);
}

/**
 * In-app `mobile.html` with `?section=` for either a **tab** or a **Cockpit workstream** (use `buildMobileCockpitUrl` / `{ workstream }` for the latter only).
 */
export function buildMobileShellUrl(
  opts:
    | { tab: 'workspace' | 'chat' | 'settings' | 'integrations' }
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
