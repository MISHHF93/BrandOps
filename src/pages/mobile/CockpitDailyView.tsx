import { CalendarCheck2, Sparkles } from 'lucide-react';
import type { IntelligenceSignal } from '../../services/intelligence/localIntelligence';
import {
  cockpitNavigationGroups,
  workspaceModuleToDashboardSection,
  type DashboardSectionId
} from '../../shared/config/dashboardNavigation';
import { workspaceModules } from '../../shared/config/modules';
import { hrefExtensionIntegrationsPage } from '../../shared/navigation/navigationIntents';
import type { WorkspaceModuleId } from '../../types/domain';
import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';
import { CockpitWorkstreamBar } from './CockpitWorkstreamBar';
import { MobileTabPageHeader } from './mobileTabPrimitives';

const dashboardAreas = cockpitNavigationGroups[0]?.items.filter((item) => item.type === 'section') ?? [];

const MODULE_WORKSTREAM: Partial<Record<WorkspaceModuleId, DashboardSectionId>> = {
  ...workspaceModuleToDashboardSection,
  'command-center': 'today',
  settings: 'connections',
  'linkedin-companion': 'brand-content'
};

const MODULE_TRY_COMMAND: Partial<Record<WorkspaceModuleId, string>> = {
  'command-center': 'pipeline health',
  'brand-vault': 'add content: brand narrative asset',
  'content-library': 'add content: library seed idea',
  'publishing-queue': 'draft post: weekly insight from the workspace',
  'outreach-workspace': 'draft outreach: warm follow-up after intro call',
  'pipeline-crm': 'pipeline health',
  'scheduler-engine': 'create follow up: weekly plan review',
  'linkedin-companion': 'add note: LinkedIn companion capture',
  settings: 'configure: cadence balanced, remind before 20 min'
};

const SECTION_JUMP_LABEL: Record<DashboardSectionId, string> = {
  today: 'Today',
  pipeline: 'Pipeline',
  'brand-content': 'Brand & content',
  connections: 'Connections'
};

export interface CockpitDailyViewProps {
  snapshot: CockpitDailySnapshot;
  btnFocus: string;
  runCommand: (command: string) => void | Promise<void>;
  goToChat: () => void;
  /** Puts text in the Chat composer (does not send). Use when the agent only targets “first” rows. */
  primeChat: (line: string) => void;
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
  primeChat,
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
          <div
            className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2.5"
            aria-labelledby="cockpit-pipeline-projection-heading"
          >
            <p
              id="cockpit-pipeline-projection-heading"
              className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90"
            >
              Weighted projection
            </p>
            <p className="mt-1 text-[10px] leading-snug text-zinc-500">
              Open deals only (excludes won, lost, archived). <span className="text-zinc-400">Weighted</span> is Σ value ×
              confidence% — a sizing lens from the same rules as deal health, not a forecast.
            </p>
            <div className="-mx-0.5 mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
              {pulseTile(
                'Weighted',
                snapshot.pipelineProjection.activeDealCount > 0
                  ? `$${snapshot.pipelineProjection.weightedOpenValueUsd.toLocaleString()}`
                  : '—',
                'value × conf%'
              )}
              {pulseTile(
                'Raw open',
                snapshot.pipelineProjection.activeDealCount > 0
                  ? `$${snapshot.pipelineProjection.rawOpenValueUsd.toLocaleString()}`
                  : '—',
                `${snapshot.pipelineProjection.activeDealCount} deals`
              )}
            </div>
          </div>

