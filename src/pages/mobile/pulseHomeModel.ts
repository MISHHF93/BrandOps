import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { bucketForRow, startOfLocalDay } from './pulseBuckets';
import type { PulseTimelineRow } from './pulseTimeline';

const trunc = (s: string, n: number) => {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, Math.max(0, n - 1))}…`;
};

export type PulseHomeLine = {
  id: string;
  /** Short headline */
  line: string;
  /** Optional supporting detail */
  detail?: string;
};

export type PulseHomeAction = {
  id: string;
  title: string;
  rationale: string;
  /** Exact command for Chat (same as elsewhere in the app) */
  command: string;
};

export type PulseHomeBoard = {
  /** Top-of-fold “what matters” lines */
  mattersNow: PulseHomeLine[];
  /** Gaps, risk, and hygiene */
  needsAttention: PulseHomeLine[];
  /** Forward momentum: pipeline, content, scale */
  momentum: PulseHomeLine[];
  /** Deterministic, data-grounded “AI recommends” (local scoring, on-device) */
  recommendedActions: PulseHomeAction[];
  meta: { generatedAt: string; todayRowCount: number; thisWeekRowCount: number };
};

function countBuckets(rows: PulseTimelineRow[], now: Date) {
  let today = 0;
  let week = 0;
  for (const row of rows) {
    const b = bucketForRow(row.sortKey, now);
    if (b === 'today') today++;
    else if (b === 'thisWeek') week++;
  }
  return { today, thisWeek: week };
}

/**
 * Assembles the Pulse “homepage” story from the same {@link MobileWorkspaceSnapshot} the shell already
 * builds (local intelligence heuristics — not a network LLM).
 */
export function buildPulseHomeBoard(snapshot: MobileWorkspaceSnapshot, now: Date = new Date()): PulseHomeBoard {
  const rows = snapshot.pulseTimelineRows;
  const { today: todayRowCount, thisWeek: thisWeekRowCount } = countBuckets(rows, now);

  const mattersNow: PulseHomeLine[] = [];

  if (snapshot.cadenceHeadline.trim()) {
    mattersNow.push({ id: 'cadence', line: snapshot.cadenceHeadline });
  }

  if (snapshot.nextPublishingHint) {
    mattersNow.push({
      id: 'next-pub',
      line: 'Next in publishing queue',
      detail: snapshot.nextPublishingHint
    });
  }

  mattersNow.push({
    id: 'horizon',
    line: 'Horizon in your queue',
    detail: `${todayRowCount} due today, ${thisWeekRowCount} more this week (follow-ups, publishing, scheduler, outreach).`
  });

  if (snapshot.opportunitiesToClose[0]) {
    const o = snapshot.opportunitiesToClose[0];
    mattersNow.push({
      id: 'closing',
      line: 'Top close candidate',
      detail: `${o.label} — ${trunc(o.reason, 120)}`
    });
  } else if (snapshot.pipelineProjection.activeDealCount > 0) {
    const p = snapshot.pipelineProjection;
    mattersNow.push({
      id: 'pipe-sum',
      line: 'Open pipeline (active deals)',
      detail: `${p.activeDealCount} deals · $${p.rawOpenValueUsd.toLocaleString()} open · $${p.weightedOpenValueUsd.toLocaleString()} confidence-weighted.`
    });
  }

  const needsAttention: PulseHomeLine[] = [];

  if (snapshot.missedTasks > 0) {
    needsAttention.push({
      id: 'missed',
      line: `${snapshot.missedTasks} missed scheduler task(s)`,
      detail: 'Reschedule or complete so the queue reflects reality.'
    });
  }

  if (snapshot.dueTodayTasks > 0) {
    needsAttention.push({
      id: 'due',
      line: `${snapshot.dueTodayTasks} scheduler item(s) due or due-soon`,
      detail: 'Check due times against your workday in Settings if this feels off.'
    });
  }

  const atRiskDeals = snapshot.pipelineSignals.filter((s) => s.score < 58).slice(0, 3);
  for (const s of atRiskDeals) {
    needsAttention.push({
      id: `deal-${s.id}`,
      line: `Deal health watch: ${trunc(s.label, 64)}`,
      detail: s.reason
    });
  }

  for (const r of snapshot.followUpRiskTop.slice(0, 2)) {
    if (r.score < 20) continue;
    needsAttention.push({
      id: `fu-${r.id}`,
      line: `Follow-up / timing risk: ${trunc(r.label, 72)}`,
      detail: r.reason
    });
  }

  const disconnected = snapshot.providerStatuses.filter((p) => p.status === 'disconnected' || p.status === 'error');
  if (disconnected.length > 0) {
    needsAttention.push({
      id: 'sync',
      line: 'Sync not connected for: ' + disconnected.map((p) => p.id).join(', '),
      detail: 'Connect in Settings to reduce manual drift and missed signals.'
    });
  }

  if (needsAttention.length === 0) {
    needsAttention.push({
      id: 'clear',
      line: 'No urgent hygiene flags',
      detail: 'Keep running pipeline health and your weekly queue review.'
    });
  }

  const momentum: PulseHomeLine[] = [];
  const p = snapshot.pipelineProjection;
  if (p.activeDealCount > 0) {
    momentum.push({
      id: 'weighted',
      line: 'Weighted pipeline up for negotiation',
      detail: `Confidence-weighted open value $${p.weightedOpenValueUsd.toLocaleString()} across ${p.activeDealCount} active deals.`
    });
  }

  for (const c of snapshot.contentTopSignals.slice(0, 2)) {
    momentum.push({
      id: `content-${c.id}`,
      line: `Content priority: ${trunc(c.label, 64)}`,
      detail: c.reason
    });
  }

  if (snapshot.queuedPublishing > 0) {
    momentum.push({
      id: 'queue',
      line: 'Publishing demand',
      detail: `${snapshot.queuedPublishing} item(s) queued or due soon — keep the calendar fed.`
    });
  }

  if (snapshot.integrationHubSources.filter((s) => s.status === 'connected' || s.status === 'monitoring').length > 0) {
    const n = snapshot.integrationHubSources.length;
    momentum.push({
      id: 'sources',
      line: 'Connected workstreams',
      detail: `${n} integration source(s) in the hub — live feed and artifacts compound over time.`
    });
  }

  if (momentum.length === 0) {
    momentum.push({
      id: 'seed',
      line: 'Add motion',
      detail: 'Create a follow-up, schedule a post, or log outreach — momentum shows up as you work.'
    });
  }

  const recommendedActions: PulseHomeAction[] = [];
  const seen = new Set<string>();

  const push = (a: PulseHomeAction) => {
    if (seen.has(a.id)) return;
    seen.add(a.id);
    recommendedActions.push(a);
  };

  if (snapshot.missedTasks > 0) {
    push({
      id: 'act-missed',
      title: 'Log a plan for missed tasks',
      rationale: 'Get scheduler and Pulse back in sync before they snowball.',
      command: 'add note: triage missed scheduler items — reschedule or mark done'
    });
  }

  const topRisk = snapshot.followUpRiskTop[0];
  if (topRisk && topRisk.score > 15) {
    const safe = topRisk.label.replace(/"/g, "'");
    push({
      id: 'act-fu',
      title: `Handle risk: ${trunc(safe, 48)}`,
      rationale: topRisk.reason,
      command: `add note: priority follow-up — ${safe}`
    });
  }

  if (snapshot.outreachUrgencyTop[0]) {
    const o = snapshot.outreachUrgencyTop[0];
    push({
      id: 'act-out',
      title: `Draft outreach: ${trunc(o.label, 48)}`,
      rationale: o.reason,
      command: 'draft outreach: follow up on warm lead with clear next step'
    });
  }

  push({
    id: 'act-pipe',
    title: 'Run pipeline health',
    rationale: 'Ranks opportunities and surfaces the next best actions.',
    command: 'pipeline health'
  });

  if (snapshot.incompleteFollowUps > 2) {
    push({
      id: 'act-fu2',
      title: 'Triage follow-ups',
      rationale: `You have ${snapshot.incompleteFollowUps} open follow-ups — keep dates honest.`,
      command: 'create follow up: clear stale follow-up dates in next session'
    });
  }

  if (snapshot.contentTopSignals[0]) {
    const sig = snapshot.contentTopSignals[0];
    push({
      id: 'act-content',
      title: 'Advance top content',
      rationale: sig.reason,
      command: `update content: move "${trunc(sig.label, 32)}" toward ready`
    });
  }

  return {
    mattersNow: mattersNow.slice(0, 6),
    needsAttention: needsAttention.slice(0, 6),
    momentum: momentum.slice(0, 5),
    recommendedActions: recommendedActions.slice(0, 5),
    meta: {
      generatedAt: startOfLocalDay(now).toISOString().slice(0, 10),
      todayRowCount,
      thisWeekRowCount
    }
  };
}
