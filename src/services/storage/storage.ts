import { seedData } from '../../modules/brandMemory/seed';
import { browserLocalStorage } from '../../shared/storage/browserStorage';
import {
  ActivityNote,
  BrandOpsData,
  BrandVault,
  Company,
  Contact,
  ContentItemStatus,
  ContentItemType,
  ContentLibraryItem,
  Opportunity,
  OutreachCategory,
  OutreachDraft,
  OutreachHistoryEntry,
  OutreachStatus,
  OutreachTemplate,
  PublishingItem,
  PublishChannel
} from '../../types/domain';

const DATA_KEY = 'brandops:data';

const defaultBrandVault: BrandVault = seedData.brandVault;

const CONTENT_TYPE_FALLBACK: ContentItemType = 'reusable-paragraph';
const CONTENT_STATUS_FALLBACK: ContentItemStatus = 'idea';
const PUBLISH_CHANNEL_FALLBACK: PublishChannel = 'linkedin';

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeContentLibrary = (items: unknown): ContentLibraryItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): ContentLibraryItem | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;

      const id = typeof candidate.id === 'string' ? candidate.id : `cli-${Math.random().toString(36).slice(2, 9)}`;
      const title =
        typeof candidate.title === 'string'
          ? candidate.title
          : typeof candidate.label === 'string'
            ? candidate.label
            : 'Untitled content item';
      const body =
        typeof candidate.body === 'string'
          ? candidate.body
          : typeof candidate.text === 'string'
            ? candidate.text
            : '';

      return {
        id,
        type: (candidate.type as ContentItemType) ?? CONTENT_TYPE_FALLBACK,
        title,
        body,
        tags: asStringArray(candidate.tags),
        audience: typeof candidate.audience === 'string' ? candidate.audience : 'General audience',
        goal: typeof candidate.goal === 'string' ? candidate.goal : 'Capture and refine reusable content',
        status: (candidate.status as ContentItemStatus) ?? CONTENT_STATUS_FALLBACK,
        publishChannel: (candidate.publishChannel as PublishChannel) ?? PUBLISH_CHANNEL_FALLBACK,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        createdAt:
          typeof candidate.createdAt === 'string'
            ? candidate.createdAt
            : typeof candidate.lastUsedAt === 'string'
              ? candidate.lastUsedAt
              : new Date().toISOString(),
        updatedAt:
          typeof candidate.updatedAt === 'string'
            ? candidate.updatedAt
            : typeof candidate.lastUsedAt === 'string'
              ? candidate.lastUsedAt
              : new Date().toISOString()
      };
    })
    .filter((item): item is ContentLibraryItem => Boolean(item));
};

const normalizePublishingQueue = (items: unknown): PublishingItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): PublishingItem | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
      const scheduledFor =
        typeof candidate.scheduledFor === 'string'
          ? candidate.scheduledFor
          : typeof candidate.reminderAt === 'string'
            ? candidate.reminderAt
            : undefined;
      const status = candidate.status;
      const normalizedStatus =
        status === 'queued' ||
        status === 'due-soon' ||
        status === 'ready-to-post' ||
        status === 'posted' ||
        status === 'skipped'
          ? status
          : status === 'draft' || status === 'scheduled'
            ? 'queued'
            : status === 'ready'
              ? 'ready-to-post'
              : status === 'published'
                ? 'posted'
                : 'queued';

      return {
        id:
          typeof candidate.id === 'string' ? candidate.id : `pub-${Math.random().toString(36).slice(2, 9)}`,
        title: typeof candidate.title === 'string' ? candidate.title : 'Untitled publishing item',
        body: typeof candidate.body === 'string' ? candidate.body : '',
        platforms: ['linkedin'],
        tags: asStringArray(candidate.tags),
        status: normalizedStatus,
        contentLibraryItemId:
          typeof candidate.contentLibraryItemId === 'string' ? candidate.contentLibraryItemId : undefined,
        scheduledFor,
        reminderAt: typeof candidate.reminderAt === 'string' ? candidate.reminderAt : undefined,
        reminderLeadMinutes:
          typeof candidate.reminderLeadMinutes === 'number' ? candidate.reminderLeadMinutes : undefined,
        checklist: typeof candidate.checklist === 'string' ? candidate.checklist : undefined,
        postedAt: typeof candidate.postedAt === 'string' ? candidate.postedAt : undefined,
        skippedAt: typeof candidate.skippedAt === 'string' ? candidate.skippedAt : undefined,
        createdAt,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
      };
    })
    .filter((item): item is PublishingItem => Boolean(item));
};

