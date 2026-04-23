import { pulseTile } from './cockpitDailyPrimitives';
import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';

/** Read-only metric strip above workstream sections. */
export const CockpitAtAGlanceStrip = ({ snapshot }: { snapshot: CockpitDailySnapshot }) => (
  <div aria-labelledby="cockpit-at-a-glance-heading">
    <p
      id="cockpit-at-a-glance-heading"
      className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-textMuted"
    >
      At a glance
    </p>
    <p className="mb-1.5 text-[10px] text-textSoft">
      Digest row — workspace counts only (not buttons). Actions live in each work area below.
    </p>
    <div
      role="group"
      aria-label="Workspace metric counts, read-only — not buttons"
      className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]"
    >
      {pulseTile('Follow-ups', snapshot.incompleteFollowUps, 'open')}
      {pulseTile('Queue', snapshot.publishingQueue, 'items')}
      {pulseTile('Opps', snapshot.activeOpportunities, 'active')}
      {pulseTile('Sched', snapshot.dueTodayTasks, 'due / due-soon')}
      {pulseTile('Missed', snapshot.missedTasks, 'tasks')}
      {pulseTile('OAuth', snapshot.syncProvidersConnected, 'connected')}
      {pulseTile('Sources', snapshot.integrationSources, 'integrations')}
    </div>
  </div>
);
