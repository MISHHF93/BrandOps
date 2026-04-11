export type ExtensionSurface = 'popup' | 'dashboard' | 'options' | 'content';

export type WorkspaceModuleId =
  | 'dashboard'
  | 'publishing-queue'
  | 'content-library'
  | 'outreach-workspace'
  | 'follow-up-scheduler'
  | 'opportunity-pipeline'
  | 'messaging-vault'
  | 'linkedin-overlay'
  | 'settings';

export interface WorkspaceModule {
  id: WorkspaceModuleId;
  title: string;
  description: string;
  status: 'active' | 'planned';
}

export type QueueStatus = 'draft' | 'ready' | 'scheduled' | 'published';

export interface PublishingItem {
  id: string;
  title: string;
  body: string;
  platforms: ('linkedin' | 'newsletter' | 'x')[];
  tags: string[];
  status: QueueStatus;
  reminderAt?: string;
  createdAt: string;
}

export interface ContentAsset {
  id: string;
  label: string;
  category: 'hook' | 'cta' | 'story' | 'objection-handle' | 'proof-point';
  text: string;
  lastUsedAt?: string;
}

export type OutreachStatus = 'draft' | 'queued' | 'sent' | 'replied';

export interface OutreachDraft {
  id: string;
  contactId: string;
  subject: string;
  message: string;
  status: OutreachStatus;
  touchpoint: 1 | 2 | 3 | 4;
  scheduledFor?: string;
}

export interface FollowUpTask {
  id: string;
  contactId: string;
  reason: string;
  dueAt: string;
  completed: boolean;
}

export type OpportunityStage = 'prospect' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Opportunity {
  id: string;
  contactId: string;
  account: string;
  serviceLine: string;
  stage: OpportunityStage;
  valueUsd: number;
  confidence: number;
  nextAction: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  fullName: string;
  title: string;
  company: string;
  relationship: 'new' | 'warm' | 'active-client' | 'past-client';
  lastContactAt: string;
}

export interface MessagingVaultEntry {
  id: string;
  category: 'positioning' | 'offer' | 'case-study' | 'faq';
  title: string;
  content: string;
}

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

export interface AppSettings {
  timezone: string;
  defaultReminderLeadHours: number;
  weekStartsOn: 'monday' | 'sunday';
  localModelEnabled: boolean;
  aiAdapterMode: 'disabled' | 'local-only' | 'external-opt-in';
  overlay: OverlayPreferences;
  automationRules: AutomationRule[];
}

export interface SeedMetadata {
  seededAt: string;
  source: 'default-demo';
  version: string;
}

export interface BrandProfile {
  operatorName: string;
  positioning: string;
  primaryOffer: string;
  voiceGuide: string;
  focusMetric: string;
}

export interface BrandOpsData {
  brand: BrandProfile;
  modules: WorkspaceModule[];
  publishingQueue: PublishingItem[];
  contentLibrary: ContentAsset[];
  contacts: Contact[];
  outreachDrafts: OutreachDraft[];
  followUps: FollowUpTask[];
  opportunities: Opportunity[];
  messagingVault: MessagingVaultEntry[];
  settings: AppSettings;
  seed: SeedMetadata;
}
