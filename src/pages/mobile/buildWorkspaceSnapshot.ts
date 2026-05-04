import { localIntelligence } from '../../services/intelligence/localIntelligence';
import { operatorCadenceFlow } from '../../services/intelligence/operatorCadenceFlow';
import type {
  AgentAuditEntry,
  BrandOpsData,
  BrandVault,
  BrandVaultListField,
  CopilotWorkerRegistrySettings,
  IntegrationSourceKind,
  SchedulerTask,
  SchedulerTaskStatus
} from '../../types/domain';
import type { MobileSettingsFullReadout } from './mobileSettingsReadout';
import { buildMobileSettingsFullReadout } from './mobileSettingsReadout';
import { buildCockpitIntelligenceExtras } from './cockpitSnapshot';
import {
  buildIntelligenceRulesReadout,
  type MobileIntelligenceRulesReadout
} from './intelligenceRulesReadout';
import type {
  IntelligenceSignal,
  PipelineProjectionReadout
} from '../../services/intelligence/localIntelligence';
import type { PulseTimelineRow } from './pulseTimeline';
import { buildPulseTimeline } from './pulseTimeline';

/** Compact rows for Integrations tab (full hub lives in `BrandOpsData.integrationHub`). */
export type MobileIntegrationSourceRow = {
  id: string;
  name: string;
  kind: IntegrationSourceKind;
  status: 'planned' | 'connected' | 'monitoring';
};

/** Read-only Today tab / Cockpit pipeline peek (agent still mutates “first” opportunity by default). */
export type CockpitOpportunityPeekRow = {
  id: string;
  name: string;
  company: string;
  status: string;
  nextAction: string;
};

export type CockpitContentPeekRow = {
  id: string;
  title: string;
  status: string;
};

export type CockpitPublishingPeekRow = {
  id: string;
  title: string;
  status: string;
};

export type CockpitArtifactPeekRow = {
  id: string;
  title: string;
  artifactType: string;
};

export type CockpitSshPeekRow = {
  id: string;
  name: string;
  host: string;
};

export type CockpitSchedulerTaskPeekRow = {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  sourceType: string;
};

export type CockpitNotePeekRow = {
  id: string;
  title: string;
  entityType: string;
  createdAt: string;
};

export type CockpitContactPeekRow = {
  id: string;
  name: string;
  company: string;
  role: string;
};

export type ExternalSyncLinkPeekRow = {
  id: string;
  provider: string;
  resourceType: string;
  sourceType: string;
  lastSyncedAt: string;
};

export type IntegrationLiveFeedPeekRow = {
  id: string;
  source: string;
  title: string;
  detail: string;
  level: string;
  happenedAt: string;
};

export type SeedSnapshotReadout = {
  source: string;
  version: string;
  seededAt: string;
  welcomeCompletedAt?: string;
  onboardingVersion?: string;
};

export type CockpitOutreachTemplatePeekRow = {
  id: string;
  name: string;
  category: string;
  updatedAt: string;
};

export type CockpitOutreachHistoryPeekRow = {
  id: string;
  targetName: string;
  company: string;
  status: string;
  loggedAt: string;
  summaryPreview: string;
};

export type CockpitCompanyPeekRow = {
  id: string;
  name: string;
  status: string;
  nextAction: string;
};

export type CockpitBrandVaultReadout = {
  filledListFieldsCount: number;
  positioningPreview: string;
  firstHeadlineOption: string;
  shortBioPreview: string;
};

export type SettingsMessagingVaultPeekRow = {
  id: string;
  category: string;
  title: string;
};

const BRAND_VAULT_LIST_KEYS: BrandVaultListField[] = [
  'headlineOptions',
  'serviceOfferings',
  'collaborationModes',
  'outreachAngles',
  'audienceSegments',
  'expertiseAreas',
  'industries',
  'proofPoints',
  'signatureThemes',
  'preferredVoiceNotes',
  'bannedPhrases',
  'callsToAction',
  'reusableSnippets',
  'personalNotes'
];

