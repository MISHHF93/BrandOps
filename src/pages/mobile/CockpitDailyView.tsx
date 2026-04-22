import { CalendarCheck2, Sparkles } from 'lucide-react';
import type { IntelligenceSignal } from '../../services/intelligence/localIntelligence';
import {
  cockpitNavigationGroups,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';
import { hrefExtensionIntegrationsPage } from '../../shared/navigation/navigationIntents';
import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';
import { CockpitWorkstreamBar } from './CockpitWorkstreamBar';
import { MobileTabPageHeader } from './mobileTabPrimitives';

const dashboardAreas = cockpitNavigationGroups[0]?.items.filter((item) => item.type === 'section') ?? [];

export interface CockpitDailyViewProps {
  snapshot: CockpitDailySnapshot;
  btnFocus: string;
  runCommand: (command: string) => void | Promise<void>;
  goToChat: () => void;
  onOpenInAppSettings: () => void;
  activeWorkstream: DashboardSectionId;
  onSelectWorkstream: (target: DashboardSectionId) => void;
}

const pulseTile = (label: string, value: string | number, sub?: string) => (
  <div className="min-w-[5.5rem] shrink-0 rounded-lg border border-white/10 bg-zinc-900/50 px-2 py-1.5">
    <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
    <p className="text-lg font-semibold tabular-nums text-zinc-100">{value}</p>
    {sub ? <p className="text-[9px] text-zinc-500">{sub}</p> : null}
  </div>
);

const signalList = (title: string, items: IntelligenceSignal[], empty: string, emptyHint?: string) => (
  <div>
    <p className="text-[11px] font-medium text-zinc-400">{title}</p>
    {items.length === 0 ? (
      <div className="mt-1 space-y-1">
        <p className="text-[11px] text-zinc-500">{empty}</p>
        {emptyHint ? <p className="text-[11px] text-zinc-500">{emptyHint}</p> : null}
      </div>
    ) : (
      <ol className="mt-1 space-y-1.5">
        {items.map((row, i) => (
          <li key={row.id} className="border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] text-zinc-200">
                {i + 1}. {row.label}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-indigo-300/90">{row.score}</span>
            </div>
            <p className="text-[10px] leading-snug text-zinc-500">{row.reason}</p>
          </li>
        ))}
      </ol>
    )}
  </div>
);

/**
 * Today tab (URL `?section=today` and related workstreams): one metrics strip + four work areas.
 * No duplicate aggregate grid, no notification readout (Settings), no “other windows” list (use bottom nav).
 */
export const CockpitDailyView = ({
  snapshot,
  btnFocus,
  runCommand,
  goToChat,
  onOpenInAppSettings,
  activeWorkstream,
  onSelectWorkstream
}: CockpitDailyViewProps) => {
  const [todayMeta, pipelineMeta, brandMeta, connectionsMeta] = [
    dashboardAreas.find((x) => x.target === 'today'),
    dashboardAreas.find((x) => x.target === 'pipeline'),
    dashboardAreas.find((x) => x.target === 'brand-content'),
    dashboardAreas.find((x) => x.target === 'connections')
  ];

  return (
    <div className="mt-2 space-y-5" aria-label="Today">
      <MobileTabPageHeader
        title="Today"
        subtitle='Cockpit — execution pulse and work areas. Same tab as bottom nav "Today"; deep edits in Chat.'
        icon={CalendarCheck2}
        iconWrapperClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-950/30"
        iconClassName="text-indigo-300"
      />

      <CockpitWorkstreamBar
        btnFocus={btnFocus}
        activeWorkstream={activeWorkstream}
        onSelectWorkstream={onSelectWorkstream}
      />

      <div aria-labelledby="cockpit-at-a-glance-heading">
        <p
          id="cockpit-at-a-glance-heading"
          className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
        >
          At a glance
        </p>
        <p className="mb-1.5 text-[10px] text-zinc-600">
          One scrollable row of workspace counts (follow-ups through registered sources).
        </p>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]">
          {pulseTile('Follow-ups', snapshot.incompleteFollowUps, 'open')}
          {pulseTile('Queue', snapshot.publishingQueue, 'items')}
          {pulseTile('Opps', snapshot.activeOpportunities, 'active')}
          {pulseTile('Sched', snapshot.dueTodayTasks, 'due / due-soon')}
          {pulseTile('Missed', snapshot.missedTasks, 'tasks')}
          {pulseTile('OAuth', snapshot.syncProvidersConnected, 'connected')}
          {pulseTile('Sources', snapshot.integrationSources, 'integrations')}
        </div>
      </div>

      <section
        className="rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs"
        aria-labelledby="cockpit-today"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 id="cockpit-today" className="text-sm font-semibold text-zinc-100">
              {todayMeta?.label ?? 'Today'}
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">{todayMeta?.description}</p>
          </div>
          <Sparkles size={16} className="shrink-0 text-amber-400/80" aria-hidden />
        </div>
        <p className="mt-2 text-zinc-400">{snapshot.cadenceHeadline}</p>
        <p className="mt-1 text-zinc-500">Cadence: {snapshot.cadenceMode}</p>
        <p className="mt-2 text-zinc-300">
          <span className="text-zinc-500">Operator:</span> {snapshot.operatorName || '—'} ·{' '}
          <span className="text-zinc-500">Offer:</span> {snapshot.primaryOffer || '—'}
        </p>
        <p className="mt-0.5 text-zinc-300">
          <span className="text-zinc-500">Focus:</span> {snapshot.focusMetric || '—'}
        </p>
        <p className="mt-3 text-[11px] text-zinc-500">
          Workday, task caps, and reminders live in{' '}
          <button
            type="button"
            onClick={onOpenInAppSettings}
            className={`font-medium text-indigo-300 underline-offset-2 hover:underline ${btnFocus}`}
          >
            Settings
          </button>
          .
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void runCommand('create follow up: check warm lead status')}
            className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus}`}
          >
            Create follow-up
          </button>
          <button
            type="button"
            onClick={() => void runCommand('configure: cadence balanced, remind before 20 min')}
            className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus}`}
          >
            Balanced cadence
          </button>
        </div>
      </section>

      <section
        className="rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-3 text-xs"
        aria-labelledby="cockpit-pipeline"
      >
        <h3 id="cockpit-pipeline" className="text-sm font-semibold text-zinc-100">
          {pipelineMeta?.label ?? 'Pipeline'}
        </h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">{pipelineMeta?.description}</p>

        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-zinc-200">Deal health (heuristic)</p>
              <button
                type="button"
                onClick={() => {
                  goToChat();
                  void runCommand('pipeline health');
                }}
                className={`shrink-0 rounded-full border border-emerald-600/40 bg-zinc-900/50 px-2 py-0.5 text-[10px] text-emerald-200 ${btnFocus}`}
              >
                In chat
              </button>
            </div>
            {snapshot.pipelineSignals.length === 0 ? (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] text-zinc-500">No active opportunities in the workspace yet.</p>
                <p className="text-[11px] text-zinc-500">
                  In <strong className="text-zinc-400">Chat</strong>, add opportunities or run{' '}
                  <code className="rounded bg-zinc-900/80 px-1 text-[10px] text-zinc-300">pipeline health</code> after
                  you have deals in motion.
                </p>
              </div>
            ) : (
              <ol className="mt-1 space-y-1.5">
                {snapshot.pipelineSignals.map((row, i) => (
                  <li key={row.id} className="border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-zinc-200">
                        {i + 1}. {row.label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-emerald-300/90">{row.score}</span>
                    </div>
                    <p className="text-[10px] leading-snug text-zinc-500">{row.reason}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {signalList(
            'Outreach urgency (top 5)',
            snapshot.outreachUrgencyTop,
            'No active outreach drafts.',
            'In Chat, try: draft outreach: quick follow-up with warm lead from demo (or use Draft outreach below).'
          )}
          {signalList(
            'Overdue & due-soon (risk score)',
            snapshot.followUpRiskTop,
            'No follow-up risk in range.',
            'Create a follow-up in Chat so due-soon items can rank here.'
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void runCommand('draft outreach: follow up on warm lead')}
            className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus}`}
          >
            Draft outreach
          </button>
          <button
            type="button"
            onClick={() => void runCommand('update opportunity to proposal')}
            className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus}`}
          >
            Advance opportunity
          </button>
        </div>
      </section>

      <section
        className="rounded-xl border border-violet-500/15 bg-violet-950/10 p-3 text-xs"
        aria-labelledby="cockpit-brand"
      >
        <h3 id="cockpit-brand" className="text-sm font-semibold text-zinc-100">
          {brandMeta?.label ?? 'Brand & content'}
        </h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">{brandMeta?.description}</p>
        <p className="mt-2 text-zinc-400">
          Publishing queue: <span className="text-zinc-100">{snapshot.publishingQueue}</span> items · Queued or
          due-soon: <span className="text-zinc-100">{snapshot.queuedPublishing}</span>
        </p>
        {snapshot.nextPublishingHint ? (
          <p className="mt-1 text-[11px] text-violet-200/80">Next: {snapshot.nextPublishingHint}</p>
        ) : null}
        {signalList(
          'Content priority (top 5)',
          snapshot.contentTopSignals,
          'No content in the library yet.',
          'In Chat: add content: … and optional status so priority can rank (e.g. add content: AI growth memo draft, status draft).'
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void runCommand('draft post: weekly insight from the workspace')}
            className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus}`}
          >
            Draft post
          </button>
          <button
            type="button"
            onClick={() => void runCommand('reschedule posts to friday 11am')}
            className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus}`}
          >
            Reschedule posts
          </button>
        </div>
      </section>

      <section
        className="rounded-xl border border-sky-500/15 bg-sky-950/10 p-3 text-xs"
        aria-labelledby="cockpit-connections"
      >
        <h3 id="cockpit-connections" className="text-sm font-semibold text-zinc-100">
          {connectionsMeta?.label ?? 'Connections'}
        </h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">{connectionsMeta?.description}</p>
        <p className="mt-2 text-[11px]">
          <a
            href={hrefExtensionIntegrationsPage()}
            className={`font-medium text-sky-400/90 underline underline-offset-2 ${btnFocus}`}
          >
            Open integrations page
          </a>{' '}
          <span className="text-zinc-500">for OAuth, sources, and add-connection commands.</span>
        </p>
        <ul className="mt-2 space-y-1 text-zinc-300">
          <li>
            Artifacts: <span className="text-zinc-100">{snapshot.integrationArtifactCount}</span>
          </li>
          <li>
            SSH targets: <span className="text-zinc-100">{snapshot.sshTargetsCount}</span>
          </li>
        </ul>
      </section>
    </div>
  );
};
