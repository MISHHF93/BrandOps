import { WorkspaceModule } from '../../types/domain';

export const workspaceModules: WorkspaceModule[] = [
  {
    id: 'command-center',
    title: 'Command Center',
    description: 'Mission control for execution telemetry, priorities, and operational cadence.',
    status: 'active',
    route: 'popup'
  },
  {
    id: 'brand-vault',
    title: 'Brand Vault',
    description: 'Canonical source for positioning pillars, offers, and approved messaging assets.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'content-library',
    title: 'Content Library',
    description: 'Reusable story blocks, hooks, and conversion CTA components.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'publishing-queue',
    title: 'Publishing Queue',
    description: 'Scheduling-ready draft stack with reminder-aware publishing workflows.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'outreach-workspace',
    title: 'Outreach Workspace',
    description: 'Multi-touch outreach drafting and relationship context workspace.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'pipeline-crm',
    title: 'Pipeline CRM',
    description: 'Deal progression, next actions, confidence scoring, and close discipline.',
    status: 'active',
    route: 'dashboard'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Extension controls, storage import/export, and environment preferences.',
    status: 'active',
    route: 'options'
  }
];
