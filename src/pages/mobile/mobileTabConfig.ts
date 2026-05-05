import {
  CalendarCheck2,
  LayoutDashboard,
  MessageCircle,
  PlugZap,
  Settings
} from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Bottom dock: **two surfaces** — Assistant (chat) and Workspace (overview + entry to deeper panels).
 * Full URLs still expose `section=today|integrations|settings|…`.
 */
export const MOBILE_SHELL_NAV_TABS: ReadonlyArray<{
  id: 'chat' | 'workspace';
  label: string;
  dockLabel?: string;
  icon: typeof MessageCircle;
}> = [
  { id: 'chat', label: 'Assistant', dockLabel: 'Ask', icon: MessageCircle },
  { id: 'workspace', label: 'Workspace', dockLabel: 'Plan', icon: LayoutDashboard }
];

export const COMMAND_PALETTE_NAV_TARGETS: ReadonlyArray<{
  tab: MobileShellTabId;
  label: string;
  keywords: string[];
  Icon: typeof MessageCircle;
}> = [
  {
    tab: 'chat',
    label: 'Assistant',
    keywords: ['assistant', 'chat', 'commands', 'ask', 'ai'],
    Icon: MessageCircle
  },
  {
    tab: 'workspace',
    label: 'Plan',
    keywords: ['workspace', 'home', 'overview', 'plan', 'pulse', 'timeline', 'queue', 'hub'],
    Icon: LayoutDashboard
  },
  {
    tab: 'daily',
    label: 'Today lanes',
    keywords: ['today', 'cockpit', 'lanes', 'digest', 'daily'],
    Icon: CalendarCheck2
  },
  {
    tab: 'integrations',
    label: 'Integrations',
    keywords: ['integrations', 'sync', 'sources', 'connect', 'oauth'],
    Icon: PlugZap
  },
  {
    tab: 'settings',
    label: 'Settings',
    keywords: ['settings', 'preferences', 'account', 'prefs', 'configure'],
    Icon: Settings
  }
];
