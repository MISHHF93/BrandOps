import type { BrandOpsData, IntegrationSourceKind } from '../../types/domain';

export interface PlatformAwareAskReadout {
  connectedApps: string[];
  unavailableApps: string[];
  recentActivity: string[];
  workflowState: string[];
  operationalContext: string[];
  contextBlock: string;
}

type PlatformKey =
  | 'gmail'
  | 'linkedin'
  | 'google-calendar'
  | 'notion'
  | 'slack'
  | 'x-twitter'
  | 'youtube'
  | 'discord'
  | 'instagram'
  | 'shopify'
  | 'hubspot'
  | 'zapier'
  | 'salesforce'
  | 'jira'
  | 'github'
  | 'confluence'
  | 'google-drive'
  | 'airtable';

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  gmail: 'Gmail',
  linkedin: 'LinkedIn',
  'google-calendar': 'Google Calendar',
  notion: 'Notion',
  slack: 'Slack',
  'x-twitter': 'X/Twitter',
  youtube: 'YouTube',
  discord: 'Discord',
  instagram: 'Instagram',
  shopify: 'Shopify',
  hubspot: 'HubSpot',
  zapier: 'Zapier',
  salesforce: 'Salesforce',
  jira: 'Jira',
  github: 'GitHub',
  confluence: 'Confluence',
  'google-drive': 'Google Drive',
  airtable: 'Airtable'
};

const KIND_PLATFORM_HINTS: Partial<Record<IntegrationSourceKind, PlatformKey[]>> = {
  'google-workspace': ['gmail', 'google-calendar', 'google-drive'],
  github: ['github'],
  notion: ['notion'],
  slack: ['slack'],
  'google-drive': ['google-drive'],
  hubspot: ['hubspot'],
  salesforce: ['salesforce'],
  jira: ['jira'],
  'linkedin-marketing': ['linkedin'],
  airtable: ['airtable']
};

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function uniq(values: string[], cap = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const t = clean(value);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 240));
    if (out.length >= cap) break;
  }
  return out;
}

function corpus(workspace: BrandOpsData): string {
  return [
    ...workspace.integrationHub.sources.map(
      (source) =>
        `${source.kind} ${source.name} ${source.status} ${source.artifactTypes.join(' ')} ${source.tags.join(' ')} ${source.notes}`
    ),
    ...workspace.integrationHub.artifacts.map(
      (artifact) =>
        `${artifact.artifactType} ${artifact.title} ${artifact.tags.join(' ')} ${artifact.summary}`
    ),
    ...workspace.integrationHub.liveFeed.map(
      (item) => `${item.source} ${item.title} ${item.detail}`
    ),
    ...workspace.externalSync.links.map(
      (link) => `${link.provider} ${link.resourceType} ${link.sourceType}`
    )
  ]
    .join('\n')
    .toLowerCase();
}

function hasTextPlatformEvidence(workspace: BrandOpsData, platform: PlatformKey): boolean {
  const text = corpus(workspace);
  return platformTerms(platform).some((term) => text.includes(term));
}

function platformTerms(platform: PlatformKey): string[] {
  const terms: Record<PlatformKey, string[]> = {
    gmail: ['gmail', 'email conversation', 'email-summary', 'email summary'],
    linkedin: ['linkedin'],
    'google-calendar': ['google-calendar', 'calendar-event', 'calendar event', 'meeting'],
    notion: ['notion'],
    slack: ['slack'],
    'x-twitter': ['twitter', 'x/twitter', 'tweet'],
    youtube: ['youtube'],
    discord: ['discord'],
    instagram: ['instagram'],
    shopify: ['shopify'],
    hubspot: ['hubspot'],
    zapier: ['zapier'],
    salesforce: ['salesforce'],
    jira: ['jira'],
    github: ['github'],
    confluence: ['confluence'],
    'google-drive': ['google-drive', 'google drive'],
    airtable: ['airtable']
  };
  return terms[platform];
}

