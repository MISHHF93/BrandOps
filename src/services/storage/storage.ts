import { seedData } from '../../modules/brandMemory/seed';
import { browserLocalStorage } from '../../shared/storage/browserStorage';
import { BrandOpsData } from '../../types/domain';

const DATA_KEY = 'brandops:data';

const withFreshSeedMetadata = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  seed: {
    ...base.seed,
    seededAt: new Date().toISOString()
  }
});

const withDefaults = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  notes: base.notes ?? []
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
