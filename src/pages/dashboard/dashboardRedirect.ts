/**
 * `dashboard.html` query contracts are legacy and must route to canonical pages.
 * - `?section=` always redirects to `mobile.html?section=...`
 * - `?overlay=help|settings` redirects to safe pages (`help.html` / `mobile.html?section=settings`)
 */
export function shouldRedirectDashboardSectionToMobile(pathname: string, search: string): boolean {
  const sp = new URLSearchParams(search);
  return /\/dashboard\.html$/i.test(pathname) && sp.has('section');
}

export function getRetiredDashboardOverlayTarget(search: string): string | null {
  const sp = new URLSearchParams(search);
  const overlay = sp.get('overlay');
  if (!overlay) return null;
  if (overlay === 'help') return 'help.html';
  return 'mobile.html?section=settings';
}
