import { StatCard } from './StatCard';

interface MissionMapMetricsProps {
  publishingQueueLength: number;
  outreachDraftsLength: number;
  weightedPipeline: number;
  overdueFollowUps: number;
}

export function MissionMapMetrics({
  publishingQueueLength,
  outreachDraftsLength,
  weightedPipeline,
  overdueFollowUps
}: MissionMapMetricsProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Publishing Queue"
        value={publishingQueueLength}
        hint="Public-facing outputs in play"
      />
      <StatCard
        label="Outreach Workspace"
        value={outreachDraftsLength}
        hint="Active touchpoints and drafts"
      />
      <StatCard
        label="Pipeline (weighted)"
        value={`$${Math.round(weightedPipeline).toLocaleString()}`}
        hint="Confidence-adjusted opportunity value"
      />
      <StatCard label="Urgent follow-ups" value={overdueFollowUps} hint="Follow-up debt to clear today" />
    </section>
  );
}
