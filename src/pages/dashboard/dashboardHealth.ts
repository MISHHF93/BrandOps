import { BrandOpsData } from '../../types/domain';

export type HealthSeverity = 'critical' | 'warning' | 'healthy';

export interface OverviewHealthMetric {
  id: 'execution' | 'pipeline' | 'publishing' | 'integration' | 'scheduler';
  label: string;
  value: string;
  detail: string;
  severity: HealthSeverity;
}

const severityFromCounts = (criticalCount: number, warningCount: number): HealthSeverity => {
  if (criticalCount > 0) return 'critical';
  if (warningCount > 0) return 'warning';
  return 'healthy';
};

const hoursSince = (iso?: string) => {
  if (!iso) return Number.POSITIVE_INFINITY;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / (1000 * 60 * 60);
};

export const severityLabel = (severity: HealthSeverity) =>
  severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Warning' : 'Healthy';

export const severityClasses = (severity: HealthSeverity) => {
  if (severity === 'critical') {
    return 'border-danger/30 bg-dangerSoft/10 text-danger';
  }
  if (severity === 'warning') {
    return 'border-warning/30 bg-warningSoft/10 text-warning';
  }
  return 'border-success/30 bg-successSoft/10 text-success';
};

export const computeOverviewHealthMetrics = (
  data: BrandOpsData,
  executionHeats: number[]
): OverviewHealthMetric[] => {
  const now = Date.now();
  const openPublishing = data.publishingQueue.filter(
    (item) => item.status !== 'posted' && item.status !== 'skipped'
  );
  const publishingOverdue = openPublishing.filter((item) => {
    const target = item.scheduledFor ?? item.reminderAt;
    return Boolean(target) && new Date(target as string).getTime() < now;
  }).length;
  const publishingDueSoon = openPublishing.filter((item) => {
    const target = item.scheduledFor ?? item.reminderAt;
    if (!target) return false;
    const delta = new Date(target).getTime() - now;
    return delta >= 0 && delta <= 24 * 60 * 60 * 1000;
  }).length;
  const publishingUnscheduled = openPublishing.filter(
    (item) => !item.scheduledFor && !item.reminderAt
  ).length;

  const overdueFollowUps = data.followUps.filter(
    (item) => !item.completed && new Date(item.dueAt).getTime() < now
  ).length;
  const overduePipelineActions = data.opportunities.filter(
    (item) =>
      item.status !== 'won' &&
      item.status !== 'lost' &&
      new Date(item.followUpDate).getTime() < now
  ).length;
  const weightedPipeline = data.opportunities.reduce(
    (sum, item) => sum + item.valueUsd * (item.confidence / 100),
    0
  );

  const hub = data.settings.syncHub;
  const connectedProviders = [hub.google, hub.github, hub.linkedin].filter(
    (row) => row.connectionStatus === 'connected'
  ).length;
  const lastTimes = [hub.google.lastConnectedAt, hub.github.lastConnectedAt, hub.linkedin.lastConnectedAt]
    .filter((t): t is string => Boolean(t))
    .map((t) => new Date(t).getTime());
  const newest = lastTimes.length ? Math.max(...lastTimes) : NaN;
  const syncAgeHours = Number.isFinite(newest)
    ? hoursSince(new Date(newest).toISOString())
    : Number.POSITIVE_INFINITY;
  const hasSyncError = [hub.google, hub.github, hub.linkedin].some((row) => Boolean(row.lastError));
  const integrationWarningCount = Number(syncAgeHours > 48) + Number(connectedProviders === 0);
  const integrationCriticalCount = Number(syncAgeHours > 96) + Number(hasSyncError);

  const schedulerTotal = data.scheduler.tasks.length;
  const schedulerMissed = data.scheduler.tasks.filter((task) => task.status === 'missed').length;
  const schedulerDueSoon = data.scheduler.tasks.filter(
    (task) => task.status === 'due' || task.status === 'due-soon'
  ).length;
  const schedulerCompleted = data.scheduler.tasks.filter(
    (task) => task.status === 'completed'
  ).length;
  const completionRate =
    schedulerTotal > 0 ? `${Math.round((schedulerCompleted / schedulerTotal) * 100)}%` : '0%';

  const executionCritical = executionHeats.filter((heat) => heat >= 85).length;
  const executionWarning = executionHeats.filter((heat) => heat >= 70 && heat < 85).length;

  return [
    {
      id: 'execution',
      label: 'Execution alerts',
      value: `${executionHeats.length}`,
      detail: `${executionCritical} critical · ${executionWarning} warning`,
      severity: severityFromCounts(executionCritical, executionWarning)
    },
    {
      id: 'pipeline',
      label: 'Pipeline health',
      value: `$${Math.round(weightedPipeline).toLocaleString()}`,
      detail: `${overdueFollowUps} overdue follow-ups · ${overduePipelineActions} overdue next actions`,
      severity: severityFromCounts(overdueFollowUps + overduePipelineActions, 0)
    },
    {
      id: 'publishing',
      label: 'Publishing health',
      value: `${openPublishing.length}`,
      detail: `${publishingOverdue} overdue · ${publishingDueSoon} due soon · ${publishingUnscheduled} unscheduled`,
      severity: severityFromCounts(publishingOverdue, publishingDueSoon + publishingUnscheduled)
    },
    {
      id: 'integration',
      label: 'Integration health',
      value: `${data.externalSync.links.length}`,
      detail: `${connectedProviders} connected identit${connectedProviders === 1 ? 'y' : 'ies'} · sync age ${
        Number.isFinite(syncAgeHours) ? `${Math.floor(syncAgeHours)}h` : 'never'
      }`,
      severity: severityFromCounts(integrationCriticalCount, integrationWarningCount)
    },
    {
      id: 'scheduler',
      label: 'Scheduler load',
      value: completionRate,
      detail: `${schedulerDueSoon} due soon · ${schedulerMissed} missed · ${schedulerTotal} total`,
      severity: severityFromCounts(schedulerMissed, schedulerDueSoon)
    }
  ];
};
