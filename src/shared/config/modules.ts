import { WorkspaceModule } from '../../types/domain';

export const workspaceModules: WorkspaceModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'KPI snapshot and next actions across your brand operations.',
    status: 'available'
  },
  {
    id: 'brand-memory',
    title: 'Brand Memory',
    description: 'Source of truth for positioning, voice, and strategic constraints.',
    status: 'planned'
  },
  {
    id: 'content-studio',
    title: 'Content Studio',
    description: 'Generate and iterate high-leverage content with reusable workflows.',
    status: 'planned'
  },
  {
    id: 'outreach-assistant',
    title: 'Outreach Assistant',
    description: 'Compose context-aware outreach and follow-up sequences.',
    status: 'planned'
  },
  {
    id: 'opportunity-crm',
    title: 'Opportunity CRM',
    description: 'Track pipeline opportunities and momentum by stage.',
    status: 'planned'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure providers, prompts, and extension behavior.',
    status: 'available'
  }
];
