import { describe, expect, it } from 'vitest';
import { shouldRedirectDashboardSectionToMobile } from '../../src/pages/dashboard/dashboardRedirect';

describe('dashboardRedirect', () => {
  it('redirects when section is present without overlay', () => {
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', 'section=pipeline')).toBe(true);
    expect(shouldRedirectDashboardSectionToMobile('/app/dashboard.html', 'section=today&foo=1')).toBe(
      true
    );
  });

  it('does not redirect when overlay is present (Knowledge / quick settings in dashboard doc)', () => {
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', 'section=pipeline&overlay=help'))
      .toBe(false);
    expect(
      shouldRedirectDashboardSectionToMobile('/dashboard.html', 'overlay=help&section=pipeline')
    ).toBe(false);
  });

  it('does not redirect without section on dashboard', () => {
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', '')).toBe(false);
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', 'overlay=help')).toBe(false);
  });

  it('ignores non-dashboard pathnames', () => {
    expect(shouldRedirectDashboardSectionToMobile('/mobile.html', 'section=pipeline')).toBe(false);
  });
});
