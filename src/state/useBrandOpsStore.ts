import { create } from 'zustand';
import { storageService } from '../services/storage/storage';
import { scheduler } from '../services/scheduling/scheduler';
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
  Opportunity,
  OutreachCategory,
  OutreachDraft,
  OutreachHistoryEntry,
  OutreachTemplate,
  PublishingItem,
  QueueStatus
} from '../types/domain';

interface StoreState {
  data: BrandOpsData | null;
  loading: boolean;
  error?: string;
  init: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  setDebugMode: (enabled: boolean) => Promise<void>;
  generateMockActivityBurst: () => Promise<void>;
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
    category: OutreachCategory;
    targetName: string;
    company: string;
    role: string;
    messageBody: string;
    outreachGoal: string;
    tone: string;
    linkedOpportunity?: string;
    notes: string;
  }) => Promise<void>;
  updateOutreachDraft: (
    id: string,
    payload: Partial<Omit<OutreachDraft, 'id' | 'createdAt'>>
  ) => Promise<void>;
  archiveOutreachDraft: (id: string) => Promise<void>;
  addOutreachTemplate: (payload: Omit<OutreachTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addContact: (payload: { fullName: string; title: string; company: string }) => Promise<void>;
  logFollowUp: (payload: { contactId: string; reason: string; dueAt: string }) => Promise<void>;
  addNote: (payload: { title: string; detail: string }) => Promise<void>;
  updateOpportunity: (id: string, payload: Partial<Opportunity>) => Promise<void>;
  archiveOpportunity: (id: string) => Promise<void>;
  restoreOpportunity: (id: string) => Promise<void>;
  toggleFollowUp: (id: string) => Promise<void>;
  snoozeSchedulerTask: (taskId: string, minutes: number) => Promise<void>;
  completeSchedulerTask: (taskId: string) => Promise<void>;
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
  const withScheduler = { ...updated, scheduler: scheduler.reconcile(updated) };
  await storageService.setData(withScheduler);
  setData(withScheduler);
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    void chrome.runtime.sendMessage({ type: 'SYNC_SCHEDULER' });
  }
};

