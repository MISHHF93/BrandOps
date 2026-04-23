import type { CockpitDailySnapshot } from './buildWorkspaceSnapshot';

const trunc = (s: string, n: number) => {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, Math.max(0, n - 1))}…`;
};

export type TodayFocusLine = {
  id: string;
  line: string;
  detail?: string;
};

export type TodayFocusAction = {
  id: string;
  label: string;
  rationale: string;
  command: string;
};

export type TodayFocusBoard = {
  /** Clear “do this today” cues (cadence, queue, publishing, deals) */
  doToday: TodayFocusLine[];
  /** Time pressure, risk, hygiene */
  urgent: TodayFocusLine[];
  /** Compounding progress: pipeline weight, content, publishing demand, brand/systems */
  momentum: TodayFocusLine[];
  quickActions: TodayFocusAction[];
};

/**
 * Deterministic “focus engine” readout for the Today tab — same data the cockpit already surfaces,
 * grouped for do / urgent / momentum.
 */
export function buildTodayFocusBoard(snapshot: CockpitDailySnapshot): TodayFocusBoard {
  const doToday: TodayFocusLine[] = [];

  if (snapshot.cadenceHeadline.trim()) {
    doToday.push({ id: 'cadence', line: 'Operator cadence', detail: snapshot.cadenceHeadline });
  }

  for (const t of snapshot.cockpitSchedulerTaskPeek.slice(0, 3)) {
    doToday.push({
      id: `sched-${t.id}`,
      line: `Scheduler: ${trunc(t.title, 72)}`,
      detail: `${t.status} · due ${new Date(t.dueAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    });
  }

  if (snapshot.nextPublishingHint) {
    doToday.push({
      id: 'pub-hint',
      line: 'Publishing window',
      detail: snapshot.nextPublishingHint
    });
  }

  if (snapshot.opportunitiesToClose[0]) {
    const o = snapshot.opportunitiesToClose[0];
    doToday.push({
      id: 'close-1',
      line: 'Move a close candidate',
      detail: `${o.label} — ${trunc(o.reason, 130)}`
    });
  }

  if (snapshot.incompleteFollowUps > 0) {
    doToday.push({
      id: 'fu-open',
      line: 'Follow-up debt',
      detail: `${snapshot.incompleteFollowUps} open follow-up(s) — pick one to finish or reschedule.`
    });
  }

  if (doToday.length === 0) {
    doToday.push({
      id: 'empty-do',
      line: 'Set today’s move',
      detail: 'Add a scheduler block, a publish time, or a follow-up so Today has a spine.'
    });
  }

  const urgent: TodayFocusLine[] = [];

  if (snapshot.missedTasks > 0) {
    urgent.push({
      id: 'missed',
      line: `${snapshot.missedTasks} missed scheduler task(s)`,
      detail: 'Reconcile in Chat so Pulse and Today stay honest.'
    });
  }

  if (snapshot.dueTodayTasks > 0) {
    urgent.push({
      id: 'due',
      line: `${snapshot.dueTodayTasks} item(s) due or due-soon in scheduler`,
      detail: 'Knock the next one down before pulling new work.'
    });
  }

  for (const r of snapshot.followUpRiskTop.slice(0, 2)) {
    if (r.score < 8) continue;
    urgent.push({
      id: `fu-${r.id}`,
      line: `Timing risk: ${trunc(r.label, 64)}`,
      detail: r.reason
    });
  }

  if (snapshot.outreachUrgencyTop[0]) {
    const o = snapshot.outreachUrgencyTop[0];
    urgent.push({
      id: `out-${o.id}`,
      line: `Outreach needs motion: ${trunc(o.label, 64)}`,
      detail: o.reason
    });
  }

  for (const s of snapshot.pipelineSignals.filter((p) => p.score < 56).slice(0, 2)) {
    urgent.push({
      id: `opp-${s.id}`,
      line: `Deal health: ${trunc(s.label, 64)}`,
      detail: s.reason
    });
  }

  const disconnected = snapshot.providerStatuses.filter(
    (p) => p.status === 'disconnected' || p.status === 'error'
  );
  if (disconnected.length) {
    urgent.push({
      id: 'sync',
      line: 'Sync gaps',
      detail: `Providers not connected: ${disconnected.map((p) => p.id).join(', ')}.`
    });
  }

  if (urgent.length === 0) {
    urgent.push({
      id: 'no-fire',
      line: 'No red flags in tracked signals',
      detail: 'Keep pipeline health in your back pocket; urgency will surface as dates slip.'
    });
  }

  const momentum: TodayFocusLine[] = [];
  const p = snapshot.pipelineProjection;

  if (p.activeDealCount > 0) {
    momentum.push({
      id: 'pipe-weight',
      line: 'Pipeline carry',
      detail: `${p.activeDealCount} active deals · $${p.rawOpenValueUsd.toLocaleString()} open · $${p.weightedOpenValueUsd.toLocaleString()} confidence-weighted.`
    });
  }

  for (const c of snapshot.contentTopSignals.slice(0, 2)) {
    momentum.push({
      id: `content-${c.id}`,
      line: `Content lift: ${trunc(c.label, 64)}`,
      detail: c.reason
    });
  }

  if (snapshot.queuedPublishing > 0) {
    momentum.push({
      id: 'pub-q',
      line: 'Publishing pull',
      detail: `${snapshot.queuedPublishing} item(s) queued or due soon — feed the calendar.`
    });
  }

  if (snapshot.cockpitBrandVaultReadout.filledListFieldsCount > 0) {
    momentum.push({
      id: 'vault',
      line: 'Brand system depth',
      detail: `${snapshot.cockpitBrandVaultReadout.filledListFieldsCount} vault list(s) in play — keep messaging assets warm.`
    });
  }

  if (snapshot.integrationArtifactCount + snapshot.sshTargetsCount > 0) {
    momentum.push({
      id: 'ops',
      line: 'Execution surface',
      detail: `${snapshot.integrationArtifactCount} artifact(s), ${snapshot.sshTargetsCount} SSH target(s) — ops leverage compounds.`
    });
  }

  if (momentum.length === 0) {
    momentum.push({
      id: 'start',
      line: 'Build momentum',
      detail:
        'Log outcomes in Chat, schedule posts, and connect sources — signals fill in as you work.'
    });
  }

  const quickActions: TodayFocusAction[] = [];
  const seen = new Set<string>();
  const push = (a: TodayFocusAction) => {
    if (seen.has(a.id)) return;
    seen.add(a.id);
    quickActions.push(a);
  };

  push({
    id: 'pipe',
    label: 'Run pipeline health',
    rationale: 'Re-rank deals and surface the next best touch.',
    command: 'pipeline health'
  });

  if (snapshot.missedTasks > 0) {
    push({
      id: 'missed-note',
      label: 'Log missed-task triage',
      rationale: 'Get scheduler and Pulse back in sync.',
      command: 'add note: triage missed scheduler — reschedule or mark done'
    });
  }

  if (snapshot.outreachUrgencyTop[0]) {
    push({
      id: 'outreach',
      label: 'Draft highest-urgency outreach',
      rationale: snapshot.outreachUrgencyTop[0].reason,
      command: 'draft outreach: follow up on warm lead with a concrete next step'
    });
  }

  if (snapshot.cockpitSchedulerTaskPeek[0]) {
    const t = snapshot.cockpitSchedulerTaskPeek[0];
    push({
      id: 'sched',
      label: 'Prime top scheduler item',
      rationale: t.title,
      command: `add note: focus scheduler task — ${t.title.replace(/"/g, "'")}`
    });
  }

  return {
    doToday: doToday.slice(0, 6),
    urgent: urgent.slice(0, 6),
    momentum: momentum.slice(0, 5),
    quickActions: quickActions.slice(0, 4)
  };
}
