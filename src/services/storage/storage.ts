import { seedData } from '../../modules/brandMemory/seed';
import { browserLocalStorage } from '../../shared/storage/browserStorage';
import {
  BrandOpsData,
  BrandVault,
  ContentItemStatus,
  ContentItemType,
  ContentLibraryItem,
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
  contentLibrary: normalizeContentLibrary(base.contentLibrary)
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
