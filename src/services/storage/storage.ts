import { BrandOpsData } from '../../types/domain';
import { seedData } from '../../modules/brandMemory/seed';

const KEY = 'brandops:data';

export const storageService = {
  async getData(): Promise<BrandOpsData> {
    const result = await chrome.storage.local.get(KEY);
    return (result[KEY] as BrandOpsData | undefined) ?? seedData;
  },
  async setData(data: BrandOpsData): Promise<void> {
    await chrome.storage.local.set({ [KEY]: data });
  },
  async reset(): Promise<void> {
    await chrome.storage.local.set({ [KEY]: seedData });
  }
};
