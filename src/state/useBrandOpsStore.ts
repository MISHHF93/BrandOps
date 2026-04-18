import { create } from 'zustand';
import { storageService } from '../services/storage/storage';
import { scheduler } from '../services/scheduling/scheduler';
import { githubIdentitySync } from '../services/sync/githubIdentity';
import { googleIdentitySync } from '../services/sync/googleIdentity';
import { linkedinIdentitySync } from '../services/sync/linkedinIdentity';
import {
  AiSettingsApplyResult,
  buildAiSettingsPlan,
  applyAiSettingsOperations
} from '../services/ai/aiSettingsMode';
import { normalizeExternalSyncSectionReferences as normalizeSectionReferences } from '../shared/config/legacySectionIds';
import { loadOAuthPublicOverrides } from '../shared/config/loadOAuthPublicOverrides';
import {
  getEffectiveGitHubClientId,
  getEffectiveGoogleClientId,
  getEffectiveLinkedInClientId,
  withEffectiveOAuthClientIds
} from '../shared/config/oauthPublisherIds';
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
  QueueStatus,
  SshTarget,
  IdentityProviderId,
  IntegrationSource
} from '../types/domain';
import { isDemoBypassBuild } from '../shared/identity/sessionAccess';

interface StoreState {
  data: BrandOpsData | null;
  loading: boolean;
  error?: string;
  aiSettingsLastSnapshot: BrandOpsData | null;
  aiSettingsLastResult: {
    prompt: string;
    applied: string[];
    skipped: string[];
    failed: string[];
    warnings: string[];
    unsupportedRequests: string[];
  } | null;
  init: () => Promise<void>;
  /** Production-empty workspace (default for new installs and recovery). */
  resetWorkspaceToEmpty: () => Promise<void>;
  /** Rich sample data for QA (Alex Mercer demo). */
  loadDemoSampleData: () => Promise<void>;
  setTheme: (theme: BrandOpsData['settings']['theme']) => Promise<void>;
  updateVisualSettings: (
    payload: Partial<Pick<BrandOpsData['settings'], 'visualMode' | 'motionMode' | 'ambientFxEnabled'>>
  ) => Promise<void>;
  updateCockpitPreferences: (
    payload: Partial<Pick<BrandOpsData['settings'], 'cockpitLayout' | 'cockpitDensity'>>
  ) => Promise<void>;
  setDebugMode: (enabled: boolean) => Promise<void>;
  updateNotificationCenterSettings: (
    payload: Partial<BrandOpsData['settings']['notificationCenter']>
  ) => Promise<void>;
  updateCadenceFlowSettings: (
    payload: Partial<BrandOpsData['settings']['cadenceFlow']>
  ) => Promise<void>;
  updateBrandProfile: (
    payload: Partial<BrandOpsData['brand']>
  ) => Promise<void>;
  setGoogleClientId: (clientId: string) => Promise<void>;
  setGitHubClientId: (clientId: string) => Promise<void>;
  setLinkedInClientId: (clientId: string) => Promise<void>;
  connectGoogleIdentity: () => Promise<void>;
  connectGitHubIdentity: () => Promise<void>;
  connectLinkedInIdentity: () => Promise<void>;
  disconnectGoogleIdentity: () => Promise<void>;
  disconnectGitHubIdentity: () => Promise<void>;
  disconnectLinkedInIdentity: () => Promise<void>;
  setPrimaryIdentityProvider: (provider: IdentityProviderId | null) => Promise<void>;
  startDemoSession: () => Promise<void>;
  completeWelcomeOnboarding: () => Promise<void>;
  signOutSession: () => Promise<void>;
  addIntegrationSource: (payload: {
    name: string;
    kind: IntegrationSource['kind'];
    status: IntegrationSource['status'];
    baseUrl?: string;
    artifactTypes: string[];
    tags: string[];
    notes: string;
  }) => Promise<void>;
  addExternalArtifact: (payload: {
    sourceId: string;
    title: string;
    artifactType: string;
    summary: string;
    externalUrl?: string;
    externalId?: string;
    tags: string[];
    syncedAt?: string;
  }) => Promise<void>;
  addSshTarget: (payload: {
    name: string;
    host: string;
    port: number;
    username: string;
    authMode: SshTarget['authMode'];
    description: string;
    tags: string[];
    commandHints: string[];
  }) => Promise<void>;
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
  applyAiWorkspaceAdjustments: (prompt: string) => Promise<StoreState['aiSettingsLastResult']>;
  undoLastAiWorkspaceAdjustments: () => Promise<void>;
  exportWorkspace: () => Promise<string>;
  importWorkspace: (raw: string) => Promise<void>;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const trimText = (value: string, fallback = '', maxLength = 300) => {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
};

const toNonEmptyArray = (value: string[], maxItems = 12, maxLength = 50) => {
  const seen = new Set<string>();
  const normalizedItems: string[] = [];
  value.forEach((item) => {
    const normalized = trimText(item, '', maxLength);
    if (!normalized) return;
    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    normalizedItems.push(normalized);
  });
  return normalizedItems.slice(0, maxItems);
};

const toIsoOrUndefined = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
};

const toOptionalUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const clampInt = (value: number, min: number, max: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
};

const withFeedEntry = (
  data: BrandOpsData,
  entry: Omit<BrandOpsData['integrationHub']['liveFeed'][number], 'id' | 'happenedAt'> & {
    happenedAt?: string;
  }
): BrandOpsData => ({
  ...data,
  integrationHub: {
    ...data.integrationHub,
    liveFeed: [
      {
        id: uid('feed'),
        happenedAt: entry.happenedAt ?? new Date().toISOString(),
        ...entry
      },
      ...data.integrationHub.liveFeed
    ].slice(0, 40)
  }
});

const nextPrimaryAfterDisconnect = (
  data: BrandOpsData,
  disconnected: IdentityProviderId
): IdentityProviderId | null => {
  const hub = data.settings.syncHub;
  const order: IdentityProviderId[] = ['google', 'github', 'linkedin'];
  if (data.settings.primaryIdentityProvider !== disconnected) {
    return data.settings.primaryIdentityProvider;
  }
  const pick = order.find((id) => id !== disconnected && hub[id].connectionStatus === 'connected');
  return pick ?? null;
};

const updateData = async (
  current: BrandOpsData | null,
  producer: (currentData: BrandOpsData) => BrandOpsData,
  setData: (next: BrandOpsData) => void
) => {
  if (!current) return;
  const updated = producer(current);
  const normalized = normalizeSectionReferences(updated);
  const withScheduler = { ...normalized, scheduler: scheduler.reconcile(normalized) };
  const persisted = await storageService.setData(withScheduler);
  setData(persisted);
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    void chrome.runtime.sendMessage({ type: 'SYNC_SCHEDULER' });
  }
};

