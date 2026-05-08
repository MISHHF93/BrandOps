import type { IntegrationSourceKind } from '../../types/domain';

export interface IntegrationSourcePreset {
  /** Short operator-facing label for UI chips and summaries. */
  label: string;
  /** Default artifact categories this integration typically produces (sync / ingest targets). */
  artifactTypes: string[];
  /** Tags applied when a source is created from Chat / agent. */
  defaultTags: string[];
}

/** Exhaustive presets — extend when adding a new {@link IntegrationSourceKind}. */
export const INTEGRATION_SOURCE_PRESETS: Record<IntegrationSourceKind, IntegrationSourcePreset> = {
  'google-workspace': {
    label: 'Google Workspace',
    artifactTypes: ['calendar-event', 'email-thread-summary', 'contact-sync'],
    defaultTags: ['workspace', 'calendar']
  },
  github: {
    label: 'GitHub',
    artifactTypes: ['pull-request', 'issue', 'release-note'],
    defaultTags: ['engineering', 'scm']
  },
  notion: {
    label: 'Notion',
    artifactTypes: ['doc-export', 'database-row'],
    defaultTags: ['docs', 'wiki']
  },
  slack: {
    label: 'Slack',
    artifactTypes: ['conversation-thread', 'workflow-trigger'],
    defaultTags: ['comms']
  },
  rss: {
    label: 'RSS / Atom',
    artifactTypes: ['feed-item', 'headline-digest'],
    defaultTags: ['signals', 'media']
  },
  'google-drive': {
    label: 'Google Drive',
    artifactTypes: ['file-metadata', 'doc-preview'],
    defaultTags: ['files']
  },
  webhook: {
    label: 'Webhook',
    artifactTypes: ['payload-batch', 'event-hook'],
    defaultTags: ['automation', 'ingress']
  },
  'custom-api': {
    label: 'Custom API',
    artifactTypes: ['api-response', 'capture'],
    defaultTags: ['custom']
  },
  hubspot: {
    label: 'HubSpot',
    artifactTypes: ['deal-update', 'contact-sync', 'pipeline-stage-change'],
    defaultTags: ['crm', 'revops']
  },
  salesforce: {
    label: 'Salesforce',
    artifactTypes: ['opportunity', 'contact-sync', 'task-sync'],
    defaultTags: ['crm', 'enterprise']
  },
  pipedrive: {
    label: 'Pipedrive',
    artifactTypes: ['deal', 'activity-log'],
    defaultTags: ['crm', 'pipeline']
  },
  linear: {
    label: 'Linear',
    artifactTypes: ['issue', 'cycle-scope'],
    defaultTags: ['product', 'engineering']
  },
  jira: {
    label: 'Jira',
    artifactTypes: ['ticket', 'sprint-item'],
    defaultTags: ['product', 'engineering']
  },
  zendesk: {
    label: 'Zendesk',
    artifactTypes: ['support-ticket', 'macro-trigger'],
    defaultTags: ['support', 'cx']
  },
  stripe: {
    label: 'Stripe',
    artifactTypes: ['invoice-event', 'subscription-change'],
    defaultTags: ['billing', 'finance']
  },
  'microsoft-365': {
    label: 'Microsoft 365',
    artifactTypes: ['calendar-block', 'mail-folder-sync'],
    defaultTags: ['workspace', 'microsoft']
  },
  'meta-business': {
    label: 'Meta Business',
    artifactTypes: ['campaign-metrics', 'ad-set-summary'],
    defaultTags: ['ads', 'growth']
  },
  'linkedin-marketing': {
    label: 'LinkedIn Marketing',
    artifactTypes: ['post-performance', 'lead-gen-form'],
    defaultTags: ['ads', 'b2b']
  },
  airtable: {
    label: 'Airtable',
    artifactTypes: ['record-batch', 'view-export'],
    defaultTags: ['ops-db', 'nocode']
  }
};

export function integrationPresetForKind(kind: IntegrationSourceKind): IntegrationSourcePreset {
  return INTEGRATION_SOURCE_PRESETS[kind];
}

/** Allowed persisted kinds — keep in sync with storage normalization. */
export const ALL_INTEGRATION_SOURCE_KINDS = Object.keys(
  INTEGRATION_SOURCE_PRESETS
) as IntegrationSourceKind[];

/**
 * Infer integration kind from natural-language connect/add source commands.
 * Order matters: more specific phrases before generic ones.
 */
export function resolveIntegrationKindFromCommand(text: string): IntegrationSourceKind {
  const lower = text.toLowerCase();

  if (lower.includes('hubspot')) return 'hubspot';
  if (lower.includes('salesforce') || lower.includes('sfdc')) return 'salesforce';
  if (lower.includes('pipedrive')) return 'pipedrive';

  if (lower.includes('linear')) return 'linear';
  if (lower.includes('jira')) return 'jira';
  if (lower.includes('zendesk')) return 'zendesk';

  if (lower.includes('stripe')) return 'stripe';

  if (
    lower.includes('microsoft 365') ||
    lower.includes('office 365') ||
    lower.includes('outlook') ||
    lower.includes('m365')
  ) {
    return 'microsoft-365';
  }

  if (
    lower.includes('meta ads') ||
    lower.includes('facebook ads') ||
    lower.includes('instagram ads')
  ) {
    return 'meta-business';
  }
  if (
    lower.includes('linkedin marketing') ||
    lower.includes('linkedin ads') ||
    lower.includes('linkedin campaign')
  ) {
    return 'linkedin-marketing';
  }

  if (lower.includes('airtable')) return 'airtable';

  if (lower.includes('notion')) return 'notion';
  if (lower.includes('slack')) return 'slack';
  if (lower.includes('github')) return 'github';
  if (lower.includes('webhook')) return 'webhook';
  if (lower.includes('rss') || lower.includes('atom feed')) return 'rss';

  if (lower.includes('google drive') || lower.includes('drive')) return 'google-drive';

  if (lower.includes('google workspace') || lower.includes('workspace')) return 'google-workspace';

  return 'custom-api';
}
