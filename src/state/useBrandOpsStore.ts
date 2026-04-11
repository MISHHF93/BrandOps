import { create } from 'zustand';
import { storageService } from '../services/storage/storage';
import {
  ActivityNote,
  BrandOpsData,
  BrandVault,
  BrandVaultListField,
  Contact,
  ContentItemStatus,
  ContentItemType,
  ContentLibraryItem,
  PublishChannel,
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
    contentLibraryItemId?: string;
    scheduledFor?: string;
    reminderAt?: string;
    reminderLeadMinutes?: number;
    checklist?: string;
  }) => Promise<void>;
  updatePublishingStatus: (id: string, status: QueueStatus) => Promise<void>;
  updatePublishingItem: (
    id: string,
    payload: Partial<
      Pick<
        PublishingItem,
        'scheduledFor' | 'reminderAt' | 'reminderLeadMinutes' | 'checklist' | 'status'
      >
    >
  ) => Promise<void>;
  quickReschedulePublishingItem: (id: string, minutesDelta: number) => Promise<void>;
  addOutreachDraft: (payload: {
    contactId: string;
    subject: string;
    message: string;
  }) => Promise<void>;
  addContact: (payload: { fullName: string; title: string; company: string }) => Promise<void>;
  logFollowUp: (payload: { contactId: string; reason: string; dueAt: string }) => Promise<void>;
  addNote: (payload: { title: string; detail: string }) => Promise<void>;
  toggleFollowUp: (id: string) => Promise<void>;
  addVaultEntry: (payload: Omit<MessagingVaultEntry, 'id'>) => Promise<void>;
  addContentLibraryItem: (payload: {
    type: ContentItemType;
    title: string;
    body: string;
    tags: string[];
    audience: string;
    goal: string;
    status: ContentItemStatus;
    publishChannel: PublishChannel;
    notes: string;
  }) => Promise<void>;
  updateContentLibraryItem: (
    id: string,
    payload: Partial<Omit<ContentLibraryItem, 'id' | 'createdAt'>>
  ) => Promise<void>;
  duplicateContentLibraryItem: (id: string) => Promise<void>;
  archiveContentLibraryItem: (id: string) => Promise<void>;
  updateBrandVaultTextField: (
    field: 'positioningStatement' | 'shortBio' | 'fullAboutSummary',
    value: string
  ) => Promise<void>;
  addBrandVaultListItem: (field: BrandVaultListField, value: string) => Promise<void>;
  updateBrandVaultListItem: (field: BrandVaultListField, index: number, value: string) => Promise<void>;
  deleteBrandVaultListItem: (field: BrandVaultListField, index: number) => Promise<void>;
  reorderBrandVaultListItem: (
    field: BrandVaultListField,
    fromIndex: number,
    toIndex: number
  ) => Promise<void>;
  exportBrandVault: () => Promise<string>;
  importBrandVault: (raw: string) => Promise<void>;
  exportWorkspace: () => Promise<string>;
  importWorkspace: (raw: string) => Promise<void>;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const updateData = async (
  current: BrandOpsData | null,
  producer: (currentData: BrandOpsData) => BrandOpsData,
  setData: (next: BrandOpsData) => void
) => {
  if (!current) return;
  const updated = producer(current);
  await storageService.setData(updated);
  setData(updated);
};

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
    const now = new Date().toISOString();
    const draft: PublishingItem = {
      id: uid('pub'),
      title: payload.title,
      body: payload.body,
      contentLibraryItemId: payload.contentLibraryItemId,
      platforms: ['linkedin'],
      tags: ['new-draft'],
      status: payload.scheduledFor ? 'queued' : 'ready-to-post',
      scheduledFor: payload.scheduledFor,
      reminderAt: payload.reminderAt,
      reminderLeadMinutes: payload.reminderLeadMinutes,
      checklist: payload.checklist,
      createdAt: now,
      updatedAt: now
    };

    await updateData(
      current,
      (currentData) => ({ ...currentData, publishingQueue: [draft, ...currentData.publishingQueue] }),
      (data) => set({ data })
    );
  },

  async updatePublishingStatus(id, status) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        publishingQueue: currentData.publishingQueue.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                postedAt: status === 'posted' ? new Date().toISOString() : item.postedAt,
                skippedAt: status === 'skipped' ? new Date().toISOString() : item.skippedAt,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }),
      (data) => set({ data })
    );
  },

  async updatePublishingItem(id, payload) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        publishingQueue: currentData.publishingQueue.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }),
      (data) => set({ data })
    );
  },

  async quickReschedulePublishingItem(id, minutesDelta) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        publishingQueue: currentData.publishingQueue.map((item) => {
          if (item.id !== id) return item;
          const source = item.scheduledFor ?? item.reminderAt ?? new Date().toISOString();
          const nextDate = new Date(source);
          nextDate.setMinutes(nextDate.getMinutes() + minutesDelta);
          const nextIso = nextDate.toISOString();

          return {
            ...item,
            scheduledFor: nextIso,
            reminderAt: nextIso,
            status: 'queued',
            updatedAt: new Date().toISOString()
          };
        })
      }),
      (data) => set({ data })
    );
  },

  async addOutreachDraft(payload) {
    const current = get().data;

    const draft: OutreachDraft = {
      id: uid('out'),
      contactId: payload.contactId,
      subject: payload.subject,
      message: payload.message,
      status: 'draft',
      touchpoint: 1
    };

    await updateData(
      current,
      (currentData) => ({ ...currentData, outreachDrafts: [draft, ...currentData.outreachDrafts] }),
      (data) => set({ data })
    );
  },

  async addContact(payload) {
    const current = get().data;

    const contact: Contact = {
      id: uid('contact'),
      fullName: payload.fullName,
      title: payload.title,
      company: payload.company,
      relationship: 'new',
      lastContactAt: new Date().toISOString()
    };

    await updateData(
      current,
      (currentData) => ({ ...currentData, contacts: [contact, ...currentData.contacts] }),
      (data) => set({ data })
    );
  },

  async logFollowUp(payload) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        followUps: [
          {
            id: uid('fu'),
            contactId: payload.contactId,
            reason: payload.reason,
            dueAt: payload.dueAt,
            completed: false
          },
          ...currentData.followUps
        ]
      }),
      (data) => set({ data })
    );
  },

  async addNote(payload) {
    const current = get().data;

    const note: ActivityNote = {
      id: uid('note'),
      title: payload.title,
      detail: payload.detail,
      createdAt: new Date().toISOString()
    };

    await updateData(
      current,
      (currentData) => ({ ...currentData, notes: [note, ...currentData.notes] }),
      (data) => set({ data })
    );
  },

  async toggleFollowUp(id) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        followUps: currentData.followUps.map((item) =>
          item.id === id ? { ...item, completed: !item.completed } : item
        )
      }),
      (data) => set({ data })
    );
  },

  async addVaultEntry(payload) {
    const current = get().data;
    const entry: MessagingVaultEntry = { id: uid('msg'), ...payload };

    await updateData(
      current,
      (currentData) => ({ ...currentData, messagingVault: [entry, ...currentData.messagingVault] }),
      (data) => set({ data })
    );
  },

  async addContentLibraryItem(payload) {
    const current = get().data;
    const now = new Date().toISOString();
    const item: ContentLibraryItem = {
      id: uid('cli'),
      ...payload,
      createdAt: now,
      updatedAt: now
    };

    await updateData(
      current,
      (currentData) => ({ ...currentData, contentLibrary: [item, ...currentData.contentLibrary] }),
      (data) => set({ data })
    );
  },

  async updateContentLibraryItem(id, payload) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        contentLibrary: currentData.contentLibrary.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }),
      (data) => set({ data })
    );
  },

  async duplicateContentLibraryItem(id) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => {
        const source = currentData.contentLibrary.find((item) => item.id === id);
        if (!source) return currentData;

        const now = new Date().toISOString();
        const duplicate: ContentLibraryItem = {
          ...source,
          id: uid('cli'),
          title: `${source.title} (Copy)`,
          status: source.status === 'archived' ? 'idea' : source.status,
          createdAt: now,
          updatedAt: now
        };

        return {
          ...currentData,
          contentLibrary: [duplicate, ...currentData.contentLibrary]
        };
      },
      (data) => set({ data })
    );
  },

  async archiveContentLibraryItem(id) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        contentLibrary: currentData.contentLibrary.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'archived',
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }),
      (data) => set({ data })
    );
  },

  async updateBrandVaultTextField(field, value) {
    const current = get().data;
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: {
          ...currentData.brandVault,
          [field]: value
        }
      }),
      (data) => set({ data })
    );
  },

  async addBrandVaultListItem(field, value) {
    const current = get().data;
    const trimmed = value.trim();
    if (!trimmed) return;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: {
          ...currentData.brandVault,
          [field]: [trimmed, ...currentData.brandVault[field]]
        }
      }),
      (data) => set({ data })
    );
  },

  async updateBrandVaultListItem(field, index, value) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: {
          ...currentData.brandVault,
          [field]: currentData.brandVault[field].map((item, itemIndex) =>
            itemIndex === index ? value : item
          )
        }
      }),
      (data) => set({ data })
    );
  },

  async deleteBrandVaultListItem(field, index) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: {
          ...currentData.brandVault,
          [field]: currentData.brandVault[field].filter((_, itemIndex) => itemIndex !== index)
        }
      }),
      (data) => set({ data })
    );
  },

  async reorderBrandVaultListItem(field, fromIndex, toIndex) {
    const current = get().data;

    await updateData(
      current,
      (currentData) => {
        const updatedList = [...currentData.brandVault[field]];
        const [movedItem] = updatedList.splice(fromIndex, 1);
        updatedList.splice(toIndex, 0, movedItem);

        return {
          ...currentData,
          brandVault: {
            ...currentData.brandVault,
            [field]: updatedList
          }
        };
      },
      (data) => set({ data })
    );
  },

  async exportBrandVault() {
    const current = get().data;
    return JSON.stringify(current?.brandVault ?? ({} as BrandVault), null, 2);
  },

  async importBrandVault(raw) {
    const current = get().data;
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid Brand Vault JSON payload.');
    }

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: parsed as BrandVault
      }),
      (data) => set({ data })
    );
  },

  async exportWorkspace() {
    return storageService.exportData();
  },

  async importWorkspace(raw) {
    const data = await storageService.importData(raw);
    set({ data, error: undefined });
  }
}));
