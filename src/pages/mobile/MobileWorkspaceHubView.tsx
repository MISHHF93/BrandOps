import clsx from 'clsx';
import { CalendarCheck2, CirclePlay, TableProperties } from 'lucide-react';
import type { LaunchAccessState } from '../../shared/account/launchAccess';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { PipelineRun } from '../../types/aiIntegrationSuite';
import { workspaceQueueCommandLine } from './pulseTimeline';
import type { PulseTimelineRow } from './pulseTimeline';
import { PlanDestinationGrid } from './PlanDestinationGrid';
import { PlanIdentityHeader } from './PlanIdentityHeader';
import { PlanJumpNav } from './PlanJumpNav';
import { PlanProfileSummary } from './PlanProfileSummary';
import { PlanSetupHint } from './PlanSetupHint';
import { PlanPlanningActions } from './PlanPlanningActions';
import { PlanExecutionInsights } from './PlanExecutionInsights';
import { WorkspaceSignalsBoard } from './WorkspaceSignalsBoard';
import { EmptyState } from '../../shared/ui/brandopsPolish';
import { mobileChipClass } from './mobileTabPrimitives';
import { defaultBrandProfile } from '../../config/workspaceDefaults';
import {
  metricToneTextClass,
  planKpiSnapshotPillClass,
  pulseQueueBadgeSurfaceClass,
  pulseTimelineKindTone,
  toneDueTodayTasks,
  toneFollowUpsOpen,
  toneMissedTasks
} from './workspaceSignalTones';

function sortRowsSoonestFirst(rows: PulseTimelineRow[]): PulseTimelineRow[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.sortKey).getTime();
    const tb = new Date(b.sortKey).getTime();
    const na = Number.isNaN(ta) ? Number.MAX_SAFE_INTEGER : ta;
    const nb = Number.isNaN(tb) ? Number.MAX_SAFE_INTEGER : tb;
    return na - nb;
  });
}

function planAgentLockCopy(reason: 'auth' | 'membership' | null): string | null {
  if (reason === 'auth') {
    return 'Sign in from Settings to run workspace commands from Plan.';
  }
  if (reason === 'membership') {
    return 'Activate membership to run workspace commands from Plan.';
  }
  return null;
}

const SHEET = 'bo-plan-flat-root overflow-hidden rounded-2xl bg-bg';
const ROW = 'scroll-mt-28 px-4 py-4 sm:px-5';

export interface MobileWorkspaceHubViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onOpenToday: () => void;
  launchAccess: LaunchAccessState;
  onOpenSettings: () => void;
  onOpenIntegrations: () => void;
  onOpenCommandPalette: () => void;
  /** When true, Getting started card shows above this hub (setup hint hidden until dismissed). */
  firstRunJourneyVisible?: boolean;
  canRunWorkspaceCommands: boolean;
  workspaceCommandLockReason: 'auth' | 'membership' | null;
  onDownloadPipelineRun: (run: PipelineRun) => void;
  onApproveOperatorTrace: (traceId: string) => void | Promise<void>;
}

/**
 * Plan hub — single flat scroll: identity, navigation, **wired planning actions**, Pulse, snapshot, queue.
 */
