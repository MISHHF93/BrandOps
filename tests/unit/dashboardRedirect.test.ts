import { describe, expect, it } from 'vitest';
import { getRetiredDashboardOverlayTarget } from '../../src/pages/dashboard/dashboardRedirect';

describe('dashboardRedirect', () => {
  it('maps retired overlay tokens to deterministic canonical pages', () => {
    expect(getRetiredDashboardOverlayTarget('overlay=help')).toBe('help.html');
    expect(getRetiredDashboardOverlayTarget('overlay=settings')).toBe(
      'mobile.html?section=settings'
    );
    expect(getRetiredDashboardOverlayTarget('overlay=other')).toBe('mobile.html?section=settings');
    expect(getRetiredDashboardOverlayTarget('section=today')).toBeNull();
  });
});
