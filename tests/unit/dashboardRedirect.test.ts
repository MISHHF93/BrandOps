import { describe, expect, it } from 'vitest';
import {
  getRetiredDashboardOverlayTarget,
  shouldRedirectDashboardSectionToMobile
} from '../../src/pages/dashboard/dashboardRedirect';

describe('dashboardRedirect', () => {
  it('redirects when section is present (overlay ignored as retired)', () => {
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', 'section=pipeline')).toBe(true);
    expect(shouldRedirectDashboardSectionToMobile('/app/dashboard.html', 'section=today&foo=1')).toBe(
      true
    );
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', 'section=pipeline&overlay=help'))
      .toBe(true);
    expect(
      shouldRedirectDashboardSectionToMobile('/dashboard.html', 'overlay=help&section=pipeline')
    ).toBe(true);
  });

  it('does not redirect without section on dashboard', () => {
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', '')).toBe(false);
    expect(shouldRedirectDashboardSectionToMobile('/dashboard.html', 'overlay=help')).toBe(false);
  });

  it('ignores non-dashboard pathnames', () => {
    expect(shouldRedirectDashboardSectionToMobile('/mobile.html', 'section=pipeline')).toBe(false);
  });

  it('maps retired overlay tokens to deterministic canonical pages', () => {
    expect(getRetiredDashboardOverlayTarget('overlay=help')).toBe('help.html');
    expect(getRetiredDashboardOverlayTarget('overlay=settings')).toBe('mobile.html?section=settings');
    expect(getRetiredDashboardOverlayTarget('overlay=other')).toBe('mobile.html?section=settings');
    expect(getRetiredDashboardOverlayTarget('section=today')).toBeNull();
  });
});
