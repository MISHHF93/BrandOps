export type ConnectorTransport =
  | 'api'
  | 'oauth'
  | 'mcp'
  | 'local-mcp'
  | 'database'
  | 'webhook'
  | 'event'
  | 'local'
  | 'internal';

export type ConnectorFamily =
  | 'google'
  | 'microsoft'
  | 'communication'
  | 'social'
  | 'development'
  | 'knowledge'
  | 'crm'
  | 'marketing'
  | 'payments'
  | 'automation'
  | 'meetings'
  | 'ai'
  | 'data'
  | 'observability'
  | 'mcp';

export type ConnectorState =
  | 'AVAILABLE'
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'AUTH_EXPIRED'
  | 'MISCONFIGURED'
  | 'UNAVAILABLE';

export type ConnectorMaturity =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'AVAILABLE_THROUGH_MCP'
  | 'SCAFFOLDED'
  | 'PLANNED'
  | 'UNAVAILABLE';

export type ConnectorRiskLevel =
  | 'READ'
  | 'DRAFT'
  | 'CREATE_INTERNAL'
  | 'SEND_EXTERNAL'
  | 'PUBLISH_PUBLIC'
  | 'DELETE'
  | 'PAYMENT'
  | 'DEPLOY_PRODUCTION'
  | 'MODIFY_SECURITY';

export interface ConnectorCapability {
  id: string;
  domain: string;
  label: string;
  description: string;
  approvalRequired?: boolean;
  risk?: ConnectorRiskLevel;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: ConnectorFamily;
  icon: string;
  documentation?: string;
  version: string;
  status: ConnectorState;
  transport: ConnectorTransport;
  authentication: string;
  scopes: string[];
  capabilities: ConnectorCapability[];
  actions: string[];
  triggers: string[];
  resources: string[];
  approvalPolicy: string;
  riskLevel: ConnectorRiskLevel;
  healthCheck: string;
  verificationStrategy: string;
  agentAccess: 'workspace' | 'restricted' | 'global';
  configurationSchema: Record<string, unknown>;
  maturity: ConnectorMaturity;
  family: ConnectorFamily;
}

export const CAPABILITY_TAXONOMY = [
  'read',
  'search',
  'create',
  'update',
  'delete',
  'execute',
  'send',
  'publish',
  'upload',
  'download',
  'subscribe',
  'trigger',
  'sync',
  'email.read',
  'email.search',
  'email.send',
  'calendar.read',
  'calendar.create',
  'calendar.update',
  'files.read',
  'files.search',
  'files.create',
  'documents.read',
  'documents.create',
  'documents.update',
  'messages.read',
  'messages.search',
  'messages.send',
  'social.read',
  'social.publish',
  'analytics.read',
  'payments.read',
  'payments.manage',
  'code.read',
  'code.write',
  'deployment.read',
  'deployment.execute',
  'gmail.send',
  'drive.read',
  'drive.write'
] as const;

export function connectorRiskForCapability(capabilityId: string): ConnectorRiskLevel | null {
  if (capabilityId.includes('delete')) return 'DELETE';
  if (capabilityId.includes('payment') || capabilityId.includes('payments')) return 'PAYMENT';
  if (capabilityId.includes('deploy') || capabilityId.includes('security')) return 'MODIFY_SECURITY';
  if (capabilityId.includes('publish')) return 'PUBLISH_PUBLIC';
  if (capabilityId.includes('send') || capabilityId.includes('email.send')) return 'SEND_EXTERNAL';
  if (capabilityId.includes('create') || capabilityId.includes('write')) return 'CREATE_INTERNAL';
  return 'READ';
}

