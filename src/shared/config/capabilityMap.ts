/**
 * Where each capability primarily lives in the `MobileApp` shell.
 * Tab ids match bottom nav / `MobileShellTabId` in `src/pages/mobile/mobileShellQuery.ts`.
 */
export type AppShellTabId = 'workspace' | 'chat' | 'daily' | 'integrations' | 'settings';

export interface CockpitCapability {
  id: string;
  label: string;
  summary: string;
  primaryTab: AppShellTabId;
  secondaryTabs: AppShellTabId[];
}

export const cockpitCapabilities: CockpitCapability[] = [
  {
    id: 'brand-vault',
    label: 'Brand narrative',
    summary:
      'Today · Brand & content — positioning, offers, voice, and reusable story assets. Refine in Chat.',
    primaryTab: 'daily',
    secondaryTabs: ['chat']
  },
  {
    id: 'content-publishing',
    label: 'Content library and publishing',
    summary: 'Today · Brand & content — ideas, drafts, queue, and ship rhythm. Refine in Chat.',
    primaryTab: 'daily',
    secondaryTabs: ['chat']
  },
  {
    id: 'growth-pipeline',
    label: 'Outreach and pipeline',
    summary: 'Today · Pipeline — targets, CRM, follow-ups, and revenue motion. Refine in Chat.',
    primaryTab: 'daily',
    secondaryTabs: ['chat']
  },
  {
    id: 'scheduler-cadence',
    label: 'Scheduler and cadence',
    summary: 'Due work surfaces on Workspace overview and Today; cadence and workday caps in Settings.',
    primaryTab: 'workspace',
    secondaryTabs: ['daily', 'settings']
  },
  {
    id: 'integrations-manual',
    label: 'Manual integrations hub',
    summary:
      'Integrations tab — sources, artifacts, SSH nodes. Register and refine via Chat when needed.',
    primaryTab: 'integrations',
    secondaryTabs: ['chat', 'daily']
  },
  {
    id: 'sync-models-archive',
    label: 'Identity, models, backups, debug',
    summary: 'Settings — provider accounts, AI mode, export/import, reset, and diagnostics.',
    primaryTab: 'settings',
    secondaryTabs: ['integrations']
  }
];

export function appShellTabLabel(tab: AppShellTabId): string {
  switch (tab) {
    case 'workspace':
      return 'Workspace';
    case 'chat':
      return 'Assistant';
    case 'daily':
      return 'Today';
    case 'integrations':
      return 'Integrations';
    case 'settings':
      return 'Settings';
    default:
      return tab;
  }
}
