import { describe, expect, it } from 'vitest';
import {
  buildDashboardUrl,
  buildMobileCockpitUrl,
  buildMobileShellUrl,
  PAGE,
  QUERY
} from '../../src/shared/navigation/extensionLinks';

describe('extensionLinks', () => {
  it('builds mobile cockpit URLs with the section param', () => {
    const u = buildMobileCockpitUrl({ section: 'pipeline' });
    expect(u).toBe(`${PAGE.mobile}?${QUERY.dashboardSection}=pipeline`);
  });

  it('builds bare dashboard without section', () => {
    expect(buildDashboardUrl()).toBe(PAGE.dashboard);
  });

  it('keeps buildDashboardUrl section for legacy overlay and dashboard+section if ever needed', () => {
    const u = buildDashboardUrl({ section: 'today', overlay: 'help' });
    expect(u).toContain(QUERY.dashboardSection);
    expect(u).toContain(QUERY.cockpitOverlay);
    expect(u.startsWith(PAGE.dashboard)).toBe(true);
  });

  it('builds mobile shell URLs for tabs and workstreams', () => {
    expect(buildMobileShellUrl({ tab: 'settings' })).toBe(`${PAGE.mobile}?${QUERY.dashboardSection}=settings`);
    expect(buildMobileShellUrl({ tab: 'daily' })).toBe(`${PAGE.mobile}?${QUERY.dashboardSection}=daily`);
    expect(buildMobileShellUrl({ workstream: 'pipeline' })).toBe(
      `${PAGE.mobile}?${QUERY.dashboardSection}=pipeline`
    );
    expect(buildMobileCockpitUrl({ section: 'pipeline' })).toBe(buildMobileShellUrl({ workstream: 'pipeline' }));
  });
});