function truncatePeek(text: string, maxChars: number): string {
  const t = text.trim();
  if (!t) return '';
  return t.length <= maxChars ? t : `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}

function countFilledBrandVaultLists(vault: BrandVault): number {
  let n = 0;
  for (const key of BRAND_VAULT_LIST_KEYS) {
    const arr = vault[key];
    if (Array.isArray(arr) && arr.some((item) => String(item).trim().length > 0)) n++;
  }
  return n;
}

function buildBrandVaultReadout(vault: BrandVault): CockpitBrandVaultReadout {
  return {
    filledListFieldsCount: countFilledBrandVaultLists(vault),
    positioningPreview: truncatePeek(vault.positioningStatement, 160),
    firstHeadlineOption: vault.headlineOptions[0]
      ? truncatePeek(vault.headlineOptions[0], 120)
      : '',
    shortBioPreview: truncatePeek(vault.shortBio, 140)
  };
}

const SCHEDULER_PEEK_STATUSES: SchedulerTaskStatus[] = ['scheduled', 'due-soon', 'due', 'snoozed'];

function buildSchedulerTaskPeek(tasks: SchedulerTask[]): CockpitSchedulerTaskPeekRow[] {
  return [...tasks]
    .filter((t) => SCHEDULER_PEEK_STATUSES.includes(t.status))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt,
      status: t.status,
      sourceType: t.sourceType
    }));
}

/**
 * Per-tab aggregate view of `BrandOpsData` for `MobileApp` (Cockpit, Settings, Integrations).
 * Always built from a real or provisional {@link BrandOpsData} so UI never null-gates on snapshot.
 */
export interface MobileWorkspaceSnapshot {
  notes: number;
  publishingQueue: number;
  outreachDrafts: number;
  opportunities: number;
  integrationSources: number;
  /** Same length as `integrationSources`; ordered as in workspace (UI may truncate display). */
  integrationHubSources: MobileIntegrationSourceRow[];
  syncProvidersConnected: number;
  cadenceMode: string;
  reminderWindow: string;
  incompleteFollowUps: number;
  activeOpportunities: number;
  queuedPublishing: number;
  providerStatuses: Array<{ id: string; status: string }>;
  recentIntegrationSources: string[];
  managerialWeight: number;
  maxDailyTasks: number;
  remindBeforeMinutes: number;
  /** 0–23; same as `settings.notificationCenter` for editable workday UIs. */
  workdayStartHour: number;
  /** 1–24; same as `settings.notificationCenter` for editable workday UIs. */
  workdayEndHour: number;
  operatorName: string;
  /** One-line who/what (`BrandProfile.positioning`). */
  positioning: string;
  focusMetric: string;
  primaryOffer: string;
  /** Tone and vocabulary (`BrandProfile.voiceGuide`). */
  voiceGuide: string;
  dueTodayTasks: number;
  missedTasks: number;
  recentAudit: AgentAuditEntry[];
  pipelineSignals: Array<{ id: string; label: string; score: number; reason: string }>;
  /** Confidence-weighted open pipeline vs raw open value (see `localIntelligence.pipelineProjection`). */
  pipelineProjection: PipelineProjectionReadout;
  /** Proposal & negotiation deals ranked by health (see `localIntelligence.opportunitiesToClose`). */
  opportunitiesToClose: IntelligenceSignal[];
  cadenceHeadline: string;
  contentTopSignals: IntelligenceSignal[];
  outreachUrgencyTop: IntelligenceSignal[];
  followUpRiskTop: IntelligenceSignal[];
  integrationArtifactCount: number;
  sshTargetsCount: number;
  nextPublishingHint: string | null;
  settingsFullReadout: MobileSettingsFullReadout;
  /** Named hosted Ask copilots + active id — Assistant picker reads this without touching storage. */
  copilotWorkerRegistry: CopilotWorkerRegistrySettings;
  cockpitOpportunityPeek: CockpitOpportunityPeekRow[];
  cockpitContentPeek: CockpitContentPeekRow[];
  cockpitPublishingPeek: CockpitPublishingPeekRow[];
  integrationArtifactsPeek: CockpitArtifactPeekRow[];
  sshTargetsPeek: CockpitSshPeekRow[];
  cockpitSchedulerTaskPeek: CockpitSchedulerTaskPeekRow[];
  cockpitRecentNotesPeek: CockpitNotePeekRow[];
  cockpitContactsPeek: CockpitContactPeekRow[];
  externalSyncLinksPeek: ExternalSyncLinkPeekRow[];
  integrationLiveFeedPeek: IntegrationLiveFeedPeekRow[];
  seedReadout: SeedSnapshotReadout;
  intelligenceRulesReadout: MobileIntelligenceRulesReadout;
  cockpitOutreachTemplatePeek: CockpitOutreachTemplatePeekRow[];
  cockpitOutreachHistoryPeek: CockpitOutreachHistoryPeekRow[];
  cockpitCompanyPeek: CockpitCompanyPeekRow[];
  cockpitBrandVaultReadout: CockpitBrandVaultReadout;
  settingsMessagingVaultPeek: SettingsMessagingVaultPeekRow[];
  /** Mixed follow-ups, publishing, scheduler, outreach — for Pulse tab. */
  pulseTimelineRows: PulseTimelineRow[];
}

/** Fields required by Today cockpit sections; keeps props in sync with {@link MobileWorkspaceSnapshot}. */
export type CockpitDailySnapshot = Pick<
  MobileWorkspaceSnapshot,
  | 'publishingQueue'
  | 'integrationSources'
  | 'syncProvidersConnected'
  | 'cadenceMode'
  | 'incompleteFollowUps'
  | 'activeOpportunities'
  | 'queuedPublishing'
  | 'operatorName'
  | 'focusMetric'
  | 'primaryOffer'
  | 'dueTodayTasks'
  | 'missedTasks'
  | 'pipelineSignals'
  | 'pipelineProjection'
  | 'opportunitiesToClose'
  | 'cadenceHeadline'
  | 'contentTopSignals'
  | 'outreachUrgencyTop'
  | 'followUpRiskTop'
  | 'integrationArtifactCount'
  | 'sshTargetsCount'
  | 'nextPublishingHint'
  | 'cockpitOpportunityPeek'
  | 'cockpitContentPeek'
  | 'cockpitPublishingPeek'
  | 'providerStatuses'
  | 'cockpitSchedulerTaskPeek'
  | 'cockpitRecentNotesPeek'
  | 'cockpitContactsPeek'
  | 'cockpitOutreachTemplatePeek'
  | 'cockpitOutreachHistoryPeek'
  | 'cockpitCompanyPeek'
  | 'cockpitBrandVaultReadout'
  | 'integrationArtifactsPeek'
  | 'sshTargetsPeek'
>;

export function buildWorkspaceSnapshot(workspace: BrandOpsData): MobileWorkspaceSnapshot {
  const activeOpportunities = workspace.opportunities.filter((item) => !item.archivedAt);
  const pipelineSignals = localIntelligence.pipelineHealth(activeOpportunities).slice(0, 8);
  const pipelineProjection = localIntelligence.pipelineProjection(workspace.opportunities);
  const opportunitiesToClose = localIntelligence.opportunitiesToClose(workspace.opportunities);
  const cadenceHeadline = operatorCadenceFlow.build(workspace).headline;
  const cockpitExtras = buildCockpitIntelligenceExtras(workspace);

  return {
    notes: workspace.notes.length,
    publishingQueue: workspace.publishingQueue.length,
    outreachDrafts: workspace.outreachDrafts.length,
    opportunities: workspace.opportunities.length,
    integrationSources: workspace.integrationHub.sources.length,
    integrationHubSources: workspace.integrationHub.sources.map((source) => ({
      id: source.id,
      name: source.name,
      kind: source.kind,
      status: source.status
    })),
    syncProvidersConnected: [
      workspace.settings.syncHub.google,
      workspace.settings.syncHub.github,
      workspace.settings.syncHub.linkedin
    ].filter((provider) => provider.connectionStatus === 'connected').length,
    cadenceMode: workspace.settings.cadenceFlow.mode,
    reminderWindow: `${workspace.settings.notificationCenter.workdayStartHour}:00-${workspace.settings.notificationCenter.workdayEndHour}:00`,
    incompleteFollowUps: workspace.followUps.filter((item) => !item.completed).length,
    activeOpportunities: activeOpportunities.length,
    queuedPublishing: workspace.publishingQueue.filter(
      (item) => item.status === 'queued' || item.status === 'due-soon'
    ).length,
    providerStatuses: [
      { id: 'google', status: workspace.settings.syncHub.google.connectionStatus },
      { id: 'github', status: workspace.settings.syncHub.github.connectionStatus },
      { id: 'linkedin', status: workspace.settings.syncHub.linkedin.connectionStatus }
    ],
    recentIntegrationSources: workspace.integrationHub.sources
      .slice(0, 5)
      .map((source) => source.name),
    managerialWeight: workspace.settings.notificationCenter.managerialWeight,
    maxDailyTasks: workspace.settings.notificationCenter.maxDailyTasks,
    remindBeforeMinutes: workspace.settings.cadenceFlow.remindBeforeMinutes,
    workdayStartHour: workspace.settings.notificationCenter.workdayStartHour,
    workdayEndHour: workspace.settings.notificationCenter.workdayEndHour,
    operatorName: workspace.brand.operatorName,
    positioning: workspace.brand.positioning,
    focusMetric: workspace.brand.focusMetric,
    primaryOffer: workspace.brand.primaryOffer,
    voiceGuide: workspace.brand.voiceGuide,
    dueTodayTasks: workspace.scheduler.tasks.filter(
      (task) => task.status === 'due' || task.status === 'due-soon'
    ).length,
    missedTasks: workspace.scheduler.tasks.filter((task) => task.status === 'missed').length,
    recentAudit: (workspace.agentAudit?.entries ?? []).slice(0, 8),
    pipelineSignals,
    pipelineProjection,
    opportunitiesToClose,
    cadenceHeadline,
    settingsFullReadout: buildMobileSettingsFullReadout(workspace),
    copilotWorkerRegistry: workspace.settings.copilotWorkers,
    cockpitOpportunityPeek: activeOpportunities.slice(0, 5).map((o) => ({
      id: o.id,
      name: o.name,
      company: o.company,
      status: o.status,
      nextAction: o.nextAction
    })),
    cockpitContentPeek: workspace.contentLibrary
      .filter((c) => c.status !== 'archived')
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status
      })),
    cockpitPublishingPeek: workspace.publishingQueue.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status
    })),
    integrationArtifactsPeek: workspace.integrationHub.artifacts.slice(0, 8).map((a) => ({
      id: a.id,
      title: a.title,
      artifactType: a.artifactType
    })),
    sshTargetsPeek: workspace.integrationHub.sshTargets.slice(0, 8).map((s) => ({
      id: s.id,
      name: s.name,
      host: s.host
    })),
    cockpitSchedulerTaskPeek: buildSchedulerTaskPeek(workspace.scheduler.tasks),
    cockpitRecentNotesPeek: [...workspace.notes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((n) => ({
        id: n.id,
        title: n.title,
        entityType: n.entityType,
        createdAt: n.createdAt
      })),
    cockpitContactsPeek: [...workspace.contacts]
      .filter((c) => c.status !== 'archived')
      .sort((a, b) => new Date(b.lastContactAt).getTime() - new Date(a.lastContactAt).getTime())
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        role: c.role
      })),
    externalSyncLinksPeek: workspace.externalSync.links.slice(0, 10).map((link) => ({
      id: link.id,
      provider: link.provider,
      resourceType: link.resourceType,
      sourceType: link.sourceType,
      lastSyncedAt: link.lastSyncedAt
    })),
    integrationLiveFeedPeek: [...workspace.integrationHub.liveFeed]
      .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        source: item.source,
        title: item.title,
        detail: item.detail,
        level: item.level,
        happenedAt: item.happenedAt
      })),
    seedReadout: {
      source: workspace.seed.source,
      version: workspace.seed.version,
      seededAt: workspace.seed.seededAt,
      welcomeCompletedAt: workspace.seed.welcomeCompletedAt,
      onboardingVersion: workspace.seed.onboardingVersion
    },
    intelligenceRulesReadout: buildIntelligenceRulesReadout(),
    cockpitOutreachTemplatePeek: [...workspace.outreachTemplates]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        updatedAt: t.updatedAt
      })),
    cockpitOutreachHistoryPeek: [...workspace.outreachHistory]
      .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
      .slice(0, 5)
      .map((h) => ({
        id: h.id,
        targetName: h.targetName,
        company: h.company,
        status: h.status,
        loggedAt: h.loggedAt,
        summaryPreview: truncatePeek(h.summary, 140)
      })),
    cockpitCompanyPeek: [...workspace.companies]
      .filter((c) => c.status !== 'archived')
      .sort((a, b) => {
        const byAction = a.nextAction.localeCompare(b.nextAction);
        return byAction !== 0 ? byAction : a.name.localeCompare(b.name);
      })
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        nextAction: c.nextAction
      })),
    cockpitBrandVaultReadout: buildBrandVaultReadout(workspace.brandVault),
    settingsMessagingVaultPeek: [...workspace.messagingVault]
      .sort((a, b) => {
        const byCat = a.category.localeCompare(b.category);
        return byCat !== 0 ? byCat : a.title.localeCompare(b.title);
      })
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        category: m.category,
        title: m.title
      })),
    pulseTimelineRows: buildPulseTimeline(workspace),
    ...cockpitExtras
  };
}
