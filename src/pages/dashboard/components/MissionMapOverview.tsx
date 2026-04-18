import type { BrandOpsData, CockpitDensityMode } from '../../../types/domain';
import { dailyNotificationCenter } from '../../../services/intelligence/dailyNotificationCenter';

type NotificationDigest = ReturnType<typeof dailyNotificationCenter.build>;

interface MissionMapOverviewProps {
  data: BrandOpsData;
  notificationDigest: NotificationDigest;
  formatHour: (value: number) => string;
  /** Compact folds lane cards and workflow copy behind a disclosure. */
  density?: CockpitDensityMode;
}

export function MissionMapOverview({
  data,
  notificationDigest,
  formatHour,
  density = 'comfortable'
}: MissionMapOverviewProps) {
  const activeOpportunities = data.opportunities.filter(
    (item) => item.status !== 'won' && item.status !== 'lost' && !item.archivedAt
  ).length;

  const isCompact = density === 'compact';

  const laneGrid = (
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
      <div className="bo-retro-card rounded-2xl border border-border bg-bg/45 p-3 text-left">
        <p className="text-xs uppercase tracking-[0.14em] text-textSoft">Execution Center</p>
        <p className="mt-2 text-base font-semibold text-text">{notificationDigest.headline}</p>
        <p className="mt-1 text-xs text-textMuted">Heat-ranked command queue.</p>
      </div>
      <div className="bo-retro-card rounded-2xl border border-border bg-bg/45 p-3 text-left">
        <p className="text-xs uppercase tracking-[0.14em] text-textSoft">Pipeline CRM</p>
        <p className="mt-2 text-base font-semibold text-text">{activeOpportunities} active opportunities</p>
        <p className="mt-1 text-xs text-textMuted">Deals, stages, and next action discipline.</p>
      </div>
      <div className="bo-retro-card rounded-2xl border border-border bg-bg/45 p-3 text-left">
        <p className="text-xs uppercase tracking-[0.14em] text-textSoft">Publishing Queue</p>
        <p className="mt-2 text-base font-semibold text-text">{data.publishingQueue.length} queued outputs</p>
        <p className="mt-1 text-xs text-textMuted">Presence cadence ready to ship.</p>
      </div>
      <div className="bo-retro-card rounded-2xl border border-border bg-bg/45 p-3 text-left">
        <p className="text-xs uppercase tracking-[0.14em] text-textSoft">Connections</p>
        <p className="mt-2 text-base font-semibold text-text">
          {data.integrationHub.sources.length + data.integrationHub.sshTargets.length} connected systems
        </p>
        <p className="mt-1 text-xs text-textMuted">Integration health and trusted stack status.</p>
      </div>
    </div>
  );

  const workflowArticle = (
    <article className="rounded-2xl border border-border bg-bg/45 p-3">
      <div className="space-y-2">
        <p className="bo-pill">Daily workflow</p>
        <h3 className="text-base font-semibold text-text">Operator loop</h3>
        <p className="text-xs text-textMuted">Run one loop daily: prioritize, ship, close.</p>
      </div>
      <ol className="mt-2.5 grid gap-2 md:grid-cols-3">
        <li className="rounded-xl border border-border bg-bg/55 p-2.5 text-xs">
          <p className="font-medium text-text">1. Prioritize</p>
          <p className="mt-1 text-textMuted">Review execute-now, due follow-ups, and schedule pressure.</p>
        </li>
        <li className="rounded-xl border border-border bg-bg/55 p-2.5 text-xs">
          <p className="font-medium text-text">2. Ship</p>
          <p className="mt-1 text-textMuted">Run outreach + publishing tasks and update pipeline status.</p>
        </li>
        <li className="rounded-xl border border-border bg-bg/55 p-2.5 text-xs">
          <p className="font-medium text-text">3. Close loop</p>
          <p className="mt-1 text-textMuted">Capture learnings, unblock next actions, and stage tomorrow.</p>
        </li>
      </ol>
      <p className="mt-3 text-xs text-textMuted">Execution system, not passive analytics.</p>
    </article>
  );

  return (
    <section
      className="bo-card scroll-mt-4 space-y-3 border border-border/85 bg-bg/65"
      id="today"
      aria-label="Solo operator lanes"
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 space-y-2">
          <p className="bo-pill">Operator cockpit</p>
          <h2 className="text-lg font-semibold text-text">
            Four lanes: command, revenue, presence, systems.
          </h2>
          {isCompact ? (
            <p className="max-w-3xl text-sm text-textMuted">
              Lean snapshot mode — expand when you need the full map.
            </p>
          ) : (
            <p className="max-w-3xl text-sm text-textMuted">
              One-page command map for daily execution and growth operations.
            </p>
          )}
        </div>
        <article className="shrink-0 bo-retro-card rounded-2xl border border-border bg-bg/45 p-3 text-xs text-textMuted">
          <p className="uppercase tracking-[0.14em] text-textSoft">Today shape</p>
          <p className="mt-2 text-lg font-semibold text-text">
            {formatHour(data.settings.notificationCenter.workdayStartHour)} -{' '}
            {formatHour(data.settings.notificationCenter.workdayEndHour)}
          </p>
          <p className="mt-1 text-textMuted">
            {notificationDigest.managerialWeight}% business · {notificationDigest.technicalWeight}% build
          </p>
        </article>
      </div>

      {isCompact ? (
        <details className="rounded-2xl border border-border bg-bg/40 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-text">
            Lane snapshot and daily workflow
          </summary>
          <div className="mt-3 space-y-4">
            {laneGrid}
            {workflowArticle}
          </div>
        </details>
      ) : (
        <>
          {laneGrid}
          {workflowArticle}
        </>
      )}
    </section>
  );
}