export const useBrandOpsStore = create<StoreState>((set, get) => ({
  data: null,
  loading: false,
  aiSettingsLastSnapshot: null,
  aiSettingsLastResult: null,

  async init() {
    set({ loading: true, error: undefined });

    try {
      await loadOAuthPublicOverrides();
      const data = await storageService.getData();
      const withScheduler = { ...data, scheduler: scheduler.reconcile(data) };
      const persisted = await storageService.setData(withScheduler);
      set({ data: persisted, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
    }
  },

  async resetWorkspaceToEmpty() {
    const data = await storageService.resetToSeed();
    const withScheduler = { ...data, scheduler: scheduler.reconcile(data) };
    const persisted = await storageService.setData(withScheduler);
    set({ data: persisted, error: undefined });
  },

  async loadDemoSampleData() {
    const data = await storageService.resetToDemoSample();
    const withScheduler = { ...data, scheduler: scheduler.reconcile(data) };
    const persisted = await storageService.setData(withScheduler);
    set({ data: persisted, error: undefined });
  },

  async setTheme(theme) {
    const current = get().data;
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          theme: nextTheme
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async updateVisualSettings(payload) {
    const current = get().data;
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          ...payload
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async updateCockpitPreferences(payload) {
    const current = get().data;
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          ...payload
        }
      }),
      (data) => set({ data, error: undefined })
    );
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

  async updateNotificationCenterSettings(payload) {
    const current = get().data;
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          notificationCenter: {
            ...currentData.settings.notificationCenter,
            ...payload
          }
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async updateCadenceFlowSettings(payload) {
    const current = get().data;
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          cadenceFlow: {
            ...currentData.settings.cadenceFlow,
            ...payload
          }
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async updateBrandProfile(payload) {
    const current = get().data;
    const normalizedPayload: Partial<BrandOpsData['brand']> = { ...payload };
    if ('operatorName' in payload && typeof payload.operatorName === 'string') {
      normalizedPayload.operatorName = trimText(payload.operatorName, '', 90);
    }
    if ('positioning' in payload && typeof payload.positioning === 'string') {
      normalizedPayload.positioning = trimText(payload.positioning, '', 240);
    }
    if ('primaryOffer' in payload && typeof payload.primaryOffer === 'string') {
      normalizedPayload.primaryOffer = trimText(payload.primaryOffer, '', 180);
    }
    if ('voiceGuide' in payload && typeof payload.voiceGuide === 'string') {
      normalizedPayload.voiceGuide = trimText(payload.voiceGuide, '', 180);
    }
    if ('focusMetric' in payload && typeof payload.focusMetric === 'string') {
      normalizedPayload.focusMetric = trimText(payload.focusMetric, '', 180);
    }
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brand: {
          ...currentData.brand,
          ...normalizedPayload
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async setGoogleClientId(clientId) {
    const current = get().data;
    const trimmed = trimText(clientId, '', 180);

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          syncHub: {
            ...currentData.settings.syncHub,
            google: {
              ...currentData.settings.syncHub.google,
              clientId: trimmed,
              connectionStatus: trimmed ? 'configured' : 'disconnected',
              lastError: undefined,
              lastConnectedAt: undefined,
              auth: { scope: [] },
              profile: undefined
            }
          }
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async setGitHubClientId(clientId) {
    const current = get().data;
    const trimmed = trimText(clientId, '', 180);

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          syncHub: {
            ...currentData.settings.syncHub,
            github: {
              ...currentData.settings.syncHub.github,
              clientId: trimmed,
              connectionStatus: trimmed ? 'configured' : 'disconnected',
              lastError: undefined,
              lastConnectedAt: undefined,
              auth: { scope: [] },
              profile: undefined
            }
          }
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async setLinkedInClientId(clientId) {
    const current = get().data;
    const trimmed = trimText(clientId, '', 180);

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          syncHub: {
            ...currentData.settings.syncHub,
            linkedin: {
              ...currentData.settings.syncHub.linkedin,
              clientId: trimmed,
              connectionStatus: trimmed ? 'configured' : 'disconnected',
              lastError: undefined,
              lastConnectedAt: undefined,
              auth: { scope: [] },
              profile: undefined
            }
          }
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async connectGoogleIdentity() {
    const current = get().data;
    if (!current) return;

    set({ loading: true });

    try {
      const next = await googleIdentitySync.connect(withEffectiveOAuthClientIds(current));
      const withFeed = withFeedEntry(next, {
        source: 'Google',
        title: 'Google identity connected',
        detail: 'Profile is available for display on Welcome and Dashboard.',
        level: 'success'
      });
      const withScheduler = { ...withFeed, scheduler: scheduler.reconcile(withFeed) };
      const persisted = await storageService.setData(withScheduler);
      set({ data: persisted, loading: false, error: undefined });
    } catch (error) {
      set({ loading: false });
      const message = error instanceof Error ? error.message : 'Google connection failed.';
      const afterFail = get().data;
      if (afterFail) {
        await updateData(
          afterFail,
          (d) => ({
            ...d,
            settings: {
              ...d.settings,
              syncHub: {
                ...d.settings.syncHub,
                google: {
                  ...d.settings.syncHub.google,
                  lastError: message,
                  connectionStatus: getEffectiveGoogleClientId(d) ? 'error' : 'disconnected'
                }
              }
            }
          }),
          (data) => set({ data, error: undefined })
        );
      }
      throw error;
    }
  },

  async connectGitHubIdentity() {
    const current = get().data;
    if (!current) return;

    set({ loading: true });

    try {
      const next = await githubIdentitySync.connect(withEffectiveOAuthClientIds(current));
      const withFeed = withFeedEntry(next, {
        source: 'GitHub',
        title: 'GitHub identity connected',
        detail: 'Profile is available for display on Welcome and Dashboard.',
        level: 'success'
      });
      const withScheduler = { ...withFeed, scheduler: scheduler.reconcile(withFeed) };
      const persisted = await storageService.setData(withScheduler);
      set({ data: persisted, loading: false, error: undefined });
    } catch (error) {
      set({ loading: false });
      const message = error instanceof Error ? error.message : 'GitHub connection failed.';
      const afterFail = get().data;
      if (afterFail) {
        await updateData(
          afterFail,
          (d) => ({
            ...d,
            settings: {
              ...d.settings,
              syncHub: {
                ...d.settings.syncHub,
                github: {
                  ...d.settings.syncHub.github,
                  lastError: message,
                  connectionStatus: getEffectiveGitHubClientId(d) ? 'error' : 'disconnected'
                }
              }
            }
          }),
          (data) => set({ data, error: undefined })
        );
      }
      throw error;
    }
  },

  async connectLinkedInIdentity() {
    const current = get().data;
    if (!current) return;

    set({ loading: true });

    try {
      const next = await linkedinIdentitySync.connect(withEffectiveOAuthClientIds(current));
      const withFeed = withFeedEntry(next, {
        source: 'LinkedIn',
        title: 'LinkedIn identity connected',
        detail: 'OpenID profile is available for display in Welcome and Settings.',
        level: 'success'
      });
      const withScheduler = { ...withFeed, scheduler: scheduler.reconcile(withFeed) };
      const persisted = await storageService.setData(withScheduler);
      set({ data: persisted, loading: false, error: undefined });
    } catch (error) {
      set({ loading: false });
      const message = error instanceof Error ? error.message : 'LinkedIn connection failed.';
      const afterFail = get().data;
      if (afterFail) {
        await updateData(
          afterFail,
          (d) => ({
            ...d,
            settings: {
              ...d.settings,
              syncHub: {
                ...d.settings.syncHub,
                linkedin: {
                  ...d.settings.syncHub.linkedin,
                  lastError: message,
                  connectionStatus: getEffectiveLinkedInClientId(d) ? 'error' : 'disconnected'
                }
              }
            }
          }),
          (data) => set({ data, error: undefined })
        );
      }
      throw error;
    }
  },

  async disconnectGoogleIdentity() {
    const current = get().data;
    if (!current) return;

    const cleared = googleIdentitySync.disconnect(current);
    const withPrimary = {
      ...cleared,
      settings: {
        ...cleared.settings,
        primaryIdentityProvider: nextPrimaryAfterDisconnect(cleared, 'google')
      }
    };
    const next = withFeedEntry(withPrimary, {
      source: 'Google',
      title: 'Google identity removed',
      detail: 'Stored Google tokens and cached profile were cleared from the workspace.',
      level: 'warning'
    });
    const withScheduler = { ...next, scheduler: scheduler.reconcile(next) };
    const persisted = await storageService.setData(withScheduler);
    set({ data: persisted, error: undefined });
  },

  async disconnectGitHubIdentity() {
    const current = get().data;
    if (!current) return;

    const cleared = githubIdentitySync.disconnect(current);
    const withPrimary = {
      ...cleared,
      settings: {
        ...cleared.settings,
        primaryIdentityProvider: nextPrimaryAfterDisconnect(cleared, 'github')
      }
    };
    const next = withFeedEntry(withPrimary, {
      source: 'GitHub',
      title: 'GitHub identity removed',
      detail: 'Stored GitHub tokens and cached profile were cleared from the workspace.',
      level: 'warning'
    });
    const withScheduler = { ...next, scheduler: scheduler.reconcile(next) };
    const persisted = await storageService.setData(withScheduler);
    set({ data: persisted, error: undefined });
  },

  async disconnectLinkedInIdentity() {
    const current = get().data;
    if (!current) return;

    const cleared = linkedinIdentitySync.disconnect(current);
    const withPrimary = {
      ...cleared,
      settings: {
        ...cleared.settings,
        primaryIdentityProvider: nextPrimaryAfterDisconnect(cleared, 'linkedin')
      }
    };
    const next = withFeedEntry(withPrimary, {
      source: 'LinkedIn',
      title: 'LinkedIn identity removed',
      detail: 'Stored LinkedIn tokens and cached profile were cleared from the workspace.',
      level: 'warning'
    });
    const withScheduler = { ...next, scheduler: scheduler.reconcile(next) };
    const persisted = await storageService.setData(withScheduler);
    set({ data: persisted, error: undefined });
  },

  async setPrimaryIdentityProvider(provider) {
    const current = get().data;
    if (!current) return;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        settings: {
          ...currentData.settings,
          primaryIdentityProvider: provider
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async startDemoSession() {
    const current = get().data;
    if (!current) return;
    if (!import.meta.env.DEV && !isDemoBypassBuild()) return;

    const now = new Date().toISOString();
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        seed: {
          ...currentData.seed,
          guestSessionAt: now,
          welcomeCompletedAt: currentData.seed.welcomeCompletedAt ?? now
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async completeWelcomeOnboarding() {
    const current = get().data;
    if (!current) return;

    const now = new Date().toISOString();
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        seed: {
          ...currentData.seed,
          welcomeCompletedAt: now
        }
      }),
      (data) => set({ data, error: undefined })
    );
  },

  async signOutSession() {
    const current = get().data;
    if (!current) return;

    let next = googleIdentitySync.disconnect(current);
    next = githubIdentitySync.disconnect(next);
    next = linkedinIdentitySync.disconnect(next);
    const cleared = {
      ...next,
      settings: {
        ...next.settings,
        primaryIdentityProvider: null
      },
      seed: {
        ...next.seed,
        guestSessionAt: undefined,
        welcomeCompletedAt: undefined
      }
    };
    const withFeed = withFeedEntry(cleared, {
      source: 'Session',
      title: 'Signed out',
      detail: 'Federated sessions were cleared. Open Welcome to sign in again.',
      level: 'warning'
    });
    const withScheduler = { ...withFeed, scheduler: scheduler.reconcile(withFeed) };
    const persisted = await storageService.setData(withScheduler);
    set({ data: persisted, error: undefined });
  },

  async addIntegrationSource(payload) {
    const current = get().data;
    const name = trimText(payload.name, '', 100);
    if (!name) return;
    const artifactTypes = toNonEmptyArray(payload.artifactTypes, 14, 64);
    const tags = toNonEmptyArray(payload.tags, 14, 40);
    const notes = trimText(payload.notes, '', 520);
    const baseUrl = toOptionalUrl(payload.baseUrl);
    const createdAt = new Date().toISOString();

    await updateData(
      current,
      (currentData) =>
        withFeedEntry(
          {
            ...currentData,
            integrationHub: {
              ...currentData.integrationHub,
              sources: [
                {
                  id: uid('source'),
                  name,
                  kind: payload.kind,
                  status: payload.status,
                  baseUrl,
                  artifactTypes,
                  tags,
                  notes,
                  createdAt
                },
                ...currentData.integrationHub.sources
              ]
            }
          },
          {
            source: 'Integration hub',
            title: `Source added: ${name}`,
            detail: `Registered a ${payload.kind} source with ${artifactTypes.length} artifact type hints.`,
            level: 'success'
          }
        ),
      (data) => set({ data, error: undefined })
    );
  },

  async addExternalArtifact(payload) {
    const current = get().data;
    const title = trimText(payload.title, '', 140);
    const artifactType = trimText(payload.artifactType, '', 70);
    if (!payload.sourceId || !title || !artifactType) return;
    const summary = trimText(payload.summary, '', 640);
    const externalUrl = toOptionalUrl(payload.externalUrl);
    const externalId = trimText(payload.externalId ?? '', '', 120) || undefined;
    const tags = toNonEmptyArray(payload.tags, 14, 40);
    const syncedAt = toIsoOrUndefined(payload.syncedAt);
    const now = new Date().toISOString();

    await updateData(
      current,
      (currentData) => {
        const source = currentData.integrationHub.sources.find((item) => item.id === payload.sourceId);
        if (!source) return currentData;
        const next: BrandOpsData = {
          ...currentData,
          integrationHub: {
            ...currentData.integrationHub,
            artifacts: [
              {
                id: uid('artifact'),
                sourceId: payload.sourceId,
                title,
                artifactType,
                summary,
                externalUrl,
                externalId,
                tags,
                syncedAt,
                createdAt: now,
                updatedAt: now
              },
              ...currentData.integrationHub.artifacts
            ]
          }
        };

        return withFeedEntry(next, {
          source: source?.name ?? 'Integration hub',
          title: `Artifact added: ${title}`,
          detail: `${artifactType} stored in the integration hub artifact library.`,
          level: 'info'
        });
      },
      (data) => set({ data, error: undefined })
    );
  },

  async addSshTarget(payload) {
    const current = get().data;
    const name = trimText(payload.name, '', 90);
    const host = trimText(payload.host, '', 120);
    const username = trimText(payload.username, '', 80);
    if (!name || !host || !username) return;
    const description = trimText(payload.description, '', 420);
    const tags = toNonEmptyArray(payload.tags, 16, 40);
    const commandHints = payload.commandHints
      .map((hint) => trimText(hint, '', 180))
      .filter(Boolean)
      .slice(0, 24);
    const port = clampInt(payload.port, 1, 65535, 22);
    const now = new Date().toISOString();

    await updateData(
      current,
      (currentData) =>
        withFeedEntry(
          {
            ...currentData,
            integrationHub: {
              ...currentData.integrationHub,
              sshTargets: [
                {
                  id: uid('ssh'),
                  name,
                  host,
                  port,
                  username,
                  authMode: payload.authMode,
                  description,
                  tags,
                  commandHints,
                  createdAt: now
                },
                ...currentData.integrationHub.sshTargets
              ]
            }
          },
          {
            source: 'SSH workspace',
            title: `Target added: ${name}`,
            detail: `Stored SSH connection details for ${username}@${host}:${port}.`,
            level: 'info'
          }
        ),
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
    const title = trimText(payload.title, '', 140);
    const body = trimText(payload.body, '', 5000);
    if (!title || !body) return;
    const scheduledFor = toIsoOrUndefined(payload.scheduledFor);
    const reminderLeadMinutes = clampInt(payload.reminderLeadMinutes ?? 60, 0, 7 * 24 * 60, 60);
    const reminderAt =
      toIsoOrUndefined(payload.reminderAt) ??
      (scheduledFor
        ? new Date(new Date(scheduledFor).getTime() - reminderLeadMinutes * 60 * 1000).toISOString()
        : undefined);
    const checklist = trimText(payload.checklist ?? '', '', 1200) || undefined;
    const now = new Date().toISOString();
    const draft: PublishingItem = {
      id: uid('pub'),
      title,
      body,
      contentLibraryItemId: payload.contentLibraryItemId,
      platforms: ['linkedin'],
      tags: ['new-draft'],
      status: scheduledFor ? 'queued' : 'ready-to-post',
      scheduledFor,
      reminderAt,
      reminderLeadMinutes,
      checklist,
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
    const sanitized: Partial<
      Pick<
        PublishingItem,
        'scheduledFor' | 'reminderAt' | 'reminderLeadMinutes' | 'checklist' | 'status'
      >
    > = { ...payload };

    if ('scheduledFor' in payload) {
      sanitized.scheduledFor = toIsoOrUndefined(payload.scheduledFor);
    }
    if ('reminderAt' in payload) {
      sanitized.reminderAt = toIsoOrUndefined(payload.reminderAt);
    }
    if ('reminderLeadMinutes' in payload && typeof payload.reminderLeadMinutes === 'number') {
      sanitized.reminderLeadMinutes = clampInt(payload.reminderLeadMinutes, 0, 7 * 24 * 60, 60);
    }
    if ('checklist' in payload && typeof payload.checklist === 'string') {
      sanitized.checklist = trimText(payload.checklist, '', 1200) || undefined;
    }

    if (
      sanitized.scheduledFor &&
      !sanitized.reminderAt &&
      typeof sanitized.reminderLeadMinutes === 'number'
    ) {
      sanitized.reminderAt = new Date(
        new Date(sanitized.scheduledFor).getTime() - sanitized.reminderLeadMinutes * 60 * 1000
      ).toISOString();
    }

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        publishingQueue: currentData.publishingQueue.map((item) =>
          item.id === id
            ? {
                ...item,
                ...sanitized,
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
    const boundedDelta = clampInt(minutesDelta, -7 * 24 * 60, 14 * 24 * 60, 60);

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        publishingQueue: currentData.publishingQueue.map((item) => {
          if (item.id !== id) return item;
          const source = item.scheduledFor ?? item.reminderAt ?? new Date().toISOString();
          const nextDate = new Date(source);
          if (!Number.isFinite(nextDate.getTime())) {
            nextDate.setTime(Date.now());
          }
          nextDate.setMinutes(nextDate.getMinutes() + boundedDelta);
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
    const targetName = trimText(payload.targetName, '', 90);
    const company = trimText(payload.company, '', 90);
    const messageBody = trimText(payload.messageBody, '', 5000);
    if (!targetName || !company || !messageBody) return;
    const now = new Date().toISOString();

    const draft: OutreachDraft = {
      id: uid('out'),
      category: payload.category,
      targetName,
      company,
      role: trimText(payload.role, '', 90),
      messageBody,
      outreachGoal: trimText(payload.outreachGoal, 'Start a conversation', 220),
      tone: trimText(payload.tone, 'Direct and practical', 110),
      status: 'draft',
      linkedOpportunity: trimText(payload.linkedOpportunity ?? '', '', 80) || undefined,
      notes: trimText(payload.notes, '', 500),
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
    const sanitizedPayload: Partial<Omit<OutreachDraft, 'id' | 'createdAt'>> = { ...payload };

    if ('targetName' in payload && typeof payload.targetName === 'string') {
      sanitizedPayload.targetName = trimText(payload.targetName, '', 90);
    }
    if ('company' in payload && typeof payload.company === 'string') {
      sanitizedPayload.company = trimText(payload.company, '', 90);
    }
    if ('role' in payload && typeof payload.role === 'string') {
      sanitizedPayload.role = trimText(payload.role, '', 90);
    }
    if ('messageBody' in payload && typeof payload.messageBody === 'string') {
      sanitizedPayload.messageBody = trimText(payload.messageBody, '', 5000);
    }
    if ('outreachGoal' in payload && typeof payload.outreachGoal === 'string') {
      sanitizedPayload.outreachGoal = trimText(payload.outreachGoal, 'Start a conversation', 220);
    }
    if ('tone' in payload && typeof payload.tone === 'string') {
      sanitizedPayload.tone = trimText(payload.tone, 'Direct and practical', 120);
    }
    if ('linkedOpportunity' in payload) {
      sanitizedPayload.linkedOpportunity =
        typeof payload.linkedOpportunity === 'string'
          ? trimText(payload.linkedOpportunity, '', 80) || undefined
          : undefined;
    }
    if ('notes' in payload && typeof payload.notes === 'string') {
      sanitizedPayload.notes = trimText(payload.notes, '', 500);
    }

    await updateData(
      current,
      (currentData) => {
        const previous = currentData.outreachDrafts.find((item) => item.id === id);
        const nextStatus = sanitizedPayload.status;
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
                ...sanitizedPayload,
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
    const name = trimText(payload.name, '', 100);
    if (!name) return;
    const now = new Date().toISOString();
    const template: OutreachTemplate = {
      id: uid('tpl'),
      ...payload,
      name,
      openerBlock: trimText(payload.openerBlock, '', 500),
      valueBlock: trimText(payload.valueBlock, '', 500),
      proofBlock: trimText(payload.proofBlock, '', 500),
      callToActionBlock: trimText(payload.callToActionBlock, '', 500),
      signoffBlock: trimText(payload.signoffBlock, '', 200),
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
    const fullName = trimText(payload.fullName, '', 90);
    const company = trimText(payload.company, '', 90);
    const title = trimText(payload.title, '', 90);
    if (!fullName || !company || !title) return;

    const contact: Contact = {
      id: uid('contact'),
      name: fullName,
      company,
      role: title,
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
    const reason = trimText(payload.reason, '', 260);
    const dueAt = toIsoOrUndefined(payload.dueAt);
    if (!payload.contactId || !reason || !dueAt) return;

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        followUps: [
          {
            id: uid('fu'),
            contactId: payload.contactId,
            reason,
            dueAt,
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
    const title = trimText(payload.title, '', 140);
    const detail = trimText(payload.detail, '', 1500);
    if (!title || !detail) return;

    const note: ActivityNote = {
      id: uid('note'),
      entityType: 'opportunity',
      entityId: 'manual',
      title,
      detail,
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
    const sanitizedPayload: Partial<Opportunity> = { ...payload };

    if ('name' in payload && typeof payload.name === 'string') {
      sanitizedPayload.name = trimText(payload.name, '', 140);
    }
    if ('company' in payload && typeof payload.company === 'string') {
      sanitizedPayload.company = trimText(payload.company, '', 120);
    }
    if ('role' in payload && typeof payload.role === 'string') {
      sanitizedPayload.role = trimText(payload.role, '', 100);
    }
    if ('source' in payload && typeof payload.source === 'string') {
      sanitizedPayload.source = trimText(payload.source, '', 120);
    }
    if ('nextAction' in payload && typeof payload.nextAction === 'string') {
      sanitizedPayload.nextAction = trimText(payload.nextAction, '', 260);
    }
    if ('followUpDate' in payload) {
      const normalized = toIsoOrUndefined(payload.followUpDate);
      if (normalized) {
        sanitizedPayload.followUpDate = normalized;
      }
    }
    if ('notes' in payload && typeof payload.notes === 'string') {
      sanitizedPayload.notes = trimText(payload.notes, '', 2000);
    }
    if ('valueUsd' in payload && typeof payload.valueUsd === 'number') {
      sanitizedPayload.valueUsd = clampInt(payload.valueUsd, 0, 50_000_000, 0);
    }
    if ('confidence' in payload && typeof payload.confidence === 'number') {
      sanitizedPayload.confidence = clampInt(payload.confidence, 0, 100, 0);
    }

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        opportunities: currentData.opportunities.map((item) =>
          item.id === id
            ? {
                ...item,
                ...sanitizedPayload,
                status: sanitizedPayload.status ?? item.status,
                stage:
                  sanitizedPayload.status ??
                  sanitizedPayload.stage ??
                  item.stage ??
                  item.status,
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
    const boundedMinutes = clampInt(minutes, -7 * 24 * 60, 30 * 24 * 60, 15);

    const next = {
      ...current,
      scheduler: scheduler.snooze(current.scheduler, taskId, boundedMinutes)
    };
    const persisted = await storageService.setData(next);
    set({ data: persisted });
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
    const persisted = await storageService.setData(next);
    set({ data: persisted });
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      void chrome.runtime.sendMessage({ type: 'SYNC_SCHEDULER' });
    }
  },

  async addVaultEntry(payload) {
    const current = get().data;
    const title = trimText(payload.title, '', 140);
    const content = trimText(payload.content, '', 5000);
    if (!title || !content) return;
    const entry: MessagingVaultEntry = {
      id: uid('msg'),
      category: payload.category,
      title,
      content
    };

    await updateData(
      current,
      (currentData) => ({ ...currentData, messagingVault: [entry, ...currentData.messagingVault] }),
      (data) => set({ data })
    );
  },

  async addContentLibraryItem(payload) {
    const current = get().data;
    const title = trimText(payload.title, '', 140);
    const body = trimText(payload.body, '', 5000);
    if (!title || !body) return;
    const now = new Date().toISOString();
    const item: ContentLibraryItem = {
      id: uid('cli'),
      ...payload,
      title,
      body,
      tags: toNonEmptyArray(payload.tags, 16, 40),
      audience: trimText(payload.audience, 'General audience', 120),
      goal: trimText(payload.goal, 'Capture and refine reusable content', 180),
      notes: trimText(payload.notes, '', 1000),
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
    const sanitizedPayload: Partial<Omit<ContentLibraryItem, 'id' | 'createdAt'>> = { ...payload };
    if ('title' in payload && typeof payload.title === 'string') {
      sanitizedPayload.title = trimText(payload.title, '', 140);
    }
    if ('body' in payload && typeof payload.body === 'string') {
      sanitizedPayload.body = trimText(payload.body, '', 5000);
    }
    if ('tags' in payload && Array.isArray(payload.tags)) {
      sanitizedPayload.tags = toNonEmptyArray(payload.tags, 16, 40);
    }
    if ('audience' in payload && typeof payload.audience === 'string') {
      sanitizedPayload.audience = trimText(payload.audience, 'General audience', 120);
    }
    if ('goal' in payload && typeof payload.goal === 'string') {
      sanitizedPayload.goal = trimText(payload.goal, 'Capture and refine reusable content', 180);
    }
    if ('notes' in payload && typeof payload.notes === 'string') {
      sanitizedPayload.notes = trimText(payload.notes, '', 1000);
    }

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        contentLibrary: currentData.contentLibrary.map((item) =>
          item.id === id
            ? {
                ...item,
                ...sanitizedPayload,
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
    const normalizedValue = trimText(value, '', 4000);
    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: {
          ...currentData.brandVault,
          [field]: normalizedValue
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
    const normalizedValue = trimText(value, '', 300);

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: {
          ...currentData.brandVault,
          [field]: currentData.brandVault[field].map((item, itemIndex) =>
            itemIndex === index ? normalizedValue : item
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
        if (
          fromIndex < 0 ||
          fromIndex >= updatedList.length ||
          toIndex < 0 ||
          toIndex >= updatedList.length
        ) {
          return currentData;
        }
        const [movedItem] = updatedList.splice(fromIndex, 1);
        if (!movedItem) return currentData;
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error('Invalid Brand Vault JSON payload: malformed JSON.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid Brand Vault JSON payload.');
    }

    const parsedRecord = parsed as Record<string, unknown>;
    const fallbackVault = current?.brandVault;

    if (!fallbackVault) {
      throw new Error('Workspace is not loaded yet.');
    }

    const normalizeListField = (field: BrandVaultListField) =>
      Array.isArray(parsedRecord[field])
        ? toNonEmptyArray(
            (parsedRecord[field] as unknown[]).filter(
              (item): item is string => typeof item === 'string'
            ),
            80,
            300
          )
        : fallbackVault[field];

    const normalizedVault: BrandVault = {
      positioningStatement: trimText(
        (parsedRecord.positioningStatement as string) ?? '',
        fallbackVault.positioningStatement,
        8000
      ),
      shortBio: trimText((parsedRecord.shortBio as string) ?? '', fallbackVault.shortBio, 3000),
      fullAboutSummary: trimText(
        (parsedRecord.fullAboutSummary as string) ?? '',
        fallbackVault.fullAboutSummary,
        12000
      ),
      headlineOptions: normalizeListField('headlineOptions'),
      serviceOfferings: normalizeListField('serviceOfferings'),
      collaborationModes: normalizeListField('collaborationModes'),
      outreachAngles: normalizeListField('outreachAngles'),
      audienceSegments: normalizeListField('audienceSegments'),
      expertiseAreas: normalizeListField('expertiseAreas'),
      industries: normalizeListField('industries'),
      proofPoints: normalizeListField('proofPoints'),
      signatureThemes: normalizeListField('signatureThemes'),
      preferredVoiceNotes: normalizeListField('preferredVoiceNotes'),
      bannedPhrases: normalizeListField('bannedPhrases'),
      callsToAction: normalizeListField('callsToAction'),
      reusableSnippets: normalizeListField('reusableSnippets'),
      personalNotes: normalizeListField('personalNotes')
    };

    await updateData(
      current,
      (currentData) => ({
        ...currentData,
        brandVault: normalizedVault
      }),
      (data) => set({ data })
    );
  },

  async applyAiWorkspaceAdjustments(prompt) {
    const current = get().data;
    if (!current) {
      throw new Error('Workspace is not loaded yet.');
    }

    const plan = buildAiSettingsPlan(prompt);
    if (plan.operations.length === 0) {
      const message =
        plan.unsupportedRequests[0] ??
        'No supported adjustments were found in your prompt.';
      throw new Error(message);
    }

    const snapshot = structuredClone(current);
    const appliedResult: AiSettingsApplyResult = applyAiSettingsOperations(
      current,
      plan.operations
    );
    const normalized = normalizeSectionReferences(appliedResult.data);
    const withScheduler = { ...normalized, scheduler: scheduler.reconcile(normalized) };
    const persisted = await storageService.setData(withScheduler);
    const result = {
      prompt,
      applied: appliedResult.applied,
      skipped: appliedResult.skipped,
      failed: appliedResult.failed,
      warnings: plan.warnings,
      unsupportedRequests: plan.unsupportedRequests
    };

    set({
      data: persisted,
      error: undefined,
      aiSettingsLastSnapshot: snapshot,
      aiSettingsLastResult: result
    });

    return result;
  },

  async undoLastAiWorkspaceAdjustments() {
    const snapshot = get().aiSettingsLastSnapshot;
    if (!snapshot) {
      throw new Error('No AI adjustment snapshot is available to undo.');
    }
    const withScheduler = { ...snapshot, scheduler: scheduler.reconcile(snapshot) };
    const persisted = await storageService.setData(withScheduler);
    set({
      data: persisted,
      error: undefined,
      aiSettingsLastSnapshot: null
    });
  },

  async exportWorkspace() {
    return storageService.exportData();
  },

  async importWorkspace(raw) {
    const data = await storageService.importData(raw);
    const normalized = normalizeSectionReferences(data);
    const withScheduler = { ...normalized, scheduler: scheduler.reconcile(normalized) };
    const persisted = await storageService.setData(withScheduler);
    set({ data: persisted, error: undefined, aiSettingsLastSnapshot: null });
  }
}));
