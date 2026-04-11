import { create } from 'zustand';
import { storageService } from '../services/storage/storage';
import { BrandOpsData } from '../types/domain';

interface StoreState {
  data: BrandOpsData | null;
  loading: boolean;
  error?: string;
  init: () => Promise<void>;
  resetDemoData: () => Promise<void>;
}

export const useBrandOpsStore = create<StoreState>((set) => ({
  data: null,
  loading: false,
  async init() {
    set({ loading: true, error: undefined });

    try {
      const data = await storageService.getData();
      set({ data, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },
  async resetDemoData() {
    const data = await storageService.resetToSeed();
    set({ data });
  }
}));
