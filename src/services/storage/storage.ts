import { demoSampleData } from '../../modules/brandMemory/demoSeed';
import { seedData } from '../../modules/brandMemory/seed';
import { browserLocalStorage } from '../../shared/storage/browserStorage';
import {
  ActivityNote,
  BrandProfile,
  BrandOpsData,
  BrandVault,
  Company,
  Contact,
  ContentItemStatus,
  ContentItemType,
  ContentLibraryItem,
  FollowUpTask,
  MessagingVaultEntry,
  Opportunity,
  OutreachCategory,
  OutreachDraft,
  OutreachHistoryEntry,
  OutreachStatus,
  OutreachTemplate,
  PublishingItem,
  PublishChannel,
  SchedulerState,
  SchedulerTask,
  SeedDataSource,
  WorkspaceModule
} from '../../types/domain';

const DATA_KEY = 'brandops:data';

const defaultBrandVault: BrandVault = seedData.brandVault;

const CONTENT_TYPE_FALLBACK: ContentItemType = 'reusable-paragraph';
const CONTENT_STATUS_FALLBACK: ContentItemStatus = 'idea';
const PUBLISH_CHANNEL_FALLBACK: PublishChannel = 'linkedin';

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const asTrimmedString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const asIsoString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
};

const normalizeContentLibrary = (items: unknown): ContentLibraryItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): ContentLibraryItem | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;

      const id = typeof candidate.id === 'string' ? candidate.id : `cli-${Math.random().toString(36).slice(2, 9)}`;
      const title =
        typeof candidate.title === 'string'
          ? candidate.title
          : typeof candidate.label === 'string'
            ? candidate.label
            : 'Untitled content item';
      const body =
        typeof candidate.body === 'string'
          ? candidate.body
          : typeof candidate.text === 'string'
            ? candidate.text
            : '';

      return {
        id,
        type: (candidate.type as ContentItemType) ?? CONTENT_TYPE_FALLBACK,
        title,
        body,
        tags: asStringArray(candidate.tags),
        audience: typeof candidate.audience === 'string' ? candidate.audience : 'General audience',
        goal: typeof candidate.goal === 'string' ? candidate.goal : 'Capture and refine reusable content',
        status: (candidate.status as ContentItemStatus) ?? CONTENT_STATUS_FALLBACK,
        publishChannel: (candidate.publishChannel as PublishChannel) ?? PUBLISH_CHANNEL_FALLBACK,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        createdAt:
          typeof candidate.createdAt === 'string'
            ? candidate.createdAt
            : typeof candidate.lastUsedAt === 'string'
              ? candidate.lastUsedAt
              : new Date().toISOString(),
        updatedAt:
          typeof candidate.updatedAt === 'string'
            ? candidate.updatedAt
            : typeof candidate.lastUsedAt === 'string'
              ? candidate.lastUsedAt
              : new Date().toISOString()
      };
    })
    .filter((item): item is ContentLibraryItem => Boolean(item));
};

const normalizePublishingQueue = (items: unknown): PublishingItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): PublishingItem | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
      const scheduledFor =
        typeof candidate.scheduledFor === 'string'
          ? candidate.scheduledFor
          : typeof candidate.reminderAt === 'string'
            ? candidate.reminderAt
            : undefined;
      const status = candidate.status;
      const normalizedStatus =
        status === 'queued' ||
        status === 'due-soon' ||
        status === 'ready-to-post' ||
        status === 'posted' ||
        status === 'skipped'
          ? status
          : status === 'draft' || status === 'scheduled'
            ? 'queued'
            : status === 'ready'
              ? 'ready-to-post'
              : status === 'published'
                ? 'posted'
                : 'queued';

      return {
        id:
          typeof candidate.id === 'string' ? candidate.id : `pub-${Math.random().toString(36).slice(2, 9)}`,
        title: typeof candidate.title === 'string' ? candidate.title : 'Untitled publishing item',
        body: typeof candidate.body === 'string' ? candidate.body : '',
        platforms: ['linkedin'],
        tags: asStringArray(candidate.tags),
        status: normalizedStatus,
        contentLibraryItemId:
          typeof candidate.contentLibraryItemId === 'string' ? candidate.contentLibraryItemId : undefined,
        scheduledFor,
        reminderAt: typeof candidate.reminderAt === 'string' ? candidate.reminderAt : undefined,
        reminderLeadMinutes:
          typeof candidate.reminderLeadMinutes === 'number' ? candidate.reminderLeadMinutes : undefined,
        checklist: typeof candidate.checklist === 'string' ? candidate.checklist : undefined,
        postedAt: typeof candidate.postedAt === 'string' ? candidate.postedAt : undefined,
        skippedAt: typeof candidate.skippedAt === 'string' ? candidate.skippedAt : undefined,
        createdAt,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
      };
    })
    .filter((item): item is PublishingItem => Boolean(item));
};

const OUTREACH_CATEGORY_FALLBACK: OutreachCategory = 'consulting';
const OUTREACH_STATUS_FALLBACK: OutreachStatus = 'draft';

