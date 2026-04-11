import { seedData } from '../../modules/brandMemory/seed';
import { browserLocalStorage } from '../../shared/storage/browserStorage';
import { BrandOpsData } from '../../types/domain';

const DATA_KEY = 'brandops:data';

export const storageService = {
  async getData(): Promise<BrandOpsData> {
    const stored = await browserLocalStorage.get<BrandOpsData>(DATA_KEY);
    if (stored) {
      return stored;
    }

    await browserLocalStorage.set(DATA_KEY, seedData);
    return seedData;
  },

  async setData(data: BrandOpsData): Promise<void> {
    await browserLocalStorage.set(DATA_KEY, data);
  },

  async resetToSeed(): Promise<BrandOpsData> {
    await browserLocalStorage.set(DATA_KEY, seedData);
    return seedData;
  }
};