function textMatchesPlatform(text: string, platform: PlatformKey): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes(PLATFORM_LABELS[platform].toLowerCase()) ||
    platformTerms(platform).some((term) => normalized.includes(term))
  );
}

function isPlatformConnected(workspace: BrandOpsData, platform: PlatformKey): boolean {
  if (
    platform === 'linkedin' &&
    workspace.settings.syncHub.linkedin.connectionStatus === 'connected'
  ) {
    return true;
  }
  if (platform === 'github' && workspace.settings.syncHub.github.connectionStatus === 'connected') {
    return true;
  }
  if (
    (platform === 'gmail' || platform === 'google-calendar' || platform === 'google-drive') &&
    workspace.settings.syncHub.google.connectionStatus === 'connected'
  ) {
    const scopes = workspace.settings.syncHub.google.auth.scope.join(' ').toLowerCase();
    if (platform === 'gmail')
      return /gmail|mail|email/.test(scopes) || hasTextPlatformEvidence(workspace, platform);
    if (platform === 'google-calendar') {
      return (
        scopes.includes('calendar') ||
        workspace.externalSync.links.some((link) => link.provider === 'google-calendar') ||
        hasTextPlatformEvidence(workspace, platform)
      );
    }
    if (platform === 'google-drive')
      return scopes.includes('drive') || hasTextPlatformEvidence(workspace, platform);
  }

  return (
    hasTextPlatformEvidence(workspace, platform) ||
    workspace.integrationHub.sources.some((source) => {
      if (source.status !== 'connected' && source.status !== 'monitoring') return false;
      const hinted = KIND_PLATFORM_HINTS[source.kind]?.includes(platform) ?? false;
      const text =
        `${source.kind} ${source.name} ${source.artifactTypes.join(' ')} ${source.tags.join(' ')} ${source.notes}`.toLowerCase();
      return hinted || textMatchesPlatform(text, platform);
    })
  );
}

function approvedPlatformSummaries(workspace: BrandOpsData, platform: PlatformKey): string[] {
  const label = PLATFORM_LABELS[platform].toLowerCase();
  const summaries = workspace.integrationHub.artifacts
    .filter((artifact) => {
      const text =
        `${artifact.artifactType} ${artifact.title} ${artifact.tags.join(' ')} ${artifact.summary}`.toLowerCase();
      return text.includes(label) || textMatchesPlatform(text, platform);
    })
    .map((artifact) => `${artifact.title}: ${artifact.summary}`);

  if (platform === 'notion') {
    summaries.push(...workspace.notes.slice(0, 5).map((note) => `${note.title}: ${note.detail}`));
  }
  if (platform === 'google-calendar') {
    summaries.push(
      ...workspace.scheduler.tasks
        .filter((task) => /meeting|calendar/i.test(`${task.title} ${task.detail}`))
        .slice(0, 6)
        .map((task) => `${task.title}: ${task.status} due ${task.dueAt}`)
    );
  }
  return uniq(summaries, 8);
}

function buildRecentActivity(workspace: BrandOpsData): string[] {
  return uniq(
    [
      ...workspace.integrationHub.liveFeed
        .slice(0, 5)
        .map((item) => `${item.source}: ${item.title} (${item.level})`),
      ...workspace.outreachHistory
        .slice(0, 4)
        .map((item) => `Outreach ${item.status}: ${item.targetName} at ${item.company}`),
      ...workspace.notes.slice(0, 4).map((note) => `Note: ${note.title} (${note.entityType})`),
      ...(workspace.operatorTraces?.entries ?? [])
        .slice(0, 5)
        .map((trace) => `Trace: ${trace.verb}${trace.outcome ? ` (${trace.outcome})` : ''}`)
    ],
    12
  );
}