const OUTREACH_CATEGORY_FALLBACK: OutreachCategory = 'consulting';
const OUTREACH_STATUS_FALLBACK: OutreachStatus = 'draft';

const normalizeOutreachDrafts = (items: unknown): OutreachDraft[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): OutreachDraft | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
      const targetName =
        typeof candidate.targetName === 'string'
          ? candidate.targetName
          : typeof candidate.contactName === 'string'
            ? candidate.contactName
            : 'Unknown target';
      const messageBody =
        typeof candidate.messageBody === 'string'
          ? candidate.messageBody
          : typeof candidate.message === 'string'
            ? candidate.message
            : '';

      return {
        id:
          typeof candidate.id === 'string' ? candidate.id : `out-${Math.random().toString(36).slice(2, 9)}`,
        category: (candidate.category as OutreachCategory) ?? OUTREACH_CATEGORY_FALLBACK,
        targetName,
        company: typeof candidate.company === 'string' ? candidate.company : '',
        role: typeof candidate.role === 'string' ? candidate.role : '',
        messageBody,
        outreachGoal: typeof candidate.outreachGoal === 'string' ? candidate.outreachGoal : 'Start a conversation',
        tone: typeof candidate.tone === 'string' ? candidate.tone : 'Direct and practical',
        status: (candidate.status as OutreachStatus) ?? OUTREACH_STATUS_FALLBACK,
        linkedOpportunity:
          typeof candidate.linkedOpportunity === 'string' ? candidate.linkedOpportunity : undefined,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        createdAt,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
      };
    })
    .filter((item): item is OutreachDraft => Boolean(item));
};

