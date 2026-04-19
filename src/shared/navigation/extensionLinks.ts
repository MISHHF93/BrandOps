/**
 * BrandOps extension — URL & page hierarchy (single source of truth)
 *
 * Layer 1 — Shell / HTML surfaces (each is its own document):
 *   index.html          → site root; redirects to dashboard.html (hosted preview entry)
 *   welcome.html        → OAuth gateway (Google / GitHub / LinkedIn); optional sign-in surface
 *   dashboard.html      → main workspace (OAuth required locally unless VITE_PREVIEW_COCKPIT_UNGATED; Vercel builds are ungated automatically)
 *   options.html        → Settings (open via in-app links; manifest options_page removed — see docs)
 *   help.html           → Knowledge Center
 *   privacy-policy.html → static legal (bundled)
 *
 * Layer 2 — Welcome deep link (one optional query param):
 *   welcome.html                    → Sign in (default): same UI as “returning user”
 *   welcome.html?flow=signup        → Create account (copy + OAuth variant “sign up”)
 *
 * Legacy: ?auth=signup|signin is still read and normalized to ?flow= or a clean URL.
 *
 * Layer 3 — Other queries:
 *   dashboard.html?section=<id>     → cockpit section
 *   dashboard.html?overlay=help|settings → open overlay after load (then stripped from URL)
 *   help.html?topic=<id>            → Knowledge Center scroll target
 */
import type { DashboardSectionId } from '../config/dashboardNavigation';

export const PAGE = {
  welcome: 'welcome.html',
  dashboard: 'dashboard.html',
  help: 'help.html',
  options: 'options.html',
  privacyPolicy: 'privacy-policy.html',
  index: 'index.html'
} as const;

export const QUERY = {
  /** `signup` only. Omitted URL = sign-in flow (canonical: bare welcome.html). */
  welcomeFlow: 'flow',
  /** @deprecated Legacy; still read. Prefer `flow`. */
  welcomeAuthLegacy: 'auth',
  dashboardSection: 'section',
  /** Opens Knowledge or Quick settings overlay on the dashboard (consumed once, then removed from URL). */
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
    page: PAGE.dashboard,
    query: `${QUERY.dashboardSection} | ${QUERY.cockpitOverlay} (optional)`,
    values: 'sections as above; overlay = help | settings',
    notes: 'Cockpit section; overlay opens in-page panel once. Legacy #hash migrated once on load.'
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
    notes: 'Redirects to dashboard.html preserving search/hash.'
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

export type CockpitOverlayParam = 'help' | 'settings';

export function buildDashboardUrl(opts?: {
  section?: DashboardSectionId;
  overlay?: CockpitOverlayParam;
}): string {
  const params: Record<string, string> = {};
  if (opts?.section) params[QUERY.dashboardSection] = opts.section;
  if (opts?.overlay) params[QUERY.cockpitOverlay] = opts.overlay;
  return withQuery(PAGE.dashboard, params);
}

export function buildHelpUrl(opts?: { topic?: string }): string {
  return withQuery(PAGE.help, opts?.topic ? { [QUERY.helpTopic]: opts.topic } : {});
}

export function buildPrivacyPolicyUrl(): string {
  return PAGE.privacyPolicy;
}
