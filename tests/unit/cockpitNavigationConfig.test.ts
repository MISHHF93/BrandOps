import { describe, expect, it } from 'vitest';
import {
  cockpitNavigationGroups,
  getCockpitMobileSectionHeadingId,
  observedSectionIds,
  type DashboardSectionId
} from '../../src/shared/config/dashboardNavigation';

describe('cockpit navigation vs mobile Cockpit', () => {
  it('exposes a heading id for every observed dashboard section', () => {
    for (const id of observedSectionIds) {
      const domId = getCockpitMobileSectionHeadingId(id);
      expect(domId).toMatch(/^cockpit-/);
    }
  });

  it('keeps group 0 section items aligned with observedSectionIds', () => {
    const group0 = cockpitNavigationGroups[0];
    const sectionItems = group0?.items.filter((i) => i.type === 'section') ?? [];
    const targets = sectionItems.map((i) => (i as { type: 'section'; target: DashboardSectionId }).target);
    expect(targets).toEqual(observedSectionIds);
  });

  it('loads every navigation group (dashboard areas + other windows) from config', () => {
    expect(cockpitNavigationGroups.length).toBeGreaterThanOrEqual(2);
    const surfaces = cockpitNavigationGroups[1]?.items.filter((i) => i.type === 'surface') ?? [];
    expect(surfaces.length).toBeGreaterThanOrEqual(1);
  });
});
