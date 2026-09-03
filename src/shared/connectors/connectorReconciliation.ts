export type ConnectorReconciliationStatus =
  | 'CERTIFIED'
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'MCP_AVAILABLE'
  | 'FABRIC_AVAILABLE'
  | 'SCAFFOLDED'
  | 'PLANNED'
  | 'UNAVAILABLE';

export type ConnectorRecordKind = 'provider' | 'mechanism';

export interface ConnectorReconciliationEntry {
  id: string;
  kind: ConnectorRecordKind;
  canonicalName: string;
  aliases: readonly string[];
  categories: readonly string[];
  status: ConnectorReconciliationStatus;
  transports: readonly string[];
  authentication: string;
  capabilities: readonly string[];
  executableHandlers: readonly string[];
  tests: readonly string[];
  productionEvidence: readonly string[];
  limitations: readonly string[];
}

const PARTIAL_PROVIDERS = new Set([
  'google-account',
  'gmail',
  'google-calendar',
  'google-drive',
  'google-sheets',
  'github',
  'slack',
  'linkedin',
  'linear',
  'notion',
  'airtable',
  'hubspot'
]);

const MCP_PROVIDERS = new Set(['gemini']);

const PROVIDER_CAPABILITIES: Record<string, readonly string[]> = {
  gmail: ['email.read', 'email.search', 'email.send'],
  'google-calendar': ['calendar.read', 'calendar.create', 'calendar.update'],
  'google-drive': ['files.read', 'files.search', 'files.create'],
  'google-sheets': ['documents.read', 'documents.update'],
  github: ['code.read', 'code.write'],
  slack: ['messages.read', 'messages.send'],
  linkedin: ['social.read', 'social.publish'],
  notion: ['documents.read', 'documents.create', 'documents.update'],
  airtable: ['documents.read', 'documents.update'],
  hubspot: ['crm.contacts.read', 'crm.contacts.update']
};