export const MobileWorkspaceHubView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  onOpenToday,
  launchAccess,
  onOpenSettings,
  onOpenIntegrations,
  onOpenCommandPalette,
  firstRunJourneyVisible = false,
  canRunWorkspaceCommands,
  workspaceCommandLockReason,
  onDownloadPipelineRun,
  onApproveOperatorTrace
}: MobileWorkspaceHubViewProps) => {
  const profileIncomplete =
    snapshot.operatorName.trim() === defaultBrandProfile.operatorName.trim() ||
    !snapshot.primaryOffer.trim() ||
    !snapshot.voiceGuide.trim() ||
    !snapshot.focusMetric.trim();
  const showSetupHint = profileIncomplete && !firstRunJourneyVisible;

  const sorted = sortRowsSoonestFirst(snapshot.pulseTimelineRows);
  const todayPreviewTasks = snapshot.cockpitSchedulerTaskPeek.slice(0, 4);
  const todayPreviewDeals = snapshot.cockpitOpportunityPeek.slice(0, 2);
  const hasTodayPeekLists = todayPreviewTasks.length > 0 || todayPreviewDeals.length > 0;
  const lockHint = planAgentLockCopy(workspaceCommandLockReason);
  const dueSnapTone = toneDueTodayTasks(snapshot.dueTodayTasks);
  const missedSnapTone = toneMissedTasks(snapshot.missedTasks);
  const fuSnapTone = toneFollowUpsOpen(snapshot.incompleteFollowUps);

  return (
    <div className="space-y-3" aria-label="Plan">
      <span className="sr-only">
        Plan — workspace command center; profile summary and Account actions above; pulse, quick
        picks, Today snapshot, and queue below. Cross-tab destinations use the dock or ⌘K palette.
      </span>

      <div className={SHEET}>
        <div className={ROW}>
          <PlanIdentityHeader
            variant="sheet"
            btnFocus={btnFocus}
            operatorName={snapshot.operatorName}
            positioningPreview={snapshot.positioning}
            launchAccess={launchAccess}
            onOpenSettings={onOpenSettings}
          />
        </div>

        {showSetupHint ? (
          <div className={ROW}>
            <PlanSetupHint
              btnFocus={btnFocus}
              onOpenSettings={onOpenSettings}
              onOpenIntegrations={onOpenIntegrations}
              onOpenCommandPalette={onOpenCommandPalette}
            />
          </div>
        ) : null}

        <div className={ROW}>
          <PlanProfileSummary
            btnFocus={btnFocus}
            primaryOffer={snapshot.primaryOffer}
            voiceGuide={snapshot.voiceGuide}
            focusMetric={snapshot.focusMetric}
            onEditProfile={onOpenSettings}
          />
        </div>

        <div className={clsx(ROW, 'space-y-3')}>
          <header>
            <h1 className="text-meta font-semibold uppercase tracking-[0.14em] text-textMuted">
              Plan
            </h1>
            <p className="mt-1.5 text-meta leading-snug text-textMuted">
              Use the Plan strip (Overview · Workstreams · Connect · Setup) or{' '}
              <kbd className="rounded bg-bgSubtle px-1 py-px font-mono text-fine text-text">⌘K</kbd>{' '}
              — Assistant stays on Ask.
            </p>
            <p className="mt-2 text-fine leading-snug text-textSoft">
              Understand résumé and operating context → keep an accurate operator/org model → act to
              offload work and lift execution.
            </p>
          </header>

          <PlanDestinationGrid
            btnFocus={btnFocus}
            commandBusy={commandBusy}
            runCommand={runCommand}
            onOpenToday={onOpenToday}
          />

          <p className="text-meta leading-snug text-textMuted">
            <span className="font-medium text-textSoft">Palette:</span> still lists commands and
            deep targets — the strip above keeps everyday navigation inside Plan.
          </p>

          <PlanJumpNav btnFocus={btnFocus} />
        </div>

        <section id="plan-pulse" className={ROW}>
          <WorkspaceSignalsBoard
            metrics={snapshot}
            variant="pulse"
            cellOverrides={{
              oauth: {
                label: 'Sync hub',
                sub: '3 slots',
                title:
                  'Google, GitHub, and LinkedIn sync-hub preference rows (connected vs disconnected).'
              }
            }}
          />
        </section>

        <div className={ROW}>
          <PlanPlanningActions
            btnFocus={btnFocus}
            commandBusy={commandBusy}
            agentEnabled={canRunWorkspaceCommands}
            agentLockHint={lockHint}
            runCommand={runCommand}
            onOpenCommandPalette={onOpenCommandPalette}
          />
        </div>

        <div className={ROW}>
          <PlanExecutionInsights
            snapshot={snapshot}
            commandBusy={commandBusy}
            canRunWorkspaceCommands={canRunWorkspaceCommands}
            runCommand={runCommand}
            onDownloadPipelineRun={onDownloadPipelineRun}
            onApproveOperatorTrace={onApproveOperatorTrace}
          />
        </div>

        <section id="plan-today" className={ROW} aria-labelledby="plan-today-heading">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2
                id="plan-today-heading"
                className="flex items-center gap-2 text-meta font-semibold uppercase tracking-wide text-textMuted"
              >
                <CalendarCheck2 className="h-3.5 w-3.5 shrink-0 text-textSoft" aria-hidden />
                Today snapshot
              </h2>
              <p className="mt-1 text-meta leading-snug text-textSoft line-clamp-3">
                {snapshot.cadenceHeadline.trim()
                  ? snapshot.cadenceHeadline
                  : 'Cadence and peek rows — full cockpit lives on Today.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenToday}
              className={clsx(
                'shrink-0 rounded-lg bg-bgElevated px-2.5 py-1 text-meta font-semibold text-text',
                btnFocus
              )}
            >
              Open full Today
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Today snapshot counts">
            <span className={planKpiSnapshotPillClass(dueSnapTone)}>
              Due & soon{' '}
              <span className={clsx('font-semibold', metricToneTextClass(dueSnapTone))}>
                {snapshot.dueTodayTasks}
              </span>
            </span>
            <span className={planKpiSnapshotPillClass(missedSnapTone)}>
              Missed{' '}
              <span className={clsx('font-semibold', metricToneTextClass(missedSnapTone))}>
                {snapshot.missedTasks}
              </span>
            </span>
            <span className={planKpiSnapshotPillClass(fuSnapTone)}>
              Follow-ups open{' '}
              <span className={clsx('font-semibold', metricToneTextClass(fuSnapTone))}>
                {snapshot.incompleteFollowUps}
              </span>
            </span>
          </div>
          {hasTodayPeekLists ? (
            <div className="mt-3 space-y-2 pt-1">
              {todayPreviewTasks.length > 0 ? (
                <div>
                  <p className="text-fine font-medium uppercase tracking-wide text-textSoft">
                    Scheduler
                  </p>
                  <ul className="mt-1 space-y-1 text-meta text-textMuted">
                    {todayPreviewTasks.map((t) => (
                      <li key={t.id} className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-text">
                          {t.title}
                        </span>
                        <span className="max-w-[45%] shrink-0 text-end text-fine text-textSoft">
                          {t.dueAt ? `${t.dueAt} · ` : ''}
                          {t.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {todayPreviewDeals.length > 0 ? (
                <div>
                  <p className="text-fine font-medium uppercase tracking-wide text-textSoft">
                    Pipeline
                  </p>
                  <ul className="mt-1 space-y-1 text-meta text-textMuted">
                    {todayPreviewDeals.map((d) => (
                      <li key={d.id} className="flex flex-col gap-0.5">
                        <span className="truncate font-medium text-text">{d.name}</span>
                        <span className="truncate text-fine text-textSoft">{d.company}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 pt-1 text-fine text-textSoft">
              Nothing peeking yet — open Today for scheduler lanes and pipeline detail.
            </p>
          )}
        </section>

        <section id="plan-queue" className={ROW} aria-labelledby="plan-queue-heading">
          <h2
            id="plan-queue-heading"
            className="flex flex-wrap items-center gap-2 text-meta font-semibold uppercase tracking-wide text-textMuted"
          >
            <TableProperties className="h-3.5 w-3.5 shrink-0 text-textSoft" aria-hidden />
            Soonest queue
            <span
              className={clsx(
                'tabular-nums text-fine font-medium normal-case',
                sorted.length > 0 ? 'text-info' : 'text-textSoft'
              )}
            >
              {sorted.length} row{sorted.length === 1 ? '' : 's'}
            </span>
          </h2>
          {sorted.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="Nothing queued"
                body="Use Assistant to add follow-ups, publishing slots, or outreach — they land here as structured rows."
              />
            </div>
          ) : (
            <div className="bo-scroll-x-lane mt-2">
              <table className="w-full min-w-[280px] border-collapse text-left text-meta">
                <thead>
                  <tr className="border-b border-border/35 text-fine uppercase tracking-wide text-textSoft">
                    <th className="py-1.5 pe-2 font-medium">Type</th>
                    <th className="py-1.5 pe-2 font-medium">Item</th>
                    <th className="py-1.5 font-medium">When / status</th>
                    <th className="w-[1%] py-1.5 ps-2 font-medium whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 14).map((row) => (
                    <tr key={row.id} className="align-top text-textMuted">
                      <td className="py-2 pe-2 align-middle">
                        <span
                          className={pulseQueueBadgeSurfaceClass(pulseTimelineKindTone(row.kind))}
                          title={row.badge ?? row.kind}
                        >
                          {row.badge ?? row.kind}
                        </span>
                      </td>
                      <td className="max-w-[10rem] py-2 pe-2">
                        <span className="line-clamp-2 font-medium text-text" title={row.title}>
                          {row.title}
                        </span>
                      </td>
                      <td className="py-2 pe-2 text-fine leading-snug text-textSoft">
                        {row.subtitle}
                      </td>
                      <td className="py-2 ps-2 text-end whitespace-nowrap">
                        <button
                          type="button"
                          disabled={commandBusy}
                          title="Run this queue line on device (stay on Plan)"
                          onClick={() => runCommand(workspaceQueueCommandLine(row))}
                          className={clsx(mobileChipClass(btnFocus), 'text-fine')}
                        >
                          <CirclePlay className="me-1 inline h-3 w-3 align-text-bottom" />
                          Run
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sorted.length > 14 ? (
                <p className="mt-2 text-fine text-textSoft">
                  Showing 14 of {sorted.length}. Run narrower commands in Assistant to trim the
                  queue.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
