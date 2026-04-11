import { WorkspaceModule } from '../../types/domain';

export const workspaceModules: WorkspaceModule[] = [
  {
    id: 'dashboard',
    title: 'Command Center',
    description: 'Daily execution cockpit for publishing, outreach, and pipeline momentum.',
    status: 'active'
  },
  {
    id: 'publishing-queue',
    title: 'Publishing Queue',
    description: 'Capture drafts, mark readiness, and schedule reminder timestamps.',
    status: 'active'
  },
  {
    id: 'content-library',
    title: 'Content Library',
    description: 'Store reusable hooks, proof points, and closing CTAs.',
    status: 'active'
  },
  {
    id: 'outreach-workspace',
    title: 'Outreach Workspace',
    description: 'Build message drafts and multi-touchpoint outreach sequences.',
    status: 'active'
  },
  {
    id: 'follow-up-scheduler',
    title: 'Follow-Up Scheduler',
    description: 'Track overdue follow-ups and execution discipline.',
    status: 'active'
  },
  {
    id: 'opportunity-pipeline',
    title: 'Opportunity Pipeline CRM',
    description: 'Move opportunities through stages with confidence-weighted value.',
    status: 'active'
  },
  {
    id: 'messaging-vault',
    title: 'Brand Messaging Vault',
    description: 'Protect approved positioning, offers, and FAQ responses.',
    status: 'active'
  },
  {
    id: 'linkedin-overlay',
    title: 'LinkedIn Companion Overlay',
    description: 'Contextual sidebar focused on reminders, not unsafe automation.',
    status: 'active'
  },
  {
    id: 'settings',
    title: 'Settings / Export / Import',
    description: 'Configure local-first behavior and optional future adapters.',
    status: 'active'
  }
];
