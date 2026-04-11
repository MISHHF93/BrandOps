import { seedData } from '../../modules/brandMemory/seed';
import { browserLocalStorage } from '../../shared/storage/browserStorage';
import {
  BrandOpsData,
  BrandVault,
  ContentItemStatus,
  ContentItemType,
  ContentLibraryItem,
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

const withFreshSeedMetadata = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  seed: {
    ...base.seed,
    seededAt: new Date().toISOString()
  }
});

const withDefaults = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  notes: base.notes ?? [],
  brandVault: base.brandVault ?? defaultBrandVault,
  contentLibrary: normalizeContentLibrary(base.contentLibrary),
  publishingQueue: normalizePublishingQueue(base.publishingQueue),
  outreachDrafts: normalizeOutreachDrafts(base.outreachDrafts),
  outreachTemplates: normalizeOutreachTemplates(base.outreachTemplates),
  outreachHistory: normalizeOutreachHistory(base.outreachHistory)
});

const isBrandOpsData = (value: unknown): value is BrandOpsData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BrandOpsData>;
  return Array.isArray(candidate.modules) && Array.isArray(candidate.publishingQueue);
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
