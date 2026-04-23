import { WorkspaceModule } from '../../types/domain';

/**
 * Logical modules and their home surface (`route`). Workstream ids and nav copy live in
 * `dashboardNavigation.ts` — keep naming aligned when you add or rename areas.
 *
 * The live product uses one five-tab shell (`MobileApp`): Pulse, Chat, Today, Integrations, Settings.
 * HTML entry names (`mobile.html`, `dashboard.html`, `integrations.html`) are packaging only.
 */
export const workspaceModules: WorkspaceModule[] = [
  {
    id: 'command-center',
    title: 'Quick actions',
    description: 'Today — fast snapshot: posts, follow-ups, opportunities, and priorities.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'brand-vault',
    title: 'Brand Vault',
    description:
      'Today · Brand & content — positioning, offers, principles, and reusable narrative assets (library and queue).',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'content-library',
    title: 'Content Library',
    description: 'Today · Brand & content — ideas, drafts, reusable blocks, and content assets.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'publishing-queue',
    title: 'Publishing Queue',
    description: 'Today · Brand & content — planned posts, reminders, publish windows, and completion state.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'outreach-workspace',
    title: 'Outreach Workspace',
    description: 'Today · Pipeline — outreach drafts, targets, send logging, and follow-through.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'pipeline-crm',
    title: 'Pipeline CRM',
    description: 'Today · Pipeline — opportunities, stages, replies, follow-ups, and pipeline confidence.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'scheduler-engine',
    title: 'Scheduler Engine',
    description: 'Today — reminders, cadence timing, and due tasks (cadence tuning in Settings).',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'linkedin-companion',
    title: 'LinkedIn Companion',
    description: 'LinkedIn page overlay — lightweight capture (full content work under Today · Brand & content).',
    status: 'active',
    route: 'content'
  },
  {
    id: 'settings',
    title: 'Settings',
    description:
      'Integrations tab and Settings: sync health, export/import, backups, optional local intelligence.',
    status: 'active',
    route: 'integrations'
  }
];
