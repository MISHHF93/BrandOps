/**
 * BrandOps persisted workspace types (Chrome `storage.local` / web LocalStorage).
 * Do not duplicate these shapes elsewhere — extend here, then normalize in `storage.ts`.
 */
import type {
  FocusKpiSelfCheck,
  OperatorTwinSettings
} from '../shared/operatorTwin/operatorTwinTypes';

export type { FocusKpiSelfCheck, OperatorTwinSettings };
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

/** Canonical schedule only — legacy JSON variants normalize to balanced on load. */
export type CadenceFlowMode = 'balanced';

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
  | 'custom-api'
  | 'hubspot'
  | 'salesforce'
  | 'pipedrive'
  | 'linear'
  | 'jira'
  | 'zendesk'
  | 'stripe'
  | 'microsoft-365'
  | 'meta-business'
  | 'linkedin-marketing'
  | 'airtable';

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

export type ConnectedIdentitySignalSource =
  | 'linkedin'
  | 'gmail'
  | 'google-calendar'
  | 'notion'
  | 'slack'
  | 'content'
  | 'workflow'
  | 'integration-hub';

export type ConnectedIdentitySignalKind =
  | 'professional_positioning'
  | 'communication_tone'
  | 'operational_schedule'
  | 'knowledge_memory'
  | 'team_collaboration_style'
  | 'content_pattern'
  | 'workflow_behavior'
  | 'operational_habit';

export interface ConnectedIdentitySignal {
  id: string;
  source: ConnectedIdentitySignalSource;
  kind: ConnectedIdentitySignalKind;
  summary: string;
  evidence: string[];
  confidence: number;
  sensitivity: 'metadata_only' | 'user_approved_summary' | 'private_data_blocked';
  lastObservedAt: string;
}

export interface ConnectedIdentityEngineState {
  schemaVersion: number;
  consentGranted: boolean;
  lastUpdatedAt: string | null;
  signals: ConnectedIdentitySignal[];
  sensitiveDataPolicy: string;
  blockedPrivateSources: ConnectedIdentitySignalSource[];
}

/** Dashboard: one mounted area vs single long scroll with anchors. */
export type CockpitLayoutMode = 'sections' | 'unified-scroll';

/** Today stack: more open panels vs collapsed disclosures by default. */
export type CockpitDensityMode = 'comfortable' | 'compact';

/** Unified Settings operating profile (Today chrome + optional AI hints). Daily cadence is fixed in-product. */
export type OperatingPresetId =
  | 'offline-local-first'
  | 'launch-sprint'
  | 'client-heavy-ops'
  | 'balanced-ops';

export interface OperatingProfileState {
  /** Last preset applied from the unified control; null when unknown / legacy workspaces. */
  lastAppliedPresetId: OperatingPresetId | 'custom' | null;
}

/**
 * Optional bridge to hosted NLP / LLM APIs (OpenAI-compatible HTTPS shape).
 * API secrets MUST NOT live here — use `aiSecretsAccess` / device-local storage (Chrome Web Store + Play).
 */
export interface AiBridgeSettings {
  /** Example: `https://api.openai.com/v1` — trailing slashes tolerated. */
  inferenceBaseUrl: string;
  /** Example: same root as inference when provider bundles embeddings under `/v1/embeddings`. */
  embeddingBaseUrl: string;
  chatModelId: string;
  embeddingModelId: string;
}

/** Optional grounding hints for a named copilot (retrieval / prompt scope). */
export interface CopilotWorkerContextHints {
  contentTags?: string[];
  integrationArtifactKinds?: string[];
  includeBrandVault?: boolean;
}

/** Named copilot persona + capability bounds (persisted in workspace settings). */
export interface CopilotWorker {
  id: string;
  name: string;
  description?: string;
  /** Layered after global notificationCenter roleContext / promptTemplate in Ask builds. */
  systemInstructions: string;
  contextHints?: CopilotWorkerContextHints;
  /** Compared using normalized tokens against structured JSON suggestions / auto-exec. */
  allowedAgentCommands?: string[];
  chatModelId?: string;
  maxCompletionTokens?: number;
}

export interface CopilotWorkerRegistrySettings {
  workers: CopilotWorker[];
  /** Must match `workers[].id` when set. */
  activeWorkerId: string | null;
}

