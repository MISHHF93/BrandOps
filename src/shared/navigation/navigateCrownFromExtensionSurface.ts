import type { DashboardNavItem } from '../config/dashboardNavigation';
import { openExtensionSurface } from './openExtensionSurface';

/** Crown menu selection when the app is not the in-page dashboard (popup, options, etc.). */
export function navigateCrownFromExtensionSurface(item: DashboardNavItem) {
  if (item.type === 'section') {
    openExtensionSurface('dashboard', item.target);
    return;
  }
  openExtensionSurface(item.target);
}
