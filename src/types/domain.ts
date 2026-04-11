export type ExtensionSurface = 'popup' | 'dashboard' | 'options' | 'content';

export type WorkspaceModuleId =
  | 'command-center'
  | 'brand-vault'
  | 'content-library'
  | 'publishing-queue'
  | 'outreach-workspace'
  | 'pipeline-crm'
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

export interface ActivityNote {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
}

export interface MessagingVaultEntry {
  id: string;
  category: 'positioning' | 'offer' | 'case-study' | 'faq';
  title: string;
  content: string;
}

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
  brandVault: BrandVault;
  modules: WorkspaceModule[];
  publishingQueue: PublishingItem[];
  contentLibrary: ContentLibraryItem[];
  contacts: Contact[];
  notes: ActivityNote[];
  outreachDrafts: OutreachDraft[];
  outreachTemplates: OutreachTemplate[];
  outreachHistory: OutreachHistoryEntry[];
  followUps: FollowUpTask[];
  opportunities: Opportunity[];
  messagingVault: MessagingVaultEntry[];
  settings: AppSettings;
  seed: SeedMetadata;
}
