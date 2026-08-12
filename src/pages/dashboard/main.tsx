import { getRetiredDashboardOverlayTarget } from './dashboardRedirect';

/**
 * `dashboard.html` is a legacy URL contract — product UX is **one** `MobileApp` shell on
 * `mobile.html`. It never boots a second app surface. Every entry routes to a canonical page:
 * - `?overlay=help` → `help.html`; `?overlay=*` → `mobile.html?section=settings` (retired contract)
 * - anything else (bare, `?section=<workstream>` bookmarks) → `mobile.html` preserving query + hash
 *
 * Because the query is preserved, legacy `dashboard.html?section=pipeline` bookmarks land on
 * `mobile.html?section=pipeline` — no duplicate shell, no broken mapping.
 */
if (typeof window !== 'undefined') {
  const retiredOverlayTarget = getRetiredDashboardOverlayTarget(window.location.search);
  if (retiredOverlayTarget) {
    window.location.replace(new URL(retiredOverlayTarget, window.location.href).toString());
  } else {
    const target = new URL('mobile.html', window.location.href);
    target.search = window.location.search;
    target.hash = window.location.hash;
    window.location.replace(target.toString());
  }
}