export const useBrandOpsStore = create<StoreState>((set, get) => ({
  data: null,
  loading: false,

  async init() {
    set({ loading: true, error: undefined });

    try {
      const data = await storageService.getData();
      const withScheduler = { ...data, scheduler: scheduler.reconcile(data) };
      await storageService.setData(withScheduler);
      set({ data: withScheduler, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  async resetDemoData() {
    const data = await storageService.resetToSeed();
    const withScheduler = { ...data, scheduler: scheduler.reconcile(data) };
    await storageService.setData(withScheduler);
    set({ data: withScheduler, error: undefined });
  },

  async setDebugMode(enabled) {
    const current = get().data;
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          debugMode: enabled
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async generateMockActivityBurst() {
    const current = get().data;
    const now = new Date().toISOString();

    await updateData(
      current,
      (currentData) => {
        const syntheticContentId = uid('cli');
        const syntheticOpportunityId = uid('opp');
        const syntheticContactId = uid('contact');

        return {
          ...currentData,
          contentLibrary: [
            {
              id: syntheticContentId,
              type: 'post-idea',
              title: 'QA synthetic content idea',
              body: 'Generated test content to validate first-launch empty and loaded states.',
              tags: ['qa', 'synthetic'],
              audience: 'Internal QA',
              goal: 'Exercise rendering and search index paths',
              status: 'idea',
              publishChannel: 'linkedin',
              notes: 'Auto-generated from developer tools.',
              createdAt: now,
              updatedAt: now
            },
            ...currentData.contentLibrary
          ],
          contacts: [
            {
              id: syntheticContactId,
              name: 'QA Synthetic Contact',
              company: 'Demo Labs',
              role: 'Operator',
              source: 'debug-generator',
              relationshipStage: 'new',
              status: 'active',
              nextAction: 'Validate follow-up scheduling flow',
              followUpDate: now,
              notes: 'Generated for QA checks.',
              links: [],
              relatedOutreachDraftIds: [],
              relatedContentTags: ['qa'],
              lastContactAt: now,
              fullName: 'QA Synthetic Contact',
              title: 'Operator',
              relationship: 'new'
            },
            ...currentData.contacts
          ],
          opportunities: [
            {
              id: syntheticOpportunityId,
              name: 'QA Pipeline Opportunity',
              company: 'Demo Labs',
              role: 'Buyer',
              source: 'debug-generator',
              relationshipStage: 'building',
              opportunityType: 'consulting',
              status: 'prospect',
              nextAction: 'Run CRM status transition checks',
              followUpDate: now,
              notes: 'Generated for test coverage of pipeline cards.',
              links: [],
              relatedOutreachDraftIds: [],
              relatedContentTags: ['qa'],
              createdAt: now,
              updatedAt: now,
              valueUsd: 7500,
              confidence: 35
            },
            ...currentData.opportunities
          ]
        };
      },
      (data) => set({ data, error: undefined })
    );
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
    const now = new Date().toISOString();

    const draft: OutreachDraft = {
      id: uid('out'),
      category: payload.category,
      targetName: payload.targetName,
      company: payload.company,
      role: payload.role,
      messageBody: payload.messageBody,
      outreachGoal: payload.outreachGoal,
      tone: payload.tone,
      status: 'draft',
      linkedOpportunity: payload.linkedOpportunity,
      notes: payload.notes,
      createdAt: now,
      updatedAt: now
    };

    await updateData(
      current,
      (currentData) => ({ ...currentData, outreachDrafts: [draft, ...currentData.outreachDrafts] }),
      (data) => set({ data })
    );
  },

  async updateOutreachDraft(id, payload) {
    const current = get().data;
    const now = new Date().toISOString();
    await updateData(
      current,
      (currentData) => {
        const previous = currentData.outreachDrafts.find((item) => item.id === id);
        const nextStatus = payload.status;
        const shouldLogHistory =
          nextStatus &&
          nextStatus !== 'draft' &&
          nextStatus !== 'ready' &&
          previous &&
          previous.status !== nextStatus;

        const updatedDrafts = currentData.outreachDrafts.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload,
                updatedAt: now
              }
            : item
        );

        const historyEntry: OutreachHistoryEntry | null =
          shouldLogHistory && previous
            ? {
                id: uid('outh'),
                draftId: previous.id,
                targetName: previous.targetName,
                company: previous.company,
                status: nextStatus,
                loggedAt: now,
                summary: `${nextStatus.toUpperCase()}: ${previous.outreachGoal}`
              }
            : null;

        return {
          ...currentData,
          outreachDrafts: updatedDrafts,
          outreachHistory: historyEntry
            ? [historyEntry, ...currentData.outreachHistory].slice(0, 25)
            : currentData.outreachHistory
        };
      },
      (data) => set({ data })
    );
  },

  async archiveOutreachDraft(id) {
    await get().updateOutreachDraft(id, { status: 'archived' });
  },

  async addOutreachTemplate(payload) {
    const current = get().data;
    const now = new Date().toISOString();
    const template: OutreachTemplate = {
      id: uid('tpl'),
      ...payload,
      createdAt: now,
      updatedAt: now
    };
    await updateData(
      current,
      (currentData) => ({ ...currentData, outreachTemplates: [template, ...currentData.outreachTemplates] }),
      (data) => set({ data })
    );
  },

  async addContact(payload) {
    const current = get().data;

    const contact: Contact = {
      id: uid('contact'),
      name: payload.fullName,
      company: payload.company,
      role: payload.title,
      source: 'manual',
      relationshipStage: 'new',
      status: 'active',
      nextAction: 'Send a first-touch intro message',
      followUpDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      notes: 'Added from quick capture.',
      links: [],
      relatedOutreachDraftIds: [],
      relatedContentTags: [],
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
      entityType: 'opportunity',
      entityId: 'manual',
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

  async updateOpportunity(id, payload) {
    const current = get().data;
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        opportunities: currentData.opportunities.map((item) =>
          item.id === id
            ? {
                ...item,
                ...payload,
                status: payload.status ?? item.status,
                stage: payload.status ?? payload.stage ?? item.stage ?? item.status,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }),
      (data) => set({ data })
    );
  },

  async archiveOpportunity(id) {
    await get().updateOpportunity(id, { archivedAt: new Date().toISOString() });
  },

  async restoreOpportunity(id) {
    await get().updateOpportunity(id, { archivedAt: undefined });
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

  async snoozeSchedulerTask(taskId, minutes) {
    const current = get().data;
    if (!current) return;

    const next = {
      ...current,
      scheduler: scheduler.snooze(current.scheduler, taskId, minutes)
    };
    await storageService.setData(next);
    set({ data: next });
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      void chrome.runtime.sendMessage({ type: 'SYNC_SCHEDULER' });
    }
  },

  async completeSchedulerTask(taskId) {
    const current = get().data;
    if (!current) return;

    const next = {
      ...current,
      scheduler: scheduler.complete(current.scheduler, taskId)
    };
    await storageService.setData(next);
    set({ data: next });
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      void chrome.runtime.sendMessage({ type: 'SYNC_SCHEDULER' });
    }
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
    const withScheduler = { ...data, scheduler: scheduler.reconcile(data) };
    await storageService.setData(withScheduler);
    set({ data: withScheduler, error: undefined });
  }
}));
