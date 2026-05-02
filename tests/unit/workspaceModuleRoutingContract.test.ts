import { describe, expect, it } from 'vitest';
import {
  canonicalizeDashboardSectionId,
  observedSectionIds
} from '../../src/shared/config/dashboardNavigation';
import { workspaceModules } from '../../src/shared/config/modules';

describe('workspace modules ↔ Cockpit deep links', () => {
  it('every dashboard-route module resolves to a Cockpit workstream via ?section=', () => {
    const dashboardModules = workspaceModules.filter((m) => m.route === 'dashboard');
    expect(dashboardModules.length).toBeGreaterThan(0);

    for (const m of dashboardModules) {
      const ws = canonicalizeDashboardSectionId(m.id);
      expect(ws, `missing deep-link mapping for workspace module "${m.id}"`).not.toBeNull();
      expect(observedSectionIds).toContain(ws);
    }
  });

  it('linkedin companion resolves to Brand & content workstream for deep links', () => {
    const mod = workspaceModules.find((m) => m.id === 'linkedin-companion');
    expect(mod).toBeDefined();
    expect(canonicalizeDashboardSectionId('linkedin-companion')).toBe('brand-content');
  });

  it('settings workspace module id does not steal the Settings tab token (reserved in shell parser)', () => {
    expect(canonicalizeDashboardSectionId('settings')).toBeNull();
    const settingsModule = workspaceModules.find((m) => m.id === 'settings');
    expect(settingsModule?.route).toBe('integrations');
  });
});
