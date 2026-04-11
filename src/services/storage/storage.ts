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

export const storageService = {
  async getData(): Promise<BrandOpsData> {
    const stored = await browserLocalStorage.get<BrandOpsData>(DATA_KEY);
    if (stored) {
      return stored;
    }

    const seeded = withFreshSeedMetadata(seedData);
    await browserLocalStorage.set(DATA_KEY, seeded);
    return seeded;
  },

  async setData(data: BrandOpsData): Promise<void> {
    await browserLocalStorage.set(DATA_KEY, data);
  },

  async resetToSeed(): Promise<BrandOpsData> {
    const seeded = withFreshSeedMetadata(seedData);
    await browserLocalStorage.set(DATA_KEY, seeded);
    return seeded;
  },

  async exportData(): Promise<string> {
    const data = await this.getData();
    return JSON.stringify(data, null, 2);
  },

  async importData(raw: string): Promise<BrandOpsData> {
    const parsed = JSON.parse(raw) as BrandOpsData;
    await browserLocalStorage.set(DATA_KEY, parsed);
    return parsed;
  }
};
