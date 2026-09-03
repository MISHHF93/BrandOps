import { defaultAppSettings, defaultBrandProfile } from '../../config/workspaceDefaults';
import { seedData } from '../../modules/brandMemory/seed';
import { browserLocalStorage } from '../../shared/storage/browserStorage';
import type { StorageAdapter } from '../../shared/storage/browserStorage';
import {
  ActivityNote,
  AgentAuditEntry,
  AiAssistantTurnTrace,
  BrandProfile,
  BrandOpsData,
  BrandVault,
  Company,
  Contact,
  ContentItemStatus,
  ContentItemType,
  ContentLibraryItem,
  FocusKpiSelfCheck,
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
  OperatorTraceEntry,
  SeedDataSource,
  WorkspaceModule,
  ContentItemEmbeddingRecord,
  AiEmbeddingIndexState,
  CopilotWorker,
  CopilotWorkerContextHints,
  ConnectedIdentityEngineState,
  ConnectedIdentitySignal,
  ConnectedIdentitySignalKind,
  ConnectedIdentitySignalSource,
  DigitalTwin,
  DigitalTwinState,
  OperatingPresetId,
  OperatingProfileState,
  TwinFactStatus,
  TwinSupportedActionType,
  IntegrationSourceKind,
  Plan,
  PlanNextAction,
  PlanOutputAsset,
  PlanPreset,
  PlanReceipt,
  PlanRisk,
  PlanStep,
  PlanStepStatus,
  PlanTimelineItem,
  PlanWorkspaceState,
  SavedPlanStatus
} from '../../types/domain';
import { SUPPORTED_TWIN_ACTIONS } from '../digitalTwin/digitalTwin';
import { ALL_INTEGRATION_SOURCE_KINDS } from '../../shared/integrations/integrationSourceCatalog';
import {
  AGENT_CAPABILITY_IDS,
  AgentCapabilityId,
  AgentProposal,
  AgentProposalStatus,
  AgentProposalsState,
  ContextBundleId,
  CONTEXT_BUNDLE_IDS,
  ExternalAgentAuditEntry,
  ExternalAgentAuditState,
  ExternalAgentClientKind,
  EXTERNAL_AGENT_CLIENT_KINDS,
  ExternalAgentEvent,
  ExternalAgentEventKind,
  ExternalAgentEventsState,
  ExternalAgentEventStatus,
  EXTERNAL_AGENT_EVENT_KINDS,
  ExternalAgentSession,
  ExternalAgentSessionsState,
  TrustTier
} from '../../types/agentInterop';
import { OPERATING_PRESETS } from '../../shared/workspace/operatingProfileCatalog';
import { MAX_AI_TRACE_BUNDLES, sanitizeTraceBundle } from '../ai/aiTracePersistence';
import { normalizeAiPipelineRuns } from '../ai/aiPipelineRunPersistence';
import { normalizeBrandOpsAICoreState } from '../ai/brandOpsAiCore';
import type { TraceBundle } from '../../types/aiTraceGraph';
import { AI_TRACE_GRAPH_SCHEMA_VERSION } from '../../types/aiTraceGraph';
import {
  MAX_OPERATOR_TRACE_ENTRIES,
  prependOperatorTrace,
  serializeOperatorTracesJsonl
} from '../dataset/operatorTraces';
import { MAX_CHECKPOINT_ENTRIES } from '../execution/checkpointStore';
import { MAX_AGENT_EVENTS } from '../interop/events';
import { MAX_AGENT_SESSIONS } from '../interop/sessions';
import { MAX_AGENT_PROPOSALS, MAX_INTEGRATION_ARTIFACTS } from '../interop/proposals';
import { MAX_AUDIT_ENTRIES } from '../interop/audit';
import type {
  Checkpoint,
  CheckpointActionType,
  CheckpointType,
  ExecutionState
} from '../../types/executionState';
import type { OperationalExpertId } from '../ai/expertRegistry';
import { MAX_AI_ASSISTANT_TURN_TRACES } from '../ai/aiAssistantTraceLog';
import { sanitizeOrphanInlineMarkers } from '../ai/aiInlineCitations';
import { AI_IO_TRACE_SCHEMA_VERSION, sanitizeAiCitationChunks } from '../ai/aiIoProvenance';
import { normalizeOperatingTimelineState } from '../operatingTimeline/operatingTimeline';
import {
  buildWorkspaceIntelligenceState,
  normalizeWorkspaceIntelligenceState
} from '../workspaceIntelligence/workspaceIntelligence';
import { serializeWorkspaceWrite } from '../analytics/writeQueue';

const DATA_KEY = 'brandops:data';

/** Shared workspace storage key — used by the interop gateway and the Node MCP server, not just the browser UI. */
export const BRANDOPS_WORKSPACE_DATA_KEY = DATA_KEY;

/**
 * Reused by the external-agent gateway so protocol adapters and the UI share
 * one normalization implementation (no duplicated backend logic).
 */
export function normalizeBrandOpsData(data: BrandOpsData): BrandOpsData {
  return withDefaults(data);
}

export function isValidBrandOpsData(value: unknown): value is BrandOpsData {
  return isBrandOpsData(value);
}

const ALLOWED_INTEGRATION_SOURCE_KINDS = new Set<string>(ALL_INTEGRATION_SOURCE_KINDS);

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

const asNumberInRange = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
};

