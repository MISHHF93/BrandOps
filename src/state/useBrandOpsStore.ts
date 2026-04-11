import { create } from 'zustand';
import { generatePostDraft } from '../modules/contentStudio/service';
import { generateOutreachDraft } from '../modules/outreach/service';
import { storageService } from '../services/storage/storage';
import { BrandOpsData, OpportunityStage } from '../types/domain';

interface StoreState {
  data: BrandOpsData | null;
  loading: boolean;
  error?: string;
  init: () => Promise<void>;
  updateHeadline: (headline: string) => Promise<void>;
  generatePost: (idea: string) => Promise<void>;
  generateOutreach: (name: string, role: string, objective: string) => Promise<void>;
  moveOpportunity: (id: string, stage: OpportunityStage) => Promise<void>;
  updateSettings: (next: Partial<BrandOpsData['settings']>) => Promise<void>;
}

export const useBrandOpsStore = create<StoreState>((set, get) => ({
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
  async updateHeadline(headline) {
    const data = get().data;
    if (!data) return;
    const next = { ...data, brand: { ...data.brand, headline } };
    await storageService.setData(next);
    set({ data: next });
  },
  async generatePost(idea) {
    const data = get().data;
    if (!data) return;
    const draft = await generatePostDraft(data, idea);
    const next = { ...data, posts: [draft, ...data.posts] };
    await storageService.setData(next);
    set({ data: next });
  },
  async generateOutreach(name, role, objective) {
    const data = get().data;
    if (!data) return;
    const draft = await generateOutreachDraft(data, name, role, objective);
    const next = { ...data, outreach: [draft, ...data.outreach] };
    await storageService.setData(next);
    set({ data: next });
  },
  async moveOpportunity(id, stage) {
    const data = get().data;
    if (!data) return;
    const next = {
      ...data,
      opportunities: data.opportunities.map((item) =>
        item.id === id ? { ...item, stage, updatedAt: new Date().toISOString() } : item
      )
    };
    await storageService.setData(next);
    set({ data: next });
  },
  async updateSettings(nextSettings) {
    const data = get().data;
    if (!data) return;
    const next = { ...data, settings: { ...data.settings, ...nextSettings } };
    await storageService.setData(next);
    set({ data: next });
  }
}));
