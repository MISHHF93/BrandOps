/**
 * `dashboard.html` query contracts are legacy and must route to canonical pages.
 * - Every `dashboard.html` entry redirects to `mobile.html` (query + hash preserved)
 * - `?overlay=help|settings` redirects to safe pages (`help.html` / `mobile.html?section=settings`)
 */
export function getRetiredDashboardOverlayTarget(search: string): string | null {
  const sp = new URLSearchParams(search);
  const overlay = sp.get('overlay');
  if (!overlay) return null;
  if (overlay === 'help') return 'help.html';
  return 'mobile.html?section=settings';
}