const normalizeContentLibrary = (items: unknown): ContentLibraryItem[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): ContentLibraryItem | null => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;

      const id =
        typeof candidate.id === 'string'
          ? candidate.id
          : `cli-${Math.random().toString(36).slice(2, 9)}`;
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
        goal:
          typeof candidate.goal === 'string'
            ? candidate.goal
            : 'Capture and refine reusable content',
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
      const createdAt =
        typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
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
          typeof candidate.id === 'string'
            ? candidate.id
            : `pub-${Math.random().toString(36).slice(2, 9)}`,
        title: typeof candidate.title === 'string' ? candidate.title : 'Untitled publishing item',
        body: typeof candidate.body === 'string' ? candidate.body : '',
        platforms: ['linkedin'],
        tags: asStringArray(candidate.tags),
        status: normalizedStatus,
        contentLibraryItemId:
          typeof candidate.contentLibraryItemId === 'string'
            ? candidate.contentLibraryItemId
            : undefined,
        scheduledFor,
        reminderAt: typeof candidate.reminderAt === 'string' ? candidate.reminderAt : undefined,
        reminderLeadMinutes:
          typeof candidate.reminderLeadMinutes === 'number'
            ? candidate.reminderLeadMinutes
            : undefined,
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
      const createdAt =
        typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
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
          typeof candidate.id === 'string'
            ? candidate.id
            : `out-${Math.random().toString(36).slice(2, 9)}`,
        category: (candidate.category as OutreachCategory) ?? OUTREACH_CATEGORY_FALLBACK,
        targetName,
        company: typeof candidate.company === 'string' ? candidate.company : '',
        role: typeof candidate.role === 'string' ? candidate.role : '',
        messageBody,
        outreachGoal:
          typeof candidate.outreachGoal === 'string'
            ? candidate.outreachGoal
            : 'Start a conversation',
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
      const createdAt =
        typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
      return {
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `tpl-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : 'Untitled template',
        category: (candidate.category as OutreachCategory) ?? OUTREACH_CATEGORY_FALLBACK,
        openerBlock: typeof candidate.openerBlock === 'string' ? candidate.openerBlock : '',
        valueBlock: typeof candidate.valueBlock === 'string' ? candidate.valueBlock : '',
        proofBlock: typeof candidate.proofBlock === 'string' ? candidate.proofBlock : '',
        callToActionBlock:
          typeof candidate.callToActionBlock === 'string' ? candidate.callToActionBlock : '',
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
        targetName:
          typeof candidate.targetName === 'string' ? candidate.targetName : 'Unknown target',
        company: typeof candidate.company === 'string' ? candidate.company : 'Unknown company',
        status,
        loggedAt:
          typeof candidate.loggedAt === 'string' ? candidate.loggedAt : new Date().toISOString(),
        summary:
          typeof candidate.summary === 'string' ? candidate.summary : 'Outreach status updated.'
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
      const legacyName =
        typeof candidate.fullName === 'string' ? candidate.fullName : 'Unknown contact';
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
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `contact-${Math.random().toString(36).slice(2, 9)}`,
        name: typeof candidate.name === 'string' ? candidate.name : legacyName,
        company: typeof candidate.company === 'string' ? candidate.company : 'Unknown company',
        role: typeof candidate.role === 'string' ? candidate.role : legacyRole,
        source: typeof candidate.source === 'string' ? candidate.source : 'manual',
        relationshipStage,
        status:
          candidate.status === 'active' ||
          candidate.status === 'dormant' ||
          candidate.status === 'archived'
            ? candidate.status
            : 'active',
        nextAction:
          typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Add next action',
        followUpDate:
          typeof candidate.followUpDate === 'string' ? candidate.followUpDate : undefined,
        notes: typeof candidate.notes === 'string' ? candidate.notes : '',
        links: asStringArray(candidate.links),
        relatedOutreachDraftIds: asStringArray(candidate.relatedOutreachDraftIds),
        relatedContentTags: asStringArray(candidate.relatedContentTags),
        lastContactAt:
          typeof candidate.lastContactAt === 'string'
            ? candidate.lastContactAt
            : new Date().toISOString(),
        fullName: legacyName,
        title: legacyRole,
        relationship:
          relationship === 'new' ||
          relationship === 'warm' ||
          relationship === 'active-client' ||
          relationship === 'past-client'
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
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `company-${Math.random().toString(36).slice(2, 9)}`,
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
          candidate.status === 'active' ||
          candidate.status === 'dormant' ||
          candidate.status === 'archived'
            ? candidate.status
            : 'active',
        nextAction:
          typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Add next action',
        followUpDate:
          typeof candidate.followUpDate === 'string' ? candidate.followUpDate : undefined,
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
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `opp-${Math.random().toString(36).slice(2, 9)}`,
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
        nextAction:
          typeof candidate.nextAction === 'string' ? candidate.nextAction : 'Define next action',
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
        createdAt:
          typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
        updatedAt:
          typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
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
        id:
          typeof candidate.id === 'string'
            ? candidate.id
            : `note-${Math.random().toString(36).slice(2, 9)}`,
        entityType:
          candidate.entityType === 'contact' ||
          candidate.entityType === 'company' ||
          candidate.entityType === 'opportunity'
            ? candidate.entityType
            : 'opportunity',
        entityId: typeof candidate.entityId === 'string' ? candidate.entityId : 'unknown',
        title: typeof candidate.title === 'string' ? candidate.title : 'Activity note',
        detail: typeof candidate.detail === 'string' ? candidate.detail : '',
        status: typeof candidate.status === 'string' ? candidate.status : undefined,
        nextAction: typeof candidate.nextAction === 'string' ? candidate.nextAction : undefined,
        createdAt:
          typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString()
      };
    })
    .filter((item): item is ActivityNote => Boolean(item));
};

const normalizeBrandProfile = (value: unknown): BrandProfile => {
  const fallback = defaultBrandProfile;
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
          candidate.route === 'integrations' ||
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
        (recurrenceCandidate.interval === 'daily' || recurrenceCandidate.interval === 'weekly') &&
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
          typeof candidate.contactId === 'string' ? candidate.contactId : 'unknown-contact',
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
            (entry.recurrence.interval === 'daily' || entry.recurrence.interval === 'weekly') &&
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
    expiresAt: typeof candidate.expiresAt === 'string' ? candidate.expiresAt : undefined,
    scope: Array.isArray(candidate.scope)
      ? candidate.scope.filter(
          (item): item is string => typeof item === 'string' && item.length > 0
        )
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

  const candidate = value as Partial<
    NonNullable<BrandOpsData['settings']['syncHub']['linkedin']['profile']>
  >;
  const profile: NonNullable<BrandOpsData['settings']['syncHub']['linkedin']['profile']> = {};
  if (typeof candidate.sub === 'string' && candidate.sub.length > 0) profile.sub = candidate.sub;
  if (typeof candidate.name === 'string' && candidate.name.length > 0)
    profile.name = candidate.name;
  if (typeof candidate.email === 'string' && candidate.email.length > 0)
    profile.email = candidate.email;
  if (typeof candidate.picture === 'string' && candidate.picture.length > 0)
    profile.picture = candidate.picture;
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
  const hasClientId =
    typeof candidate.clientId === 'string' && candidate.clientId.trim().length > 0;

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
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
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
      typeof candidate.roleContext === 'string' ? candidate.roleContext : fallback.roleContext,
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

const normalizeOperatorTwinSettings = (
  value: unknown,
  legacyNotificationCenter: unknown,
  fallback: BrandOpsData['settings']['operatorTwin']
): BrandOpsData['settings']['operatorTwin'] => {
  const legacyResume =
    legacyNotificationCenter &&
    typeof legacyNotificationCenter === 'object' &&
    typeof (legacyNotificationCenter as { resumeNeuralPhaseContext?: unknown })
      .resumeNeuralPhaseContext === 'string'
      ? String(
          (legacyNotificationCenter as { resumeNeuralPhaseContext: string })
            .resumeNeuralPhaseContext
        )
          .trim()
          .slice(0, 12_000)
      : '';

  const candidate =
    value && typeof value === 'object'
      ? (value as Partial<BrandOpsData['settings']['operatorTwin']>)
      : {};

  let resumeArtifact =
    typeof candidate.resumeArtifact === 'string'
      ? candidate.resumeArtifact.trim().slice(0, 12_000)
      : '';
  if (!resumeArtifact.length && legacyResume.length) {
    resumeArtifact = legacyResume;
  }

  let version =
    typeof candidate.version === 'number' && Number.isFinite(candidate.version)
      ? Math.max(0, Math.min(1_000_000, Math.round(candidate.version)))
      : 0;
  if (resumeArtifact.length > 0 && version === 0) {
    version = 1;
  }

  const lastIngestAt =
    typeof candidate.lastIngestAt === 'string' && candidate.lastIngestAt.trim().length >= 10
      ? candidate.lastIngestAt.trim().slice(0, 40)
      : undefined;
  const sourceSummary =
    typeof candidate.sourceSummary === 'string'
      ? candidate.sourceSummary.trim().slice(0, 240)
      : undefined;

  let kpiSelfChecks: FocusKpiSelfCheck[] = Array.isArray(fallback.kpiSelfChecks)
    ? [...fallback.kpiSelfChecks]
    : [];
  if (Array.isArray(candidate.kpiSelfChecks)) {
    const next: FocusKpiSelfCheck[] = [];
    for (const row of candidate.kpiSelfChecks) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Partial<FocusKpiSelfCheck>;
      const score = r.score;
      if (score !== 1 && score !== 2 && score !== 3 && score !== 4 && score !== 5) continue;
      const recordedAt =
        typeof r.recordedAt === 'string' && r.recordedAt.trim().length >= 10
          ? r.recordedAt.trim().slice(0, 40)
          : new Date().toISOString();
      const note = typeof r.note === 'string' ? r.note.trim().slice(0, 400) : '';
      next.push({ score, recordedAt, note });
      if (next.length >= 24) break;
    }
    kpiSelfChecks = next;
  }

  return { resumeArtifact, version, lastIngestAt, sourceSummary, kpiSelfChecks };
};

const normalizeCadenceFlowSettings = (value: unknown): BrandOpsData['settings']['cadenceFlow'] => {
  const fallback = seedData.settings.cadenceFlow;
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<BrandOpsData['settings']['cadenceFlow']>;

  return {
    mode: 'balanced',
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

      if (!ALLOWED_INTEGRATION_SOURCE_KINDS.has(source.kind)) {
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
        kind: source.kind as IntegrationSourceKind,
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
    (candidate.artifacts as unknown[]).slice(0, MAX_INTEGRATION_ARTIFACTS).forEach((item) => {
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

const MAX_AI_URL_LEN = 2048;
const MAX_AI_MODEL_ID_LEN = 128;

const normalizeAiBridgeSettings = (
  value: unknown,
  fallback: BrandOpsData['settings']['aiBridge']
): BrandOpsData['settings']['aiBridge'] => {
  if (!value || typeof value !== 'object') return fallback;
  const v = value as Partial<BrandOpsData['settings']['aiBridge']>;
  const trimUrl = (raw: unknown) =>
    typeof raw === 'string' ? raw.trim().slice(0, MAX_AI_URL_LEN) : '';
  const trimModel = (raw: unknown, fb: string) => {
    if (typeof raw !== 'string') return fb;
    const t = raw.trim().slice(0, MAX_AI_MODEL_ID_LEN);
    return t || fb;
  };
  return {
    inferenceBaseUrl: trimUrl(v.inferenceBaseUrl),
    embeddingBaseUrl: trimUrl(v.embeddingBaseUrl),
    chatModelId: trimModel(v.chatModelId, fallback.chatModelId),
    embeddingModelId: trimModel(v.embeddingModelId, fallback.embeddingModelId)
  };
};

const MAX_COPILOT_WORKERS = 8;
const MAX_COPILOT_ID_LEN = 64;
const MAX_COPILOT_NAME_LEN = 80;
const MAX_COPILOT_DESC_LEN = 280;
const MAX_COPILOT_INSTRUCTIONS_LEN = 4000;
const MAX_COPILOT_MODEL_LEN = 128;
const MAX_ALLOWED_AGENT_COMMAND_TOKENS = 16;
const MAX_AGENT_COMMAND_TOKEN_LEN = 120;

const normalizeCopilotWorkerRegistry = (
  value: unknown,
  fallback: BrandOpsData['settings']['copilotWorkers']
): BrandOpsData['settings']['copilotWorkers'] => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const raw = value as Partial<{ workers?: unknown; activeWorkerId?: unknown }>;
  const activeRaw = typeof raw.activeWorkerId === 'string' ? raw.activeWorkerId.trim() : '';
  const workersIn = Array.isArray(raw.workers) ? raw.workers : [];
  const workers: CopilotWorker[] = [];

  for (const item of workersIn) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Record<string, unknown>;
    const id = typeof w.id === 'string' ? w.id.trim().slice(0, MAX_COPILOT_ID_LEN) : '';
    const name = typeof w.name === 'string' ? w.name.trim().slice(0, MAX_COPILOT_NAME_LEN) : '';
    const systemInstructions =
      typeof w.systemInstructions === 'string'
        ? w.systemInstructions.trim().slice(0, MAX_COPILOT_INSTRUCTIONS_LEN)
        : '';
    if (!id || !name || !systemInstructions) continue;
    if (workers.some((x) => x.id === id)) continue;

    const description =
      typeof w.description === 'string'
        ? w.description.trim().slice(0, MAX_COPILOT_DESC_LEN)
        : undefined;

    let allowedAgentCommands: string[] | undefined;
    if (Array.isArray(w.allowedAgentCommands)) {
      allowedAgentCommands = w.allowedAgentCommands
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim().slice(0, MAX_AGENT_COMMAND_TOKEN_LEN))
        .filter(Boolean)
        .slice(0, MAX_ALLOWED_AGENT_COMMAND_TOKENS);
      if (allowedAgentCommands.length === 0) allowedAgentCommands = undefined;
    }

    const chatModelId =
      typeof w.chatModelId === 'string'
        ? w.chatModelId.trim().slice(0, MAX_COPILOT_MODEL_LEN)
        : undefined;

    const maxCompletionTokens =
      typeof w.maxCompletionTokens === 'number' && Number.isFinite(w.maxCompletionTokens)
        ? Math.min(Math.max(0, Math.floor(w.maxCompletionTokens)), 8192)
        : undefined;

    let contextHints: CopilotWorkerContextHints | undefined;
    if (w.contextHints && typeof w.contextHints === 'object' && !Array.isArray(w.contextHints)) {
      const ch = w.contextHints as Record<string, unknown>;
      const tags = Array.isArray(ch.contentTags)
        ? ch.contentTags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim().slice(0, 64))
            .filter(Boolean)
            .slice(0, 24)
        : undefined;
      const kinds = Array.isArray(ch.integrationArtifactKinds)
        ? ch.integrationArtifactKinds
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim().slice(0, 64))
            .filter(Boolean)
            .slice(0, 24)
        : undefined;
      const includeBrandVault =
        typeof ch.includeBrandVault === 'boolean' ? ch.includeBrandVault : undefined;
      if ((tags && tags.length) || (kinds && kinds.length) || includeBrandVault !== undefined) {
        contextHints = {};
        if (tags?.length) contextHints.contentTags = tags;
        if (kinds?.length) contextHints.integrationArtifactKinds = kinds;
        if (includeBrandVault !== undefined) contextHints.includeBrandVault = includeBrandVault;
      }
    }

    workers.push({
      id,
      name,
      ...(description ? { description } : {}),
      systemInstructions,
      ...(contextHints ? { contextHints } : {}),
      ...(allowedAgentCommands ? { allowedAgentCommands } : {}),
      ...(chatModelId ? { chatModelId } : {}),
      ...(maxCompletionTokens !== undefined && maxCompletionTokens > 0
        ? { maxCompletionTokens }
        : {})
    });

    if (workers.length >= MAX_COPILOT_WORKERS) break;
  }

  if (!workers.length) {
    return fallback;
  }

  const idSet = new Set(workers.map((x) => x.id));
  const activeTrimmed = activeRaw.slice(0, MAX_COPILOT_ID_LEN);
  const activeWorkerId = activeTrimmed && idSet.has(activeTrimmed) ? activeTrimmed : workers[0].id;

  return { workers, activeWorkerId };
};

const VALID_OPERATING_PRESET_IDS = new Set<OperatingPresetId>(OPERATING_PRESETS.map((p) => p.id));

function normalizeOperatingProfile(
  raw: unknown,
  fallback: OperatingProfileState
): OperatingProfileState {
  if (!raw || typeof raw !== 'object') return fallback;
  const id = (raw as Partial<OperatingProfileState>).lastAppliedPresetId;
  if (id === undefined) return fallback;
  if (id === null) return { lastAppliedPresetId: null };
  if (id === 'custom') return { lastAppliedPresetId: 'custom' };
  if (typeof id === 'string') {
    const token = id as string;
    const migrated = token === 'focused-builder' ? 'balanced-ops' : token;
    if (VALID_OPERATING_PRESET_IDS.has(migrated as OperatingPresetId)) {
      return { lastAppliedPresetId: migrated as OperatingPresetId };
    }
  }
  return fallback;
}

const normalizeSettings = (settings: unknown): BrandOpsData['settings'] => {
  const fallback = defaultAppSettings;
  if (!settings || typeof settings !== 'object') {
    return fallback;
  }

  const candidate = settings as Partial<BrandOpsData['settings']>;
  return {
    timezone: typeof candidate.timezone === 'string' ? candidate.timezone : fallback.timezone,
    defaultReminderLeadHours:
      typeof candidate.defaultReminderLeadHours === 'number'
        ? candidate.defaultReminderLeadHours
        : fallback.defaultReminderLeadHours,
    weekStartsOn: candidate.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
    theme: candidate.theme === 'light' ? 'light' : 'dark',
    cockpitLayout: candidate.cockpitLayout === 'unified-scroll' ? 'unified-scroll' : 'sections',
    cockpitDensity: candidate.cockpitDensity === 'compact' ? 'compact' : 'comfortable',
    professionPackId:
      candidate.professionPackId === 'founder-consultant' ||
      candidate.professionPackId === 'sales-marketing' ||
      candidate.professionPackId === 'research-analytical'
        ? candidate.professionPackId
        : undefined,
    localModelEnabled: Boolean(candidate.localModelEnabled),
    aiAdapterMode:
      candidate.aiAdapterMode === 'local-only' || candidate.aiAdapterMode === 'external-opt-in'
        ? candidate.aiAdapterMode
        : 'disabled',
    debugMode: fallback.debugMode,
    operatorTraceCollectionEnabled:
      typeof candidate.operatorTraceCollectionEnabled === 'boolean'
        ? candidate.operatorTraceCollectionEnabled
        : fallback.operatorTraceCollectionEnabled,
    connectedIdentityLearningEnabled:
      typeof candidate.connectedIdentityLearningEnabled === 'boolean'
        ? candidate.connectedIdentityLearningEnabled
        : fallback.connectedIdentityLearningEnabled,
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
      ? candidate.automationRules.filter(
          (rule): rule is BrandOpsData['settings']['automationRules'][number] => {
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
          }
        )
      : fallback.automationRules,
    syncHub: normalizeSyncHubSettings(candidate.syncHub),
    notificationCenter: normalizeNotificationCenterSettings(candidate.notificationCenter),
    operatorTwin: normalizeOperatorTwinSettings(
      candidate.operatorTwin,
      candidate.notificationCenter,
      fallback.operatorTwin
    ),
    cadenceFlow: normalizeCadenceFlowSettings(candidate.cadenceFlow),
    aiBridge: normalizeAiBridgeSettings(candidate.aiBridge, fallback.aiBridge),
    copilotWorkers: normalizeCopilotWorkerRegistry(
      candidate.copilotWorkers,
      fallback.copilotWorkers
    ),
    operatingProfile: normalizeOperatingProfile(
      candidate.operatingProfile,
      fallback.operatingProfile
    ),
    aiOperatorMode:
      candidate.aiOperatorMode === 'fast' ||
      candidate.aiOperatorMode === 'balanced' ||
      candidate.aiOperatorMode === 'deep_reasoning' ||
      candidate.aiOperatorMode === 'private_local' ||
      candidate.aiOperatorMode === 'best_evidence'
        ? candidate.aiOperatorMode
        : fallback.aiOperatorMode,
    aiRoutingDiagnosticsEnabled:
      typeof candidate.aiRoutingDiagnosticsEnabled === 'boolean'
        ? candidate.aiRoutingDiagnosticsEnabled
        : fallback.aiRoutingDiagnosticsEnabled
  };
};

/** Normalize raw persisted `settings` (same path as workspace load). Exported for contract tests and tooling. */
export function normalizeWorkspaceSettings(settings: unknown): BrandOpsData['settings'] {
  return normalizeSettings(settings);
}

const MAX_AGENT_AUDIT_ENTRIES = 200;

const normalizeAgentAudit = (value: unknown): NonNullable<BrandOpsData['agentAudit']> => {
  if (!value || typeof value !== 'object') {
    return { entries: [] };
  }
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) {
    return { entries: [] };
  }
  const entries: AgentAuditEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      typeof e.at !== 'string' ||
      typeof e.source !== 'string' ||
      typeof e.action !== 'string' ||
      typeof e.ok !== 'boolean' ||
      typeof e.summary !== 'string' ||
      typeof e.commandPreview !== 'string'
    ) {
      continue;
    }
    entries.push({
      id: e.id,
      at: e.at,
      source: e.source,
      action: e.action,
      ok: e.ok,
      summary: e.summary,
      commandPreview: e.commandPreview
    });
    if (entries.length >= MAX_AGENT_AUDIT_ENTRIES) break;
  }
  return { entries: entries.slice(-MAX_AGENT_AUDIT_ENTRIES) };
};

const MAX_EMBEDDING_INDEX_ENTRIES = 48;
const MAX_EMBEDDING_VECTOR_DIM = 1536;

const normalizeEmbeddingIndex = (value: unknown): AiEmbeddingIndexState => {
  if (!value || typeof value !== 'object') {
    return { entries: [] };
  }
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) {
    return { entries: [] };
  }
  const entries: ContentItemEmbeddingRecord[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.id !== 'string' ||
      typeof r.contentLibraryItemId !== 'string' ||
      typeof r.modelId !== 'string' ||
      typeof r.textFingerprint !== 'string' ||
      typeof r.updatedAt !== 'string'
    ) {
      continue;
    }
    if (!Array.isArray(r.vector)) continue;
    const vector = r.vector
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
      .slice(0, MAX_EMBEDDING_VECTOR_DIM);
    if (vector.length === 0) continue;
    entries.push({
      id: r.id.slice(0, 160),
      contentLibraryItemId: r.contentLibraryItemId.slice(0, 160),
      modelId: r.modelId.slice(0, 128),
      dims: vector.length,
      vector,
      textFingerprint: r.textFingerprint.slice(0, 160),
      updatedAt: r.updatedAt
    });
    if (entries.length >= MAX_EMBEDDING_INDEX_ENTRIES) break;
  }
  return { entries };
};

const normalizeOperatorTraces = (value: unknown): NonNullable<BrandOpsData['operatorTraces']> => {
  if (!value || typeof value !== 'object') {
    return { entries: [] };
  }
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) {
    return { entries: [] };
  }
  const entries: OperatorTraceEntry[] = [];
  const isActor = (s: string): s is OperatorTraceEntry['source'] =>
    s === 'user' || s === 'assistant' || s === 'automation' || s === 'bridge';
  const isOutcome = (s: string): s is NonNullable<OperatorTraceEntry['outcome']> =>
    s === 'success' || s === 'failure';
  const isReview = (s: string): s is NonNullable<OperatorTraceEntry['reviewStatus']> =>
    s === 'pending' || s === 'approved' || s === 'rejected';

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      typeof e.at !== 'string' ||
      typeof e.source !== 'string' ||
      typeof e.verb !== 'string' ||
      !isActor(e.source)
    ) {
      continue;
    }
    const ent: OperatorTraceEntry = {
      id: e.id,
      at: e.at,
      source: e.source,
      verb: e.verb
    };
    if (typeof e.surface === 'string') ent.surface = e.surface;
    if (typeof e.route === 'string') ent.route = e.route;
    if (typeof e.capabilityId === 'string') ent.capabilityId = e.capabilityId;
    if (typeof e.sessionId === 'string') ent.sessionId = e.sessionId;
    if (typeof e.entityType === 'string') ent.entityType = e.entityType;
    if (typeof e.entityId === 'string') ent.entityId = e.entityId;
    if (e.details && typeof e.details === 'object' && !Array.isArray(e.details)) {
      ent.details = e.details as OperatorTraceEntry['details'];
    }
    if (typeof e.outcome === 'string' && isOutcome(e.outcome)) ent.outcome = e.outcome;
    if (Array.isArray(e.labels)) {
      ent.labels = e.labels.filter((x): x is string => typeof x === 'string');
    }
    if (typeof e.reviewStatus === 'string' && isReview(e.reviewStatus)) {
      ent.reviewStatus = e.reviewStatus;
    }
    if (typeof e.annotatorNote === 'string') ent.annotatorNote = e.annotatorNote;
    entries.push(ent);
  }
  return { entries: entries.slice(0, MAX_OPERATOR_TRACE_ENTRIES) };
};

const CHECKPOINT_TYPES: readonly CheckpointType[] = [
  'ask.question',
  'ask.response',
  'ask.artifact_generated',
  'ask.convert_to_plan_requested',
  'plan.draft_created',
  'plan.saved',
  'plan.approval_requested',
  'plan.approval_granted',
  'plan.approval_rejected',
  'plan.execution_started',
  'plan.step_executed',
  'plan.execution_completed',
  'plan.execution_blocked',
  'plan.verified',
  'tool.invocation',
  'background.operation',
  'agent.session_connected',
  'agent.event_ingested',
  'agent.achievement_detected',
  'agent.achievement_verified',
  'agent.achievement_promoted',
  'agent.context_supplied',
  'agent.artifact_proposed',
  'agent.opportunity_detected',
  'agent.action_requested'
];

const EXECUTION_STATES: readonly ExecutionState[] = [
  'IDLE',
  'UNDERSTANDING',
  'PLANNING',
  'WORKING',
  'NEEDS_APPROVAL',
  'EXECUTING',
  'VERIFYING',
  'COMPLETED',
  'BLOCKED',
  'FAILED',
  'REJECTED',
  'CANCELLED'
];

/**
 * Unconditional (not gated by `operatorTraceCollectionEnabled`, unlike `normalizeOperatorTraces`) —
 * approval-gating UI depends on this array always existing. See `checkpointStore.ts`.
 */
const normalizeCheckpoints = (value: unknown): NonNullable<BrandOpsData['checkpoints']> => {
  if (!value || typeof value !== 'object') return { entries: [] };
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return { entries: [] };

  const isActor = (s: unknown): s is Checkpoint['source'] =>
    s === 'user' || s === 'assistant' || s === 'automation' || s === 'bridge';
  const isType = (s: unknown): s is CheckpointType =>
    typeof s === 'string' && (CHECKPOINT_TYPES as readonly string[]).includes(s);
  const isState = (s: unknown): s is ExecutionState =>
    typeof s === 'string' && (EXECUTION_STATES as readonly string[]).includes(s);
  const isReview = (s: unknown): s is NonNullable<Checkpoint['approvalStatus']> =>
    s === 'pending' || s === 'approved' || s === 'rejected';

  const entries: Checkpoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      typeof e.conversationId !== 'string' ||
      typeof e.at !== 'string' ||
      typeof e.summary !== 'string' ||
      !isType(e.type) ||
      !isState(e.state) ||
      !isActor(e.source)
    ) {
      continue;
    }
    const checkpoint: Checkpoint = {
      id: e.id.slice(0, 160),
      conversationId: e.conversationId.slice(0, 160),
      type: e.type,
      state: e.state,
      at: e.at,
      summary: e.summary.slice(0, 240),
      source: e.source
    };
    if (typeof e.parentCheckpointId === 'string') {
      checkpoint.parentCheckpointId = e.parentCheckpointId.slice(0, 160);
    }
    if (typeof e.sourceMessageId === 'string') {
      checkpoint.sourceMessageId = e.sourceMessageId.slice(0, 160);
    }
    if (e.generatedArtifactRef && typeof e.generatedArtifactRef === 'object') {
      const ref = e.generatedArtifactRef as Record<string, unknown>;
      if (
        (ref.kind === 'ai_core_artifact' || ref.kind === 'trace_bundle') &&
        typeof ref.id === 'string'
      ) {
        checkpoint.generatedArtifactRef = { kind: ref.kind, id: ref.id.slice(0, 160) };
      }
    }
    if (e.associatedPlanRef && typeof e.associatedPlanRef === 'object') {
      const ref = e.associatedPlanRef as Record<string, unknown>;
      if ((ref.kind === 'draft' || ref.kind === 'saved') && typeof ref.id === 'string') {
        checkpoint.associatedPlanRef = { id: ref.id.slice(0, 160), kind: ref.kind };
      }
    }
    if (typeof e.associatedTwinId === 'string') {
      checkpoint.associatedTwinId = e.associatedTwinId.slice(0, 160);
    }
    if (e.toolRef && typeof e.toolRef === 'object') {
      const ref = e.toolRef as Record<string, unknown>;
      const toolRef: NonNullable<Checkpoint['toolRef']> = {};
      if (typeof ref.expertId === 'string') toolRef.expertId = ref.expertId as OperationalExpertId;
      if (typeof ref.integrationSourceId === 'string') {
        toolRef.integrationSourceId = ref.integrationSourceId.slice(0, 160);
      }
      if (Object.keys(toolRef).length > 0) checkpoint.toolRef = toolRef;
    }
    if (isReview(e.approvalStatus)) checkpoint.approvalStatus = e.approvalStatus;
    if (e.errorState && typeof e.errorState === 'object') {
      const err = e.errorState as Record<string, unknown>;
      if (typeof err.code === 'string' && typeof err.message === 'string') {
        checkpoint.errorState = {
          code: err.code.slice(0, 80),
          message: err.message.slice(0, 500),
          recoveryActions: Array.isArray(err.recoveryActions)
            ? (err.recoveryActions
                .filter((a): a is CheckpointActionType => typeof a === 'string')
                .slice(0, 6) as CheckpointActionType[])
            : []
        };
      }
    }
    if (typeof e.receiptRef === 'string') checkpoint.receiptRef = e.receiptRef.slice(0, 160);
    entries.push(checkpoint);
  }
  return { entries: entries.slice(0, MAX_CHECKPOINT_ENTRIES) };
};

const MAX_PLAN_WORKSPACE_PLANS = 40;
const MAX_PLAN_WORKSPACE_RECEIPTS = 80;
const PLAN_PRESETS: PlanPreset[] = [
  'outreach-plan',
  'content-plan',
  'positioning-plan',
  'buyer-persona-plan',
  'opportunity-analysis-plan',
  'workflow-plan',
  'resume-profile-improvement-plan',
  'integration-setup-plan',
  'weekly-execution-plan',
  'custom-plan'
];
const PLAN_STEP_STATUSES: PlanStepStatus[] = [
  'todo',
  'blocked',
  'ready',
  'approved',
  'done',
  'failed'
];
const SAVED_PLAN_STATUSES: SavedPlanStatus[] = [
  'draft',
  'active',
  'pending-approval',
  'opportunity',
  'approved',
  'rejected',
  'executing',
  'executed',
  'verified'
];

const normalizePlanString = (value: unknown, fallback: string, max = 500): string => {
  const clean = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return (clean || fallback).slice(0, max);
};

const normalizePlanStringArray = (value: unknown, max = 8): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.replace(/\s+/g, ' ').trim().slice(0, 320))
        .slice(0, max)
    : [];

const normalizePlanStep = (value: unknown, index: number): PlanStep | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const status = PLAN_STEP_STATUSES.includes(item.status as PlanStepStatus)
    ? (item.status as PlanStepStatus)
    : 'todo';
  return {
    id: normalizePlanString(item.id, `step-${index + 1}`, 120),
    title: normalizePlanString(item.title, `Step ${index + 1}`, 160),
    description: normalizePlanString(item.description, 'Review and complete this step.', 700),
    owner: normalizePlanString(item.owner, 'User', 120),
    ...(typeof item.platform === 'string' && item.platform.trim()
      ? { platform: item.platform.trim().slice(0, 80) }
      : {}),
    requiredInput: normalizePlanString(item.requiredInput, 'Review required input.', 300),
    approvalRequired: Boolean(item.approvalRequired),
    status
  };
};

const normalizePlanTimelineItem = (value: unknown, index: number): PlanTimelineItem | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  return {
    id: normalizePlanString(item.id, `timeline-${index + 1}`, 120),
    title: normalizePlanString(item.title, `Timeline ${index + 1}`, 160),
    description: normalizePlanString(item.description, 'Timeline checkpoint.', 500),
    timing: normalizePlanString(item.timing, 'TBD', 120)
  };
};

const normalizePlanOutputAsset = (value: unknown, index: number): PlanOutputAsset | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  return {
    id: normalizePlanString(item.id, `asset-${index + 1}`, 120),
    title: normalizePlanString(item.title, `Asset ${index + 1}`, 160),
    description: normalizePlanString(item.description, 'Draft output asset.', 500),
    ...(typeof item.platform === 'string' && item.platform.trim()
      ? { platform: item.platform.trim().slice(0, 80) }
      : {}),
    approvalRequired: Boolean(item.approvalRequired)
  };
};

const normalizePlanRisk = (value: unknown, index: number): PlanRisk | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const severity =
    item.severity === 'low' || item.severity === 'medium' || item.severity === 'high'
      ? item.severity
      : 'medium';
  return {
    id: normalizePlanString(item.id, `risk-${index + 1}`, 120),
    title: normalizePlanString(item.title, `Risk ${index + 1}`, 160),
    mitigation: normalizePlanString(item.mitigation, 'Review before execution.', 500),
    severity
  };
};

const normalizePlanNextAction = (value: unknown, index: number): PlanNextAction | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const status = PLAN_STEP_STATUSES.includes(item.status as PlanStepStatus)
    ? (item.status as PlanStepStatus)
    : 'todo';
  return {
    id: normalizePlanString(item.id, `next-${index + 1}`, 120),
    label: normalizePlanString(item.label, `Next action ${index + 1}`, 180),
    approvalRequired: Boolean(item.approvalRequired),
    status
  };
};

const PLAN_SOURCE_SURFACES = [
  'ask-my-twin',
  'agent-proposal',
  'agent-event',
  'predictive-opportunity',
  'predictive-content-ideation',
  'workflow-prediction'
] as const;

const normalizePlan = (value: unknown): Plan | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || typeof item.sourceResponseId !== 'string') return null;
  const planType = PLAN_PRESETS.includes(item.planType as PlanPreset)
    ? (item.planType as PlanPreset)
    : 'custom-plan';
  const status = SAVED_PLAN_STATUSES.includes(item.status as SavedPlanStatus)
    ? (item.status as SavedPlanStatus)
    : 'draft';
  const sourceRaw =
    item.source && typeof item.source === 'object' ? (item.source as Record<string, unknown>) : {};
  const steps = Array.isArray(item.steps)
    ? item.steps
        .map((step, index) => normalizePlanStep(step, index))
        .filter((step): step is PlanStep => Boolean(step))
        .slice(0, 20)
    : [];
  if (steps.length === 0) return null;
  return {
    id: item.id.slice(0, 160),
    title: normalizePlanString(item.title, 'Untitled plan', 180),
    summary: normalizePlanString(item.summary, 'Converted from Ask My Twin.', 600),
    objective: normalizePlanString(
      item.objective,
      'Operationalize the selected Ask response.',
      700
    ),
    planType,
    confidenceScore: asNumberInRange(item.confidenceScore, 50, 0, 100),
    sourceResponseId: item.sourceResponseId.slice(0, 160),
    assumptions: normalizePlanStringArray(item.assumptions, 12),
    missingInputs: normalizePlanStringArray(item.missingInputs, 12),
    requiredApprovals: normalizePlanStringArray(item.requiredApprovals, 12),
    steps,
    timeline: Array.isArray(item.timeline)
      ? item.timeline
          .map((row, index) => normalizePlanTimelineItem(row, index))
          .filter((row): row is PlanTimelineItem => Boolean(row))
          .slice(0, 12)
      : [],
    outputsAssets: Array.isArray(item.outputsAssets)
      ? item.outputsAssets
          .map((row, index) => normalizePlanOutputAsset(row, index))
          .filter((row): row is PlanOutputAsset => Boolean(row))
          .slice(0, 12)
      : [],
    risks: Array.isArray(item.risks)
      ? item.risks
          .map((row, index) => normalizePlanRisk(row, index))
          .filter((row): row is PlanRisk => Boolean(row))
          .slice(0, 12)
      : [],
    nextActions: Array.isArray(item.nextActions)
      ? item.nextActions
          .map((row, index) => normalizePlanNextAction(row, index))
          .filter((row): row is PlanNextAction => Boolean(row))
          .slice(0, 12)
      : [],
    status,
    source: {
      sourceSurface: PLAN_SOURCE_SURFACES.includes(
        sourceRaw.sourceSurface as (typeof PLAN_SOURCE_SURFACES)[number]
      )
        ? (sourceRaw.sourceSurface as (typeof PLAN_SOURCE_SURFACES)[number])
        : 'ask-my-twin',
      originalUserMessage: normalizePlanString(sourceRaw.originalUserMessage, '', 1000),
      aiResponse: normalizePlanString(sourceRaw.aiResponse, '', 1500),
      activeTwinId: typeof sourceRaw.activeTwinId === 'string' ? sourceRaw.activeTwinId : null,
      ...(typeof sourceRaw.activeTwinName === 'string' && sourceRaw.activeTwinName.trim()
        ? { activeTwinName: sourceRaw.activeTwinName.trim().slice(0, 160) }
        : {}),
      professionContext: normalizePlanString(
        sourceRaw.professionContext,
        'BrandOps workspace',
        500
      ),
      verifiedFactsUsed: normalizePlanStringArray(sourceRaw.verifiedFactsUsed, 12),
      unverifiedMissingFacts: normalizePlanStringArray(sourceRaw.unverifiedMissingFacts, 12),
      timestamp: asIsoString(sourceRaw.timestamp, new Date().toISOString()),
      conversationId: normalizePlanString(sourceRaw.conversationId, 'local-chat', 160),
      messageId: normalizePlanString(sourceRaw.messageId, item.sourceResponseId, 160)
    },
    estimatedEffort: normalizePlanString(item.estimatedEffort, 'Needs review', 120),
    expectedOutput: normalizePlanString(item.expectedOutput, 'Structured plan draft', 240),
    ...(item.thoughtTree && typeof item.thoughtTree === 'object'
      ? { thoughtTree: item.thoughtTree as Plan['thoughtTree'] }
      : {}),
    savedAt: asIsoString(item.savedAt, new Date().toISOString()),
    receiptId: normalizePlanString(item.receiptId, `receipt-${item.id}`, 160)
  };
};

const normalizePlanReceipt = (value: unknown): PlanReceipt | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || typeof item.planId !== 'string') return null;
  const planType = PLAN_PRESETS.includes(item.planType as PlanPreset)
    ? (item.planType as PlanPreset)
    : 'custom-plan';
  return {
    id: item.id.slice(0, 160),
    planId: item.planId.slice(0, 160),
    convertedFrom:
      typeof item.convertedFrom === 'string' && item.convertedFrom.trim()
        ? item.convertedFrom.trim().slice(0, 80)
        : 'Ask',
    planType,
    sourceMessageId: normalizePlanString(item.sourceMessageId, '', 160),
    generatedSteps: normalizePlanStringArray(item.generatedSteps, 20),
    userAction:
      item.userAction === 'regenerate-preview' || item.userAction === 'cancel-preview'
        ? item.userAction
        : 'save-plan',
    timestamp: asIsoString(item.timestamp, new Date().toISOString()),
    summary: normalizePlanString(item.summary, 'Converted from Ask My Twin.', 500)
  };
};

const normalizePlanWorkspace = (value: unknown): PlanWorkspaceState => {
  const nowIso = new Date().toISOString();
  if (!value || typeof value !== 'object') {
    return { plans: [], receipts: [], updatedAt: nowIso };
  }
  const raw = value as Record<string, unknown>;
  const plans = Array.isArray(raw.plans)
    ? raw.plans
        .map(normalizePlan)
        .filter((plan): plan is Plan => Boolean(plan))
        .slice(0, MAX_PLAN_WORKSPACE_PLANS)
    : [];
  const receipts = Array.isArray(raw.receipts)
    ? raw.receipts
        .map(normalizePlanReceipt)
        .filter((receipt): receipt is PlanReceipt => Boolean(receipt))
        .slice(0, MAX_PLAN_WORKSPACE_RECEIPTS)
    : [];
  return {
    plans,
    receipts,
    updatedAt: asIsoString(raw.updatedAt, nowIso)
  };
};

const normalizeAiAssistantTraces = (
  value: unknown
): NonNullable<BrandOpsData['aiAssistantTraces']> => {
  if (!value || typeof value !== 'object') {
    return { entries: [] };
  }
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) {
    return { entries: [] };
  }
  const entries: AiAssistantTurnTrace[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (typeof e.id !== 'string' || typeof e.at !== 'string') continue;
    const surface = e.surface;
    const outcome = e.outcome;
    if (
      surface !== 'assistant_chat' &&
      surface !== 'linkedin_overlay' &&
      surface !== 'workspace_automation'
    ) {
      continue;
    }
    if (outcome !== 'success' && outcome !== 'failure') continue;
    const orphanMarkers = Array.isArray(e.orphan_inline_markers)
      ? sanitizeOrphanInlineMarkers(
          e.orphan_inline_markers.filter((x): x is string => typeof x === 'string')
        )
      : [];
    entries.push({
      id: e.id,
      at: e.at,
      trace_schema_version:
        typeof e.trace_schema_version === 'string' && e.trace_schema_version.trim().length > 0
          ? e.trace_schema_version.trim().slice(0, 48)
          : AI_IO_TRACE_SCHEMA_VERSION,
      surface,
      outcome,
      message_id: typeof e.message_id === 'string' ? e.message_id.trim().slice(0, 160) : undefined,
      user_turn_preview:
        typeof e.user_turn_preview === 'string' ? e.user_turn_preview.slice(0, 920) : '',
      assistant_preview:
        typeof e.assistant_preview === 'string' ? e.assistant_preview.slice(0, 920) : '',
      citations: sanitizeAiCitationChunks(e.citations),
      ...(orphanMarkers.length ? { orphan_inline_markers: orphanMarkers } : {}),
      model_id: typeof e.model_id === 'string' ? e.model_id.trim().slice(0, 160) : undefined,
      worker_id: typeof e.worker_id === 'string' ? e.worker_id.trim().slice(0, 160) : undefined,
      duration_ms:
        typeof e.duration_ms === 'number' && Number.isFinite(e.duration_ms)
          ? Math.round(e.duration_ms)
          : undefined
    });
  }
  return { entries: entries.slice(0, MAX_AI_ASSISTANT_TURN_TRACES) };
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

const normalizeAiTraceGraph = (value: unknown): BrandOpsData['aiTraceGraph'] => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = (value as { bundles?: unknown }).bundles;
  if (!Array.isArray(raw)) return undefined;
  const bundles: TraceBundle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Partial<TraceBundle>;
    if (typeof b.trace_id !== 'string' || typeof b.created_at !== 'string') continue;
    if (!b.trace_id.trim() || !b.created_at.trim()) continue;
    bundles.push(sanitizeTraceBundle(b as TraceBundle));
    if (bundles.length >= MAX_AI_TRACE_BUNDLES) break;
  }
  if (!bundles.length) return undefined;
  return {
    schema_version: AI_TRACE_GRAPH_SCHEMA_VERSION,
    bundles
  };
};

const CONNECTED_IDENTITY_SIGNAL_SOURCES = new Set<ConnectedIdentitySignalSource>([
  'linkedin',
  'gmail',
  'google-calendar',
  'notion',
  'slack',
  'content',
  'workflow',
  'integration-hub'
]);

const CONNECTED_IDENTITY_SIGNAL_KINDS = new Set<ConnectedIdentitySignalKind>([
  'professional_positioning',
  'communication_tone',
  'operational_schedule',
  'knowledge_memory',
  'team_collaboration_style',
  'content_pattern',
  'workflow_behavior',
  'operational_habit'
]);

const normalizeConnectedIdentityEngine = (
  value: unknown,
  consentGranted: boolean
): ConnectedIdentityEngineState => {
  const fallback: ConnectedIdentityEngineState = {
    schemaVersion: 1,
    consentGranted,
    lastUpdatedAt: null,
    signals: [],
    sensitiveDataPolicy:
      'Connected Identity Engine is opt-in. It may derive identity signals from local metadata, summaries, and approved traces, but it must not automatically ingest raw private messages, files, or calendar details.',
    blockedPrivateSources: ['gmail', 'google-calendar', 'slack', 'notion']
  };
  if (!value || typeof value !== 'object') return fallback;
  const v = value as Partial<ConnectedIdentityEngineState> & Record<string, unknown>;
  const signals: ConnectedIdentitySignal[] = Array.isArray(v.signals)
    ? v.signals
        .slice(0, 80)
        .map((raw, i): ConnectedIdentitySignal | null => {
          if (!raw || typeof raw !== 'object') return null;
          const item = raw as unknown as Record<string, unknown>;
          const source =
            typeof item.source === 'string' &&
            CONNECTED_IDENTITY_SIGNAL_SOURCES.has(item.source as ConnectedIdentitySignalSource)
              ? (item.source as ConnectedIdentitySignalSource)
              : null;
          const kind =
            typeof item.kind === 'string' &&
            CONNECTED_IDENTITY_SIGNAL_KINDS.has(item.kind as ConnectedIdentitySignalKind)
              ? (item.kind as ConnectedIdentitySignalKind)
              : null;
          if (!source || !kind) return null;
          return {
            id:
              typeof item.id === 'string' && item.id.trim()
                ? item.id.trim().slice(0, 160)
                : `cis-${i}`,
            source,
            kind,
            summary: asTrimmedString(item.summary, '').slice(0, 500),
            evidence: asStringArray(item.evidence).slice(0, 10),
            confidence: asNumberInRange(item.confidence, 0, 0, 100),
            sensitivity:
              item.sensitivity === 'user_approved_summary' ||
              item.sensitivity === 'private_data_blocked'
                ? item.sensitivity
                : 'metadata_only',
            lastObservedAt: asIsoString(item.lastObservedAt, new Date().toISOString())
          };
        })
        .filter((item): item is ConnectedIdentitySignal => Boolean(item))
    : [];
  return {
    schemaVersion: 1,
    consentGranted,
    lastUpdatedAt:
      typeof v.lastUpdatedAt === 'string' && v.lastUpdatedAt.trim()
        ? asIsoString(v.lastUpdatedAt, new Date().toISOString())
        : null,
    signals,
    sensitiveDataPolicy:
      typeof v.sensitiveDataPolicy === 'string' && v.sensitiveDataPolicy.trim()
        ? v.sensitiveDataPolicy.trim().slice(0, 800)
        : fallback.sensitiveDataPolicy,
    blockedPrivateSources: Array.isArray(v.blockedPrivateSources)
      ? v.blockedPrivateSources
          .filter(
            (source): source is ConnectedIdentitySignalSource =>
              typeof source === 'string' &&
              CONNECTED_IDENTITY_SIGNAL_SOURCES.has(source as ConnectedIdentitySignalSource)
          )
          .slice(0, 12)
      : fallback.blockedPrivateSources
  };
};

const asFactStatus = (value: unknown): TwinFactStatus =>
  value === 'verified' || value === 'rejected' ? value : 'unverified';

const asTwinActionType = (value: unknown): TwinSupportedActionType | null =>
  typeof value === 'string' && SUPPORTED_TWIN_ACTIONS.includes(value as TwinSupportedActionType)
    ? (value as TwinSupportedActionType)
    : null;

const normalizeDigitalTwin = (value: unknown): DigitalTwin | null => {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<DigitalTwin> & Record<string, unknown>;
  if (typeof v.id !== 'string' || !v.id.trim()) return null;
  const nowIso = new Date().toISOString();
  const identity =
    v.identity && typeof v.identity === 'object'
      ? (v.identity as unknown as Record<string, unknown>)
      : {};
  const resumeProfile =
    v.resumeProfile && typeof v.resumeProfile === 'object'
      ? (v.resumeProfile as unknown as Record<string, unknown>)
      : {};
  const contactInfo =
    resumeProfile.contactInfo && typeof resumeProfile.contactInfo === 'object'
      ? (resumeProfile.contactInfo as Record<string, unknown>)
      : {};
  const memory =
    v.memory && typeof v.memory === 'object'
      ? (v.memory as unknown as Record<string, unknown>)
      : {};
  const actions =
    v.actions && typeof v.actions === 'object'
      ? (v.actions as unknown as Record<string, unknown>)
      : {};
  return {
    id: v.id.trim().slice(0, 120),
    ownerUserId:
      typeof v.ownerUserId === 'string' && v.ownerUserId.trim()
        ? v.ownerUserId.trim().slice(0, 160)
        : 'local-owner',
    workspaceId:
      typeof v.workspaceId === 'string' && v.workspaceId.trim()
        ? v.workspaceId.trim().slice(0, 160)
        : 'local-workspace',
    displayName: asTrimmedString(v.displayName, 'Digital Twin').slice(0, 120),
    sourceType:
      v.sourceType === 'resume' ||
      v.sourceType === 'linkedin' ||
      v.sourceType === 'portfolio' ||
      v.sourceType === 'brand' ||
      v.sourceType === 'manual'
        ? v.sourceType
        : 'manual',
    status:
      v.status === 'draft' ||
      v.status === 'processing' ||
      v.status === 'ready' ||
      v.status === 'needs_review' ||
      v.status === 'failed'
        ? v.status
        : 'needs_review',
    confidenceScore: asNumberInRange(v.confidenceScore, 0, 0, 100),
    createdAt: asIsoString(v.createdAt, nowIso),
    updatedAt: asIsoString(v.updatedAt, nowIso),
    identity: {
      headline: asTrimmedString(identity.headline, '').slice(0, 220),
      summary: asTrimmedString(identity.summary, '').slice(0, 1200),
      professionalPositioning: asTrimmedString(identity.professionalPositioning, '').slice(0, 500),
      targetAudience: asTrimmedString(identity.targetAudience, '').slice(0, 360),
      goals: asStringArray(identity.goals).slice(0, 12),
      toneOfVoice: asTrimmedString(identity.toneOfVoice, '').slice(0, 500),
      strengths: asStringArray(identity.strengths).slice(0, 24),
      differentiators: asStringArray(identity.differentiators).slice(0, 18)
    },
    resumeProfile: {
      contactInfo: {
        name: typeof contactInfo.name === 'string' ? contactInfo.name.slice(0, 160) : undefined,
        email: typeof contactInfo.email === 'string' ? contactInfo.email.slice(0, 180) : undefined,
        phone: typeof contactInfo.phone === 'string' ? contactInfo.phone.slice(0, 80) : undefined,
        location:
          typeof contactInfo.location === 'string' ? contactInfo.location.slice(0, 160) : undefined,
        links: asStringArray(contactInfo.links).slice(0, 12)
      },
      experience: Array.isArray(resumeProfile.experience)
        ? resumeProfile.experience.slice(0, 24).map((rawItem, i) => {
            const item =
              rawItem && typeof rawItem === 'object' ? (rawItem as Record<string, unknown>) : {};
            return {
              id: typeof item.id === 'string' ? item.id : `exp-${i}`,
              role: asTrimmedString(item.role, '').slice(0, 160),
              organization: asTrimmedString(item.organization, '').slice(0, 160),
              timeframe: asTrimmedString(item.timeframe, '').slice(0, 120),
              highlights: asStringArray(item.highlights).slice(0, 12),
              verificationStatus: asFactStatus(item.verificationStatus)
            };
          })
        : [],
      education: Array.isArray(resumeProfile.education)
        ? resumeProfile.education.slice(0, 16).map((rawItem, i) => {
            const item =
              rawItem && typeof rawItem === 'object' ? (rawItem as Record<string, unknown>) : {};
            return {
              id: typeof item.id === 'string' ? item.id : `edu-${i}`,
              institution: asTrimmedString(item.institution, '').slice(0, 180),
              credential: asTrimmedString(item.credential, '').slice(0, 180),
              timeframe: asTrimmedString(item.timeframe, '').slice(0, 120),
              verificationStatus: asFactStatus(item.verificationStatus)
            };
          })
        : [],
      skills: asStringArray(resumeProfile.skills).slice(0, 80),
      certifications: asStringArray(resumeProfile.certifications).slice(0, 40),
      projects: Array.isArray(resumeProfile.projects)
        ? resumeProfile.projects.slice(0, 24).map((rawItem, i) => {
            const item =
              rawItem && typeof rawItem === 'object' ? (rawItem as Record<string, unknown>) : {};
            return {
              id: typeof item.id === 'string' ? item.id : `proj-${i}`,
              name: asTrimmedString(item.name, '').slice(0, 180),
              summary: asTrimmedString(item.summary, '').slice(0, 600),
              tools: asStringArray(item.tools).slice(0, 20),
              verificationStatus: asFactStatus(item.verificationStatus)
            };
          })
        : [],
      achievements: asStringArray(resumeProfile.achievements).slice(0, 80),
      industries: asStringArray(resumeProfile.industries).slice(0, 40),
      tools: asStringArray(resumeProfile.tools).slice(0, 60),
      keywords: asStringArray(resumeProfile.keywords).slice(0, 120)
    },
    memory: {
      facts: asStringArray(memory.facts).slice(0, 100),
      preferences: asStringArray(memory.preferences).slice(0, 60),
      voiceExamples: asStringArray(memory.voiceExamples).slice(0, 30),
      approvedClaims: asStringArray(memory.approvedClaims).slice(0, 80),
      rejectedClaims: asStringArray(memory.rejectedClaims).slice(0, 80),
      missingInfo: asStringArray(memory.missingInfo).slice(0, 60)
    },
    actions: {
      supportedActionTypes: Array.isArray(actions.supportedActionTypes)
        ? actions.supportedActionTypes
            .map(asTwinActionType)
            .filter((x): x is TwinSupportedActionType => Boolean(x))
        : SUPPORTED_TWIN_ACTIONS,
      generatedAssets: Array.isArray(actions.generatedAssets)
        ? actions.generatedAssets.slice(0, 80).map((rawAsset, i) => {
            const asset =
              rawAsset && typeof rawAsset === 'object' ? (rawAsset as Record<string, unknown>) : {};
            return {
              id: typeof asset.id === 'string' ? asset.id : `asset-${i}`,
              actionType: asTwinActionType(asset.actionType) ?? 'summarize_resume',
              title: asTrimmedString(asset.title, 'Generated twin asset').slice(0, 180),
              body: asTrimmedString(asset.body, '').slice(0, 20_000),
              createdAt: asIsoString(asset.createdAt, nowIso)
            };
          })
        : [],
      pendingApprovals: Array.isArray(actions.pendingApprovals)
        ? actions.pendingApprovals.slice(0, 40).map((rawApproval, i) => {
            const approval =
              rawApproval && typeof rawApproval === 'object'
                ? (rawApproval as Record<string, unknown>)
                : {};
            return {
              id: typeof approval.id === 'string' ? approval.id : `approval-${i}`,
              actionType: asTwinActionType(approval.actionType) ?? 'summarize_resume',
              summary: asTrimmedString(approval.summary, '').slice(0, 600),
              createdAt: asIsoString(approval.createdAt, nowIso)
            };
          })
        : [],
      auditTrail: Array.isArray(actions.auditTrail)
        ? actions.auditTrail.slice(0, 120).map((rawEntry, i) => {
            const entry =
              rawEntry && typeof rawEntry === 'object' ? (rawEntry as Record<string, unknown>) : {};
            return {
              id: typeof entry.id === 'string' ? entry.id : `audit-${i}`,
              at: asIsoString(entry.at, nowIso),
              action: asTrimmedString(entry.action, 'twin_action').slice(0, 120),
              summary: asTrimmedString(entry.summary, '').slice(0, 800)
            };
          })
        : []
    }
  };
};

const normalizeDigitalTwinState = (value: unknown): DigitalTwinState => {
  if (!value || typeof value !== 'object') return { activeTwinId: null, twins: [] };
  const v = value as Partial<DigitalTwinState>;
  const twins = Array.isArray(v.twins)
    ? v.twins
        .map(normalizeDigitalTwin)
        .filter((t): t is DigitalTwin => Boolean(t))
        .slice(0, 12)
    : [];
  const requestedActive = typeof v.activeTwinId === 'string' ? v.activeTwinId : null;
  return {
    activeTwinId: twins.some((t) => t.id === requestedActive)
      ? requestedActive
      : (twins[0]?.id ?? null),
    twins
  };
};

const isAgentClientKind = (s: unknown): s is ExternalAgentClientKind =>
  typeof s === 'string' && EXTERNAL_AGENT_CLIENT_KINDS.includes(s as ExternalAgentClientKind);

const isContextBundleId = (s: unknown): s is ContextBundleId =>
  typeof s === 'string' && CONTEXT_BUNDLE_IDS.includes(s as ContextBundleId);

const isAgentCapabilityId = (s: unknown): s is AgentCapabilityId =>
  typeof s === 'string' && AGENT_CAPABILITY_IDS.includes(s as AgentCapabilityId);

const isTrustTier = (s: unknown): s is TrustTier =>
  typeof s === 'string' &&
  [
    'USER_VERIFIED',
    'BRANDOPS_VERIFIED',
    'AGENT_REPORTED',
    'EXTERNAL_SOURCE',
    'MODEL_INFERRED',
    'UNKNOWN'
  ].includes(s);

const isAgentEventStatus = (s: unknown): s is ExternalAgentEventStatus =>
  typeof s === 'string' && ['proposed', 'reviewed', 'verified', 'rejected', 'promoted'].includes(s);

const isAgentEventKind = (s: unknown): s is ExternalAgentEventKind =>
  typeof s === 'string' && EXTERNAL_AGENT_EVENT_KINDS.includes(s as ExternalAgentEventKind);

const isAgentProposalStatus = (s: unknown): s is AgentProposalStatus =>
  typeof s === 'string' && ['pending', 'approved', 'rejected', 'superseded'].includes(s);

const normalizeAgentSessions = (value: unknown): ExternalAgentSessionsState => {
  if (!value || typeof value !== 'object') return { entries: [], updatedAt: '' };
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return { entries: [], updatedAt: '' };
  const nowIso = new Date().toISOString();
  const entries = raw.slice(0, MAX_AGENT_SESSIONS).flatMap((item): ExternalAgentSession[] => {
    if (!item || typeof item !== 'object') return [];
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      typeof e.ownerUserId !== 'string' ||
      typeof e.workspaceId !== 'string' ||
      typeof e.tokenHash !== 'string' ||
      !isAgentClientKind(e.clientKind)
    ) {
      return [];
    }
    const session: ExternalAgentSession = {
      id: e.id.slice(0, 160),
      ownerUserId: e.ownerUserId.slice(0, 160),
      workspaceId: e.workspaceId.slice(0, 160),
      clientKind: e.clientKind,
      clientName: typeof e.clientName === 'string' ? e.clientName.slice(0, 120) : e.clientKind,
      tokenHash: e.tokenHash.slice(0, 128),
      status: e.status === 'revoked' ? 'revoked' : 'active',
      grantedBundles: Array.isArray(e.grantedBundles)
        ? e.grantedBundles.filter(isContextBundleId).slice(0, CONTEXT_BUNDLE_IDS.length)
        : [],
      grantedCapabilities: Array.isArray(e.grantedCapabilities)
        ? e.grantedCapabilities.filter(isAgentCapabilityId).slice(0, AGENT_CAPABILITY_IDS.length)
        : [],
      createdAt: asIsoString(e.createdAt, nowIso),
      lastActivityAt: asIsoString(e.lastActivityAt, nowIso)
    };
    if (typeof e.revokedAt === 'string') session.revokedAt = e.revokedAt;
    if (typeof e.expiresAt === 'string') session.expiresAt = e.expiresAt;
    // An operator-set trust ceiling must survive a reload, or a session that
    // was deliberately capped silently regains its full grants on next boot.
    if (
      e.trustCeiling === 'NONE' ||
      e.trustCeiling === 'READ_ONLY' ||
      e.trustCeiling === 'CONTEXT_CONSUMER' ||
      e.trustCeiling === 'PROPOSER' ||
      e.trustCeiling === 'ACTION_REQUESTER'
    ) {
      session.trustCeiling = e.trustCeiling;
    }
    return [session];
  });
  return {
    entries,
    updatedAt: asIsoString((value as { updatedAt?: unknown }).updatedAt, nowIso)
  };
};

const normalizeAgentEvents = (value: unknown): ExternalAgentEventsState => {
  if (!value || typeof value !== 'object') return { entries: [], updatedAt: '' };
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return { entries: [], updatedAt: '' };
  const nowIso = new Date().toISOString();
  const entries = raw.slice(0, MAX_AGENT_EVENTS).flatMap((item): ExternalAgentEvent[] => {
    if (!item || typeof item !== 'object') return [];
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      typeof e.sessionId !== 'string' ||
      typeof e.title !== 'string' ||
      typeof e.detail !== 'string' ||
      typeof e.dedupeKey !== 'string' ||
      !isAgentClientKind(e.clientKind) ||
      !isAgentEventKind(e.kind)
    ) {
      return [];
    }
    const event: ExternalAgentEvent = {
      id: e.id.slice(0, 160),
      sessionId: e.sessionId.slice(0, 160),
      clientKind: e.clientKind,
      kind: e.kind,
      title: e.title.slice(0, 300),
      detail: e.detail.slice(0, 4000),
      evidence: Array.isArray(e.evidence)
        ? e.evidence.slice(0, 12).flatMap((rawRef): ExternalAgentEvent['evidence'] => {
            if (!rawRef || typeof rawRef !== 'object') return [];
            const ref = rawRef as Record<string, unknown>;
            if (typeof ref.ref !== 'string' || typeof ref.label !== 'string') return [];
            const kind =
              ref.kind === 'git' ||
              ref.kind === 'release' ||
              ref.kind === 'document' ||
              ref.kind === 'milestone' ||
              ref.kind === 'link' ||
              ref.kind === 'other'
                ? ref.kind
                : 'other';
            return [{ ref: ref.ref.slice(0, 240), kind, label: ref.label.slice(0, 200) }];
          })
        : [],
      dedupeKey: e.dedupeKey.slice(0, 320),
      status: isAgentEventStatus(e.status) ? e.status : 'proposed',
      trustTier: isTrustTier(e.trustTier) ? e.trustTier : 'AGENT_REPORTED',
      sourceRef: typeof e.sourceRef === 'string' ? e.sourceRef.slice(0, 240) : '',
      createdAt: asIsoString(e.createdAt, nowIso)
    };
    if (typeof e.reviewedAt === 'string') event.reviewedAt = e.reviewedAt;
    if (typeof e.verifiedAt === 'string') event.verifiedAt = e.verifiedAt;
    if (typeof e.rejectedAt === 'string') event.rejectedAt = e.rejectedAt;
    if (typeof e.promotedAt === 'string') event.promotedAt = e.promotedAt;
    if (typeof e.originCheckpointId === 'string') event.originCheckpointId = e.originCheckpointId;
    if (typeof e.convertedPlanId === 'string') event.convertedPlanId = e.convertedPlanId;
    return [event];
  });
  return {
    entries,
    updatedAt: asIsoString((value as { updatedAt?: unknown }).updatedAt, nowIso)
  };
};

const normalizeAgentProposals = (value: unknown): AgentProposalsState => {
  if (!value || typeof value !== 'object') return { entries: [], updatedAt: '' };
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return { entries: [], updatedAt: '' };
  const nowIso = new Date().toISOString();
  const entries = raw.slice(0, MAX_AGENT_PROPOSALS).flatMap((item): AgentProposal[] => {
    if (!item || typeof item !== 'object') return [];
    const e = item as Record<string, unknown>;
    if (typeof e.id !== 'string' || typeof e.title !== 'string' || typeof e.detail !== 'string') {
      return [];
    }
    const kind =
      e.kind === 'twin_update' ||
      e.kind === 'artifact' ||
      e.kind === 'content_opportunity' ||
      e.kind === 'external_action' ||
      e.kind === 'promotion'
        ? e.kind
        : 'external_action';
    const tier =
      e.tier === 'READ' ||
      e.tier === 'GENERATE' ||
      e.tier === 'PREPARE' ||
      e.tier === 'EXTERNAL_ACTION' ||
      e.tier === 'SENSITIVE_ACTION'
        ? e.tier
        : 'PREPARE';
    const proposal: AgentProposal = {
      id: e.id.slice(0, 160),
      kind,
      sessionId: typeof e.sessionId === 'string' ? e.sessionId.slice(0, 160) : undefined,
      title: e.title.slice(0, 300),
      detail: e.detail.slice(0, 4000),
      rationale:
        typeof e.rationale === 'string'
          ? e.rationale.slice(0, 1000)
          : 'Legacy proposal (pre-rationale schema).',
      status: isAgentProposalStatus(e.status) ? e.status : 'pending',
      tier,
      checkpointId: typeof e.checkpointId === 'string' ? e.checkpointId.slice(0, 160) : undefined,
      // A promotion proposal is worthless after a reload without its target: the
      // approval surface would show a request nobody could act on.
      promotion:
        e.promotion &&
        typeof e.promotion === 'object' &&
        ((e.promotion as Record<string, unknown>).action === 'verify-achievement' ||
          (e.promotion as Record<string, unknown>).action === 'accept-twin-proposal') &&
        typeof (e.promotion as Record<string, unknown>).targetId === 'string'
          ? {
              action: (e.promotion as { action: 'verify-achievement' | 'accept-twin-proposal' })
                .action,
              targetId: String((e.promotion as { targetId: string }).targetId).slice(0, 160)
            }
          : undefined,
      createdAt: asIsoString(e.createdAt, nowIso),
      updatedAt: asIsoString(e.updatedAt, nowIso)
    };
    if (typeof e.planId === 'string') proposal.planId = e.planId;
    // MCP task handle for execution requests — must survive the round trip or a
    // task the agent is polling becomes unreachable after a reload.
    if (typeof e.taskId === 'string') proposal.taskId = e.taskId.slice(0, 160);
    if (typeof e.decidedAt === 'string') proposal.decidedAt = e.decidedAt;
    if (typeof e.relatedEventId === 'string') proposal.relatedEventId = e.relatedEventId;
    if (
      e.twinMemoryType === 'approvedClaims' ||
      e.twinMemoryType === 'rejectedClaims' ||
      e.twinMemoryType === 'none'
    ) {
      proposal.twinMemoryType = e.twinMemoryType;
    }
    if (typeof e.approvedClaimText === 'string') proposal.approvedClaimText = e.approvedClaimText;
    if (
      e.externalAction &&
      typeof e.externalAction === 'object' &&
      'action' in e.externalAction &&
      'target' in e.externalAction &&
      'summary' in e.externalAction
    ) {
      proposal.externalAction = e.externalAction as AgentProposal['externalAction'];
    }
    if (
      e.artifact &&
      typeof e.artifact === 'object' &&
      'title' in e.artifact &&
      'artifactType' in e.artifact &&
      'summary' in e.artifact &&
      'tags' in e.artifact
    ) {
      proposal.artifact = e.artifact as AgentProposal['artifact'];
    }
    if (e.contentOpportunity && typeof e.contentOpportunity === 'object') {
      proposal.contentOpportunity = e.contentOpportunity as AgentProposal['contentOpportunity'];
    }
    return [proposal];
  });
  return {
    entries,
    updatedAt: asIsoString((value as { updatedAt?: unknown }).updatedAt, nowIso)
  };
};

const normalizeExternalAgentAudit = (value: unknown): ExternalAgentAuditState => {
  if (!value || typeof value !== 'object') return { entries: [], updatedAt: '' };
  const raw = (value as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return { entries: [], updatedAt: '' };
  const nowIso = new Date().toISOString();
  const entries = raw.slice(0, MAX_AUDIT_ENTRIES).flatMap((item): ExternalAgentAuditEntry[] => {
    if (!item || typeof item !== 'object') return [];
    const e = item as Record<string, unknown>;
    if (
      typeof e.id !== 'string' ||
      typeof e.sessionId !== 'string' ||
      typeof e.operation !== 'string' ||
      !isAgentClientKind(e.clientKind) ||
      !isAgentCapabilityId(e.capabilityId)
    ) {
      return [];
    }
    const entry: ExternalAgentAuditEntry = {
      id: e.id.slice(0, 160),
      at: asIsoString(e.at, nowIso),
      sessionId: e.sessionId.slice(0, 160),
      clientKind: e.clientKind,
      capabilityId: e.capabilityId,
      operation: e.operation.slice(0, 120),
      ok: e.ok !== false,
      summary: typeof e.summary === 'string' ? e.summary.slice(0, 600) : '',
      requestPreview: typeof e.requestPreview === 'string' ? e.requestPreview.slice(0, 200) : ''
    };
    if (typeof e.errorCode === 'string') entry.errorCode = e.errorCode;
    if (typeof e.latencyMs === 'number' && Number.isFinite(e.latencyMs))
      entry.latencyMs = e.latencyMs;
    return [entry];
  });
  return {
    entries,
    updatedAt: asIsoString((value as { updatedAt?: unknown }).updatedAt, nowIso)
  };
};

export const withDefaults = (base: BrandOpsData): BrandOpsData => {
  const normalized: BrandOpsData = {
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
    agentAudit: normalizeAgentAudit(base.agentAudit),
    operatorTraces: normalizeOperatorTraces(base.operatorTraces),
    aiAssistantTraces: normalizeAiAssistantTraces(base.aiAssistantTraces),
    aiTraceGraph: normalizeAiTraceGraph(base.aiTraceGraph),
    aiPipelineRuns: normalizeAiPipelineRuns(base.aiPipelineRuns),
    aiCore: normalizeBrandOpsAICoreState(base.aiCore),
    operatingTimeline: normalizeOperatingTimelineState(base.operatingTimeline),
    workspaceIntelligence: normalizeWorkspaceIntelligenceState(base.workspaceIntelligence),
    digitalTwins: normalizeDigitalTwinState(base.digitalTwins),
    connectedIdentityEngine: normalizeConnectedIdentityEngine(
      base.connectedIdentityEngine,
      Boolean(base.settings?.connectedIdentityLearningEnabled)
    ),
    planWorkspace: normalizePlanWorkspace(base.planWorkspace),
    checkpoints: normalizeCheckpoints(base.checkpoints),
    externalAgentSessions: normalizeAgentSessions(base.externalAgentSessions),
    externalAgentEvents: normalizeAgentEvents(base.externalAgentEvents),
    agentProposals: normalizeAgentProposals(base.agentProposals),
    externalAgentAudit: normalizeExternalAgentAudit(base.externalAgentAudit),
    embeddingIndex: normalizeEmbeddingIndex(base.embeddingIndex),
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
        typeof base.seed?.onboardingVersion === 'string' &&
        base.seed.onboardingVersion.trim().length > 0
          ? base.seed.onboardingVersion
          : seedData.seed.onboardingVersion,
      /** Legacy guest/demo timestamp is no longer persisted; account access is local preview state. */
      guestSessionAt: undefined,
      previewMagicSignInAt:
        typeof base.seed?.previewMagicSignInAt === 'string' &&
        base.seed.previewMagicSignInAt.length > 0
          ? base.seed.previewMagicSignInAt
          : undefined
    }
  };

  return {
    ...normalized,
    workspaceIntelligence: buildWorkspaceIntelligenceState(normalized)
  };
};

const isBrandOpsData = (value: unknown): value is BrandOpsData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BrandOpsData>;
  return (
    Array.isArray(candidate.publishingQueue) &&
    Array.isArray(candidate.contentLibrary) &&
    Array.isArray(candidate.contacts) &&
    Array.isArray(candidate.opportunities) &&
    Boolean(candidate.settings)
  );
};

const createSeededWorkspace = () => withDefaults(withFreshSeedMetadata(seedData));

/**
 * Runtime storage injection point. The default is the browser adapter; a Node
 * MCP server swaps in a file-backed adapter so the exact same `storageService`
 * (and its normalization/isBrandOpsData guards) backs both the UI and the
 * external-agent protocol — one source of truth, no duplicated backends.
 */
let activeStorage: StorageAdapter = browserLocalStorage;

export function configureStorageAdapter(adapter: StorageAdapter): void {
  activeStorage = adapter;
}

export function getActiveStorageAdapter(): StorageAdapter {
  return activeStorage;
}

/**
 * In-memory default workspace (no I/O). Lets the mobile shell render Cockpit, Settings, and Integrations
 * immediately; `getData()` then replaces the snapshot with persisted data when ready.
 */
export function createInMemorySeededWorkspace(): BrandOpsData {
  return withDefaults(withFreshSeedMetadata(seedData));
}

/**
 * Typed failure surfaced when the underlying storage adapter cannot persist a
 * write (quota exceeded, IO error, denied permission). Lets callers distinguish
 * a real storage failure from malformed/corrupt payload handling without
 * catching bare `Error` and re-scanning message text for evidence.
 */
export class StorageWriteError extends Error {
  constructor(
    message: string,
    readonly key: string
  ) {
    super(message);
    this.name = 'StorageWriteError';
  }
}

/**
 * Persist a normalized workspace blob, translating any adapter-level write
 * failure into a typed `StorageWriteError`. The normalized value is never
 * partially stored by this layer: either the adapter persists it whole or we
 * surface the failure (fail-closed) so callers never mistake a silent IO error
 * for a successful write.
 */
const persistWorkspace = async (value: BrandOpsData): Promise<void> => {
  try {
    await activeStorage.set(DATA_KEY, value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new StorageWriteError(`Failed to persist workspace: ${detail}`, DATA_KEY);
  }
};

/**
 * Read the raw persisted blob plus a normalized copy. Seeding (first boot) and
 * self-healing of a corrupt blob write here and only here, so a plain read never
 * re-persists the whole workspace (removes the old unconditional write-on-read).
 */
const readWorkspace = async (): Promise<{ raw: unknown; data: BrandOpsData }> => {
  try {
    const raw = await activeStorage.get<unknown>(DATA_KEY);
    if (isBrandOpsData(raw)) {
      return { raw, data: withDefaults(raw) };
    }
  } catch {
    // Corrupt storage should recover into a valid seeded workspace.
  }

  const seeded = createSeededWorkspace();
  try {
    await activeStorage.set(DATA_KEY, seeded);
  } catch {
    // Persistence is unavailable (quota/IO). Still hand the caller a valid,
    // normalized in-memory workspace so the app can boot rather than bricking
    // the whole read on a failing write.
  }
  return { raw: seeded, data: seeded };
};

const rawMatches = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

export const storageService = {
  async getData(): Promise<BrandOpsData> {
    const { data } = await readWorkspace();
    return data;
  },

  /**
   * Read → mutate → persist with optimistic concurrency. Mutators must be pure
   * (`(data) => data`, returning the same reference for "no change"). Before
   * writing, the stored blob is re-read; if a concurrent writer (another
   * extension realm, e.g. the background service worker) landed in between, the
   * mutator is re-applied against the fresh state and retried (bounded). This
   * converts whole-blob last-write-wins clobbering into rebase-and-retry.
   * `chrome.storage.local` has no atomic compare-and-swap, so the final write
   * still races in theory; the retry window is limited to `maxAttempts`.
   */
  async withWorkspaceMutation(
    mutator: (data: BrandOpsData) => BrandOpsData,
    options?: { maxAttempts?: number }
  ): Promise<{ data: BrandOpsData; changed: boolean; attempts: number; forced: boolean }> {
    const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { raw, data } = await readWorkspace();
      const next = mutator(data);
      if (next === data) {
        return { data, changed: false, attempts: attempt, forced: false };
      }
      const currentRaw = await activeStorage.get<unknown>(DATA_KEY);
      if (rawMatches(currentRaw, raw)) {
        await this.setData(next);
        return { data: next, changed: true, attempts: attempt, forced: false };
      }
    }
    const { data: finalData } = await readWorkspace();
    const finalNext = mutator(finalData);
    if (finalNext === finalData) {
      return { data: finalData, changed: false, attempts: maxAttempts, forced: false };
    }
    await this.setData(finalNext);
    return { data: finalNext, changed: true, attempts: maxAttempts, forced: true };
  },

  async setData(data: BrandOpsData): Promise<BrandOpsData> {
    const normalized = withDefaults(data);
    await persistWorkspace(normalized);
    return normalized;
  },

  /**
   * Read the workspace, derive the next one, and write it — with no other write
   * able to interleave.
   *
   * Every mutation in the mobile shell was written as a bare
   * `getData()` → derive → `setData()`, and there are 32 of them. Two running at
   * once lose one of the changes:
   *
   * ```
   *   A: read  -> w0
   *   B: read  -> w0          (A has not written yet)
   *   A: write -> w0 + changeA
   *   B: write -> w0 + changeB  <- A's change is gone
   * ```
   *
   * For analytics that costs an event. For `approvePlanFromCheckpoint` it costs
   * an approval, and the interface still says "Checkpoint approved" — a success
   * reported for a write that was discarded, which is the one thing a workspace
   * holding someone's decisions must never do.
   *
   * `mutate` returning `null` means "nothing to write", so a no-op does not have
   * to fabricate an unchanged workspace to signal it.
   */
  async updateWorkspace(
    mutate: (current: BrandOpsData) => BrandOpsData | null | Promise<BrandOpsData | null>
  ): Promise<BrandOpsData | null> {
    return serializeWorkspaceWrite(async () => {
      const current = await this.getData();
      const next = await mutate(current);
      if (!next || next === current) return null;
      return this.setData(next);
    });
  },

  async resetToSeed(): Promise<BrandOpsData> {
    const seeded = createSeededWorkspace();
    await persistWorkspace(seeded);
    return seeded;
  },

  async exportData(): Promise<string> {
    const data = await this.getData();
    return JSON.stringify(data, null, 2);
  },

  async exportOperatorTracesJsonl(): Promise<string> {
    const data = await this.getData();
    return serializeOperatorTracesJsonl(data);
  },

  /** Best-effort: read, prepend trace, persist. Skips when collection is disabled. */
  async appendOperatorTrace(
    input: Parameters<typeof prependOperatorTrace>[1]
  ): Promise<BrandOpsData | null> {
    try {
      const result = await this.withWorkspaceMutation((data) => prependOperatorTrace(data, input));
      return result.changed ? result.data : null;
    } catch {
      return null;
    }
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
    await persistWorkspace(normalized);
    return normalized;
  }
};