export interface AppSettings {
  timezone: string;
  defaultReminderLeadHours: number;
  weekStartsOn: 'monday' | 'sunday';
  theme: UiTheme;
  cockpitLayout: CockpitLayoutMode;
  cockpitDensity: CockpitDensityMode;
  localModelEnabled: boolean;
  aiAdapterMode: 'disabled' | 'local-only' | 'external-opt-in';
  debugMode: boolean;
  /**
   * When true, record operator traces locally (navigation, commands, selected settings changes).
   * Stored in workspace only; no automatic network upload.
   */
  operatorTraceCollectionEnabled: boolean;
  /**
   * Explicit consent gate for evolving the digital twin from connected platform metadata,
   * summaries, traces, and habits. Raw private data is never pulled automatically.
   */
  connectedIdentityLearningEnabled: boolean;
  /** Which linked OAuth profile drives “Signed in as …” in the cockpit. */
  primaryIdentityProvider: IdentityProviderId | null;
  overlay: OverlayPreferences;
  automationRules: AutomationRule[];
  syncHub: SyncHubSettings;
  notificationCenter: NotificationCenterSettings;
  /** Operator twin: résumé Phase R artifact, ingest metadata, lightweight KPI self-checks. */
  operatorTwin: OperatorTwinSettings;
  cadenceFlow: CadenceFlowSettings;
  aiBridge: AiBridgeSettings;
  /** Named hosted Ask copilots + active selection for Assistant. */
  copilotWorkers: CopilotWorkerRegistrySettings;
  /** Tracks unified Operating profile applies from Settings (diagnostics / exports). */
  operatingProfile: OperatingProfileState;
  /**
   * Operator-facing routing stance for hosted NLP (`ask:`) — chooses scoring weights + decoding knobs.
   * See {@link ./aiIntegrationSuite.ts}.
   */
  aiOperatorMode: import('./aiIntegrationSuite').AiOperatorMode;
  /** Append routing scoring breadcrumbs into hosted Ask system prompts (advanced troubleshooting). */
  aiRoutingDiagnosticsEnabled: boolean;
}

/** Workspace dataset lineage. Legacy `default-demo` is normalized to `demo-sample` on save. */
export type SeedDataSource = 'production-empty' | 'demo-sample' | 'default-demo';

