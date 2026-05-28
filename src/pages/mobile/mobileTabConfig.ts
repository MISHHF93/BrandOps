import { CalendarCheck2, LayoutDashboard, MessageCircle, PlugZap, Settings } from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';

/**
 * Bottom dock: **Ask | Plan** — Plan contains the OPERATE layer.
 * Plan strip tabs (`PlanSurfaceNav`) open `daily` | `integrations` | `settings` while keeping the Plan dock lit.
 * Tab id ↔ URL mapping: `mobileShellQuery.ts`.
 */
export const MOBILE_SHELL_NAV_TABS: ReadonlyArray<{
  id: 'chat' | 'workspace';
  label: string;
  dockLabel?: string;
  icon: typeof MessageCircle;
}> = [
  { id: 'chat', label: 'ASK', dockLabel: 'Ask', icon: MessageCircle },
  { id: 'workspace', label: 'PLAN / OPERATE', dockLabel: 'Plan', icon: LayoutDashboard }
];

export const COMMAND_PALETTE_NAV_TARGETS: ReadonlyArray<{
  tab: MobileShellTabId;
  label: string;
  keywords: string[];
  Icon: typeof MessageCircle;
}> = [
  {
    tab: 'chat',
    label: 'ASK',
    keywords: ['ask', 'ai twin', 'strategist', 'chat', 'commands', 'assistant', 'intelligence'],
    Icon: MessageCircle
  },
  {
    tab: 'workspace',
    label: 'PLAN / OPERATE',
    keywords: [
      'workspace',
      'home',
      'overview',
      'plan',
      'operate',
      'execution',
      'pulse',
      'timeline',
      'queue',
      'hub'
    ],
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
    keywords: [
      'settings',
      'preferences',
      'account',
      'prefs',
      'configure',
      'setup',
      'environment',
      'configuration',
      'profile',
      'operating profile',
      'preset'
    ],
    Icon: Settings
  }
];