const normalizeOutreachTemplates = (items: unknown): OutreachTemplate[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): OutreachTemplate | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
      return {
        id:
          typeof candidate.id === 'string' ? candidate.id : `tpl-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : 'Untitled template',
        category: (candidate.category as OutreachCategory) ?? OUTREACH_CATEGORY_FALLBACK,
        openerBlock: typeof candidate.openerBlock === 'string' ? candidate.openerBlock : '',
        valueBlock: typeof candidate.valueBlock === 'string' ? candidate.valueBlock : '',
        proofBlock: typeof candidate.proofBlock === 'string' ? candidate.proofBlock : '',
        callToActionBlock: typeof candidate.callToActionBlock === 'string' ? candidate.callToActionBlock : '',
        signoffBlock: typeof candidate.signoffBlock === 'string' ? candidate.signoffBlock : '',
        createdAt,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
      };
    })
    .filter((item): item is OutreachTemplate => Boolean(item));
};

const normalizeOutreachHistory = (items: unknown): OutreachHistoryEntry[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): OutreachHistoryEntry | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const status = candidate.status;
      if (
        status !== 'scheduled follow-up' &&
        status !== 'sent' &&
        status !== 'replied' &&
        status !== 'archived'
      ) {
        return null;
      }

      return {
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `outh-${Math.random().toString(36).slice(2, 9)}`,
        draftId: typeof candidate.draftId === 'string' ? candidate.draftId : 'unknown-draft',
        targetName: typeof candidate.targetName === 'string' ? candidate.targetName : 'Unknown target',
        company: typeof candidate.company === 'string' ? candidate.company : 'Unknown company',
        status,
        loggedAt: typeof candidate.loggedAt === 'string' ? candidate.loggedAt : new Date().toISOString(),
        summary: typeof candidate.summary === 'string' ? candidate.summary : 'Outreach status updated.'
      };
    })
    .filter((item): item is OutreachHistoryEntry => Boolean(item));
};

const normalizeContacts = (items: unknown): Contact[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): Contact | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const legacyName = typeof candidate.fullName === 'string' ? candidate.fullName : 'Unknown contact';
      const legacyRole = typeof candidate.title === 'string' ? candidate.title : 'Unknown role';
      const relationship = candidate.relationship;
      const relationshipStage =
        candidate.relationshipStage === 'new' ||
        candidate.relationshipStage === 'building' ||
        candidate.relationshipStage === 'trusted' ||
        candidate.relationshipStage === 'partner'
          ? candidate.relationshipStage
          : relationship === 'active-client' || relationship === 'past-client'
            ? 'trusted'
            : relationship === 'warm'
              ? 'building'
              : 'new';

      return {
        id: typeof candidate.id === 'string' ? candidate.id : `contact-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : legacyName,
        company: typeof candidate.company === 'string' ? candidate.company : 'Unknown company',
        role: typeof candidate.role === 'string' ? candidate.role : legacyRole,
        source: typeof candidate.source === 'string' ? candidate.source : 'manual',
        relationshipStage,
        status:
          candidate.status === 'active' || candidate.status === 'dormant' || candidate.status === 'archived'
            ? candidate.status
            : 'active',
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Add next action',
        followUpDate: typeof candidate.followUpDate === 'string' ? candidate.followUpDate : undefined,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        links: asStringArray(candidate.links),
        relatedOutreachDraftIds: asStringArray(candidate.relatedOutreachDraftIds),
        relatedContentTags: asStringArray(candidate.relatedContentTags),
        lastContactAt:
          typeof candidate.lastContactAt === 'string' ? candidate.lastContactAt : new Date().toISOString(),
        fullName: legacyName,
        title: legacyRole,
        relationship:
          relationship === 'new' || relationship === 'warm' || relationship === 'active-client' || relationship === 'past-client'
            ? relationship
            : 'new'
      };
    })
    .filter((item): item is Contact => Boolean(item));
};