export interface SeedMetadata {
  seededAt: string;
  source: SeedDataSource;
  version: string;
  /** First completion of in-shell Getting started (Plan checklist dismiss). ISO timestamp. */
  welcomeCompletedAt?: string;
  /** Checklist generation the user last dismissed; aligns with `GETTING_STARTED_CONTENT_VERSION`. */
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

export type DigitalTwinSourceType = 'resume' | 'linkedin' | 'portfolio' | 'brand' | 'manual';
export type DigitalTwinStatus = 'draft' | 'processing' | 'ready' | 'needs_review' | 'failed';
export type TwinFactStatus = 'verified' | 'unverified' | 'rejected';

export interface TwinIdentity {
  headline: string;
  summary: string;
  professionalPositioning: string;
  targetAudience: string;
  goals: string[];
  toneOfVoice: string;
  strengths: string[];
  differentiators: string[];
}

export interface TwinExperienceItem {
  id: string;
  role: string;
  organization: string;
  timeframe: string;
  highlights: string[];
  verificationStatus: TwinFactStatus;
}

export interface TwinEducationItem {
  id: string;
  institution: string;
  credential: string;
  timeframe: string;
  verificationStatus: TwinFactStatus;
}

export interface TwinProjectItem {
  id: string;
  name: string;
  summary: string;
  tools: string[];
  verificationStatus: TwinFactStatus;
}

export interface TwinResumeProfile {
  contactInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  experience: TwinExperienceItem[];
  education: TwinEducationItem[];
  skills: string[];
  certifications: string[];
  projects: TwinProjectItem[];
  achievements: string[];
  industries: string[];
  tools: string[];
  keywords: string[];
}

export interface TwinMemory {
  facts: string[];
  preferences: string[];
  voiceExamples: string[];
  approvedClaims: string[];
  rejectedClaims: string[];
  missingInfo: string[];
}

export type TwinSupportedActionType =
  | 'generate_professional_bio'
  | 'generate_linkedin_about'
  | 'generate_positioning'
  | 'draft_outreach'
  | 'create_30_day_content_plan'
  | 'generate_pitch_email'
  | 'create_media_kit_copy'
  | 'summarize_resume'
  | 'find_strongest_opportunities'
  | 'improve_profile_gaps';

export interface TwinGeneratedAsset {
  id: string;
  actionType: TwinSupportedActionType;
  title: string;
  body: string;
  createdAt: string;
}

export interface TwinPendingApproval {
  id: string;
  actionType: TwinSupportedActionType;
  summary: string;
  createdAt: string;
}

export interface TwinAuditEntry {
  id: string;
  at: string;
  action: string;
  summary: string;
}

export interface TwinActions {
  supportedActionTypes: TwinSupportedActionType[];
  generatedAssets: TwinGeneratedAsset[];
  pendingApprovals: TwinPendingApproval[];
  auditTrail: TwinAuditEntry[];
}

export interface DigitalTwin {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  displayName: string;
  sourceType: DigitalTwinSourceType;
  status: DigitalTwinStatus;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
  identity: TwinIdentity;
  resumeProfile: TwinResumeProfile;
  memory: TwinMemory;
  actions: TwinActions;
}

export interface DigitalTwinState {
  activeTwinId: string | null;
  twins: DigitalTwin[];
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

export type OperatorTraceActor = 'user' | 'assistant' | 'automation' | 'bridge';

export type OperatorTraceReviewStatus = 'pending' | 'approved' | 'rejected';

/** Append-only operator behavior traces for local analysis and future annotation (not integration hub artifacts). */
export interface OperatorTraceEntry {
  id: string;
  at: string;
  source: OperatorTraceActor;
  verb: string;
  surface?: string;
  route?: string;
  capabilityId?: string;
  sessionId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, string | number | boolean | null>;
  outcome?: 'success' | 'failure';
  labels?: string[];
  reviewStatus?: OperatorTraceReviewStatus;
  annotatorNote?: string;
}

export interface OperatorTracesState {
  entries: OperatorTraceEntry[];
}

/** Vector snapshot for a content library item (hosted embedding model). Kept small via normalization caps. */
export interface ContentItemEmbeddingRecord {
  id: string;
  contentLibraryItemId: string;
  modelId: string;
  dims: number;
  vector: number[];
  /** Fingerprint of normalized source text used for the vector (staleness detection). */
  textFingerprint: string;
  updatedAt: string;
}

export interface AiEmbeddingIndexState {
  entries: ContentItemEmbeddingRecord[];
}

/**
 * Structured citation / retrieval provenance for hosted Assistant (`ask:`) and future multimodal surfaces.
 * Persisted only inside workspace JSON when trace retention is enabled — never API keys or raw secrets.
 */
export type AiCitationSourceType =
  | 'workspace_entity'
  | 'integration_hub'
  | 'linked_document'
  | 'web_retrieval'
  | 'browser_overlay'
  | 'user_attachment'
  | 'audio'
  | 'image'
  | 'video'
  | 'document'
  | 'unknown';

export type AiCitationModality =
  | 'text'
  | 'audio'
  | 'image'
  | 'video'
  | 'document'
  | 'browser_overlay';

/** Optional multimodal anchor — URIs are hints/ids only (no bearer tokens or secrets). */
export interface AiMultimodalContextRef {
  modality?: AiCitationModality;
  mime_type?: string;
  /** Relative workspace key, asset id, or https URL length-capped — sanitized at persistence. */
  uri_hint?: string;
  duration_ms?: number;
  dimensions?: { w?: number; h?: number };
  transcript_span?: { start_ms?: number; end_ms?: number };
}

/** One retrievable span the model attributes to its answer (RAG chunk, doc page, entity row, overlay slice, …). */
export interface AiCitationChunk {
  /** Stable id for inline `[cite: …]` markers — numeric or string (e.g. `12`, `ISO_42001.pdf`). */
  chunk_id?: string | number;
  source?: string;
  /** Page number or logical page label (e.g. "appendix-a"). */
  page?: number | string;
  source_type?: AiCitationSourceType;
  retrieval_timestamp?: string;
  /** 0–1 when provided; clamped on normalize. */
  confidence?: number;
  embedding_region?: string;
  workspace_entity_id?: string;
  message_id?: string;
  agent_step_id?: string;
  multimodal?: AiMultimodalContextRef;
  /** Short excerpt for UI chips — capped on sanitize. */
  excerpt?: string;
}

export type AiAssistantTraceSurface =
  | 'assistant_chat'
  | 'linkedin_overlay'
  | 'workspace_automation';

/** Append-only Assistant I/O trace row (auditable; capped in storage). */
export interface AiAssistantTurnTrace {
  id: string;
  at: string;
  trace_schema_version: string;
  surface: AiAssistantTraceSurface;
  outcome: 'success' | 'failure';
  /** Chat transcript message id (Assistant UI), when known. */
  message_id?: string;
  /** Bounded preview of user question — not full system prompt. */
  user_turn_preview: string;
  /** Bounded preview of assistant visible text after structured-json strip. */
  assistant_preview: string;
  citations: AiCitationChunk[];
  /** Inline `[cite: x]` markers that did not match any citation row (bounded; audit). */
  orphan_inline_markers?: string[];
  model_id?: string;
  worker_id?: string;
  duration_ms?: number;
}

export interface AiAssistantTraceLogState {
  entries: AiAssistantTurnTrace[];
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
  /** Local operator traces for mining / annotation export (optional; normalized on read). */
  operatorTraces?: OperatorTracesState;
  /** Hosted embedding vectors keyed by content library item id (optional; normalized on read). */
  embeddingIndex?: AiEmbeddingIndexState;
  /** Assistant `ask:` citation / provenance turns (optional; normalized on read). */
  aiAssistantTraces?: AiAssistantTraceLogState;
  /** AI provenance graph bundles — auditable artifact linkage (optional; normalized on read). */
  aiTraceGraph?: import('./aiTraceGraph').AIWorkspaceTraceIndexState;
  /** Declarative AI pipeline executions — capped audit-only rows (optional). */
  aiPipelineRuns?: import('./aiIntegrationSuite').AiPipelineRunLogState;
  /** Resume/profile-derived AI digital twins. Local-first; exported/deleted with workspace data. */
  digitalTwins?: DigitalTwinState;
  /** Consent-gated identity learning signals derived from local platform metadata/summaries. */
  connectedIdentityEngine?: ConnectedIdentityEngineState;
}
