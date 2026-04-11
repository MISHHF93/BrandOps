import { create } from 'zustand';
import { storageService } from '../services/storage/storage';
import {
  BrandOpsData,
  ContentAsset,
  MessagingVaultEntry,
  OutreachDraft,
  PublishingItem,
  QueueStatus
} from '../types/domain';

interface StoreState {
  data: BrandOpsData | null;
  loading: boolean;
  error?: string;
  init: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  addPublishingDraft: (payload: {
    title: string;
    body: string;
    reminderAt?: string;
  }) => Promise<void>;
  updatePublishingStatus: (id: string, status: QueueStatus) => Promise<void>;
  addOutreachDraft: (payload: {
    contactId: string;
    subject: string;
    message: string;
  }) => Promise<void>;
  toggleFollowUp: (id: string) => Promise<void>;
  addVaultEntry: (payload: Omit<MessagingVaultEntry, 'id'>) => Promise<void>;
  addContentAsset: (payload: Omit<ContentAsset, 'id'>) => Promise<void>;
  exportWorkspace: () => Promise<string>;
  importWorkspace: (raw: string) => Promise<void>;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
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

  async resetDemoData() {
    const data = await storageService.resetToSeed();
    set({ data, error: undefined });
  },

  async addPublishingDraft(payload) {
    const current = get().data;
    if (!current) return;

    const draft: PublishingItem = {
      id: uid('pub'),
      title: payload.title,
      body: payload.body,
      platforms: ['linkedin'],
      tags: ['new-draft'],
      status: 'draft',
      reminderAt: payload.reminderAt,
      createdAt: new Date().toISOString()
    };

    const updated = { ...current, publishingQueue: [draft, ...current.publishingQueue] };
    await storageService.setData(updated);
    set({ data: updated });
  },

  async updatePublishingStatus(id, status) {
    const current = get().data;
    if (!current) return;

    const updated = {
      ...current,
      publishingQueue: current.publishingQueue.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    };

    await storageService.setData(updated);
    set({ data: updated });
  },

  async addOutreachDraft(payload) {
    const current = get().data;
    if (!current) return;

    const draft: OutreachDraft = {
      id: uid('out'),
      contactId: payload.contactId,
      subject: payload.subject,
      message: payload.message,
      status: 'draft',
      touchpoint: 1
    };

    const updated = { ...current, outreachDrafts: [draft, ...current.outreachDrafts] };
    await storageService.setData(updated);
    set({ data: updated });
  },

  async toggleFollowUp(id) {
    const current = get().data;
    if (!current) return;

    const updated = {
      ...current,
      followUps: current.followUps.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    };

    await storageService.setData(updated);
    set({ data: updated });
  },

  async addVaultEntry(payload) {
    const current = get().data;
    if (!current) return;

    const entry: MessagingVaultEntry = { id: uid('msg'), ...payload };
    const updated = { ...current, messagingVault: [entry, ...current.messagingVault] };

    await storageService.setData(updated);
    set({ data: updated });
  },

  async addContentAsset(payload) {
    const current = get().data;
    if (!current) return;

    const asset: ContentAsset = { id: uid('asset'), ...payload };
    const updated = { ...current, contentLibrary: [asset, ...current.contentLibrary] };

    await storageService.setData(updated);
    set({ data: updated });
  },

  async exportWorkspace() {
    return storageService.exportData();
  },

  async importWorkspace(raw) {
    const data = await storageService.importData(raw);
    set({ data, error: undefined });
  }
}));
