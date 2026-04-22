import { localIntelligence } from '../../services/intelligence/localIntelligence';
import { operatorCadenceFlow } from '../../services/intelligence/operatorCadenceFlow';
import type { AgentAuditEntry, BrandOpsData, IntegrationSourceKind } from '../../types/domain';
import type { MobileSettingsFullReadout } from './mobileSettingsReadout';
import { buildMobileSettingsFullReadout } from './mobileSettingsReadout';
import { buildCockpitIntelligenceExtras } from './cockpitSnapshot';
import type { IntelligenceSignal } from '../../services/intelligence/localIntelligence';

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
  visualMode: string;
  motionMode: string;
  ambientFxEnabled: boolean;
  debugMode: boolean;
  managerialWeight: number;
  maxDailyTasks: number;
  remindBeforeMinutes: number;
  /** 0–23; same as `settings.notificationCenter` for editable workday UIs. */
  workdayStartHour: number;
  /** 1–24; same as `settings.notificationCenter` for editable workday UIs. */
  workdayEndHour: number;
  operatorName: string;
  focusMetric: string;
  primaryOffer: string;
  dueTodayTasks: number;
  missedTasks: number;
  recentAudit: AgentAuditEntry[];
  pipelineSignals: Array<{ id: string; label: string; score: number; reason: string }>;
  cadenceHeadline: string;
  contentTopSignals: IntelligenceSignal[];
  outreachUrgencyTop: IntelligenceSignal[];
  followUpRiskTop: IntelligenceSignal[];
  integrationArtifactCount: number;
  sshTargetsCount: number;
  nextPublishingHint: string | null;
  settingsFullReadout: MobileSettingsFullReadout;
  cockpitOpportunityPeek: CockpitOpportunityPeekRow[];
  cockpitContentPeek: CockpitContentPeekRow[];
  cockpitPublishingPeek: CockpitPublishingPeekRow[];
  integrationArtifactsPeek: CockpitArtifactPeekRow[];
  sshTargetsPeek: CockpitSshPeekRow[];
}

/** Fields required by {@link CockpitDailyView}; keeps props in sync with {@link MobileWorkspaceSnapshot}. */
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
>;

export function buildWorkspaceSnapshot(workspace: BrandOpsData): MobileWorkspaceSnapshot {
  const activeOpportunities = workspace.opportunities.filter((item) => !item.archivedAt);
  const pipelineSignals = localIntelligence.pipelineHealth(activeOpportunities).slice(0, 8);
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
    recentIntegrationSources: workspace.integrationHub.sources.slice(0, 5).map((source) => source.name),
    visualMode: workspace.settings.visualMode,
    motionMode: workspace.settings.motionMode,
    ambientFxEnabled: workspace.settings.ambientFxEnabled,
    debugMode: workspace.settings.debugMode,
    managerialWeight: workspace.settings.notificationCenter.managerialWeight,
    maxDailyTasks: workspace.settings.notificationCenter.maxDailyTasks,
    remindBeforeMinutes: workspace.settings.cadenceFlow.remindBeforeMinutes,
    workdayStartHour: workspace.settings.notificationCenter.workdayStartHour,
    workdayEndHour: workspace.settings.notificationCenter.workdayEndHour,
    operatorName: workspace.brand.operatorName,
    focusMetric: workspace.brand.focusMetric,
    primaryOffer: workspace.brand.primaryOffer,
    dueTodayTasks: workspace.scheduler.tasks.filter(
      (task) => task.status === 'due' || task.status === 'due-soon'
    ).length,
    missedTasks: workspace.scheduler.tasks.filter((task) => task.status === 'missed').length,
    recentAudit: (workspace.agentAudit?.entries ?? []).slice(0, 8),
    pipelineSignals,
    cadenceHeadline,
    settingsFullReadout: buildMobileSettingsFullReadout(workspace),
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
    ...cockpitExtras
  };
}
