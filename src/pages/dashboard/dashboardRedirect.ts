/**
 * `dashboard.html?section=` without `overlay` should not stay on the Chat-first dashboard; callers
 * and bookmarks are redirected to `mobile.html?section=…` (see `src/pages/dashboard/main.tsx`).
 */
export function shouldRedirectDashboardSectionToMobile(pathname: string, search: string): boolean {
  const sp = new URLSearchParams(search);
  return /\/dashboard\.html$/i.test(pathname) && sp.has('section') && !sp.has('overlay');
}
