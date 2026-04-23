/**
 * BrandOps persisted workspace types (Chrome `storage.local` / web LocalStorage).
 * Do not duplicate these shapes elsewhere — extend here, then normalize in `storage.ts`.
 */
export type ExtensionSurface = 'dashboard' | 'integrations' | 'content';

export type WorkspaceModuleId =
  | 'command-center'
  | 'brand-vault'
  | 'content-library'
  | 'publishing-queue'
  | 'outreach-workspace'
  | 'pipeline-crm'
  | 'scheduler-engine'
  | 'linkedin-companion'
  | 'settings';

export interface WorkspaceModule {
  id: WorkspaceModuleId;
  title: string;
  description: string;
  status: 'active' | 'planned';
  route: ExtensionSurface;
}

export type QueueStatus = 'queued' | 'due-soon' | 'ready-to-post' | 'posted' | 'skipped';

export interface PublishingItem {
  id: string;
  title: string;
  body: string;
  platforms: ('linkedin' | 'newsletter' | 'x')[];
  tags: string[];
  status: QueueStatus;
  contentLibraryItemId?: string;
  scheduledFor?: string;
  reminderAt?: string;
  reminderLeadMinutes?: number;
  checklist?: string;
  postedAt?: string;
  skippedAt?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export type ContentItemType =
  | 'post-draft'
  | 'post-idea'
  | 'article-note'
  | 'carousel-outline'
  | 'hook-bank-entry'
  | 'cta-snippet'
  | 'reusable-paragraph';

export type ContentItemStatus =
  | 'idea'
  | 'drafting'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'archived';

export type PublishChannel = 'linkedin' | 'newsletter' | 'x' | 'blog' | 'youtube' | 'podcast';

export interface ContentLibraryItem {
  id: string;
  type: ContentItemType;
  title: string;
  body: string;
  tags: string[];
  audience: string;
  goal: string;
  status: ContentItemStatus;
  publishChannel: PublishChannel;
  notes: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export type OutreachCategory =
  | 'collaboration'
  | 'consulting'
  | 'technical build partnership'
  | 'founder intro'
  | 'follow-up'
  | 'warm reconnect'
  | 'recruiting reply';

export type OutreachStatus =
  | 'draft'
  | 'ready'
  | 'scheduled follow-up'
  | 'sent'
  | 'replied'
  | 'archived';

export interface OutreachDraft {
  id: string;
  category: OutreachCategory;
  targetName: string;
  company: string;
  role: string;
  messageBody: string;
  outreachGoal: string;
  tone: string;
  status: OutreachStatus;
  linkedOpportunity?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface OutreachTemplate {
  id: string;
  name: string;
  category: OutreachCategory;
  openerBlock: string;
  valueBlock: string;
  proofBlock: string;
  callToActionBlock: string;
  signoffBlock: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachHistoryEntry {
  id: string;
  draftId: string;
  targetName: string;
  company: string;
  status: Exclude<OutreachStatus, 'draft' | 'ready'>;
  loggedAt: string;
  summary: string;
}

export interface FollowUpTask {
  id: string;
  contactId: string;
  reason: string;
  dueAt: string;
  completed: boolean;
  recurrence?: SchedulerRecurrence;
}

export type SchedulerTaskType = 'publishing' | 'follow-up' | 'crm';

export type SchedulerTaskStatus =
  | 'scheduled'
  | 'due-soon'
  | 'due'
  | 'completed'
  | 'missed'
  | 'snoozed'
  | 'cancelled';

export interface SchedulerRecurrence {
  interval: 'daily' | 'weekly';
  every: number;
}

export interface SchedulerTask {
  id: string;
  sourceId: string;
  sourceType: SchedulerTaskType;
  title: string;
  detail: string;
  dueAt: string;
  remindAt: string;
  status: SchedulerTaskStatus;
  recurrence?: SchedulerRecurrence;
  snoozeCount: number;
  lastNotifiedAt?: string;
  completedAt?: string;
  missedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerState {
  tasks: SchedulerTask[];
  updatedAt: string;
  lastHydratedAt: string;
}

export type OpportunityStage =
  | 'prospect'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface Opportunity {
  id: string;
  name: string;
  company: string;
  role: string;
  source: string;
  relationshipStage: 'new' | 'building' | 'trusted' | 'partner';
  opportunityType:
    | 'consulting'
    | 'collaboration'
    | 'client delivery'
    | 'advisory'
    | 'founding team'
    | 'investor relationship'
    | 'recruiter conversation';
  status: OpportunityStage;
  nextAction: string;
  followUpDate: string;
  notes: string;
  links: string[];
  relatedOutreachDraftIds: string[];
  relatedContentTags: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  valueUsd: number;
  confidence: number;
  contactId?: string;
  account?: string;
  serviceLine?: string;
  stage?: OpportunityStage;
  version?: number;
}

/** Batch payload for a hypothetical future LLM that narrates pipeline risk; ranking in-app uses deterministic heuristics only. */
export type LlmOpportunityNarrativeRequest = { opportunities: Opportunity[] };

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  source: string;
  relationshipStage: 'new' | 'building' | 'trusted' | 'partner';
  status: 'active' | 'dormant' | 'archived';
  nextAction: string;
  followUpDate?: string;
  notes: string;
  links: string[];
  relatedOutreachDraftIds: string[];
  relatedContentTags: string[];
  lastContactAt: string;
  fullName?: string;
  title?: string;
  relationship?: 'new' | 'warm' | 'active-client' | 'past-client';
  version?: number;
}

export interface ActivityNote {
  id: string;
  entityType: 'contact' | 'company' | 'opportunity';
  entityId: string;
  title: string;
  detail: string;
  status?: string;
  nextAction?: string;
  createdAt: string;
  version?: number;
}

export interface Company {
  id: string;
  name: string;
  source: string;
  relationshipStage: 'new' | 'building' | 'trusted' | 'partner';
  status: 'active' | 'dormant' | 'archived';
  nextAction: string;
  followUpDate?: string;
  notes: string;
  links: string[];
  relatedOutreachDraftIds: string[];
  relatedContentTags: string[];
  version?: number;
}

export interface MessagingVaultEntry {
  id: string;
  category: 'positioning' | 'offer' | 'case-study' | 'faq';
  title: string;
  content: string;
  version?: number;
}

/**
 * Canonical data-model aliases used in product and docs.
 * These map directly to the active runtime entities.
 */
export type BrandVaultEntry = MessagingVaultEntry;
export type ContentItem = ContentLibraryItem;
export type ScheduledPost = PublishingItem;
export type ActivityLog = ActivityNote;

export interface BrandVault {
  positioningStatement: string;
  headlineOptions: string[];
  shortBio: string;
  fullAboutSummary: string;
  serviceOfferings: string[];
  collaborationModes: string[];
  outreachAngles: string[];
  audienceSegments: string[];
  expertiseAreas: string[];
  industries: string[];
  proofPoints: string[];
  signatureThemes: string[];
  preferredVoiceNotes: string[];
  bannedPhrases: string[];
  callsToAction: string[];
  reusableSnippets: string[];
  personalNotes: string[];
}

export type BrandVaultListField = Exclude<
  keyof BrandVault,
  'positioningStatement' | 'shortBio' | 'fullAboutSummary'
>;

export interface OverlayPreferences {
  enabled: boolean;
  compactMode: boolean;
  showContactInsights: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'publish-reminder' | 'follow-up-overdue' | 'weekly-review';
  action: 'badge-highlight' | 'dashboard-pin' | 'notification';
  enabled: boolean;
}

export interface ExternalSyncOption {
  id: string;
  title: string;
  primary?: boolean;
}

export interface LinkedInOAuthState {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope: string[];
  tokenType?: string;
}

/** Cached OpenID userinfo subset for display (“Signed in as …”). */
export interface LinkedInIdentityProfile {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}

/** OAuth-linked profile for Google, GitHub, or LinkedIn (stored tokens + display fields). */
export interface IdentityProviderSettings {
  clientId: string;
  connectionStatus: 'disconnected' | 'configured' | 'connected' | 'error';
  lastError?: string;
  lastConnectedAt?: string;
  auth: LinkedInOAuthState;
  profile?: LinkedInIdentityProfile;
}

export type LinkedInIdentitySettings = IdentityProviderSettings;

export type IdentityProviderId = 'google' | 'github' | 'linkedin';

export interface SyncHubSettings {
  google: IdentityProviderSettings;
  github: IdentityProviderSettings;
  linkedin: IdentityProviderSettings;
}

export interface NotificationCenterSettings {
  enabled: boolean;
  managerialWeight: number;
  workdayStartHour: number;
  workdayEndHour: number;
  maxDailyTasks: number;
  aiGuidanceMode: 'rule-based' | 'prompt-ready' | 'hybrid';
  preferredModel: string;
  roleContext: string;
  promptTemplate: string;
  datasetReviewEnabled: boolean;
  integrationReviewEnabled: boolean;
}

export type CadenceFlowMode = 'balanced' | 'maker-heavy' | 'client-heavy' | 'launch-day';

export interface CadenceFlowSettings {
  mode: CadenceFlowMode;
  deepWorkBlockCount: number;
  deepWorkBlockHours: number;
  includeStartupBlock: boolean;
  includeShutdownBlock: boolean;
  includeArtifactReviewBlock: boolean;
  remindBeforeMinutes: number;
  calendarSyncEnabled: boolean;
  artifactSyncEnabled: boolean;
}

export type UiTheme = 'dark' | 'light';
export type VisualMode = 'classic' | 'retroMagic';
export type MotionMode = 'off' | 'balanced' | 'wild';

export type ExternalSyncProvider = 'google-calendar' | 'google-tasks';

export type ExternalSyncResourceType = 'calendar-event' | 'task';

export type ExternalSyncSourceType =
  | 'publishing-item'
  | 'follow-up'
  | 'opportunity'
  | 'daily-cadence-block';

export interface ExternalSyncLink {
  id: string;
  provider: ExternalSyncProvider;
  resourceType: ExternalSyncResourceType;
  sourceType: ExternalSyncSourceType;
  sourceId: string;
  targetId: string;
  remoteId: string;
  remoteUrl?: string;
  lastSyncedAt: string;
}

export interface ExternalSyncState {
  links: ExternalSyncLink[];
  updatedAt: string;
}

export interface IntegrationLiveFeedItem {
  id: string;
  source: string;
  title: string;
  detail: string;
  level: 'info' | 'success' | 'warning';
  happenedAt: string;
}

export interface SshTarget {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMode: 'ssh-key' | 'agent' | 'passwordless';
  description: string;
  tags: string[];
  commandHints: string[];
  createdAt: string;
}

export type IntegrationSourceKind =
  | 'google-workspace'
  | 'github'
  | 'notion'
  | 'slack'
  | 'rss'
  | 'google-drive'
  | 'webhook'
  | 'custom-api';

export interface IntegrationSource {
  id: string;
  name: string;
  kind: IntegrationSourceKind;
  status: 'planned' | 'connected' | 'monitoring';
  baseUrl?: string;
  artifactTypes: string[];
  tags: string[];
  notes: string;
  createdAt: string;
}

export interface ExternalArtifactRecord {
  id: string;
  sourceId: string;
  title: string;
  artifactType: string;
  summary: string;
  externalUrl?: string;
  externalId?: string;
  tags: string[];
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationHubState {
  liveFeed: IntegrationLiveFeedItem[];
  sshTargets: SshTarget[];
  sources: IntegrationSource[];
  artifacts: ExternalArtifactRecord[];
}

/** Dashboard: one mounted area vs single long scroll with anchors. */
export type CockpitLayoutMode = 'sections' | 'unified-scroll';

/** Today stack: more open panels vs collapsed disclosures by default. */
export type CockpitDensityMode = 'comfortable' | 'compact';

export interface AppSettings {
  timezone: string;
  defaultReminderLeadHours: number;
  weekStartsOn: 'monday' | 'sunday';
  theme: UiTheme;
  visualMode: VisualMode;
  motionMode: MotionMode;
  ambientFxEnabled: boolean;
  cockpitLayout: CockpitLayoutMode;
  cockpitDensity: CockpitDensityMode;
  localModelEnabled: boolean;
  aiAdapterMode: 'disabled' | 'local-only' | 'external-opt-in';
  debugMode: boolean;
  /** Which linked OAuth profile drives “Signed in as …” in the cockpit. */
  primaryIdentityProvider: IdentityProviderId | null;
  overlay: OverlayPreferences;
  automationRules: AutomationRule[];
  syncHub: SyncHubSettings;
  notificationCenter: NotificationCenterSettings;
  cadenceFlow: CadenceFlowSettings;
}

/** Workspace dataset lineage. Legacy `default-demo` is normalized to `demo-sample` on save. */
export type SeedDataSource = 'production-empty' | 'demo-sample' | 'default-demo';

export interface SeedMetadata {
  seededAt: string;
  source: SeedDataSource;
  version: string;
  /** Set when the user finishes Welcome onboarding (Continue to Dashboard or skip). */
  welcomeCompletedAt?: string;
  /** Bump when onboarding content changes and you want returning users to see new copy. */
  onboardingVersion?: string;
  /**
   * User explicitly chose local-only use without federated sign-in (guest mode).
   * Distinct from per-provider **Disconnect** in Settings (revoke one IdP only).
   */
  guestSessionAt?: string;
  /** Hosted preview only: magic-link / open-preview session started at (ISO). Not used for Chrome Web Store builds. */
  previewMagicSignInAt?: string;
}

export interface BrandProfile {
  operatorName: string;
  positioning: string;
  primaryOffer: string;
  voiceGuide: string;
  focusMetric: string;
}

/** Append-only log for command execution and bridge ingress (capped in storage). */
export interface AgentAuditEntry {
  id: string;
  at: string;
  source: string;
  action: string;
  ok: boolean;
  summary: string;
  commandPreview: string;
}

export interface AgentAuditState {
  entries: AgentAuditEntry[];
}

export interface BrandOpsData {
  brand: BrandProfile;
  brandVault: BrandVault;
  modules: WorkspaceModule[];
  publishingQueue: PublishingItem[];
  contentLibrary: ContentLibraryItem[];
  contacts: Contact[];
  companies: Company[];
  notes: ActivityNote[];
  outreachDrafts: OutreachDraft[];
  outreachTemplates: OutreachTemplate[];
  outreachHistory: OutreachHistoryEntry[];
  followUps: FollowUpTask[];
  opportunities: Opportunity[];
  messagingVault: MessagingVaultEntry[];
  scheduler: SchedulerState;
  settings: AppSettings;
  externalSync: ExternalSyncState;
  integrationHub: IntegrationHubState;
  seed: SeedMetadata;
  /** Command / bridge execution audit (optional; normalized on read). */
  agentAudit?: AgentAuditState;
}
