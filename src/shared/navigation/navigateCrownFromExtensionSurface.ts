import type { DashboardNavItem } from '../config/dashboardNavigation';
import { openExtensionSurface } from './openExtensionSurface';

/**
 * Navigates from compass/crown `cockpitNavigationGroups` items.
 * `section` workstreams go to `mobile.html?section=…` (Cockpit) via `openExtensionSurface`. Target
 * `dashboard` (no section) goes to `mobile.html?section=chat`. Legacy `dashboard.html?section=…` is
 * redirected to `mobile.html` in `dashboard/main.tsx` when not using overlay.
 * Hosts should pass this as `onSelectItem` when mounting a compass; no host wires this today,
 * so keep the module for future surfaces or test doubles.
 */
export function navigateCrownFromExtensionSurface(item: DashboardNavItem) {
  if (item.type === 'section') {
    openExtensionSurface('dashboard', item.target);
    return;
  }
  openExtensionSurface(item.target);
}