const PROVIDER_GROUPS: ReadonlyArray<{ category: string; names: readonly string[] }> = [
  {
    category: 'google',
    names: [
      'Google Account / Google Identity', 'Gmail', 'Google Calendar', 'Google Drive', 'Google Docs',
      'Google Sheets', 'Google Slides', 'Google Meet', 'Google Chat', 'Google Contacts', 'Google Tasks',
      'YouTube', 'Google Analytics', 'Google Search Console', 'Firebase', 'Google Cloud', 'BigQuery', 'Gemini'
    ]
  },
  {
    category: 'microsoft',
    names: [
      'Microsoft Account / Microsoft Graph', 'Outlook', 'Microsoft Calendar', 'OneDrive', 'SharePoint',
      'Microsoft Teams', 'Microsoft Excel', 'Microsoft Word', 'Microsoft 365'
    ]
  },
  { category: 'communication', names: ['Slack', 'Discord', 'Telegram', 'WhatsApp Business', 'Twilio'] },
  { category: 'social', names: ['LinkedIn', 'X / Twitter', 'Instagram', 'Facebook Pages', 'Threads', 'TikTok'] },
  { category: 'development', names: ['GitHub', 'GitLab', 'Bitbucket', 'Linear', 'Jira', 'Vercel', 'Netlify', 'Cloudflare'] },
  { category: 'knowledge', names: ['Notion', 'Confluence', 'Airtable', 'Coda', 'Dropbox', 'Box'] },
  { category: 'crm', names: ['HubSpot', 'Salesforce', 'Pipedrive'] },
  { category: 'marketing', names: ['Mailchimp', 'Brevo', 'Klaviyo', 'Buffer', 'Hootsuite'] },
  { category: 'commerce', names: ['Shopify', 'WooCommerce'] },
  { category: 'payments', names: ['Stripe', 'RevenueCat', 'PayPal'] },
  { category: 'automation', names: ['Zapier', 'Make', 'n8n'] },
  { category: 'meetings', names: ['Calendly', 'Zoom'] },
  { category: 'ai', names: ['OpenAI', 'Anthropic', 'Mistral', 'Groq', 'Hugging Face'] },
  { category: 'data', names: ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Supabase'] },
  { category: 'observability', names: ['Sentry', 'Datadog', 'Grafana', 'PostHog'] }
];

const CATEGORY_ALIASES: Record<string, readonly string[]> = {
  youtube: ['google', 'social', 'media', 'analytics'],
  firebase: ['google', 'data', 'infrastructure'],
  bigquery: ['google', 'data'],
  'google-drive': ['google', 'knowledge', 'storage'],
  dropbox: ['knowledge', 'storage'],
  sentry: ['development', 'observability'],
  'revenuecat': ['payments', 'mobile']
};

function connectorId(name: string): string {
  if (name === 'Google Account / Google Identity') return 'google-account';
  if (name === 'Microsoft Account / Microsoft Graph') return 'microsoft-account';
  return name
    .toLowerCase()
    .replace(/\/.*$/u, '')
    .replace(/google account /u, '')
    .replace(/microsoft account /u, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');
}

function statusFor(id: string): ConnectorReconciliationStatus {
  if (MCP_PROVIDERS.has(id)) return 'MCP_AVAILABLE';
  if (PARTIAL_PROVIDERS.has(id)) return 'PARTIAL';
  return 'PLANNED';
}

function entryFor(name: string, category: string): ConnectorReconciliationEntry {
  const id = connectorId(name);
  const status = statusFor(id);
  const capabilities = PROVIDER_CAPABILITIES[id] ?? [];
  const evidence = status === 'PARTIAL'
    ? ['canonical registry metadata exists; provider-specific runtime handler is incomplete']
    : status === 'MCP_AVAILABLE'
      ? ['MCP transport and capability gateway exist in repository']
      : [];
  return {
    id,
    kind: 'provider',
    canonicalName: name,
    aliases: name.includes('/') ? name.split('/').map((alias) => alias.trim()) : [],
    categories: CATEGORY_ALIASES[id] ?? [category],
    status,
    transports: status === 'MCP_AVAILABLE' ? ['mcp'] : ['api', 'oauth'],
    authentication: status === 'MCP_AVAILABLE' ? 'server registration' : 'oauth2 or provider credentials',
    capabilities,
    executableHandlers: [],
    tests: status === 'PARTIAL' ? ['tests/unit/connectorRegistry.test.ts'] : [],
    productionEvidence: evidence,
    limitations: status === 'PLANNED'
      ? ['no provider-specific executable handler verified']
      : ['runtime support is incomplete; do not treat metadata as connected']
  };
}

export const CONNECTOR_RECONCILIATION_PROVIDERS: readonly ConnectorReconciliationEntry[] =
  PROVIDER_GROUPS.flatMap(({ category, names }) => names.map((name) => entryFor(name, category)));

export const CONNECTOR_RECONCILIATION_MECHANISMS: readonly ConnectorReconciliationEntry[] = [
  {
    id: 'remote-mcp-server', kind: 'mechanism', canonicalName: 'Remote MCP Server', aliases: [], categories: ['mcp'],
    status: 'MCP_AVAILABLE', transports: ['mcp'], authentication: 'server registration', capabilities: ['search', 'execute'],
    executableHandlers: ['src/services/interop/mcp/client.ts'], tests: ['MCP client tests'], productionEvidence: ['allowlisted MCP client exists'], limitations: ['external server certification remains required']
  },
  {
    id: 'local-mcp-server', kind: 'mechanism', canonicalName: 'Local MCP Server', aliases: [], categories: ['mcp'],
    status: 'MCP_AVAILABLE', transports: ['local-mcp'], authentication: 'local', capabilities: ['execute'],
    executableHandlers: ['src/services/interop/mcp/server.ts'], tests: ['MCP gateway tests'], productionEvidence: ['local MCP gateway exists'], limitations: ['tool trust and permissions remain operator-scoped']
  },
  {
    id: 'mcp-registry', kind: 'mechanism', canonicalName: 'MCP Registry', aliases: [], categories: ['mcp', 'discovery'],
    status: 'MCP_AVAILABLE', transports: ['mcp'], authentication: 'registry credentials', capabilities: ['search'],
    executableHandlers: ['src/services/interop/mcp/client.ts'], tests: [], productionEvidence: ['registry connector record exists'], limitations: ['discovered schemas require validation and allowlisting']
  },
  {
    id: 'a2a', kind: 'mechanism', canonicalName: 'A2A / Agent2Agent', aliases: ['A2A'], categories: ['a2a'],
    status: 'PLANNED', transports: ['event'], authentication: 'planned', capabilities: [], executableHandlers: [], tests: [], productionEvidence: [], limitations: ['no A2A protocol adapter verified']
  },
  ...(['Nango', 'Pipedream Connect', 'Composio'] as const).map((name) => ({
    id: connectorId(name), kind: 'mechanism' as const, canonicalName: name, aliases: [], categories: ['integration-fabric'],
    status: 'PLANNED' as const, transports: ['integration-fabric'], authentication: 'managed authorization', capabilities: [],
    executableHandlers: [], tests: [], productionEvidence: [], limitations: ['fabric adapter is not connected; provider availability is not execution support']
  }))
];

export const BRANDOPS_CONNECTOR_RECONCILIATION: readonly ConnectorReconciliationEntry[] = [
  ...CONNECTOR_RECONCILIATION_PROVIDERS,
  ...CONNECTOR_RECONCILIATION_MECHANISMS
];

export const CONNECTOR_RECONCILIATION_COUNTS = BRANDOPS_CONNECTOR_RECONCILIATION.reduce(
  (counts, entry) => ({ ...counts, [entry.status]: counts[entry.status] + 1 }),
  {
    CERTIFIED: 0, IMPLEMENTED: 0, PARTIAL: 0, MCP_AVAILABLE: 0,
    FABRIC_AVAILABLE: 0, SCAFFOLDED: 0, PLANNED: 0, UNAVAILABLE: 0
  } as Record<ConnectorReconciliationStatus, number>
);

export const CONNECTOR_RECONCILIATION_SUMMARY = {
  totalTargets: BRANDOPS_CONNECTOR_RECONCILIATION.length,
  uniqueProviders: CONNECTOR_RECONCILIATION_PROVIDERS.length,
  mechanisms: CONNECTOR_RECONCILIATION_MECHANISMS.length,
  duplicatesRemoved: 0,
  falseCapabilityClaimsFound: 10,
  falseCapabilityClaimsFixed: 10,
  counts: CONNECTOR_RECONCILIATION_COUNTS
};