import { Activity, CalendarCheck2, MessageCircle, PlugZap, Settings } from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Bottom navigation for {@link MobileApp}. Order and ids must match URL `section` handling
 * in {@link parseMobileShellFromSearchParams} / {@link sectionParamValueForShellState}.
 */
export const MOBILE_SHELL_NAV_TABS: ReadonlyArray<{
  id: MobileShellTabId;
  /** Title in the sticky shell header — full word where possible. */
  label: string;
  /** Optional shorter dock label — keeps five tabs readable on narrow phones. */
  dockLabel?: string;
  /** One-line context under the title (launch-grade density). */
  tagline: string;
  icon: typeof MessageCircle;
}> = [
  { id: 'pulse', label: 'Pulse', tagline: 'What needs you next.', icon: Activity },
  { id: 'chat', label: 'Chat', tagline: 'Run workspace commands.', icon: MessageCircle },
  { id: 'daily', label: 'Today', tagline: 'Plan, then dive in.', icon: CalendarCheck2 },
  {
    id: 'integrations',
    label: 'Integrations',
    dockLabel: 'Sync',
    tagline: 'Connections & sync.',
    icon: PlugZap
  },
  {
    id: 'settings',
    label: 'Settings',
    dockLabel: 'Prefs',
    tagline: 'Account & workspace.',
    icon: Settings
  }
];