const normalizeCompanies = (items: unknown): Company[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item): Company | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : `company-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : 'Unknown company',
        source: typeof candidate.source === 'string' ? candidate.source : 'manual',
        relationshipStage:
          candidate.relationshipStage === 'new' ||
          candidate.relationshipStage === 'building' ||
          candidate.relationshipStage === 'trusted' ||
          candidate.relationshipStage === 'partner'
            ? candidate.relationshipStage
            : 'new',
        status:
          candidate.status === 'active' || candidate.status === 'dormant' || candidate.status === 'archived'
            ? candidate.status
            : 'active',
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Add next action',
        followUpDate: typeof candidate.followUpDate === 'string' ? candidate.followUpDate : undefined,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        links: asStringArray(candidate.links),
        relatedOutreachDraftIds: asStringArray(candidate.relatedOutreachDraftIds),
        relatedContentTags: asStringArray(candidate.relatedContentTags)
      };
    })
    .filter((item): item is Company => Boolean(item));
};

const normalizeOpportunities = (items: unknown): Opportunity[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item): Opportunity | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const stage =
        candidate.status === 'prospect' ||
        candidate.status === 'discovery' ||
        candidate.status === 'proposal' ||
        candidate.status === 'negotiation' ||
        candidate.status === 'won' ||
        candidate.status === 'lost'
          ? candidate.status
          : candidate.stage === 'prospect' ||
              candidate.stage === 'discovery' ||
              candidate.stage === 'proposal' ||
              candidate.stage === 'negotiation' ||
              candidate.stage === 'won' ||
              candidate.stage === 'lost'
            ? candidate.stage
            : 'prospect';

      return {
        id: typeof candidate.id === 'string' ? candidate.id : `opp-${Math.random().toString(36).slice(2, 9)}`,
        name:
          typeof candidate.name === 'string'
            ? candidate.name
            : typeof candidate.account === 'string'
              ? `${candidate.account} opportunity`
              : 'Untitled opportunity',
        company:
          typeof candidate.company === 'string'
            ? candidate.company
            : typeof candidate.account === 'string'
              ? candidate.account
              : 'Unknown company',
        role: typeof candidate.role === 'string' ? candidate.role : 'Decision maker',
        source: typeof candidate.source === 'string' ? candidate.source : 'manual',
        relationshipStage:
          candidate.relationshipStage === 'new' ||
          candidate.relationshipStage === 'building' ||
          candidate.relationshipStage === 'trusted' ||
          candidate.relationshipStage === 'partner'
            ? candidate.relationshipStage
            : 'new',
        opportunityType:
          candidate.opportunityType === 'consulting' ||
          candidate.opportunityType === 'collaboration' ||
          candidate.opportunityType === 'client delivery' ||
          candidate.opportunityType === 'advisory' ||
          candidate.opportunityType === 'founding team' ||
          candidate.opportunityType === 'investor relationship' ||
          candidate.opportunityType === 'recruiter conversation'
            ? candidate.opportunityType
            : 'consulting',
        status: stage,
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Define next action',
        followUpDate:
          typeof candidate.followUpDate === 'string'
            ? candidate.followUpDate
            : typeof candidate.updatedAt === 'string'
              ? candidate.updatedAt
              : new Date().toISOString(),
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        links: asStringArray(candidate.links),
        relatedOutreachDraftIds: asStringArray(candidate.relatedOutreachDraftIds),
        relatedContentTags: asStringArray(candidate.relatedContentTags),
        archivedAt: typeof candidate.archivedAt === 'string' ? candidate.archivedAt : undefined,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
        valueUsd: typeof candidate.valueUsd === 'number' ? candidate.valueUsd : 0,
        confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0,
        contactId: typeof candidate.contactId === 'string' ? candidate.contactId : undefined,
        account: typeof candidate.account === 'string' ? candidate.account : undefined,
        serviceLine: typeof candidate.serviceLine === 'string' ? candidate.serviceLine : undefined,
        stage
      };
    })
    .filter((item): item is Opportunity => Boolean(item));
};

const normalizeActivityNotes = (items: unknown): ActivityNote[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item): ActivityNote | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : `note-${Math.random().toString(36).slice(2, 9)}`,
        entityType:
          candidate.entityType === 'contact' || candidate.entityType === 'company' || candidate.entityType === 'opportunity'
            ? candidate.entityType
            : 'opportunity',
        entityId: typeof candidate.entityId === 'string' ? candidate.entityId : 'unknown',
        title: typeof candidate.title === 'string' ? candidate.title : 'Activity note',
        detail: typeof candidate.detail === 'string' ? candidate.detail : '',
        status: typeof candidate.status === 'string' ? candidate.status : undefined,
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : undefined,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString()
      };
    })
    .filter((item): item is ActivityNote => Boolean(item));
};

const normalizeSettings = (settings: unknown): BrandOpsData['settings'] => {
  const fallback = seedData.settings;
  if (!settings || typeof settings !== 'object') {
    return fallback;
  }

  const candidate = settings as Partial<BrandOpsData['settings']>;
  return {
    timezone: typeof candidate.timezone === 'string' ? candidate.timezone : fallback.timezone,
    defaultReminderLeadHours:
      typeof candidate.defaultReminderLeadHours === 'number' ? candidate.defaultReminderLeadHours : fallback.defaultReminderLeadHours,
    weekStartsOn: candidate.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
    localModelEnabled: Boolean(candidate.localModelEnabled),
    aiAdapterMode:
      candidate.aiAdapterMode === 'local-only' || candidate.aiAdapterMode === 'external-opt-in'
        ? candidate.aiAdapterMode
        : 'disabled',
    debugMode: Boolean(candidate.debugMode),
    overlay: {
      enabled: Boolean(candidate.overlay?.enabled),
      compactMode: Boolean(candidate.overlay?.compactMode),
      showContactInsights: Boolean(candidate.overlay?.showContactInsights)
    },
    automationRules: Array.isArray(candidate.automationRules)
      ? candidate.automationRules
          .filter((rule): rule is BrandOpsData['settings']['automationRules'][number] => {
            return (
              Boolean(rule) &&
              typeof rule.id === 'string' &&
              typeof rule.name === 'string' &&
              (rule.trigger === 'publish-reminder' ||
                rule.trigger === 'follow-up-overdue' ||
                rule.trigger === 'weekly-review') &&
              (rule.action === 'badge-highlight' ||
                rule.action === 'dashboard-pin' ||
                rule.action === 'notification') &&
              typeof rule.enabled === 'boolean'
            );
          })
      : fallback.automationRules
  };
};

const withFreshSeedMetadata = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  seed: {
    ...base.seed,
    seededAt: new Date().toISOString()
  }
});

const withDefaults = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  brandVault: base.brandVault ?? defaultBrandVault,
  contentLibrary: normalizeContentLibrary(base.contentLibrary),
  publishingQueue: normalizePublishingQueue(base.publishingQueue),
  contacts: normalizeContacts(base.contacts),
  companies: normalizeCompanies(base.companies),
  opportunities: normalizeOpportunities(base.opportunities),
  notes: normalizeActivityNotes(base.notes),
  outreachDrafts: normalizeOutreachDrafts(base.outreachDrafts),
  outreachTemplates: normalizeOutreachTemplates(base.outreachTemplates),
  outreachHistory: normalizeOutreachHistory(base.outreachHistory),
  settings: normalizeSettings(base.settings),
  scheduler: base.scheduler ?? {
    tasks: [],
    updatedAt: new Date().toISOString(),
    lastHydratedAt: new Date().toISOString()
  }
});

const isBrandOpsData = (value: unknown): value is BrandOpsData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BrandOpsData>;
  return (
    Array.isArray(candidate.modules) &&
    Array.isArray(candidate.publishingQueue) &&
    Array.isArray(candidate.contentLibrary) &&
    Array.isArray(candidate.contacts) &&
    Array.isArray(candidate.opportunities) &&
    Boolean(candidate.settings)
  );
};

export const storageService = {
  async getData(): Promise<BrandOpsData> {
    const stored = await browserLocalStorage.get<BrandOpsData>(DATA_KEY);
    if (isBrandOpsData(stored)) {
      return withDefaults(stored);
    }

    const seeded = withDefaults(withFreshSeedMetadata(seedData));
    await browserLocalStorage.set(DATA_KEY, seeded);
    return seeded;
  },

  async setData(data: BrandOpsData): Promise<void> {
    await browserLocalStorage.set(DATA_KEY, data);
  },

  async resetToSeed(): Promise<BrandOpsData> {
    const seeded = withDefaults(withFreshSeedMetadata(seedData));
    await browserLocalStorage.set(DATA_KEY, seeded);
    return seeded;
  },

  async exportData(): Promise<string> {
    const data = await this.getData();
    return JSON.stringify(data, null, 2);
  },

  async importData(raw: string): Promise<BrandOpsData> {
    const parsed = JSON.parse(raw) as unknown;
    if (!isBrandOpsData(parsed)) {
      throw new Error('Invalid BrandOps workspace payload.');
    }

    const normalized = withDefaults(parsed);
    await browserLocalStorage.set(DATA_KEY, normalized);
    return normalized;
  }
};