const normalizeOutreachDrafts = (items: unknown): OutreachDraft[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): OutreachDraft | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
      const targetName =
        typeof candidate.targetName === 'string'
          ? candidate.targetName
          : typeof candidate.contactName === 'string'
            ? candidate.contactName
            : 'Unknown target';
      const messageBody =
        typeof candidate.messageBody === 'string'
          ? candidate.messageBody
          : typeof candidate.message === 'string'
            ? candidate.message
            : '';

      return {
        id:
          typeof candidate.id === 'string' ? candidate.id : `out-${Math.random().toString(36).slice(2, 9)}`,
        category: (candidate.category as OutreachCategory) ?? OUTREACH_CATEGORY_FALLBACK,
        targetName,
        company: typeof candidate.company === 'string' ? candidate.company : '',
        role: typeof candidate.role === 'string' ? candidate.role : '',
        messageBody,
        outreachGoal: typeof candidate.outreachGoal === 'string' ? candidate.outreachGoal : 'Start a conversation',
        tone: typeof candidate.tone === 'string' ? candidate.tone : 'Direct and practical',
        status: (candidate.status as OutreachStatus) ?? OUTREACH_STATUS_FALLBACK,
        linkedOpportunity:
          typeof candidate.linkedOpportunity === 'string' ? candidate.linkedOpportunity : undefined,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        createdAt,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
      };
    })
    .filter((item): item is OutreachDraft => Boolean(item));
};

const normalizeOutreachTemplates = (items: unknown): OutreachTemplate[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): OutreachTemplate | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
      return {
        id:
          typeof candidate.id === 'string' ? candidate.id : `tpl-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : 'Untitled template',
        category: (candidate.category as OutreachCategory) ?? OUTREACH_CATEGORY_FALLBACK,
        openerBlock: typeof candidate.openerBlock === 'string' ? candidate.openerBlock : '',
        valueBlock: typeof candidate.valueBlock === 'string' ? candidate.valueBlock : '',
        proofBlock: typeof candidate.proofBlock === 'string' ? candidate.proofBlock : '',
        callToActionBlock: typeof candidate.callToActionBlock === 'string' ? candidate.callToActionBlock : '',
        signoffBlock: typeof candidate.signoffBlock === 'string' ? candidate.signoffBlock : '',
        createdAt,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt
      };
    })
    .filter((item): item is OutreachTemplate => Boolean(item));
};

const normalizeOutreachHistory = (items: unknown): OutreachHistoryEntry[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): OutreachHistoryEntry | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const status = candidate.status;
      if (
        status !== 'scheduled follow-up' &&
        status !== 'sent' &&
        status !== 'replied' &&
        status !== 'archived'
      ) {
        return null;
      }

      return {
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `outh-${Math.random().toString(36).slice(2, 9)}`,
        draftId: typeof candidate.draftId === 'string' ? candidate.draftId : 'unknown-draft',
        targetName: typeof candidate.targetName === 'string' ? candidate.targetName : 'Unknown target',
        company: typeof candidate.company === 'string' ? candidate.company : 'Unknown company',
        status,
        loggedAt: typeof candidate.loggedAt === 'string' ? candidate.loggedAt : new Date().toISOString(),
        summary: typeof candidate.summary === 'string' ? candidate.summary : 'Outreach status updated.'
      };
    })
    .filter((item): item is OutreachHistoryEntry => Boolean(item));
};

const normalizeContacts = (items: unknown): Contact[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): Contact | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const legacyName = typeof candidate.fullName === 'string' ? candidate.fullName : 'Unknown contact';
      const legacyRole = typeof candidate.title === 'string' ? candidate.title : 'Unknown role';
      const relationship = candidate.relationship;
      const relationshipStage =
        candidate.relationshipStage === 'new' ||
        candidate.relationshipStage === 'building' ||
        candidate.relationshipStage === 'trusted' ||
        candidate.relationshipStage === 'partner'
          ? candidate.relationshipStage
          : relationship === 'active-client' || relationship === 'past-client'
            ? 'trusted'
            : relationship === 'warm'
              ? 'building'
              : 'new';

      return {
        id: typeof candidate.id === 'string' ? candidate.id : `contact-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : legacyName,
        company: typeof candidate.company === 'string' ? candidate.company : 'Unknown company',
        role: typeof candidate.role === 'string' ? candidate.role : legacyRole,
        source: typeof candidate.source === 'string' ? candidate.source : 'manual',
        relationshipStage,
        status:
          candidate.status === 'active' || candidate.status === 'dormant' || candidate.status === 'archived'
            ? candidate.status
            : 'active',
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Add next action',
        followUpDate: typeof candidate.followUpDate === 'string' ? candidate.followUpDate : undefined,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        links: asStringArray(candidate.links),
        relatedOutreachDraftIds: asStringArray(candidate.relatedOutreachDraftIds),
        relatedContentTags: asStringArray(candidate.relatedContentTags),
        lastContactAt:
          typeof candidate.lastContactAt === 'string' ? candidate.lastContactAt : new Date().toISOString(),
        fullName: legacyName,
        title: legacyRole,
        relationship:
          relationship === 'new' || relationship === 'warm' || relationship === 'active-client' || relationship === 'past-client'
            ? relationship
            : 'new'
      };
    })
    .filter((item): item is Contact => Boolean(item));
};