          {signalList(
            'Opportunities to close (proposal & negotiation)',
            snapshot.opportunitiesToClose,
            'No deals in proposal or negotiation yet.',
            'In Chat: update opportunity to proposal, or add opportunities with stage, value, and confidence.'
          )}

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
        {snapshot.cockpitOpportunityPeek.length > 0 ? (
          <div className="mt-3 border-t border-white/5 pt-3">
            <p className="text-[11px] font-medium text-zinc-400">Opportunities in workspace</p>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              Read-only peek. Agent stage updates still apply to the first active deal unless you name fields in Chat.
            </p>
            <ul className="mt-2 space-y-2">
              {snapshot.cockpitOpportunityPeek.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
                >
                  <p className="font-medium text-zinc-100">
                    {row.name}
                    <span className="font-normal text-zinc-500"> · {row.company}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {row.status}
                    {row.nextAction ? ` · ${row.nextAction}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        primeChat(
                          `add note: review deal ${row.company} — ${row.name} (${row.status})`
                        )
                      }
                      className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus}`}
                    >
                      Draft note in Chat
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        primeChat(`draft outreach: follow up on ${row.company} re: ${row.name}`)
                      }
                      className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus}`}
                    >
                      Draft outreach in Chat
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
        {snapshot.cockpitContentPeek.length > 0 ? (
          <div className="mt-3 border-t border-white/5 pt-3">
            <p className="text-[11px] font-medium text-zinc-400">Content library (top)</p>
            <ul className="mt-2 space-y-2">
              {snapshot.cockpitContentPeek.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
                >
                  <p className="font-medium text-zinc-100">{row.title}</p>
                  <p className="text-[10px] text-zinc-500">{row.status}</p>
                  <button
                    type="button"
                    onClick={() => primeChat(`add note: refine content "${row.title.replace(/"/g, "'")}"`)}
                    className={`mt-2 rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus}`}
                  >
                    Draft note in Chat
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {snapshot.cockpitPublishingPeek.length > 0 ? (
          <div className="mt-3 border-t border-white/5 pt-3">
            <p className="text-[11px] font-medium text-zinc-400">Publishing queue (top)</p>
            <ul className="mt-2 space-y-2">
              {snapshot.cockpitPublishingPeek.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
                >
                  <p className="font-medium text-zinc-100">{row.title}</p>
                  <p className="text-[10px] text-zinc-500">{row.status}</p>
                  <button
                    type="button"
                    onClick={() =>
                      primeChat(`update publishing: ${row.title.replace(/"/g, "'")} checklist ready`)
                    }
                    className={`mt-2 rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus}`}
                  >
                    Prime publishing command
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Sync providers</p>
        <ul className="mt-1 space-y-1 text-[11px] text-zinc-400">
          {snapshot.providerStatuses.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="text-zinc-500">{p.id}</span>
              <span className="text-zinc-200">{p.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <details className="group rounded-xl border border-white/10 bg-zinc-950/25 p-3 open:shadow-inner">
        <summary
          className={`cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-zinc-500 ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            Workspace lanes (from product modules)
            <span className="text-[10px] font-normal normal-case text-zinc-600 group-open:hidden">(tap)</span>
          </span>
        </summary>
        <p className="mt-2 text-[10px] leading-snug text-zinc-600">
          Maps your migrated web-era modules to Today work areas and Chat commands — deep panels were folded into the agent;
          this is your compass.
        </p>
        <ul className="mt-3 space-y-3">
          {workspaceModules
            .filter((m) => m.status === 'active')
            .map((m) => {
              const section = MODULE_WORKSTREAM[m.id];
              const seed = MODULE_TRY_COMMAND[m.id];
              return (
                <li key={m.id} className="rounded-lg border border-white/5 bg-zinc-900/40 p-2.5">
                  <p className="text-[12px] font-medium text-zinc-100">{m.title}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{m.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {section ? (
                      <button
                        type="button"
                        onClick={() => onSelectWorkstream(section)}
                        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[10px] ${btnFocus}`}
                      >
                        Go to {SECTION_JUMP_LABEL[section]}
                      </button>
                    ) : null}
                    {seed ? (
                      <button
                        type="button"
                        onClick={() => void runCommand(seed)}
                        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[10px] ${btnFocus}`}
                      >
                        Run starter
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
        </ul>
      </details>
    </div>
  );
};
