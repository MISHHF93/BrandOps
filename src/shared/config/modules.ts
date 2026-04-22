import { WorkspaceModule } from '../../types/domain';

/**
 * Logical modules and their home surface (`route`). Dashboard section IDs and nav copy live in
 * `dashboardNavigation.ts` — keep naming aligned when you add or rename areas.
 *
 * Surface names (pair with BrandHeader on each HTML entry):
 * - dashboard.html → Dashboard (full workspace; Today is the default section)
 * - integrations.html → Integrations + Settings (MV3 options_ui)
 */
export const workspaceModules: WorkspaceModule[] = [
  {
    id: 'command-center',
    title: 'Quick actions',
    description: 'Fast snapshot: posts, follow-ups, opportunities, and priorities from Dashboard.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'brand-vault',
    title: 'Brand Vault',
    description:
      'Dashboard · Brand & content — positioning, offers, principles, and reusable narrative assets (same lane as library and queue).',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'content-library',
    title: 'Content Library',
    description: 'Dashboard · Brand & content — ideas, drafts, reusable blocks, and content assets.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'publishing-queue',
    title: 'Publishing Queue',
    description: 'Dashboard · Brand & content — planned posts, reminders, publish windows, and completion state.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'outreach-workspace',
    title: 'Outreach Workspace',
    description: 'Dashboard · Pipeline — outreach drafts, targets, send logging, and follow-through.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'pipeline-crm',
    title: 'Pipeline CRM',
    description: 'Dashboard · Pipeline — opportunities, stages, replies, follow-ups, and pipeline confidence.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'scheduler-engine',
    title: 'Scheduler Engine',
    description: 'Dashboard · Today — reminders, cadence timing, and due tasks (cadence tuning in Settings).',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'linkedin-companion',
    title: 'LinkedIn Companion',
    description: 'LinkedIn page overlay — lightweight capture (full content work on Dashboard · Brand & content).',
    status: 'active',
    route: 'content'
  },
  {
    id: 'settings',
    title: 'Settings',
    description:
      'Sync, export/import, models, backups, and optional local intelligence configuration.',
    status: 'active',
    route: 'integrations'
  }
];