function buildWorkflowState(workspace: BrandOpsData): string[] {
  const openFollowUps = workspace.followUps.filter((item) => !item.completed);
  const activeOpportunities = workspace.opportunities.filter((item) => !item.archivedAt);
  const queuedPublishing = workspace.publishingQueue.filter((item) => item.status !== 'posted');
  const pendingReviews = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'pending'
  );
  return [
    `${activeOpportunities.length} active opportunities`,
    `${openFollowUps.length} open follow-ups`,
    `${queuedPublishing.length} publishing items not yet posted`,
    `${workspace.outreachDrafts.length} outreach drafts`,
    `${pendingReviews.length} pending human approvals`,
    `${workspace.scheduler.tasks.filter((task) => task.status !== 'completed').length} open scheduler tasks`
  ];
}

function buildOperationalContext(workspace: BrandOpsData): string[] {
  const nc = workspace.settings.notificationCenter;
  const nextTasks = [...workspace.scheduler.tasks]
    .filter((task) => task.status !== 'completed')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5)
    .map((task) => `${task.title} (${task.status}, ${task.dueAt})`);
  return uniq(
    [
      `Workday: ${nc.workdayStartHour}:00-${nc.workdayEndHour}:00 ${workspace.settings.timezone}`,
      `Max daily tasks: ${nc.maxDailyTasks}`,
      `Cadence: ${workspace.settings.cadenceFlow.deepWorkBlockCount} deep-work blocks x ${workspace.settings.cadenceFlow.deepWorkBlockHours}h`,
      ...nextTasks
    ],
    10
  );
}

function lineList(label: string, values: string[]): string {
  return values.length
    ? `${label}:\n${values.map((value) => `- ${value}`).join('\n')}`
    : `${label}: none`;
}

export function buildPlatformAwareAskReadout(workspace: BrandOpsData): PlatformAwareAskReadout {
  const platforms = Object.keys(PLATFORM_LABELS) as PlatformKey[];
  const connected = platforms.filter((platform) => isPlatformConnected(workspace, platform));
  const unavailable = platforms.filter((platform) => !connected.includes(platform));
  const appLines = connected.map((platform) => {
    const summaries = approvedPlatformSummaries(workspace, platform);
    return `${PLATFORM_LABELS[platform]} connected${summaries.length ? `; approved context: ${summaries.slice(0, 2).join(' | ')}` : '; no approved activity summaries available'}`;
  });
  const recentActivity = buildRecentActivity(workspace);
  const workflowState = buildWorkflowState(workspace);
  const operationalContext = buildOperationalContext(workspace);
  const contextBlock = [
    'Platform-aware ASK context:',
    'Truth rule: do not hallucinate integrations, app data, messages, meetings, notes, or conversations. If a requested app is unavailable or has no approved summaries, say so and ask the user to connect it or provide approved context.',
    lineList('Connected apps', appLines),
    lineList(
      'Unavailable apps',
      unavailable.map((platform) => PLATFORM_LABELS[platform])
    ),
    lineList('Recent activity', recentActivity),
    lineList('Workflow state', workflowState),
    lineList('Operational context', operationalContext),
    'Request handling rules:',
    '- “What should I prioritize today?”: use workflow state, operational context, due tasks, follow-ups, opportunities, and approvals.',
    '- Gmail conversations: use only approved Gmail/email summaries. If none exist, say Gmail conversation context is unavailable.',
    '- Notion notes: use only registered Notion sources, approved doc summaries, or local notes. If none exist, ask for notes.',
    '- Founder meetings: use Google Calendar/external sync/scheduler meeting rows only. If none exist, say no upcoming meeting context is connected.',
    '- External actions still require PLAN approval; ASK may draft, summarize, or recommend only.'
  ].join('\n');

  return {
    connectedApps: connected.map((platform) => PLATFORM_LABELS[platform]),
    unavailableApps: unavailable.map((platform) => PLATFORM_LABELS[platform]),
    recentActivity,
    workflowState,
    operationalContext,
    contextBlock
  };
}
