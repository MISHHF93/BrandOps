import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  CalendarRange,
  CircleDot,
  KanbanSquare,
  Layers2,
  LayoutDashboard,
  Plug2,
  Settings2
} from 'lucide-react';
import type { DashboardNavItem } from '../../config/dashboardNavigation';

/** Stable id → icon map; keep in sync with `cockpitNavigationGroups` item ids. */
const COCKPIT_NAV_ICONS: Record<string, LucideIcon> = {
  'nav-overview': CalendarRange,
  'nav-growth': KanbanSquare,
  'nav-content': Layers2,
  'nav-systems': Plug2,
  'nav-options': Settings2,
  'nav-knowledge': BookOpen,
  'nav-dashboard': LayoutDashboard
};

export function cockpitNavIconForItem(item: DashboardNavItem): LucideIcon {
  return COCKPIT_NAV_ICONS[item.id] ?? CircleDot;
}

export interface CockpitNavItemIconProps {
  item: DashboardNavItem;
  size?: number;
  className?: string;
}

/** Decorative companion to nav labels — always paired with visible text. */
export function CockpitNavItemIcon({ item, size = 15, className }: CockpitNavItemIconProps) {
  const Icon = cockpitNavIconForItem(item);
  return <Icon size={size} strokeWidth={2} className={className} aria-hidden />;
}