const normalizeCompanies = (items: unknown): Company[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item): Company | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : `company-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : 'Unknown company',
        source: typeof candidate.source === 'string' ? candidate.source : 'manual',
        relationshipStage:
          candidate.relationshipStage === 'new' ||
          candidate.relationshipStage === 'building' ||
          candidate.relationshipStage === 'trusted' ||
          candidate.relationshipStage === 'partner'
            ? candidate.relationshipStage
            : 'new',
        status:
          candidate.status === 'active' || candidate.status === 'dormant' || candidate.status === 'archived'
            ? candidate.status
            : 'active',
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Add next action',
        followUpDate: typeof candidate.followUpDate === 'string' ? candidate.followUpDate : undefined,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        links: asStringArray(candidate.links),
        relatedOutreachDraftIds: asStringArray(candidate.relatedOutreachDraftIds),
        relatedContentTags: asStringArray(candidate.relatedContentTags)
      };
    })
    .filter((item): item is Company => Boolean(item));
};

const normalizeOpportunities = (items: unknown): Opportunity[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item): Opportunity | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const stage =
        candidate.status === 'prospect' ||
        candidate.status === 'discovery' ||
        candidate.status === 'proposal' ||
        candidate.status === 'negotiation' ||
        candidate.status === 'won' ||
        candidate.status === 'lost'
          ? candidate.status
          : candidate.stage === 'prospect' ||
              candidate.stage === 'discovery' ||
              candidate.stage === 'proposal' ||
              candidate.stage === 'negotiation' ||
              candidate.stage === 'won' ||
              candidate.stage === 'lost'
            ? candidate.stage
            : 'prospect';

      return {
        id: typeof candidate.id === 'string' ? candidate.id : `opp-${Math.random().toString(36).slice(2, 9)}`,
        name:
          typeof candidate.name === 'string'
            ? candidate.name
            : typeof candidate.account === 'string'
              ? `${candidate.account} opportunity`
              : 'Untitled opportunity',
        company:
          typeof candidate.company === 'string'
            ? candidate.company
            : typeof candidate.account === 'string'
              ? candidate.account
              : 'Unknown company',
        role: typeof candidate.role === 'string' ? candidate.role : 'Decision maker',
        source: typeof candidate.source === 'string' ? candidate.source : 'manual',
        relationshipStage:
          candidate.relationshipStage === 'new' ||
          candidate.relationshipStage === 'building' ||
          candidate.relationshipStage === 'trusted' ||
          candidate.relationshipStage === 'partner'
            ? candidate.relationshipStage
            : 'new',
        opportunityType:
          candidate.opportunityType === 'consulting' ||
          candidate.opportunityType === 'collaboration' ||
          candidate.opportunityType === 'client delivery' ||
          candidate.opportunityType === 'advisory' ||
          candidate.opportunityType === 'founding team' ||
          candidate.opportunityType === 'investor relationship' ||
          candidate.opportunityType === 'recruiter conversation'
            ? candidate.opportunityType
            : 'consulting',
        status: stage,
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Define next action',
        followUpDate:
          typeof candidate.followUpDate === 'string'
            ? candidate.followUpDate
            : typeof candidate.updatedAt === 'string'
              ? candidate.updatedAt
              : new Date().toISOString(),
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        links: asStringArray(candidate.links),
        relatedOutreachDraftIds: asStringArray(candidate.relatedOutreachDraftIds),
        relatedContentTags: asStringArray(candidate.relatedContentTags),
        archivedAt: typeof candidate.archivedAt === 'string' ? candidate.archivedAt : undefined,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
        valueUsd: typeof candidate.valueUsd === 'number' ? candidate.valueUsd : 0,
        confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0,
        contactId: typeof candidate.contactId === 'string' ? candidate.contactId : undefined,
        account: typeof candidate.account === 'string' ? candidate.account : undefined,
        serviceLine: typeof candidate.serviceLine === 'string' ? candidate.serviceLine : undefined,
        stage
      };
    })
    .filter((item): item is Opportunity => Boolean(item));
};

const normalizeActivityNotes = (items: unknown): ActivityNote[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item): ActivityNote | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : `note-${Math.random().toString(36).slice(2, 9)}`,
        entityType:
          candidate.entityType === 'contact' || candidate.entityType === 'company' || candidate.entityType === 'opportunity'
            ? candidate.entityType
            : 'opportunity',
        entityId: typeof candidate.entityId === 'string' ? candidate.entityId : 'unknown',
        title: typeof candidate.title === 'string' ? candidate.title : 'Activity note',
        detail: typeof candidate.detail === 'string' ? candidate.detail : '',
        status: typeof candidate.status === 'string' ? candidate.status : undefined,
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : undefined,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString()
      };
    })
    .filter((item): item is ActivityNote => Boolean(item));
};

const normalizeBrandProfile = (value: unknown): BrandProfile => {
  const fallback = seedData.brand;
  if (!value || typeof value !== 'object') return fallback;

  const candidate = value as Partial<BrandProfile>;
  return {
    operatorName: asTrimmedString(candidate.operatorName, fallback.operatorName),
    positioning: asTrimmedString(candidate.positioning, fallback.positioning),
    primaryOffer: asTrimmedString(candidate.primaryOffer, fallback.primaryOffer),
    voiceGuide: asTrimmedString(candidate.voiceGuide, fallback.voiceGuide),
    focusMetric: asTrimmedString(candidate.focusMetric, fallback.focusMetric)
  };
};

const normalizeModules = (value: unknown): WorkspaceModule[] => {
  const fallback = seedData.modules;
  if (!Array.isArray(value)) return fallback;

  const normalized = value
    .map((item): WorkspaceModule | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<WorkspaceModule>;
      if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') {
        return null;
      }

      const seededModule = fallback.find((module) => module.id === candidate.id);
      if (!seededModule) return null;

      return {
        id: seededModule.id,
        title: asTrimmedString(candidate.title, seededModule.title),
        description: asTrimmedString(candidate.description, seededModule.description),
        status:
          candidate.status === 'active' || candidate.status === 'planned'
            ? candidate.status
            : seededModule.status,
        route:
          candidate.route === 'dashboard' ||
          candidate.route === 'options' ||
          candidate.route === 'content'
            ? candidate.route
            : seededModule.route
      };
    })
    .filter((item): item is WorkspaceModule => Boolean(item));

  return normalized.length > 0 ? normalized : fallback;
};

const normalizeFollowUps = (value: unknown): FollowUpTask[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): FollowUpTask | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const dueAt = asIsoString(
        candidate.dueAt,
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      );
      const recurrenceCandidate = candidate.recurrence as
        | { interval?: unknown; every?: unknown }
        | undefined;
      let recurrence: FollowUpTask['recurrence'];
      if (
        recurrenceCandidate &&
        (recurrenceCandidate.interval === 'daily' ||
          recurrenceCandidate.interval === 'weekly') &&
        typeof recurrenceCandidate.every === 'number' &&
        Number.isFinite(recurrenceCandidate.every)
      ) {
        recurrence = {
          interval: recurrenceCandidate.interval,
          every: Math.max(1, Math.min(30, Math.round(recurrenceCandidate.every)))
        };
      }

      return {
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `fu-${Math.random().toString(36).slice(2, 9)}`,
        contactId:
          typeof candidate.contactId === 'string'
            ? candidate.contactId
            : 'unknown-contact',
        reason: asTrimmedString(candidate.reason, 'Follow up'),
        dueAt,
        completed: Boolean(candidate.completed),
        recurrence
      };
    })
    .filter((item): item is FollowUpTask => Boolean(item));
};

const normalizeMessagingVault = (value: unknown): MessagingVaultEntry[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): MessagingVaultEntry | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<MessagingVaultEntry>;
      if (
        candidate.category !== 'positioning' &&
        candidate.category !== 'offer' &&
        candidate.category !== 'case-study' &&
        candidate.category !== 'faq'
      ) {
        return null;
      }

      return {
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `msg-${Math.random().toString(36).slice(2, 9)}`,
        category: candidate.category,
        title: asTrimmedString(candidate.title, 'Untitled entry'),
        content: asTrimmedString(candidate.content, '')
      };
    })
    .filter((item): item is MessagingVaultEntry => Boolean(item));
};

const normalizeSchedulerState = (value: unknown): SchedulerState => {
  const fallbackTimestamp = new Date().toISOString();
  if (!value || typeof value !== 'object') {
    return {
      tasks: [],
      updatedAt: fallbackTimestamp,
      lastHydratedAt: fallbackTimestamp
    };
  }

  const candidate = value as Partial<SchedulerState>;
  const tasks = Array.isArray(candidate.tasks)
    ? candidate.tasks
        .map((task): SchedulerTask | null => {
          if (!task || typeof task !== 'object') return null;
          const entry = task as Partial<SchedulerTask>;
          if (
            entry.sourceType !== 'publishing' &&
            entry.sourceType !== 'follow-up' &&
            entry.sourceType !== 'crm'
          ) {
            return null;
          }

          if (
            entry.status !== 'scheduled' &&
            entry.status !== 'due-soon' &&
            entry.status !== 'due' &&
            entry.status !== 'completed' &&
            entry.status !== 'missed' &&
            entry.status !== 'snoozed' &&
            entry.status !== 'cancelled'
          ) {
            return null;
          }

          const dueAt = asIsoString(entry.dueAt, fallbackTimestamp);
          const remindAt = asIsoString(entry.remindAt, dueAt);

          const recurrence =
            entry.recurrence &&
            (entry.recurrence.interval === 'daily' ||
              entry.recurrence.interval === 'weekly') &&
            typeof entry.recurrence.every === 'number' &&
            Number.isFinite(entry.recurrence.every)
              ? {
                  interval: entry.recurrence.interval,
                  every: Math.max(1, Math.min(30, Math.round(entry.recurrence.every)))
                }
              : undefined;

          return {
            id: asTrimmedString(entry.id, `task-${Math.random().toString(36).slice(2, 9)}`),
            sourceId: asTrimmedString(entry.sourceId, 'unknown-source'),
            sourceType: entry.sourceType,
            title: asTrimmedString(entry.title, 'Untitled task'),
            detail: typeof entry.detail === 'string' ? entry.detail : '',
            dueAt,
            remindAt,
            status: entry.status,
            recurrence,
            snoozeCount:
              typeof entry.snoozeCount === 'number' && Number.isFinite(entry.snoozeCount)
                ? Math.max(0, Math.min(100, Math.round(entry.snoozeCount)))
                : 0,
            lastNotifiedAt: entry.lastNotifiedAt
              ? asIsoString(entry.lastNotifiedAt, fallbackTimestamp)
              : undefined,
            completedAt: entry.completedAt
              ? asIsoString(entry.completedAt, fallbackTimestamp)
              : undefined,
            missedAt: entry.missedAt ? asIsoString(entry.missedAt, fallbackTimestamp) : undefined,
            createdAt: asIsoString(entry.createdAt, fallbackTimestamp),
            updatedAt: asIsoString(entry.updatedAt, fallbackTimestamp)
          };
        })
        .filter((item): item is SchedulerTask => Boolean(item))
    : [];

  return {
    tasks,
    updatedAt: asIsoString(candidate.updatedAt, fallbackTimestamp),
    lastHydratedAt: asIsoString(candidate.lastHydratedAt, fallbackTimestamp)
  };
};

const normalizeLinkedInOAuthState = (
  value: unknown
): BrandOpsData['settings']['syncHub']['linkedin']['auth'] => {
  if (!value || typeof value !== 'object') {
    return { scope: [] };
  }

  const candidate = value as Partial<BrandOpsData['settings']['syncHub']['linkedin']['auth']>;
  return {
    accessToken: typeof candidate.accessToken === 'string' ? candidate.accessToken : undefined,
    refreshToken: typeof candidate.refreshToken === 'string' ? candidate.refreshToken : undefined,
    expiresAt: typeof candidate.expiresAt === 'string' ? candidate.expiresAt : undefined,
    scope: Array.isArray(candidate.scope)
      ? candidate.scope.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : [],
    tokenType: typeof candidate.tokenType === 'string' ? candidate.tokenType : undefined
  };
};

const normalizeLinkedInIdentityProfile = (
  value: unknown
): BrandOpsData['settings']['syncHub']['linkedin']['profile'] => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<NonNullable<BrandOpsData['settings']['syncHub']['linkedin']['profile']>>;
  const profile: NonNullable<BrandOpsData['settings']['syncHub']['linkedin']['profile']> = {};
  if (typeof candidate.sub === 'string' && candidate.sub.length > 0) profile.sub = candidate.sub;
  if (typeof candidate.name === 'string' && candidate.name.length > 0) profile.name = candidate.name;
  if (typeof candidate.email === 'string' && candidate.email.length > 0) profile.email = candidate.email;
  if (typeof candidate.picture === 'string' && candidate.picture.length > 0) profile.picture = candidate.picture;
  return Object.keys(profile).length > 0 ? profile : undefined;
};

const normalizeIdentityProviderSettings = (
  value: unknown,
  fallback: BrandOpsData['settings']['syncHub']['linkedin']
): BrandOpsData['settings']['syncHub']['linkedin'] => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<BrandOpsData['settings']['syncHub']['linkedin']>;
  const hasClientId = typeof candidate.clientId === 'string' && candidate.clientId.trim().length > 0;

  return {
    clientId: typeof candidate.clientId === 'string' ? candidate.clientId : fallback.clientId,
    connectionStatus:
      candidate.connectionStatus === 'connected' ||
      candidate.connectionStatus === 'error' ||
      candidate.connectionStatus === 'configured' ||
      candidate.connectionStatus === 'disconnected'
        ? candidate.connectionStatus
        : hasClientId
          ? 'configured'
          : fallback.connectionStatus,
    lastError: typeof candidate.lastError === 'string' ? candidate.lastError : undefined,
    lastConnectedAt:
      typeof candidate.lastConnectedAt === 'string' ? candidate.lastConnectedAt : undefined,
    auth: normalizeLinkedInOAuthState(candidate.auth),
    profile: normalizeLinkedInIdentityProfile(candidate.profile)
  };
};

const normalizeSyncHubSettings = (value: unknown): BrandOpsData['settings']['syncHub'] => {
  const fallback = seedData.settings.syncHub;
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<BrandOpsData['settings']['syncHub']>;
  return {
    google: normalizeIdentityProviderSettings(candidate.google, fallback.google),
    github: normalizeIdentityProviderSettings(candidate.github, fallback.github),
    linkedin: normalizeIdentityProviderSettings(candidate.linkedin, fallback.linkedin)
  };
};

const normalizeNotificationCenterSettings = (
  value: unknown
): BrandOpsData['settings']['notificationCenter'] => {
  const fallback = seedData.settings.notificationCenter;
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<BrandOpsData['settings']['notificationCenter']>;
  const managerialWeight =
    typeof candidate.managerialWeight === 'number'
      ? Math.max(10, Math.min(90, Math.round(candidate.managerialWeight)))
      : fallback.managerialWeight;
  const workdayStartHour =
    typeof candidate.workdayStartHour === 'number'
      ? Math.max(0, Math.min(23, Math.round(candidate.workdayStartHour)))
      : fallback.workdayStartHour;
  const workdayEndHourRaw =
    typeof candidate.workdayEndHour === 'number'
      ? Math.max(1, Math.min(24, Math.round(candidate.workdayEndHour)))
      : fallback.workdayEndHour;
  const workdayEndHour =
    workdayEndHourRaw <= workdayStartHour ? workdayStartHour + 1 : workdayEndHourRaw;

  return {
    enabled:
      typeof candidate.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
    managerialWeight,
    workdayStartHour,
    workdayEndHour,
    maxDailyTasks:
      typeof candidate.maxDailyTasks === 'number'
        ? Math.max(1, Math.min(8, Math.round(candidate.maxDailyTasks)))
        : fallback.maxDailyTasks,
    aiGuidanceMode:
      candidate.aiGuidanceMode === 'rule-based' ||
      candidate.aiGuidanceMode === 'prompt-ready' ||
      candidate.aiGuidanceMode === 'hybrid'
        ? candidate.aiGuidanceMode
        : fallback.aiGuidanceMode,
    preferredModel:
      typeof candidate.preferredModel === 'string'
        ? candidate.preferredModel
        : fallback.preferredModel,
    roleContext:
      typeof candidate.roleContext === 'string'
        ? candidate.roleContext
        : fallback.roleContext,
    promptTemplate:
      typeof candidate.promptTemplate === 'string'
        ? candidate.promptTemplate
        : fallback.promptTemplate,
    datasetReviewEnabled:
      typeof candidate.datasetReviewEnabled === 'boolean'
        ? candidate.datasetReviewEnabled
        : fallback.datasetReviewEnabled,
    integrationReviewEnabled:
      typeof candidate.integrationReviewEnabled === 'boolean'
        ? candidate.integrationReviewEnabled
        : fallback.integrationReviewEnabled
  };
};

const normalizeCadenceFlowSettings = (
  value: unknown
): BrandOpsData['settings']['cadenceFlow'] => {
  const fallback = seedData.settings.cadenceFlow;
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<BrandOpsData['settings']['cadenceFlow']>;

  return {
    mode:
      candidate.mode === 'balanced' ||
      candidate.mode === 'maker-heavy' ||
      candidate.mode === 'client-heavy' ||
      candidate.mode === 'launch-day'
        ? candidate.mode
        : fallback.mode,
    deepWorkBlockCount:
      typeof candidate.deepWorkBlockCount === 'number'
        ? Math.max(1, Math.min(3, Math.round(candidate.deepWorkBlockCount)))
        : fallback.deepWorkBlockCount,
    deepWorkBlockHours:
      typeof candidate.deepWorkBlockHours === 'number'
        ? Math.max(1, Math.min(4, Math.round(candidate.deepWorkBlockHours * 2) / 2))
        : fallback.deepWorkBlockHours,
    includeStartupBlock:
      typeof candidate.includeStartupBlock === 'boolean'
        ? candidate.includeStartupBlock
        : fallback.includeStartupBlock,
    includeShutdownBlock:
      typeof candidate.includeShutdownBlock === 'boolean'
        ? candidate.includeShutdownBlock
        : fallback.includeShutdownBlock,
    includeArtifactReviewBlock:
      typeof candidate.includeArtifactReviewBlock === 'boolean'
        ? candidate.includeArtifactReviewBlock
        : fallback.includeArtifactReviewBlock,
    remindBeforeMinutes:
      typeof candidate.remindBeforeMinutes === 'number'
        ? Math.max(5, Math.min(90, Math.round(candidate.remindBeforeMinutes)))
        : fallback.remindBeforeMinutes,
    calendarSyncEnabled:
      typeof candidate.calendarSyncEnabled === 'boolean'
        ? candidate.calendarSyncEnabled
        : fallback.calendarSyncEnabled,
    artifactSyncEnabled:
      typeof candidate.artifactSyncEnabled === 'boolean'
        ? candidate.artifactSyncEnabled
        : fallback.artifactSyncEnabled
  };
};

const normalizeExternalSyncState = (value: unknown): BrandOpsData['externalSync'] => {
  if (!value || typeof value !== 'object') {
    return {
      links: [],
      updatedAt: new Date().toISOString()
    };
  }

  const candidate = value as Partial<BrandOpsData['externalSync']>;
  const links: BrandOpsData['externalSync']['links'] = [];

  if (Array.isArray(candidate.links)) {
    (candidate.links as unknown[]).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const link = item as Record<string, unknown>;
      if (
        typeof link.id !== 'string' ||
        typeof link.sourceId !== 'string' ||
        typeof link.targetId !== 'string' ||
        typeof link.remoteId !== 'string' ||
        typeof link.lastSyncedAt !== 'string'
      ) {
        return;
      }

      if (link.provider !== 'google-calendar' && link.provider !== 'google-tasks') {
        return;
      }

      if (link.resourceType !== 'calendar-event' && link.resourceType !== 'task') {
        return;
      }

      if (
        link.sourceType !== 'publishing-item' &&
        link.sourceType !== 'follow-up' &&
        link.sourceType !== 'opportunity' &&
        link.sourceType !== 'daily-cadence-block'
      ) {
        return;
      }

      links.push({
        id: link.id,
        provider: link.provider,
        resourceType: link.resourceType,
        sourceType: link.sourceType,
        sourceId: link.sourceId,
        targetId: link.targetId,
        remoteId: link.remoteId,
        remoteUrl: typeof link.remoteUrl === 'string' ? link.remoteUrl : undefined,
        lastSyncedAt: link.lastSyncedAt
      });
    });
  }

  return {
    links,
    updatedAt:
      typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString()
  };
};

const normalizeIntegrationHubState = (value: unknown): BrandOpsData['integrationHub'] => {
  if (!value || typeof value !== 'object') {
    return {
      liveFeed: [],
      sshTargets: [],
      sources: [],
      artifacts: []
    };
  }

  const candidate = value as Partial<BrandOpsData['integrationHub']>;
  const liveFeed: BrandOpsData['integrationHub']['liveFeed'] = [];
  const sshTargets: BrandOpsData['integrationHub']['sshTargets'] = [];
  const sources: BrandOpsData['integrationHub']['sources'] = [];
  const artifacts: BrandOpsData['integrationHub']['artifacts'] = [];

  if (Array.isArray(candidate.liveFeed)) {
    (candidate.liveFeed as unknown[]).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const feed = item as Record<string, unknown>;
      if (
        typeof feed.id !== 'string' ||
        typeof feed.source !== 'string' ||
        typeof feed.title !== 'string' ||
        typeof feed.detail !== 'string' ||
        typeof feed.happenedAt !== 'string'
      ) {
        return;
      }

      if (feed.level !== 'info' && feed.level !== 'success' && feed.level !== 'warning') {
        return;
      }

      liveFeed.push({
        id: feed.id,
        source: feed.source,
        title: feed.title,
        detail: feed.detail,
        level: feed.level,
        happenedAt: feed.happenedAt
      });
    });
  }

  if (Array.isArray(candidate.sshTargets)) {
    (candidate.sshTargets as unknown[]).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const target = item as Record<string, unknown>;
      if (
        typeof target.id !== 'string' ||
        typeof target.name !== 'string' ||
        typeof target.host !== 'string' ||
        typeof target.port !== 'number' ||
        typeof target.username !== 'string' ||
        typeof target.description !== 'string' ||
        typeof target.createdAt !== 'string'
      ) {
        return;
      }

      if (
        target.authMode !== 'ssh-key' &&
        target.authMode !== 'agent' &&
        target.authMode !== 'passwordless'
      ) {
        return;
      }

      sshTargets.push({
        id: target.id,
        name: target.name,
        host: target.host,
        port: target.port,
        username: target.username,
        authMode: target.authMode,
        description: target.description,
        tags: asStringArray(target.tags),
        commandHints: asStringArray(target.commandHints),
        createdAt: target.createdAt
      });
    });
  }

  if (Array.isArray(candidate.sources)) {
    (candidate.sources as unknown[]).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const source = item as Record<string, unknown>;
      if (
        typeof source.id !== 'string' ||
        typeof source.name !== 'string' ||
        typeof source.kind !== 'string' ||
        typeof source.status !== 'string' ||
        typeof source.notes !== 'string' ||
        typeof source.createdAt !== 'string'
      ) {
        return;
      }

      if (
        source.kind !== 'google-workspace' &&
        source.kind !== 'github' &&
        source.kind !== 'notion' &&
        source.kind !== 'slack' &&
        source.kind !== 'rss' &&
        source.kind !== 'google-drive' &&
        source.kind !== 'webhook' &&
        source.kind !== 'custom-api'
      ) {
        return;
      }

      if (
        source.status !== 'planned' &&
        source.status !== 'connected' &&
        source.status !== 'monitoring'
      ) {
        return;
      }

      sources.push({
        id: source.id,
        name: source.name,
        kind: source.kind,
        status: source.status,
        baseUrl: typeof source.baseUrl === 'string' ? source.baseUrl : undefined,
        artifactTypes: asStringArray(source.artifactTypes),
        tags: asStringArray(source.tags),
        notes: source.notes,
        createdAt: source.createdAt
      });
    });
  }

  if (Array.isArray(candidate.artifacts)) {
    (candidate.artifacts as unknown[]).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const artifact = item as Record<string, unknown>;
      if (
        typeof artifact.id !== 'string' ||
        typeof artifact.sourceId !== 'string' ||
        typeof artifact.title !== 'string' ||
        typeof artifact.artifactType !== 'string' ||
        typeof artifact.summary !== 'string' ||
        typeof artifact.createdAt !== 'string' ||
        typeof artifact.updatedAt !== 'string'
      ) {
        return;
      }

      artifacts.push({
        id: artifact.id,
        sourceId: artifact.sourceId,
        title: artifact.title,
        artifactType: artifact.artifactType,
        summary: artifact.summary,
        externalUrl: typeof artifact.externalUrl === 'string' ? artifact.externalUrl : undefined,
        externalId: typeof artifact.externalId === 'string' ? artifact.externalId : undefined,
        tags: asStringArray(artifact.tags),
        syncedAt: typeof artifact.syncedAt === 'string' ? artifact.syncedAt : undefined,
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt
      });
    });
  }

  return {
    liveFeed,
    sshTargets,
    sources,
    artifacts
  };
};

const normalizeSettings = (settings: unknown): BrandOpsData['settings'] => {
  const fallback = seedData.settings;
  if (!settings || typeof settings !== 'object') {
    return fallback;
  }

  const candidate = settings as Partial<BrandOpsData['settings']>;
  return {
    timezone: typeof candidate.timezone === 'string' ? candidate.timezone : fallback.timezone,
    defaultReminderLeadHours:
      typeof candidate.defaultReminderLeadHours === 'number' ? candidate.defaultReminderLeadHours : fallback.defaultReminderLeadHours,
    weekStartsOn: candidate.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
    theme: candidate.theme === 'light' ? 'light' : 'dark',
    visualMode:
      candidate.visualMode === 'retroMagic' || candidate.visualMode === 'classic'
        ? candidate.visualMode
        : fallback.visualMode,
    motionMode:
      candidate.motionMode === 'off' ||
      candidate.motionMode === 'balanced' ||
      candidate.motionMode === 'wild'
        ? candidate.motionMode
        : fallback.motionMode,
    ambientFxEnabled:
      typeof candidate.ambientFxEnabled === 'boolean'
        ? candidate.ambientFxEnabled
        : fallback.ambientFxEnabled,
    cockpitLayout:
      candidate.cockpitLayout === 'unified-scroll' ? 'unified-scroll' : 'sections',
    cockpitDensity: candidate.cockpitDensity === 'compact' ? 'compact' : 'comfortable',
    localModelEnabled: Boolean(candidate.localModelEnabled),
    aiAdapterMode:
      candidate.aiAdapterMode === 'local-only' || candidate.aiAdapterMode === 'external-opt-in'
        ? candidate.aiAdapterMode
        : 'disabled',
    debugMode: Boolean(candidate.debugMode),
    primaryIdentityProvider:
      candidate.primaryIdentityProvider === 'google' ||
      candidate.primaryIdentityProvider === 'github' ||
      candidate.primaryIdentityProvider === 'linkedin'
        ? candidate.primaryIdentityProvider
        : fallback.primaryIdentityProvider,
    overlay: {
      enabled: Boolean(candidate.overlay?.enabled),
      compactMode: Boolean(candidate.overlay?.compactMode),
      showContactInsights: Boolean(candidate.overlay?.showContactInsights)
    },
    automationRules: Array.isArray(candidate.automationRules)
      ? candidate.automationRules
          .filter((rule): rule is BrandOpsData['settings']['automationRules'][number] => {
            return (
              Boolean(rule) &&
              typeof rule.id === 'string' &&
              typeof rule.name === 'string' &&
              (rule.trigger === 'publish-reminder' ||
                rule.trigger === 'follow-up-overdue' ||
                rule.trigger === 'weekly-review') &&
              (rule.action === 'badge-highlight' ||
                rule.action === 'dashboard-pin' ||
                rule.action === 'notification') &&
              typeof rule.enabled === 'boolean'
            );
          })
      : fallback.automationRules,
    syncHub: normalizeSyncHubSettings(candidate.syncHub),
    notificationCenter: normalizeNotificationCenterSettings(candidate.notificationCenter),
    cadenceFlow: normalizeCadenceFlowSettings(candidate.cadenceFlow)
  };
};

const withFreshSeedMetadata = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  seed: {
    ...seedData.seed,
    ...base.seed,
    seededAt: new Date().toISOString()
  }
});

const normalizeSeedSource = (raw: string | undefined): SeedDataSource => {
  if (raw === 'demo-sample' || raw === 'default-demo') return 'demo-sample';
  if (raw === 'production-empty') return 'production-empty';
  return seedData.seed.source;
};

const withDefaults = (base: BrandOpsData): BrandOpsData => ({
  ...base,
  brand: normalizeBrandProfile(base.brand),
  modules: normalizeModules(base.modules),
  brandVault: base.brandVault ?? defaultBrandVault,
  contentLibrary: normalizeContentLibrary(base.contentLibrary),
  publishingQueue: normalizePublishingQueue(base.publishingQueue),
  followUps: normalizeFollowUps(base.followUps),
  contacts: normalizeContacts(base.contacts),
  companies: normalizeCompanies(base.companies),
  opportunities: normalizeOpportunities(base.opportunities),
  notes: normalizeActivityNotes(base.notes),
  outreachDrafts: normalizeOutreachDrafts(base.outreachDrafts),
  outreachTemplates: normalizeOutreachTemplates(base.outreachTemplates),
  outreachHistory: normalizeOutreachHistory(base.outreachHistory),
  messagingVault: normalizeMessagingVault(base.messagingVault),
  settings: normalizeSettings(base.settings),
  externalSync: normalizeExternalSyncState(base.externalSync),
  integrationHub: normalizeIntegrationHubState(base.integrationHub),
  scheduler: normalizeSchedulerState(base.scheduler),
  seed: {
    source: normalizeSeedSource(base.seed?.source),
    version:
      typeof base.seed?.version === 'string' && base.seed.version.trim().length > 0
        ? base.seed.version
        : seedData.seed.version,
    seededAt: asIsoString(base.seed?.seededAt, seedData.seed.seededAt),
    welcomeCompletedAt:
      typeof base.seed?.welcomeCompletedAt === 'string' && base.seed.welcomeCompletedAt.length > 0
        ? base.seed.welcomeCompletedAt
        : undefined,
    onboardingVersion:
      typeof base.seed?.onboardingVersion === 'string' && base.seed.onboardingVersion.trim().length > 0
        ? base.seed.onboardingVersion
        : seedData.seed.onboardingVersion,
    guestSessionAt:
      typeof base.seed?.guestSessionAt === 'string' && base.seed.guestSessionAt.length > 0
        ? base.seed.guestSessionAt
        : undefined
  }
});

const isBrandOpsData = (value: unknown): value is BrandOpsData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BrandOpsData>;
  return (
    Array.isArray(candidate.modules) &&
    Array.isArray(candidate.publishingQueue) &&
    Array.isArray(candidate.contentLibrary) &&
    Array.isArray(candidate.contacts) &&
    Array.isArray(candidate.opportunities) &&
    Boolean(candidate.settings)
  );
};

const createSeededWorkspace = () => withDefaults(withFreshSeedMetadata(seedData));

const createDemoSampleWorkspace = () => withDefaults(withFreshSeedMetadata(demoSampleData));

export const storageService = {
  async getData(): Promise<BrandOpsData> {
    try {
      const stored = await browserLocalStorage.get<BrandOpsData>(DATA_KEY);
      if (isBrandOpsData(stored)) {
        const normalized = withDefaults(stored);
        await browserLocalStorage.set(DATA_KEY, normalized);
        return normalized;
      }
    } catch {
      // Corrupt storage should recover into a valid seeded workspace.
    }

    const seeded = createSeededWorkspace();
    await browserLocalStorage.set(DATA_KEY, seeded);
    return seeded;
  },

  async setData(data: BrandOpsData): Promise<BrandOpsData> {
    const normalized = withDefaults(data);
    await browserLocalStorage.set(DATA_KEY, normalized);
    return normalized;
  },

  async resetToSeed(): Promise<BrandOpsData> {
    const seeded = createSeededWorkspace();
    await browserLocalStorage.set(DATA_KEY, seeded);
    return seeded;
  },

  /** Rich demo dataset (contacts, pipeline, content) for QA — not the production default. */
  async resetToDemoSample(): Promise<BrandOpsData> {
    const seeded = createDemoSampleWorkspace();
    await browserLocalStorage.set(DATA_KEY, seeded);
    return seeded;
  },

  async exportData(): Promise<string> {
    const data = await this.getData();
    return JSON.stringify(data, null, 2);
  },

  async importData(raw: string): Promise<BrandOpsData> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error('Import failed: JSON is malformed.');
    }
    if (!isBrandOpsData(parsed)) {
      throw new Error('Invalid BrandOps workspace payload.');
    }

    const normalized = withDefaults(parsed);
    await browserLocalStorage.set(DATA_KEY, normalized);
    return normalized;
  }
};
