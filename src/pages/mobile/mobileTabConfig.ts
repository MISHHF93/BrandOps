import { Activity, CalendarCheck2, MessageCircle, PlugZap, Settings } from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Bottom navigation for {@link MobileApp}. Order and ids must match URL `section` handling
 * in {@link parseMobileShellFromSearchParams} / {@link sectionParamValueForShellState}.
 */
export const MOBILE_SHELL_NAV_TABS: ReadonlyArray<{
  id: MobileShellTabId;
  label: string;
  icon: typeof MessageCircle;
}> = [
  { id: 'pulse', label: 'Pulse', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'daily', label: 'Today', icon: CalendarCheck2 },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'settings', label: 'Settings', icon: Settings }
];