export const GOOGLE_CONNECTOR_FAMILY: ConnectorDefinition[] = [
  {
    id: 'google-account',
    name: 'Google Account',
    provider: 'google',
    description: 'Shared Google identity and incremental consent foundation for Google services.',
    category: 'google',
    icon: 'google',
    documentation: 'https://developers.google.com/identity',
    version: '1.0.0',
    status: 'CONNECTED',
    transport: 'oauth',
    authentication: 'oauth2',
    scopes: ['openid', 'email', 'profile'],
    capabilities: [
      { id: 'identity.read', domain: 'identity', label: 'Read account identity', description: 'Read basic account metadata.', risk: 'READ' },
      { id: 'oauth.scope', domain: 'identity', label: 'Manage scopes', description: 'Incremental OAuth consent across Google services.', risk: 'READ' }
    ],
    actions: [],
    triggers: [],
    resources: ['google-account'],
    approvalPolicy: 'workspace-admin',
    riskLevel: 'READ',
    healthCheck: 'validate oauth token and refresh flow',
    verificationStrategy: 'oauth token introspection and account metadata check',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { scopes: { type: 'array' } }, required: [] },
    maturity: 'PARTIAL',
    family: 'google'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    provider: 'google',
    description: 'Mail and message access for search, reading, drafting, and sending.',
    category: 'google',
    icon: 'gmail',
    documentation: 'https://developers.google.com/gmail',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['gmail.readonly', 'gmail.send'],
    capabilities: [
      { id: 'email.read', domain: 'email', label: 'Read mail', description: 'Read email threads and metadata.', risk: 'READ' },
      { id: 'email.search', domain: 'email', label: 'Search mail', description: 'Search inbox and labels.', risk: 'READ' },
      { id: 'email.send', domain: 'email', label: 'Send mail', description: 'Compose and send email messages.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'gmail.send', domain: 'gmail', label: 'Send Gmail', description: 'Google Gmail direct send path.', approvalRequired: true, risk: 'SEND_EXTERNAL' }
    ],
    actions: ['send-email', 'draft-email', 'read-message'],
    triggers: ['new-email'],
    resources: ['gmail-message', 'gmail-thread'],
    approvalPolicy: 'approval for email.send and any external send',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'gmail api metadata call and token refresh check',
    verificationStrategy: 'message-id or delivery receipt',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { oauthScopes: { type: 'array' } }, required: [] },
    maturity: 'PARTIAL',
    family: 'google'
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    provider: 'google',
    description: 'Read and manage calendar events and meeting scheduling.',
    category: 'google',
    icon: 'calendar',
    documentation: 'https://developers.google.com/calendar',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['calendar.readonly', 'calendar.events'],
    capabilities: [
      { id: 'calendar.read', domain: 'calendar', label: 'Read calendar', description: 'Read event metadata and schedule.', risk: 'READ' },
      { id: 'calendar.create', domain: 'calendar', label: 'Create calendar event', description: 'Create events in a connected calendar.', approvalRequired: true, risk: 'CREATE_INTERNAL' },
      { id: 'calendar.update', domain: 'calendar', label: 'Update calendar event', description: 'Update calendar entries.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['create-event', 'update-event', 'read-calendar'],
    triggers: ['calendar-event-start'],
    resources: ['calendar-event'],
    approvalPolicy: 'approval for create/update outside a user-approved schedule',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'calendar list and event fetch smoke test',
    verificationStrategy: 'Google event id with updated timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { calendarId: { type: 'string' } }, required: ['calendarId'] },
    maturity: 'PARTIAL',
    family: 'google'
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    provider: 'google',
    description: 'Drive file discovery, document access, and shared content retrieval.',
    category: 'google',
    icon: 'drive',
    documentation: 'https://developers.google.com/drive',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['drive.readonly', 'drive.file'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read files', description: 'Read file metadata and content where permitted.', risk: 'READ' },
      { id: 'files.search', domain: 'files', label: 'Search files', description: 'Search Drive by name and metadata.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create file', description: 'Create or upload a new file.', approvalRequired: true, risk: 'CREATE_INTERNAL' },
      { id: 'drive.read', domain: 'drive', label: 'Read Drive', description: 'Drive API read capability.', risk: 'READ' },
      { id: 'drive.write', domain: 'drive', label: 'Write Drive', description: 'Drive API write capability.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['search-drive', 'read-file', 'create-file', 'upload-file'],
    triggers: ['drive-file-change'],
    resources: ['drive-file', 'drive-folder'],
    approvalPolicy: 'approval for write and share operations',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'drive about call and folder listing smoke test',
    verificationStrategy: 'file id and drive revision metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { folderId: { type: 'string' } }, required: [] },
    maturity: 'PARTIAL',
    family: 'google'
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    provider: 'google',
    description: 'Collaborative documents, proposal drafting, and shared document workflows.',
    category: 'google',
    icon: 'documents',
    documentation: 'https://developers.google.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['documents.readonly', 'documents'],
    capabilities: [
      { id: 'documents.read', domain: 'documents', label: 'Read docs', description: 'Read document content and metadata.', risk: 'READ' },
      { id: 'documents.create', domain: 'documents', label: 'Create document', description: 'Create a new doc.', approvalRequired: true, risk: 'CREATE_INTERNAL' },
      { id: 'documents.update', domain: 'documents', label: 'Update document', description: 'Modify existing document content.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['create-doc', 'update-doc'],
    triggers: [],
    resources: ['google-doc'],
    approvalPolicy: 'approval for writing or sharing docs',
    riskLevel: 'DRAFT',
    healthCheck: 'document metadata fetch and auth validation',
    verificationStrategy: 'document id and revision number',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { folderId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'google-chat',
    name: 'Google Chat',
    provider: 'google',
    description: 'Teams and messaging capability for workspaces and internal briefings.',
    category: 'google',
    icon: 'chat',
    documentation: 'https://developers.google.com/chat',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['chat.spaces.readonly', 'chat.messages.create'],
    capabilities: [
      { id: 'messages.read', domain: 'messages', label: 'Read messages', description: 'Read Chat space messages.', risk: 'READ' },
      { id: 'messages.search', domain: 'messages', label: 'Search messages', description: 'Search history within a space.', risk: 'READ' },
      { id: 'messages.send', domain: 'messages', label: 'Send messages', description: 'Send messages to a conversation.', approvalRequired: true, risk: 'SEND_EXTERNAL' }
    ],
    actions: ['send-message'],
    triggers: ['chat-message'],
    resources: ['chat-space'],
    approvalPolicy: 'approval for sending to workspace or external users',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'Chat API auth and space list smoke check',
    verificationStrategy: 'message id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { spaceId: { type: 'string' } }, required: ['spaceId'] },
    maturity: 'PLANNED',
    family: 'google'
  }
];

const TARGET_LIBRARY_CONNECTORS: readonly ConnectorDefinition[] = [
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    provider: 'google',
    description: 'Spreadsheet and structured-data ingestion for operational analysis.',
    category: 'google',
    icon: 'sheets',
    documentation: 'https://developers.google.com/sheets',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['spreadsheets.readonly', 'spreadsheets'],
    capabilities: [
      { id: 'documents.read', domain: 'documents', label: 'Read spreadsheet', description: 'Read a Google Sheet.', risk: 'READ' },
      { id: 'documents.update', domain: 'documents', label: 'Update spreadsheet', description: 'Update a spreadsheet, values, or formulas.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-sheet', 'update-sheet'],
    triggers: ['sheet-change'],
    resources: ['spreadsheet'],
    approvalPolicy: 'approval for writes to shared workbooks',
    riskLevel: 'DRAFT',
    healthCheck: 'smoke test spreadsheet metadata and auth scope validation',
    verificationStrategy: 'spreadsheet id and revision metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { spreadsheetId: { type: 'string' } }, required: ['spreadsheetId'] },
    maturity: 'PARTIAL',
    family: 'google'
  },
  {
    id: 'google-slides',
    name: 'Google Slides',
    provider: 'google',
    description: 'Presentation authoring and deck generation workflows.',
    category: 'google',
    icon: 'slides',
    documentation: 'https://developers.google.com/slides',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['slides.readonly', 'slides'],
    capabilities: [
      { id: 'documents.read', domain: 'documents', label: 'Read slide deck', description: 'Read presentation metadata and content.', risk: 'READ' },
      { id: 'documents.create', domain: 'documents', label: 'Create deck', description: 'Create a new presentation.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['create-deck', 'update-deck'],
    triggers: [],
    resources: ['presentation'],
    approvalPolicy: 'approval for deck creation or publishing',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'auth + presentation metadata smoke test',
    verificationStrategy: 'presentation id and revision metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { presentationId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'google-meet',
    name: 'Google Meet',
    provider: 'google',
    description: 'Meet integration for briefings, meetings, and scheduling flow triggers.',
    category: 'google',
    icon: 'meet',
    documentation: 'https://developers.google.com/meet',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['meetings.space.readonly'],
    capabilities: [
      { id: 'calendar.read', domain: 'calendar', label: 'Read meetings', description: 'Read scheduled meeting metadata.', risk: 'READ' },
      { id: 'calendar.create', domain: 'calendar', label: 'Create meeting', description: 'Create a meeting or event.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['create-meeting'],
    triggers: ['meeting-start'],
    resources: ['meeting'],
    approvalPolicy: 'approval for meeting creation and invite changes',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'calendar and meeting metadata validation',
    verificationStrategy: 'meeting event id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { meetingId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    provider: 'google',
    description: 'Contact discovery and relationship context for known people and accounts.',
    category: 'google',
    icon: 'contacts',
    documentation: 'https://developers.google.com/people',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['people.readonly'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read contacts', description: 'Read contact metadata and relationship context.', risk: 'READ' },
      { id: 'files.search', domain: 'files', label: 'Search contacts', description: 'Search for people and orgs.', risk: 'READ' }
    ],
    actions: ['read-contacts', 'search-contacts'],
    triggers: [],
    resources: ['contact'],
    approvalPolicy: 'read-only by default; write actions require explicit approval',
    riskLevel: 'READ',
    healthCheck: 'people API metadata check',
    verificationStrategy: 'contact resource name and updated timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { contactId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    provider: 'google',
    description: 'Task lists and next-action ingestion for operational execution flows.',
    category: 'google',
    icon: 'tasks',
    documentation: 'https://developers.google.com/tasks',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['tasks.readonly', 'tasks'],
    capabilities: [
      { id: 'calendar.read', domain: 'calendar', label: 'Read tasks', description: 'Read task lists and task metadata.', risk: 'READ' },
      { id: 'calendar.create', domain: 'calendar', label: 'Create task', description: 'Create or update a task item.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['create-task', 'update-task'],
    triggers: ['task-due'],
    resources: ['task'],
    approvalPolicy: 'approval for task creation and change operations',
    riskLevel: 'DRAFT',
    healthCheck: 'task list and auth validation',
    verificationStrategy: 'task id and updated timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { taskListId: { type: 'string' } }, required: ['taskListId'] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    provider: 'youtube',
    description: 'Video content, channel insights, and publishing workflows.',
    category: 'social',
    icon: 'youtube',
    documentation: 'https://developers.google.com/youtube',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['youtube.readonly'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read video channel', description: 'Read channel and video metadata.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish video', description: 'Publish or update video content.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['read-channel', 'publish-video'],
    triggers: ['video-upload'],
    resources: ['video'],
    approvalPolicy: 'approval for public publish actions',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'channel metadata and OAuth validation',
    verificationStrategy: 'video id and publishedAt timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { channelId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'social'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    provider: 'google',
    description: 'Analytics and performance reporting across BrandOps content and campaigns.',
    category: 'google',
    icon: 'analytics',
    documentation: 'https://developers.google.com/analytics',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['analytics.readonly'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read analytics', description: 'Read analytics reports and trend data.', risk: 'READ' }
    ],
    actions: ['read-report'],
    triggers: ['analytics-update'],
    resources: ['report'],
    approvalPolicy: 'read-only unless an admin grants write access',
    riskLevel: 'READ',
    healthCheck: 'analytics account metadata and report validation',
    verificationStrategy: 'report id and date range metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { propertyId: { type: 'string' } }, required: ['propertyId'] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'google-search-console',
    name: 'Google Search Console',
    provider: 'google',
    description: 'Search performance, indexing, and content diagnostics.',
    category: 'google',
    icon: 'search',
    documentation: 'https://developers.google.com/search',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['searchconsole.readonly'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read Search Console', description: 'Read search performance and indexing data.', risk: 'READ' }
    ],
    actions: ['read-search-report'],
    triggers: [],
    resources: ['search-console-site'],
    approvalPolicy: 'read-only by default',
    riskLevel: 'READ',
    healthCheck: 'site list and auth validation',
    verificationStrategy: 'site url and report metrics timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { siteUrl: { type: 'string' } }, required: ['siteUrl'] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'firebase',
    name: 'Firebase',
    provider: 'firebase',
    description: 'App events, user data, and product telemetry integration for product-aware BrandOps workflows.',
    category: 'data',
    icon: 'firebase',
    documentation: 'https://firebase.google.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['firebase.readonly'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read app events', description: 'Read and analyze Firebase app telemetry.', risk: 'READ' }
    ],
    actions: ['read-events'],
    triggers: ['firebase-event'],
    resources: ['project'],
    approvalPolicy: 'read-only by default; writes require admin approval',
    riskLevel: 'READ',
    healthCheck: 'project list and telemetry validation',
    verificationStrategy: 'project id and event timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
    maturity: 'PLANNED',
    family: 'data'
  },
  {
    id: 'google-cloud',
    name: 'Google Cloud',
    provider: 'google',
    description: 'Cloud resource visibility and deployment readiness signals for operational workflows.',
    category: 'google',
    icon: 'cloud',
    documentation: 'https://cloud.google.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['cloud-platform.readonly'],
    capabilities: [
      { id: 'deployment.read', domain: 'deployment', label: 'Read deployment state', description: 'Read deployment metadata and cloud resources.', risk: 'READ' },
      { id: 'deployment.execute', domain: 'deployment', label: 'Execute deployment', description: 'Launch a deployment command or job.', approvalRequired: true, risk: 'DEPLOY_PRODUCTION' }
    ],
    actions: ['read-deployment-state', 'trigger-deploy'],
    triggers: ['deployment-event'],
    resources: ['cloud-resource'],
    approvalPolicy: 'approval for deployment or production-impacting changes',
    riskLevel: 'DEPLOY_PRODUCTION',
    healthCheck: 'cloud project metadata and permission scope check',
    verificationStrategy: 'resource id and deployment status output',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
    maturity: 'PLANNED',
    family: 'google'
  },
  {
    id: 'bigquery',
    name: 'BigQuery',
    provider: 'google',
    description: 'Warehouse-style analytics access for data-provenance, reporting and insight loops.',
    category: 'data',
    icon: 'bigquery',
    documentation: 'https://cloud.google.com/bigquery/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'database',
    authentication: 'oauth2',
    scopes: ['bigquery.readonly'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read warehouse data', description: 'Read BigQuery tables and reports.', risk: 'READ' },
      { id: 'files.search', domain: 'files', label: 'Search data', description: 'Search table schemas and result sets.', risk: 'READ' }
    ],
    actions: ['query-dataset'],
    triggers: ['data-refresh'],
    resources: ['table'],
    approvalPolicy: 'approval for reads of regulated data and writes to warehouse tables',
    riskLevel: 'READ',
    healthCheck: 'query smoke test with metadata-only read',
    verificationStrategy: 'query job id and row count',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { dataset: { type: 'string' } }, required: ['dataset'] },
    maturity: 'PLANNED',
    family: 'data'
  },
  {
    id: 'outlook',
    name: 'Outlook',
    provider: 'microsoft',
    description: 'Microsoft email and calendar integration across the Microsoft 365 ecosystem.',
    category: 'microsoft',
    icon: 'outlook',
    documentation: 'https://learn.microsoft.com/graph',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['Mail.Read', 'Mail.Send', 'Calendars.ReadWrite'],
    capabilities: [
      { id: 'email.read', domain: 'email', label: 'Read email', description: 'Read Outlook mail and thread metadata.', risk: 'READ' },
      { id: 'email.send', domain: 'email', label: 'Send Outlook mail', description: 'Send mail through Microsoft Graph.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'calendar.read', domain: 'calendar', label: 'Read calendar', description: 'Read Outlook calendars.', risk: 'READ' },
      { id: 'calendar.create', domain: 'calendar', label: 'Create event', description: 'Create Microsoft calendar events.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['send-mail', 'create-event'],
    triggers: ['mail-received'],
    resources: ['mail-item', 'calendar-event'],
    approvalPolicy: 'approval for external send and scheduled event changes',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'Graph profile and permissions smoke test',
    verificationStrategy: 'message id or event id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { tenantId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'microsoft'
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    provider: 'microsoft',
    description: 'Unified Microsoft 365 Graph integration for productivity resources and permissions.',
    category: 'microsoft',
    icon: 'microsoft',
    documentation: 'https://learn.microsoft.com/graph',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['User.Read', 'Files.ReadWrite', 'Sites.ReadWrite.All'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read OneDrive files', description: 'Read files and document metadata.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create file', description: 'Create files in OneDrive or SharePoint.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-file', 'create-file'],
    triggers: ['sharepoint-update'],
    resources: ['drive-file', 'site'],
    approvalPolicy: 'approval for writes and share operations',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'Graph token and drive metadata validation',
    verificationStrategy: 'drive item id and last modified timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { siteId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'microsoft'
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    provider: 'microsoft',
    description: 'File storage and document retrieval for Microsoft-centric workflows.',
    category: 'knowledge',
    icon: 'onedrive',
    documentation: 'https://learn.microsoft.com/graph',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['Files.ReadWrite'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read files', description: 'Read OneDrive files and folders.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create files', description: 'Create or upload files.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-file', 'upload-file'],
    triggers: ['drive-change'],
    resources: ['drive-item'],
    approvalPolicy: 'approval for write or share actions',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'drive item listing and auth validation',
    verificationStrategy: 'file id and modified time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { driveId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'knowledge'
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    provider: 'microsoft',
    description: 'Structured document and team-site data access for knowledge and content workflows.',
    category: 'knowledge',
    icon: 'sharepoint',
    documentation: 'https://learn.microsoft.com/sharepoint',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['Sites.ReadWrite.All'],
    capabilities: [
      { id: 'documents.read', domain: 'documents', label: 'Read SharePoint docs', description: 'Read site documents and lists.', risk: 'READ' },
      { id: 'documents.create', domain: 'documents', label: 'Create SharePoint doc', description: 'Create documents in SharePoint libraries.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-doc', 'create-doc'],
    triggers: ['site-change'],
    resources: ['site-document'],
    approvalPolicy: 'approval for document creation or update actions',
    riskLevel: 'DRAFT',
    healthCheck: 'site list and auth validation',
    verificationStrategy: 'document id and last modified time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { siteUrl: { type: 'string' } }, required: ['siteUrl'] },
    maturity: 'PLANNED',
    family: 'knowledge'
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    provider: 'microsoft',
    description: 'Messaging and workflow orchestration in collaboration channels.',
    category: 'communication',
    icon: 'teams',
    documentation: 'https://learn.microsoft.com/graph',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['Chat.Read', 'ChatMessage.Send'],
    capabilities: [
      { id: 'messages.read', domain: 'messages', label: 'Read Teams messages', description: 'Read channel or chat messages.', risk: 'READ' },
      { id: 'messages.send', domain: 'messages', label: 'Send Teams message', description: 'Send a message to a channel or chat.', approvalRequired: true, risk: 'SEND_EXTERNAL' }
    ],
    actions: ['send-message'],
    triggers: ['team-message'],
    resources: ['chat'],
    approvalPolicy: 'approval for messages to shared channels',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'Graph chat metadata validation',
    verificationStrategy: 'chat id and message timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { teamId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'communication'
  },
  {
    id: 'discord',
    name: 'Discord',
    provider: 'discord',
    description: 'Community and channel notifications for launch and event communications.',
    category: 'communication',
    icon: 'discord',
    documentation: 'https://discord.com/developers/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['guilds.members.read', 'messages.read', 'messages.write'],
    capabilities: [
      { id: 'messages.read', domain: 'messages', label: 'Read Discord messages', description: 'Read channel messages and announcements.', risk: 'READ' },
      { id: 'messages.send', domain: 'messages', label: 'Send Discord message', description: 'Send a channel message.', approvalRequired: true, risk: 'SEND_EXTERNAL' }
    ],
    actions: ['send-message'],
    triggers: ['discord-message'],
    resources: ['channel'],
    approvalPolicy: 'approval before posting to community channels',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'oauth and guild metadata validation',
    verificationStrategy: 'message id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { guildId: { type: 'string' } }, required: ['guildId'] },
    maturity: 'PLANNED',
    family: 'communication'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    provider: 'telegram',
    description: 'Direct messaging and broadcast delivery for operational updates.',
    category: 'communication',
    icon: 'telegram',
    documentation: 'https://core.telegram.org/bots/api',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['sendMessages', 'getUpdates'],
    capabilities: [
      { id: 'messages.send', domain: 'messages', label: 'Send Telegram message', description: 'Send a plain or formatted message.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'messages.read', domain: 'messages', label: 'Read Telegram updates', description: 'Read bot message updates.', risk: 'READ' }
    ],
    actions: ['send-message'],
    triggers: ['telegram-update'],
    resources: ['chat'],
    approvalPolicy: 'approval before sending to user or channel groups',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'bot token and chat metadata validation',
    verificationStrategy: 'message id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { chatId: { type: 'string' } }, required: ['chatId'] },
    maturity: 'PLANNED',
    family: 'communication'
  },
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business',
    provider: 'whatsapp',
    description: 'Message and customer support channels for business workflows.',
    category: 'communication',
    icon: 'whatsapp',
    documentation: 'https://developers.facebook.com/docs/whatsapp',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
    capabilities: [
      { id: 'messages.send', domain: 'messages', label: 'Send WhatsApp message', description: 'Send outbound WhatsApp messages.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'messages.read', domain: 'messages', label: 'Read WhatsApp messages', description: 'Read incoming message metadata.', risk: 'READ' }
    ],
    actions: ['send-message'],
    triggers: ['whatsapp-message'],
    resources: ['message'],
    approvalPolicy: 'approval before sending to customers or external contacts',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'business profile and message API validation',
    verificationStrategy: 'message id and status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { businessAccountId: { type: 'string' } }, required: ['businessAccountId'] },
    maturity: 'PLANNED',
    family: 'communication'
  },
  {
    id: 'twilio',
    name: 'Twilio',
    provider: 'twilio',
    description: 'SMS and voice workflows for outreach, reminders, and operational messaging.',
    category: 'communication',
    icon: 'twilio',
    documentation: 'https://www.twilio.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['sms', 'voice'],
    capabilities: [
      { id: 'messages.send', domain: 'messages', label: 'Send SMS', description: 'Send an SMS through Twilio.', approvalRequired: true, risk: 'SEND_EXTERNAL' }
    ],
    actions: ['send-sms'],
    triggers: ['sms-status'],
    resources: ['sms-message'],
    approvalPolicy: 'approval for customer-facing outgoing messaging',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'Twilio account validation and API connectivity',
    verificationStrategy: 'message SID and delivery status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { accountSid: { type: 'string' } }, required: ['accountSid'] },
    maturity: 'PLANNED',
    family: 'communication'
  },
  {
    id: 'x',
    name: 'X',
    provider: 'x',
    description: 'Public social posting and engagement for professional brand voice and distribution.',
    category: 'social',
    icon: 'x',
    documentation: 'https://docs.x.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'oauth',
    authentication: 'oauth2',
    scopes: ['tweet.write', 'tweet.read'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read X profile', description: 'Read profile and account metadata.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish X post', description: 'Publish a public post or thread.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['publish-post'],
    triggers: [],
    resources: ['tweet'],
    approvalPolicy: 'approval before public posting',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'OAuth and profile validation',
    verificationStrategy: 'tweet id and post timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] },
    maturity: 'PLANNED',
    family: 'social'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    provider: 'instagram',
    description: 'Instagram business publishing and content distribution flows.',
    category: 'social',
    icon: 'instagram',
    documentation: 'https://developers.facebook.com/docs/instagram',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'oauth',
    authentication: 'oauth2',
    scopes: ['instagram_basic', 'pages_manage_posts'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read Instagram account', description: 'Read profile and media metadata.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish Instagram post', description: 'Publish a photo or reel.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['publish-post'],
    triggers: [],
    resources: ['media'],
    approvalPolicy: 'approval before publishing to the public account',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'Instagram graph permissions validation',
    verificationStrategy: 'media id and published timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] },
    maturity: 'PLANNED',
    family: 'social'
  },
  {
    id: 'facebook-pages',
    name: 'Facebook Pages',
    provider: 'facebook',
    description: 'Page content management for marketing and social operations.',
    category: 'social',
    icon: 'facebook',
    documentation: 'https://developers.facebook.com/docs/pages',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'oauth',
    authentication: 'oauth2',
    scopes: ['pages_manage_posts', 'pages_read_engagement'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read page content', description: 'Read page activity and engagement.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish page update', description: 'Publish a page post.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['publish-post'],
    triggers: ['page-update'],
    resources: ['page-post'],
    approvalPolicy: 'approval before public page publishing',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'page access validation and post permission check',
    verificationStrategy: 'post id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { pageId: { type: 'string' } }, required: ['pageId'] },
    maturity: 'PLANNED',
    family: 'social'
  },
  {
    id: 'threads',
    name: 'Threads',
    provider: 'threads',
    description: 'Threads publishing workflows for brand and creator distribution.',
    category: 'social',
    icon: 'threads',
    documentation: 'https://developers.facebook.com/docs/threads',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'oauth',
    authentication: 'oauth2',
    scopes: ['threads_basic', 'threads_manage_insights'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read Threads profile', description: 'Read Threads profile and media metadata.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish Threads post', description: 'Publish a Threads post.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['publish-post'],
    triggers: [],
    resources: ['thread-post'],
    approvalPolicy: 'approval before public Threads content',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'Threads auth status and account validation',
    verificationStrategy: 'post id and publish timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] },
    maturity: 'PLANNED',
    family: 'social'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    provider: 'tiktok',
    description: 'Short-form video publishing and content distribution on TikTok.',
    category: 'social',
    icon: 'tiktok',
    documentation: 'https://developers.tiktok.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'oauth',
    authentication: 'oauth2',
    scopes: ['video.upload', 'user.info.basic'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read TikTok profile', description: 'Read account metadata and content facts.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish TikTok video', description: 'Publish a TikTok video.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['publish-video'],
    triggers: [],
    resources: ['video'],
    approvalPolicy: 'approval before public publishing',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'TikTok OAuth permission check',
    verificationStrategy: 'video id and publish status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] },
    maturity: 'PLANNED',
    family: 'social'
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    provider: 'gitlab',
    description: 'GitLab repository and issue workflows for development operations.',
    category: 'development',
    icon: 'gitlab',
    documentation: 'https://docs.gitlab.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['api'],
    capabilities: [
      { id: 'code.read', domain: 'code', label: 'Read GitLab repos', description: 'Read project metadata and issue state.', risk: 'READ' },
      { id: 'code.write', domain: 'code', label: 'Write GitLab repo', description: 'Create issues or merge requests.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-repo', 'create-issue'],
    triggers: ['gitlab-pipeline'],
    resources: ['repo'],
    approvalPolicy: 'approval before pushing or merging to protected branches',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'API auth and project metadata validation',
    verificationStrategy: 'project id and merge request id',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
    maturity: 'PLANNED',
    family: 'development'
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    provider: 'bitbucket',
    description: 'Repository operations and pull request workflows for engineering teams.',
    category: 'development',
    icon: 'bitbucket',
    documentation: 'https://developer.atlassian.com/cloud/bitbucket',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['account', 'repository'],
    capabilities: [
      { id: 'code.read', domain: 'code', label: 'Read Bitbucket repo', description: 'Read repository metadata and PR state.', risk: 'READ' },
      { id: 'code.write', domain: 'code', label: 'Write Bitbucket repo', description: 'Create pull requests or issue updates.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-repo', 'create-pr'],
    triggers: ['bitbucket-commit'],
    resources: ['repo'],
    approvalPolicy: 'approval before write operations on protected repos',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'repo and auth metadata validation',
    verificationStrategy: 'commit id or PR id',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { workspaceId: { type: 'string' } }, required: ['workspaceId'] },
    maturity: 'PLANNED',
    family: 'development'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    provider: 'vercel',
    description: 'Deployment orchestration and preview environment coordination.',
    category: 'development',
    icon: 'vercel',
    documentation: 'https://vercel.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['deployment'],
    capabilities: [
      { id: 'deployment.read', domain: 'deployment', label: 'Read deploy status', description: 'Read deployment metadata and status.', risk: 'READ' },
      { id: 'deployment.execute', domain: 'deployment', label: 'Deploy project', description: 'Trigger a project deployment.', approvalRequired: true, risk: 'DEPLOY_PRODUCTION' }
    ],
    actions: ['trigger-deploy'],
    triggers: ['deployment-status'],
    resources: ['deployment'],
    approvalPolicy: 'approval for production deployment or rollback',
    riskLevel: 'DEPLOY_PRODUCTION',
    healthCheck: 'deployment API validation',
    verificationStrategy: 'deployment id and URL state',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
    maturity: 'PLANNED',
    family: 'development'
  },
  {
    id: 'netlify',
    name: 'Netlify',
    provider: 'netlify',
    description: 'Static site deployment and preview pipeline integration.',
    category: 'development',
    icon: 'netlify',
    documentation: 'https://docs.netlify.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['deploys'],
    capabilities: [
      { id: 'deployment.read', domain: 'deployment', label: 'Read Netlify deploys', description: 'Read deployment metadata and status.', risk: 'READ' },
      { id: 'deployment.execute', domain: 'deployment', label: 'Trigger deploy', description: 'Trigger a deploy on a site.', approvalRequired: true, risk: 'DEPLOY_PRODUCTION' }
    ],
    actions: ['trigger-deploy'],
    triggers: ['deploy-status'],
    resources: ['site'],
    approvalPolicy: 'approval for production deploys',
    riskLevel: 'DEPLOY_PRODUCTION',
    healthCheck: 'site metadata and deploy API validation',
    verificationStrategy: 'deploy id and URL',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { siteId: { type: 'string' } }, required: ['siteId'] },
    maturity: 'PLANNED',
    family: 'development'
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    provider: 'cloudflare',
    description: 'Edge and DNS operations for production infrastructure and domain health.',
    category: 'development',
    icon: 'cloudflare',
    documentation: 'https://developers.cloudflare.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['zone:read', 'zone:write'],
    capabilities: [
      { id: 'deployment.read', domain: 'deployment', label: 'Read Cloudflare config', description: 'Read zone and edge configuration state.', risk: 'READ' },
      { id: 'deployment.execute', domain: 'deployment', label: 'Edit DNS or edge config', description: 'Apply DNS or CDN changes.', approvalRequired: true, risk: 'MODIFY_SECURITY' }
    ],
    actions: ['update-dns'],
    triggers: ['dns-change'],
    resources: ['zone'],
    approvalPolicy: 'approval for production DNS and edge changes',
    riskLevel: 'MODIFY_SECURITY',
    healthCheck: 'zone status and API validation',
    verificationStrategy: 'zone id and change status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { zoneId: { type: 'string' } }, required: ['zoneId'] },
    maturity: 'PLANNED',
    family: 'development'
  },
  {
    id: 'sentry',
    name: 'Sentry',
    provider: 'sentry',
    description: 'Error monitoring and incident health for product and release observation.',
    category: 'observability',
    icon: 'sentry',
    documentation: 'https://docs.sentry.io',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['project:read'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read Sentry errors', description: 'Read production error events and issue trends.', risk: 'READ' }
    ],
    actions: ['read-issues'],
    triggers: ['issue-created'],
    resources: ['issue'],
    approvalPolicy: 'read-only unless an admin grants issue assignments or remediation writes',
    riskLevel: 'READ',
    healthCheck: 'project metadata and auth validation',
    verificationStrategy: 'issue id and event timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { organization: { type: 'string' } }, required: ['organization'] },
    maturity: 'PLANNED',
    family: 'observability'
  },
  {
    id: 'linear',
    name: 'Linear',
    provider: 'linear',
    description: 'Issue and project tracking for product and engineering planning.',
    category: 'development',
    icon: 'linear',
    documentation: 'https://developers.linear.app',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'code.read', domain: 'code', label: 'Read issues', description: 'Read Linear issues and teams.', risk: 'READ' },
      { id: 'code.write', domain: 'code', label: 'Write issue', description: 'Create or update product issues.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['create-issue'],
    triggers: ['issue-update'],
    resources: ['issue'],
    approvalPolicy: 'approval for issue creation and project-state changes',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'workspace metadata and project validation',
    verificationStrategy: 'issue id and updatedAt',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { teamId: { type: 'string' } }, required: ['teamId'] },
    maturity: 'PARTIAL',
    family: 'development'
  },
  {
    id: 'jira',
    name: 'Jira',
    provider: 'jira',
    description: 'Engineering and project execution tracking for teams using Jira.',
    category: 'development',
    icon: 'jira',
    documentation: 'https://developer.atlassian.com/cloud/jira',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['read:jira-work', 'write:jira-work'],
    capabilities: [
      { id: 'code.read', domain: 'code', label: 'Read Jira tickets', description: 'Read ticket state and board metadata.', risk: 'READ' },
      { id: 'code.write', domain: 'code', label: 'Write Jira ticket', description: 'Create or update tickets and subtasks.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['create-ticket'],
    triggers: ['issue-transition'],
    resources: ['ticket'],
    approvalPolicy: 'approval before issue creation or workflow transitions',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'workspace and authentication validation',
    verificationStrategy: 'issue key and updated timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { projectKey: { type: 'string' } }, required: ['projectKey'] },
    maturity: 'PLANNED',
    family: 'development'
  },
  {
    id: 'notion',
    name: 'Notion',
    provider: 'notion',
    description: 'Workspace knowledge, docs, and structured database access.',
    category: 'knowledge',
    icon: 'notion',
    documentation: 'https://developers.notion.com',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'documents.read', domain: 'documents', label: 'Read Notion page', description: 'Read pages and database entries.', risk: 'READ' },
      { id: 'documents.create', domain: 'documents', label: 'Create Notion page', description: 'Create documents and database objects.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-page', 'create-page'],
    triggers: ['notion-database-change'],
    resources: ['page'],
    approvalPolicy: 'approval for writes to shared knowledge bases',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'Notion token validation and page metadata fetch',
    verificationStrategy: 'page id and last edited time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { databaseId: { type: 'string' } }, required: [] },
    maturity: 'PARTIAL',
    family: 'knowledge'
  },
  {
    id: 'confluence',
    name: 'Confluence',
    provider: 'confluence',
    description: 'Knowledge base and team documentation management.',
    category: 'knowledge',
    icon: 'confluence',
    documentation: 'https://developer.atlassian.com/cloud/confluence',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['read:confluence-content', 'write:confluence-content'],
    capabilities: [
      { id: 'documents.read', domain: 'documents', label: 'Read Confluence page', description: 'Read article and documentation content.', risk: 'READ' },
      { id: 'documents.create', domain: 'documents', label: 'Create Confluence page', description: 'Create or update wiki content.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-page', 'create-page'],
    triggers: ['page-update'],
    resources: ['page'],
    approvalPolicy: 'approval for team-wide updates to public docs',
    riskLevel: 'DRAFT',
    healthCheck: 'content API and auth validation',
    verificationStrategy: 'page id and version number',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { spaceKey: { type: 'string' } }, required: ['spaceKey'] },
    maturity: 'PLANNED',
    family: 'knowledge'
  },
  {
    id: 'airtable',
    name: 'Airtable',
    provider: 'airtable',
    description: 'Structured data, operational records, and database-aware workflows.',
    category: 'knowledge',
    icon: 'airtable',
    documentation: 'https://airtable.com/developers/web/api',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['data.records:read', 'data.records:write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read Airtable records', description: 'Read rows from Airtable bases.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create Airtable row', description: 'Create or update a record.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-records', 'create-record'],
    triggers: ['record-change'],
    resources: ['table-row'],
    approvalPolicy: 'approval for writes to shared operational records',
    riskLevel: 'DRAFT',
    healthCheck: 'base metadata and API authentication validation',
    verificationStrategy: 'record id and updated time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { baseId: { type: 'string' } }, required: ['baseId'] },
    maturity: 'PARTIAL',
    family: 'knowledge'
  },
  {
    id: 'coda',
    name: 'Coda',
    provider: 'coda',
    description: 'Collaborative document and structured workspace integration.',
    category: 'knowledge',
    icon: 'coda',
    documentation: 'https://coda.io/developer',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['doc.read', 'doc.write'],
    capabilities: [
      { id: 'documents.read', domain: 'documents', label: 'Read Coda doc', description: 'Read a Coda doc and table data.', risk: 'READ' },
      { id: 'documents.create', domain: 'documents', label: 'Create Coda doc', description: 'Create or update a Coda document.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-doc', 'create-doc'],
    triggers: ['doc-update'],
    resources: ['doc'],
    approvalPolicy: 'approval for writes to team documents',
    riskLevel: 'DRAFT',
    healthCheck: 'doc metadata and API validation',
    verificationStrategy: 'doc id and version',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { docId: { type: 'string' } }, required: ['docId'] },
    maturity: 'PLANNED',
    family: 'knowledge'
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    provider: 'dropbox',
    description: 'File-sharing and document sync for cross-platform workspaces.',
    category: 'knowledge',
    icon: 'dropbox',
    documentation: 'https://www.dropbox.com/developers',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['files.metadata.read', 'files.content.read'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read Dropbox files', description: 'Read file metadata and document content.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create Dropbox file', description: 'Upload or create a file.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-file', 'upload-file'],
    triggers: ['file-change'],
    resources: ['file'],
    approvalPolicy: 'approval for writes or shared-file changes',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'Dropbox auth and folder metadata validation',
    verificationStrategy: 'file id and server modified time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { folderPath: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'knowledge'
  },
  {
    id: 'box',
    name: 'Box',
    provider: 'box',
    description: 'Enterprise file management and document federation integration.',
    category: 'knowledge',
    icon: 'box',
    documentation: 'https://developer.box.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['root.read', 'write.all'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read Box files', description: 'Read files and folder metadata.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create Box file', description: 'Upload or create a file.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-file', 'upload-file'],
    triggers: ['box-event'],
    resources: ['file'],
    approvalPolicy: 'approval for writes to shared enterprise folders',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'Box token and enterprise metadata validation',
    verificationStrategy: 'file id and modified time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { folderId: { type: 'string' } }, required: [] },
    maturity: 'PLANNED',
    family: 'knowledge'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    provider: 'hubspot',
    description: 'CRM and lifecycle data integration for sales and marketing workflows.',
    category: 'crm',
    icon: 'hubspot',
    documentation: 'https://developers.hubspot.com',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read CRM data', description: 'Read contact and company data.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create CRM object', description: 'Create or update CRM objects.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-contact', 'create-contact'],
    triggers: ['deal-change'],
    resources: ['contact'],
    approvalPolicy: 'approval for CRM writes and pipeline changes',
    riskLevel: 'DRAFT',
    healthCheck: 'HubSpot OAuth and object metadata validation',
    verificationStrategy: 'object id and last modified date',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { portalId: { type: 'string' } }, required: [] },
    maturity: 'PARTIAL',
    family: 'crm'
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    provider: 'salesforce',
    description: 'Salesforce CRM operations and account intelligence for revenue workflows.',
    category: 'crm',
    icon: 'salesforce',
    documentation: 'https://developer.salesforce.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['api', 'refresh_token'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read Salesforce records', description: 'Read sales and account records.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Create Salesforce record', description: 'Create or update CRM records.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-record', 'create-record'],
    triggers: ['record-change'],
    resources: ['sobject'],
    approvalPolicy: 'approval for writes and customer-data modifications',
    riskLevel: 'DRAFT',
    healthCheck: 'API connectivity and object schema validation',
    verificationStrategy: 'record id and last modified timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { instanceUrl: { type: 'string' } }, required: ['instanceUrl'] },
    maturity: 'PLANNED',
    family: 'crm'
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    provider: 'pipedrive',
    description: 'Pipeline, deals, and activity management for revenue operations.',
    category: 'crm',
    icon: 'pipedrive',
    documentation: 'https://pipedrive.readme.io',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['deals:read', 'deals:write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read deals', description: 'Read deal and activity metadata.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Update deal', description: 'Create or update a deal.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['read-deal', 'create-deal'],
    triggers: ['deal-change'],
    resources: ['deal'],
    approvalPolicy: 'approval for deal creation or pipeline-stage updates',
    riskLevel: 'DRAFT',
    healthCheck: 'API auth and pipeline schema validation',
    verificationStrategy: 'deal id and updatedAt',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { companyId: { type: 'string' } }, required: ['companyId'] },
    maturity: 'PLANNED',
    family: 'crm'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    provider: 'mailchimp',
    description: 'Audience and campaign orchestration for marketing operations.',
    category: 'marketing',
    icon: 'mailchimp',
    documentation: 'https://mailchimp.com/developer',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['campaigns:read', 'campaigns:write'],
    capabilities: [
      { id: 'email.send', domain: 'email', label: 'Send campaign', description: 'Send a campaign via Mailchimp.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'analytics.read', domain: 'analytics', label: 'Read campaign stats', description: 'Read campaign metrics.', risk: 'READ' }
    ],
    actions: ['send-campaign'],
    triggers: ['campaign-event'],
    resources: ['campaign'],
    approvalPolicy: 'approval for externally sent marketing content',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'API key validation and list metadata check',
    verificationStrategy: 'campaign id and send status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { listId: { type: 'string' } }, required: ['listId'] },
    maturity: 'PLANNED',
    family: 'marketing'
  },
  {
    id: 'brevo',
    name: 'Brevo',
    provider: 'brevo',
    description: 'Email automation and campaign orchestration workflows.',
    category: 'marketing',
    icon: 'brevo',
    documentation: 'https://developers.brevo.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['smtp', 'campaign'],
    capabilities: [
      { id: 'email.send', domain: 'email', label: 'Send Brevo email', description: 'Send email campaigns or transactional messages.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'analytics.read', domain: 'analytics', label: 'Read campaign performance', description: 'Read deliverability and engagement stats.', risk: 'READ' }
    ],
    actions: ['send-email'],
    triggers: ['campaign-status'],
    resources: ['campaign'],
    approvalPolicy: 'approval before external email dispatch',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'SMTP and API validation',
    verificationStrategy: 'campaign id and email status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { listId: { type: 'string' } }, required: ['listId'] },
    maturity: 'PLANNED',
    family: 'marketing'
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    provider: 'klaviyo',
    description: 'Lifecycle email and segmentation flows for marketing programs.',
    category: 'marketing',
    icon: 'klaviyo',
    documentation: 'https://developers.klaviyo.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['events:read', 'events:write'],
    capabilities: [
      { id: 'email.send', domain: 'email', label: 'Send Klaviyo flow', description: 'Send a campaign or flow email.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'analytics.read', domain: 'analytics', label: 'Read metrics', description: 'Read event and campaign performance metrics.', risk: 'READ' }
    ],
    actions: ['send-email'],
    triggers: ['event-trigger'],
    resources: ['flow'],
    approvalPolicy: 'approval before customer-facing email dispatch',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'Klaviyo API connectivity and list validation',
    verificationStrategy: 'event id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { listId: { type: 'string' } }, required: ['listId'] },
    maturity: 'PLANNED',
    family: 'marketing'
  },
  {
    id: 'buffer',
    name: 'Buffer',
    provider: 'buffer',
    description: 'Social scheduling and publishing workflows for content distribution.',
    category: 'marketing',
    icon: 'buffer',
    documentation: 'https://buffer.com/developers',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['account:read', 'updates:write'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read Buffer profiles', description: 'Read social account and schedule metadata.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish via Buffer', description: 'Queue or publish social updates.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['publish-post'],
    triggers: ['schedule-publish'],
    resources: ['post'],
    approvalPolicy: 'approval before public scheduling or publish',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'profile and schedule validation',
    verificationStrategy: 'buffer update id and scheduled time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { profileId: { type: 'string' } }, required: ['profileId'] },
    maturity: 'PLANNED',
    family: 'marketing'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    provider: 'stripe',
    description: 'Monetization and billing workflows for subscriptions and revenue operations.',
    category: 'payments',
    icon: 'stripe',
    documentation: 'https://stripe.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['read_write'],
    capabilities: [
      { id: 'payments.read', domain: 'payments', label: 'Read payment data', description: 'Read billing and customer data.', risk: 'READ' },
      { id: 'payments.manage', domain: 'payments', label: 'Manage Stripe payments', description: 'Manage subscriptions and invoices.', approvalRequired: true, risk: 'PAYMENT' }
    ],
    actions: ['read-invoice', 'create-subscription'],
    triggers: ['payment-event'],
    resources: ['invoice'],
    approvalPolicy: 'approval for billing changes or customer-facing payment actions',
    riskLevel: 'PAYMENT',
    healthCheck: 'billing API validation and permissions smoke test',
    verificationStrategy: 'invoice id and payment status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { accountId: { type: 'string' } }, required: ['accountId'] },
    maturity: 'PLANNED',
    family: 'payments'
  },
  {
    id: 'revenuecat',
    name: 'RevenueCat',
    provider: 'revenuecat',
    description: 'Subscription and app revenue lifecycle integration.',
    category: 'payments',
    icon: 'revenuecat',
    documentation: 'https://www.revenuecat.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'payments.read', domain: 'payments', label: 'Read subscriptions', description: 'Read subscription and revenue state.', risk: 'READ' },
      { id: 'payments.manage', domain: 'payments', label: 'Manage subscriptions', description: 'Create or update offers and entitlements.', approvalRequired: true, risk: 'PAYMENT' }
    ],
    actions: ['read-subscriptions', 'sync-offer'],
    triggers: ['subscription-event'],
    resources: ['subscription'],
    approvalPolicy: 'approval for pricing and entitlement changes',
    riskLevel: 'PAYMENT',
    healthCheck: 'RevenueCat API status validation',
    verificationStrategy: 'entitlement and subscription ids',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { appId: { type: 'string' } }, required: ['appId'] },
    maturity: 'PLANNED',
    family: 'payments'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    provider: 'paypal',
    description: 'Payments and transaction monitoring for commerce and monetization workflows.',
    category: 'payments',
    icon: 'paypal',
    documentation: 'https://developer.paypal.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['payments.read', 'payments.write'],
    capabilities: [
      { id: 'payments.read', domain: 'payments', label: 'Read PayPal transactions', description: 'Read transaction and customer payment metadata.', risk: 'READ' },
      { id: 'payments.manage', domain: 'payments', label: 'Manage PayPal payments', description: 'Create refunds or payment operations.', approvalRequired: true, risk: 'PAYMENT' }
    ],
    actions: ['read-transaction', 'issue-refund'],
    triggers: ['payment-status'],
    resources: ['payment'],
    approvalPolicy: 'approval for payment or refund operations',
    riskLevel: 'PAYMENT',
    healthCheck: 'PayPal merchant API and OAuth validation',
    verificationStrategy: 'transaction id and status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { merchantId: { type: 'string' } }, required: ['merchantId'] },
    maturity: 'PLANNED',
    family: 'payments'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    provider: 'zapier',
    description: 'Automation orchestration between BrandOps and supported services.',
    category: 'automation',
    icon: 'zapier',
    documentation: 'https://zapier.com/developer',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['zaps:read', 'zaps:write'],
    capabilities: [
      { id: 'trigger', domain: 'automation', label: 'Trigger workflow', description: 'Trigger a Zap or automation workflow.', risk: 'READ' },
      { id: 'sync', domain: 'automation', label: 'Sync workflow', description: 'Sync event payloads through an automation system.', risk: 'READ' }
    ],
    actions: ['trigger-zap'],
    triggers: ['automation-trigger'],
    resources: ['zap'],
    approvalPolicy: 'approval for automation triggers with external side effects',
    riskLevel: 'READ',
    healthCheck: 'API key and workflow metadata validation',
    verificationStrategy: 'automation run id and status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { zapId: { type: 'string' } }, required: ['zapId'] },
    maturity: 'PLANNED',
    family: 'automation'
  },
  {
    id: 'make',
    name: 'Make',
    provider: 'make',
    description: 'Workflow automation and orchestrated integration tasks.',
    category: 'automation',
    icon: 'make',
    documentation: 'https://www.make.com/en/api-documentation',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['scenarios:read', 'scenarios:write'],
    capabilities: [
      { id: 'trigger', domain: 'automation', label: 'Trigger scenario', description: 'Trigger a Make scenario.', risk: 'READ' },
      { id: 'sync', domain: 'automation', label: 'Sync data', description: 'Sync data through a scenario flow.', risk: 'READ' }
    ],
    actions: ['trigger-scenario'],
    triggers: ['scenario-run'],
    resources: ['scenario'],
    approvalPolicy: 'approval before external automation triggers run',
    riskLevel: 'READ',
    healthCheck: 'scenario and auth connectivity validation',
    verificationStrategy: 'scenario run id and status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { scenarioId: { type: 'string' } }, required: ['scenarioId'] },
    maturity: 'PLANNED',
    family: 'automation'
  },
  {
    id: 'n8n',
    name: 'n8n',
    provider: 'n8n',
    description: 'Workflow and API automation orchestration for custom external tasks.',
    category: 'automation',
    icon: 'n8n',
    documentation: 'https://docs.n8n.io',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['workflows:read', 'workflows:write'],
    capabilities: [
      { id: 'trigger', domain: 'automation', label: 'Trigger workflow', description: 'Trigger an n8n workflow.', risk: 'READ' },
      { id: 'sync', domain: 'automation', label: 'Sync workflow data', description: 'Sync events through a workflow runner.', risk: 'READ' }
    ],
    actions: ['trigger-workflow'],
    triggers: ['workflow-event'],
    resources: ['workflow'],
    approvalPolicy: 'approval before external automation triggers execute',
    riskLevel: 'READ',
    healthCheck: 'workflow metadata and auth validation',
    verificationStrategy: 'execution id and finish state',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { workflowId: { type: 'string' } }, required: ['workflowId'] },
    maturity: 'PLANNED',
    family: 'automation'
  },
  {
    id: 'calendly',
    name: 'Calendly',
    provider: 'calendly',
    description: 'Scheduling flows and meeting coordination for outbound and customer interaction.',
    category: 'meetings',
    icon: 'calendly',
    documentation: 'https://developer.calendly.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['scheduling:read', 'scheduling:write'],
    capabilities: [
      { id: 'calendar.read', domain: 'calendar', label: 'Read meeting links', description: 'Read calendly scheduling state.', risk: 'READ' },
      { id: 'calendar.create', domain: 'calendar', label: 'Create meeting', description: 'Create a Calendly event or invite.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['create-invite'],
    triggers: ['booking-event'],
    resources: ['booking'],
    approvalPolicy: 'approval for scheduling actions with customer-facing impact',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'scheduling API validation',
    verificationStrategy: 'event uuid and booking status',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { ownerId: { type: 'string' } }, required: ['ownerId'] },
    maturity: 'PLANNED',
    family: 'meetings'
  },
  {
    id: 'zoom',
    name: 'Zoom',
    provider: 'zoom',
    description: 'Video conferencing, scheduling, and meeting activity integration.',
    category: 'meetings',
    icon: 'zoom',
    documentation: 'https://developers.zoom.us',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['meeting:read', 'meeting:write'],
    capabilities: [
      { id: 'calendar.read', domain: 'calendar', label: 'Read meeting stats', description: 'Read meeting metadata and attendance.', risk: 'READ' },
      { id: 'calendar.create', domain: 'calendar', label: 'Create Zoom meeting', description: 'Schedule a Zoom call.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['create-meeting'],
    triggers: ['meeting-ended'],
    resources: ['meeting'],
    approvalPolicy: 'approval for meeting scheduling and invites',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'Zoom OAuth and meeting validation',
    verificationStrategy: 'meeting id and start time',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] },
    maturity: 'PLANNED',
    family: 'meetings'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    provider: 'gemini',
    description: 'Model access and AI workflow orchestration for agent and assistant use cases.',
    category: 'ai',
    icon: 'gemini',
    documentation: 'https://ai.google.dev',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'mcp',
    authentication: 'api-key',
    scopes: ['model:generate', 'model:reason'],
    capabilities: [
      { id: 'execute', domain: 'ai', label: 'Execute model task', description: 'Run a model-based generation or reasoning task.', risk: 'READ' }
    ],
    actions: ['generate-content'],
    triggers: ['model-request'],
    resources: ['model-task'],
    approvalPolicy: 'approval only for external or high-impact completions',
    riskLevel: 'READ',
    healthCheck: 'model endpoint and token validation',
    verificationStrategy: 'response id and completion metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { model: { type: 'string' } }, required: ['model'] },
    maturity: 'AVAILABLE_THROUGH_MCP',
    family: 'ai'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    provider: 'openai',
    description: 'External LLM integration via API for strategic reasoning and multi-step assistance.',
    category: 'ai',
    icon: 'openai',
    documentation: 'https://platform.openai.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['responses.read', 'responses.write'],
    capabilities: [
      { id: 'execute', domain: 'ai', label: 'Run model task', description: 'Run a completion or agentic workflow.', risk: 'READ' }
    ],
    actions: ['generate-text'],
    triggers: ['agent-request'],
    resources: ['model-run'],
    approvalPolicy: 'approval for external model actions with user-facing impact',
    riskLevel: 'READ',
    healthCheck: 'endpoint validation and usage quota check',
    verificationStrategy: 'response id and completion metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { model: { type: 'string' } }, required: ['model'] },
    maturity: 'PLANNED',
    family: 'ai'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    provider: 'anthropic',
    description: 'Enhanced reasoning and coding assistance with model-level policy control.',
    category: 'ai',
    icon: 'anthropic',
    documentation: 'https://docs.anthropic.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['messages:read', 'messages:write'],
    capabilities: [
      { id: 'execute', domain: 'ai', label: 'Execute reasoning task', description: 'Run a model generation call.', risk: 'READ' }
    ],
    actions: ['generate-reasoning'],
    triggers: ['agent-request'],
    resources: ['model-call'],
    approvalPolicy: 'approval for externally generated output used in customer-facing workflows',
    riskLevel: 'READ',
    healthCheck: 'API connectivity and quota validation',
    verificationStrategy: 'message id and finish reason',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { model: { type: 'string' } }, required: ['model'] },
    maturity: 'PLANNED',
    family: 'ai'
  },
  {
    id: 'mistral',
    name: 'Mistral',
    provider: 'mistral',
    description: 'Model access for drafting, summarization, and AI-assisted operations.',
    category: 'ai',
    icon: 'mistral',
    documentation: 'https://docs.mistral.ai',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['chat:read', 'chat:write'],
    capabilities: [
      { id: 'execute', domain: 'ai', label: 'Execute model task', description: 'Run a Mistral generation task.', risk: 'READ' }
    ],
    actions: ['generate-response'],
    triggers: ['ai-request'],
    resources: ['model-query'],
    approvalPolicy: 'approval only when the output crosses external trust boundaries',
    riskLevel: 'READ',
    healthCheck: 'endpoint and quota validation',
    verificationStrategy: 'completion id',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { model: { type: 'string' } }, required: ['model'] },
    maturity: 'PLANNED',
    family: 'ai'
  },
  {
    id: 'groq',
    name: 'Groq',
    provider: 'groq',
    description: 'Low-latency inference integration for workflow assistants and content pipelines.',
    category: 'ai',
    icon: 'groq',
    documentation: 'https://console.groq.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['chat:write'],
    capabilities: [
      { id: 'execute', domain: 'ai', label: 'Run Groq model', description: 'Generate or reason with Groq-hosted models.', risk: 'READ' }
    ],
    actions: ['generate-output'],
    triggers: ['inference-trigger'],
    resources: ['model-result'],
    approvalPolicy: 'approval for customer-facing generated output',
    riskLevel: 'READ',
    healthCheck: 'model endpoint validation',
    verificationStrategy: 'completion id and latency metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { model: { type: 'string' } }, required: ['model'] },
    maturity: 'PLANNED',
    family: 'ai'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    provider: 'huggingface',
    description: 'Open model hosting and inference support for AI workflows.',
    category: 'ai',
    icon: 'huggingface',
    documentation: 'https://huggingface.co/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['inference:read', 'inference:write'],
    capabilities: [
      { id: 'execute', domain: 'ai', label: 'Run inference', description: 'Run a hosted model pipeline.', risk: 'READ' }
    ],
    actions: ['run-inference'],
    triggers: ['model-request'],
    resources: ['inference-run'],
    approvalPolicy: 'approval for public-facing or consequential AI outputs',
    riskLevel: 'READ',
    healthCheck: 'model endpoint and token validation',
    verificationStrategy: 'endpoint response and output metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { model: { type: 'string' } }, required: ['model'] },
    maturity: 'PLANNED',
    family: 'ai'
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    provider: 'postgresql',
    description: 'Governed structured data access for analytical and operational queries.',
    category: 'data',
    icon: 'postgresql',
    documentation: 'https://www.postgresql.org/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'database',
    authentication: 'credential',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Query database', description: 'Read tables and row data.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Write database row', description: 'Create or update data rows.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['query-db', 'write-row'],
    triggers: ['database-change'],
    resources: ['table'],
    approvalPolicy: 'approval for writes to regulated or operational data',
    riskLevel: 'DRAFT',
    healthCheck: 'database connectivity and schema validation',
    verificationStrategy: 'query result and row count',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { dsn: { type: 'string' } }, required: ['dsn'] },
    maturity: 'PLANNED',
    family: 'data'
  },
  {
    id: 'mysql',
    name: 'MySQL',
    provider: 'mysql',
    description: 'Structured-data connector for managed MySQL workloads.',
    category: 'data',
    icon: 'mysql',
    documentation: 'https://dev.mysql.com/doc',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'database',
    authentication: 'credential',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read MySQL data', description: 'Read table rows and metadata.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Write MySQL data', description: 'Insert or update rows.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['query-db'],
    triggers: ['db-change'],
    resources: ['table'],
    approvalPolicy: 'approval for write operations on production data',
    riskLevel: 'DRAFT',
    healthCheck: 'database connectivity and query validation',
    verificationStrategy: 'row count and query result metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { dsn: { type: 'string' } }, required: ['dsn'] },
    maturity: 'PLANNED',
    family: 'data'
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    provider: 'sqlite',
    description: 'Local database access for foundational or offline-safe data workflows.',
    category: 'data',
    icon: 'sqlite',
    documentation: 'https://sqlite.org',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'database',
    authentication: 'credential',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read SQLite data', description: 'Read local row data.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Write SQLite data', description: 'Insert or update local records.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['query-db'],
    triggers: ['db-change'],
    resources: ['table'],
    approvalPolicy: 'approval for writes to local operational data',
    riskLevel: 'DRAFT',
    healthCheck: 'file accessibility and schema validation',
    verificationStrategy: 'row count and query result metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    maturity: 'PLANNED',
    family: 'data'
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    provider: 'mongodb',
    description: 'Document database access for rich operational and product state.',
    category: 'data',
    icon: 'mongodb',
    documentation: 'https://www.mongodb.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'database',
    authentication: 'credential',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read MongoDB collections', description: 'Read document collections.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Write MongoDB document', description: 'Insert or update a document.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['query-collection'],
    triggers: ['document-change'],
    resources: ['collection'],
    approvalPolicy: 'approval for writes to production collections',
    riskLevel: 'DRAFT',
    healthCheck: 'database connectivity and collection validation',
    verificationStrategy: 'document id and updatedAt',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { uri: { type: 'string' } }, required: ['uri'] },
    maturity: 'PLANNED',
    family: 'data'
  },
  {
    id: 'supabase',
    name: 'Supabase',
    provider: 'supabase',
    description: 'Postgres-backed data access and workflow triggers for app operations.',
    category: 'data',
    icon: 'supabase',
    documentation: 'https://supabase.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'database',
    authentication: 'api-key',
    scopes: ['read', 'write'],
    capabilities: [
      { id: 'files.read', domain: 'files', label: 'Read Supabase tables', description: 'Read data sets and row metadata.', risk: 'READ' },
      { id: 'files.create', domain: 'files', label: 'Write Supabase row', description: 'Insert or update rows.', approvalRequired: true, risk: 'DRAFT' }
    ],
    actions: ['query-table'],
    triggers: ['table-change'],
    resources: ['table'],
    approvalPolicy: 'approval for writes to operational data',
    riskLevel: 'DRAFT',
    healthCheck: 'project and table metadata validation',
    verificationStrategy: 'row id and updatedAt',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
    maturity: 'PLANNED',
    family: 'data'
  },
  {
    id: 'datadog',
    name: 'Datadog',
    provider: 'datadog',
    description: 'Infrastructure and service monitoring for operational observability.',
    category: 'observability',
    icon: 'datadog',
    documentation: 'https://docs.datadoghq.com',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['metrics:read'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read Datadog metrics', description: 'Read infrastructure and app metrics.', risk: 'READ' }
    ],
    actions: ['read-metrics'],
    triggers: ['alert-trigger'],
    resources: ['metric'],
    approvalPolicy: 'read-only by default',
    riskLevel: 'READ',
    healthCheck: 'API and monitoring metadata validation',
    verificationStrategy: 'metric id and timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { site: { type: 'string' } }, required: ['site'] },
    maturity: 'PLANNED',
    family: 'observability'
  },
  {
    id: 'grafana',
    name: 'Grafana',
    provider: 'grafana',
    description: 'Visualization and monitoring queries for production health and analytics.',
    category: 'observability',
    icon: 'grafana',
    documentation: 'https://grafana.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['dashboards:read'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read Grafana dashboards', description: 'Read dashboards and metrics.', risk: 'READ' }
    ],
    actions: ['read-dashboard'],
    triggers: ['alert-rule'],
    resources: ['dashboard'],
    approvalPolicy: 'read-only by default; writes require explicit admin approval',
    riskLevel: 'READ',
    healthCheck: 'dashboard and auth validation',
    verificationStrategy: 'dashboard id and last update timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    maturity: 'PLANNED',
    family: 'observability'
  },
  {
    id: 'posthog',
    name: 'PostHog',
    provider: 'posthog',
    description: 'Product analytics and event-tracking workflows for digital product loops.',
    category: 'observability',
    icon: 'posthog',
    documentation: 'https://posthog.com/docs',
    version: '1.0.0',
    status: 'NOT_CONNECTED',
    transport: 'api',
    authentication: 'api-key',
    scopes: ['events:read'],
    capabilities: [
      { id: 'analytics.read', domain: 'analytics', label: 'Read event metrics', description: 'Read product events and funnels.', risk: 'READ' }
    ],
    actions: ['read-events'],
    triggers: ['event-cohort'],
    resources: ['event'],
    approvalPolicy: 'read-only by default',
    riskLevel: 'READ',
    healthCheck: 'PostHog API and project validation',
    verificationStrategy: 'event id and capture timestamp',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
    maturity: 'PLANNED',
    family: 'observability'
  },
  {
    id: 'remote-mcp-server',
    name: 'Remote MCP Server',
    provider: 'mcp',
    description: 'Remote MCP server discovery, registration, and delegated capability access.',
    category: 'mcp',
    icon: 'mcp',
    documentation: 'https://modelcontextprotocol.io',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'mcp',
    authentication: 'oauth2',
    scopes: ['mcp.tools.read'],
    capabilities: [
      { id: 'execute', domain: 'mcp', label: 'Execute MCP tool', description: 'Run a remote MCP tool under policy control.', risk: 'READ' }
    ],
    actions: ['discover-tools', 'execute-tool'],
    triggers: ['mcp-event'],
    resources: ['mcp-tool'],
    approvalPolicy: 'approval for any external capability that changes state or reaches a remote system',
    riskLevel: 'READ',
    healthCheck: 'remote tool discovery and auth validation',
    verificationStrategy: 'tool execution result and receipt trace',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { serverUrl: { type: 'string' } }, required: ['serverUrl'] },
    maturity: 'AVAILABLE_THROUGH_MCP',
    family: 'mcp'
  },
  {
    id: 'local-mcp-server',
    name: 'Local MCP Server',
    provider: 'mcp',
    description: 'Local MCP capability with trusted transport for safe, machine-local tools.',
    category: 'mcp',
    icon: 'mcp-local',
    documentation: 'https://modelcontextprotocol.io',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'local-mcp',
    authentication: 'local',
    scopes: ['mcp.local.tool.read'],
    capabilities: [
      { id: 'execute', domain: 'mcp', label: 'Execute local MCP tool', description: 'Run a trusted local MCP tool.', risk: 'READ' }
    ],
    actions: ['execute-local-tool'],
    triggers: ['local-event'],
    resources: ['mcp-tool'],
    approvalPolicy: 'approval for any local tool that writes or mutates external state',
    riskLevel: 'READ',
    healthCheck: 'local process validation and tool schema check',
    verificationStrategy: 'tool return and local receipt metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
    maturity: 'AVAILABLE_THROUGH_MCP',
    family: 'mcp'
  },
  {
    id: 'mcp-registry',
    name: 'MCP Registry',
    provider: 'mcp',
    description: 'Official registry-backed MCP discovery and remote capability cataloguing.',
    category: 'mcp',
    icon: 'mcp-registry',
    documentation: 'https://registry.modelcontextprotocol.io',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'mcp',
    authentication: 'oauth2',
    scopes: ['registry.read'],
    capabilities: [
      { id: 'search', domain: 'mcp', label: 'Search MCP registry', description: 'Search discovered MCP servers and tools.', risk: 'READ' }
    ],
    actions: ['discover-server'],
    triggers: ['server-discovery'],
    resources: ['mcp-server'],
    approvalPolicy: 'approval for registry-backed installs or remote server connections',
    riskLevel: 'READ',
    healthCheck: 'registry fetch and tool schema validation',
    verificationStrategy: 'registry response and server metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { registryUrl: { type: 'string' } }, required: ['registryUrl'] },
    maturity: 'AVAILABLE_THROUGH_MCP',
    family: 'mcp'
  }
];

export const BRANDOPS_CONNECTOR_LIBRARY: readonly ConnectorDefinition[] = ([
  ...GOOGLE_CONNECTOR_FAMILY,
  ...TARGET_LIBRARY_CONNECTORS,
  {
    id: 'github',
    name: 'GitHub',
    provider: 'github',
    description: 'Repository and code execution context for code-aware workflow support.',
    category: 'development',
    icon: 'github',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['repo'],
    capabilities: [
      { id: 'code.read', domain: 'code', label: 'Read code', description: 'Read repository contents and issue metadata.', risk: 'READ' },
      { id: 'code.write', domain: 'code', label: 'Write code', description: 'Push or modify repository content.', approvalRequired: true, risk: 'CREATE_INTERNAL' }
    ],
    actions: ['read-repo', 'create-issue'],
    triggers: ['github-push'],
    resources: ['repo'],
    approvalPolicy: 'approval for write operations or PR creation',
    riskLevel: 'CREATE_INTERNAL',
    healthCheck: 'repo info call and token validation',
    verificationStrategy: 'GitHub object id and API response',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { repo: { type: 'string' } }, required: ['repo'] },
    maturity: 'PARTIAL',
    family: 'development'
  },
  {
    id: 'slack',
    name: 'Slack',
    provider: 'slack',
    description: 'Communication and ad-hoc coordination for workspace notifications and updates.',
    category: 'communication',
    icon: 'slack',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'api',
    authentication: 'oauth2',
    scopes: ['chat:write', 'channels:read'],
    capabilities: [
      { id: 'messages.send', domain: 'messages', label: 'Send Slack message', description: 'Send a message to a Slack channel.', approvalRequired: true, risk: 'SEND_EXTERNAL' },
      { id: 'messages.read', domain: 'messages', label: 'Read messages', description: 'Read channel history.', risk: 'READ' }
    ],
    actions: ['send-message'],
    triggers: ['slack-message'],
    resources: ['channel'],
    approvalPolicy: 'approval before sending to shared channels',
    riskLevel: 'SEND_EXTERNAL',
    healthCheck: 'auth test and channel list request',
    verificationStrategy: 'message timestamp and channel id',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { channelId: { type: 'string' } }, required: ['channelId'] },
    maturity: 'PARTIAL',
    family: 'communication'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    provider: 'linkedin',
    description: 'Professional social publishing and network engagement.',
    category: 'social',
    icon: 'linkedin',
    version: '1.0.0',
    status: 'AVAILABLE',
    transport: 'oauth',
    authentication: 'oauth2',
    scopes: ['w_member_social', 'r_liteprofile'],
    capabilities: [
      { id: 'social.read', domain: 'social', label: 'Read social profile', description: 'Read professional profile and network metadata.', risk: 'READ' },
      { id: 'social.publish', domain: 'social', label: 'Publish to social', description: 'Publish to a LinkedIn organization or profile.', approvalRequired: true, risk: 'PUBLISH_PUBLIC' }
    ],
    actions: ['publish-post'],
    triggers: [],
    resources: ['post'],
    approvalPolicy: 'approval required before public publishing',
    riskLevel: 'PUBLISH_PUBLIC',
    healthCheck: 'oauth token validation and profile fetch',
    verificationStrategy: 'post id and provider response metadata',
    agentAccess: 'workspace',
    configurationSchema: { type: 'object', properties: { profileId: { type: 'string' } }, required: [] },
    maturity: 'PARTIAL',
    family: 'social'
  }
] as ConnectorDefinition[]).map((connector: ConnectorDefinition): ConnectorDefinition => {
  if (connector.family === 'mcp') return connector;
  if (connector.status !== 'CONNECTED' && connector.status !== 'AVAILABLE') return connector;
  return { ...connector, status: 'NOT_CONNECTED' as const };
});

export function connectorStateFromProviderStatus(
  status: string | undefined | null
): ConnectorState {
  switch (status) {
    case 'connected':
      return 'CONNECTED';
    case 'configured':
      return 'AVAILABLE';
    case 'error':
      return 'MISCONFIGURED';
    case 'disconnected':
      return 'NOT_CONNECTED';
    default:
      return 'NOT_CONNECTED';
  }
}

export function resolveConnectorForProvider(provider: string): ConnectorDefinition | undefined {
  const normalized = provider.toLowerCase();

  const providerAliases: Record<string, string> = {
    google: 'google-account',
    gmail: 'gmail',
    'google-calendar': 'google-calendar',
    calendar: 'google-calendar',
    'google-drive': 'google-drive',
    drive: 'google-drive',
    docs: 'google-docs',
    'google-docs': 'google-docs',
    'google-chat': 'google-chat',
    chat: 'google-chat',
    github: 'github',
    slack: 'slack',
    linkedin: 'linkedin',
    'linkedin-marketing': 'linkedin'
  };

  const connectorId = providerAliases[normalized] ?? normalized;
  return connectorRegistry.get(connectorId) ?? BRANDOPS_CONNECTOR_LIBRARY.find((connector) => connector.provider === normalized);
}

export class ConnectorRegistry {
  private readonly entries: Map<string, ConnectorDefinition>;

  constructor(connectors: readonly ConnectorDefinition[] = BRANDOPS_CONNECTOR_LIBRARY) {
    this.entries = new Map(connectors.map((connector) => [connector.id, connector]));
  }

  get(id: string): ConnectorDefinition | undefined {
    return this.entries.get(id);
  }

  list(): readonly ConnectorDefinition[] {
    return Array.from(this.entries.values());
  }

  forCapability(capabilityId: string): readonly ConnectorDefinition[] {
    const normalized = capabilityId.toLowerCase();
    return this.list().filter((connector) =>
      connector.capabilities.some((capability) => capability.id.toLowerCase() === normalized)
    );
  }

  forProvider(provider: string): ConnectorDefinition | undefined {
    return resolveConnectorForProvider(provider);
  }
}

export const connectorRegistry = new ConnectorRegistry();

export function resolveConnectorForCapability(
  capabilityId: string,
  providerHint?: string
): ConnectorDefinition | undefined {
  const normalized = capabilityId.toLowerCase();
  const candidates = connectorRegistry.forCapability(normalized);

  if (providerHint) {
    const preferred = candidates.find((connector) => connector.provider === providerHint);
    if (preferred) return preferred;
  }

  return candidates[0];
}

export const BRANDOPS_FEATURE_TRUTH = {
  connectors: BRANDOPS_CONNECTOR_LIBRARY.map((connector) => ({
    provider: connector.provider,
    implementation: connector.maturity,
    authentication: connector.authentication,
    capabilities: connector.capabilities.map((capability) => capability.id),
    productionReadiness: connector.maturity === 'IMPLEMENTED' || connector.maturity === 'PARTIAL',
    tests: ['connectorRegistry.test.ts'],
    knownLimitations: connector.maturity === 'PLANNED' ? ['not yet production connected'] : []
  })),
  reconciliation: {
    totalTargets: 91,
    uniqueProviders: 84,
    mechanisms: 7,
    rule: 'Registry metadata is not runtime evidence; only executable handlers can earn IMPLEMENTED or CERTIFIED.'
  }
};

export const CONNECTOR_FAMILY_OPTIONS = [
  'all',
  'google',
  'microsoft',
  'communication',
  'social',
  'development',
  'knowledge',
  'crm',
  'marketing',
  'payments',
  'automation',
  'meetings',
  'ai',
  'data',
  'observability',
  'mcp'
] as const;

export type ConnectorLibraryFilter = {
  query?: string;
  family?: (typeof CONNECTOR_FAMILY_OPTIONS)[number];
  status?: ConnectorState | ConnectorMaturity | 'all';
};

export function filterConnectorLibrary(
  connectors: readonly ConnectorDefinition[] = BRANDOPS_CONNECTOR_LIBRARY,
  query = '',
  family: (typeof CONNECTOR_FAMILY_OPTIONS)[number] = 'all',
  status: ConnectorState | ConnectorMaturity | 'all' = 'all'
): readonly ConnectorDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();

  return connectors.filter((connector) => {
    const queryMatch =
      !normalizedQuery ||
      connector.name.toLowerCase().includes(normalizedQuery) ||
      connector.provider.toLowerCase().includes(normalizedQuery) ||
      connector.description.toLowerCase().includes(normalizedQuery) ||
      connector.capabilities.some((capability) => capability.id.toLowerCase().includes(normalizedQuery));

    const familyMatch = family === 'all' || connector.family === family || connector.category === family;
    const statusMatch = status === 'all' || connector.status === status || connector.maturity === status;

    return queryMatch && familyMatch && statusMatch;
  });
}
