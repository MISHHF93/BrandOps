import { quoteContextValue } from '../../services/interop/validation';
import type { BrandOpsData, SchedulerTask } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';
import { localIntelligence } from './localIntelligence';

export type BehavioralPatternKind =
  | 'user-action'
  | 'ask'
  | 'plan'
  | 'connected-platform'
  | 'workflow'
  | 'repeated-task'
  | 'operational-timing'
  | 'content'
  | 'outreach'
  | 'scheduling';

export type BehavioralSignalSource =
  | 'user-actions'
  | 'ask-behavior'
  | 'plan-behavior'
  | 'connected-platforms'
  | 'workflows'
  | 'repeated-tasks'
  | 'operational-timing'
  | 'content-patterns'
  | 'outreach-patterns'
  | 'scheduling-behavior';

export type BehavioralPredictionType =
  | 'next-action'
  | 'approval-review'
  | 'draft-prep'
  | 'schedule-adjustment'
  | 'workflow-prioritization';

export interface BehavioralPattern {
  id: string;
  kind: BehavioralPatternKind;
  label: string;
  confidence: number;
  evidence: string[];
  sources: BehavioralSignalSource[];
  lastObservedAt?: string;
}

export interface BehavioralPrediction {
  id: string;
  type: BehavioralPredictionType;
  title: string;
  rationale: string;
  confidence: number;
  sourcePatternIds: string[];
  approvalRequired: true;
  approvalGate: string;
  suggestedCommand: string;
}

export interface BehavioralIntelligenceEngineReadout {
  patterns: BehavioralPattern[];
  predictions: BehavioralPrediction[];
  signalCoverage: Record<BehavioralSignalSource, number>;
  averageConfidence: number;
  approvalPolicy: string;
  headline: string;
}

const SOURCE_KEYS: BehavioralSignalSource[] = [
  'user-actions',
  'ask-behavior',
  'plan-behavior',
  'connected-platforms',
  'workflows',
  'repeated-tasks',
  'operational-timing',
  'content-patterns',
  'outreach-patterns',
  'scheduling-behavior'
];

const APPROVAL_GATE =
  'Prediction only. The user must approve before BrandOps sends, posts, schedules, syncs, updates external systems, or mutates workspace records.';

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function uniq(values: string[], cap = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const t = compact(value);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 220));
    if (out.length >= cap) break;
  }
  return out;
}

function sortNewest<T extends { at?: string; createdAt?: string; updatedAt?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.at ?? a.updatedAt ?? a.createdAt ?? '').getTime();
    const tb = new Date(b.at ?? b.updatedAt ?? b.createdAt ?? '').getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
}

function countBy(values: string[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = compact(value);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([key, count]) => ({ key, count })).sort(
    (a, b) => b.count - a.count || a.key.localeCompare(b.key)
  );
}

function normalizeTaskTitle(title: string): string {
  return compact(
    title
      .toLowerCase()
      .replace(
        /\b(today|tomorrow|weekly|daily|monthly|monday|tuesday|wednesday|thursday|friday)\b/g,
        ''
      )
      .replace(/[^a-z0-9]+/g, ' ')
  );
}

function hourFromIso(iso?: string): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  const time = date.getTime();
  return Number.isFinite(time) ? date.getHours() : null;
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function latestIso(values: Array<string | undefined>): string | undefined {
  const times = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter(Number.isFinite);
  if (!times.length) return undefined;
  return new Date(Math.max(...times)).toISOString();
}

function confidenceFrom(count: number, base: number, step: number, cap = 92): number {
  return clamp(Math.min(cap, base + count * step));
}

function buildCommand(input: {
  title: string;
  rationale: string;
  confidence: number;
  evidence: string[];
}): string {
  return `ask: Review this Behavioral Intelligence Engine prediction and turn it into a PLAN preview only. Do not execute externally or mutate workspace records. Include approval requirements, source evidence, risks, editable draft steps, and receipt expectations.\n\nPrediction: ${quoteContextValue(input.title)}\nConfidence: ${input.confidence}%\nRationale: ${quoteContextValue(input.rationale)}\nEvidence: ${quoteContextValue(input.evidence.join(' | '))}\nApproval gate: ${APPROVAL_GATE}`;
}

function prediction(input: {
  id: string;
  type: BehavioralPredictionType;
  title: string;
  rationale: string;
  confidence: number;
  patterns: BehavioralPattern[];
}): BehavioralPrediction {
  const evidence = uniq(
    input.patterns.flatMap((pattern) => pattern.evidence),
    6
  );
  return {
    id: input.id,
    type: input.type,
    title: input.title,
    rationale: input.rationale,
    confidence: clamp(input.confidence),
    sourcePatternIds: input.patterns.map((pattern) => pattern.id),
    approvalRequired: true,
    approvalGate: APPROVAL_GATE,
    suggestedCommand: buildCommand({
      title: input.title,
      rationale: input.rationale,
      confidence: input.confidence,
      evidence
    })
  };
}

function buildSignalCoverage(workspace: BrandOpsData): Record<BehavioralSignalSource, number> {
  const traces = workspace.operatorTraces?.entries ?? [];
  const askTraces = workspace.aiAssistantTraces?.entries ?? [];
  const pendingPlanReviews = traces.filter((trace) => trace.reviewStatus === 'pending').length;
  const pipelineRuns = workspace.aiPipelineRuns?.entries?.length ?? 0;
  const connectedPlatformRows =
    workspace.integrationHub.sources.length +
    workspace.integrationHub.artifacts.length +
    workspace.integrationHub.liveFeed.length;
  const schedulerRows = workspace.scheduler.tasks.length;
  const repeatedTaskRows = countBy([
    ...workspace.scheduler.tasks.map((task) => normalizeTaskTitle(task.title)),
    ...traces.map((trace) => trace.verb)
  ]).filter((entry) => entry.count >= 2).length;
  const timingRows = [
    ...traces.map((trace) => trace.at),
    ...workspace.scheduler.tasks.map((task) => task.dueAt),
    ...workspace.publishingQueue.map((item) => item.scheduledFor),
    ...workspace.followUps.map((item) => item.dueAt)
  ].filter(Boolean).length;

  return {
    'user-actions': traces.length,
    'ask-behavior': askTraces.length,
    'plan-behavior': pendingPlanReviews + pipelineRuns,
    'connected-platforms': connectedPlatformRows,
    workflows: schedulerRows + workspace.followUps.length + workspace.opportunities.length,
    'repeated-tasks': repeatedTaskRows,
    'operational-timing': timingRows,
    'content-patterns': workspace.contentLibrary.length + workspace.publishingQueue.length,
    'outreach-patterns': workspace.outreachDrafts.length + workspace.outreachHistory.length,
    'scheduling-behavior': schedulerRows
  };
}

function addUserActionPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const recent = sortNewest((workspace.operatorTraces?.entries ?? []).slice(0, 160));
  const topVerb = countBy(recent.map((trace) => trace.verb))[0];
  if (!topVerb || topVerb.count < 2) return;

  const matching = recent.filter((trace) => trace.verb === topVerb.key);
  patterns.push({
    id: `behavior-user-action-${topVerb.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    kind: 'user-action',
    label: `Repeated action: ${topVerb.key}`,
    confidence: confidenceFrom(topVerb.count, 48, 8),
    evidence: uniq(
      matching.map(
        (trace) =>
          `${trace.source}${trace.surface ? ` on ${trace.surface}` : ''}${trace.outcome ? ` ${trace.outcome}` : ''}`
      ),
      5
    ),
    sources: ['user-actions'],
    lastObservedAt: latestIso(matching.map((trace) => trace.at))
  });
}

function addAskPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const asks = sortNewest(workspace.aiAssistantTraces?.entries ?? []).slice(0, 40);
  if (asks.length === 0) return;
  const successful = asks.filter((entry) => entry.outcome === 'success').length;
  const modelHints = uniq(
    asks.map((entry) => entry.model_id ?? entry.worker_id ?? ''),
    3
  );

  patterns.push({
    id: 'behavior-ask-usage',
    kind: 'ask',
    label: 'ASK behavior available for prediction',
    confidence: confidenceFrom(asks.length + successful, 46, 5),
    evidence: uniq(
      [
        `${asks.length} ASK trace${asks.length === 1 ? '' : 's'}`,
        `${successful} successful ASK turn${successful === 1 ? '' : 's'}`,
        ...modelHints.map((hint) => `Model/worker: ${hint}`),
        ...asks.slice(0, 2).map((entry) => `Recent ASK: ${entry.user_turn_preview}`)
      ],
      6
    ),
    sources: ['ask-behavior'],
    lastObservedAt: latestIso(asks.map((entry) => entry.at))
  });
}

function addPlanPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const traces = workspace.operatorTraces?.entries ?? [];
  const pending = traces.filter((trace) => trace.reviewStatus === 'pending');
  const approved = traces.filter((trace) => trace.reviewStatus === 'approved');
  const rejected = traces.filter((trace) => trace.reviewStatus === 'rejected');
  const runs = workspace.aiPipelineRuns?.entries ?? [];
  if (!pending.length && !approved.length && !rejected.length && !runs.length) return;

  patterns.push({
    id: 'behavior-plan-approval-flow',
    kind: 'plan',
    label: 'PLAN approval behavior detected',
    confidence: confidenceFrom(
      pending.length + approved.length + rejected.length + runs.length,
      52,
      7
    ),
    evidence: uniq(
      [
        `${pending.length} pending approval${pending.length === 1 ? '' : 's'}`,
        `${approved.length} approved trace${approved.length === 1 ? '' : 's'}`,
        `${rejected.length} rejected trace${rejected.length === 1 ? '' : 's'}`,
        `${runs.length} AI pipeline run${runs.length === 1 ? '' : 's'}`
      ],
      5
    ),
    sources: ['plan-behavior'],
    lastObservedAt: latestIso([
      ...traces.map((trace) => trace.at),
      ...runs.map((run) => run.started_at)
    ])
  });
}

function addPlatformPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const platform = buildPlatformAwareAskReadout(workspace);
  if (!platform.connectedApps.length && !platform.recentActivity.length) return;

  patterns.push({
    id: 'behavior-connected-platforms',
    kind: 'connected-platform',
    label: 'Connected platform context can inform next actions',
    confidence: confidenceFrom(
      platform.connectedApps.length + platform.recentActivity.length,
      50,
      5
    ),
    evidence: uniq(
      [
        `Connected apps: ${platform.connectedApps.join(', ') || 'none'}`,
        ...platform.recentActivity.slice(0, 4),
        ...platform.workflowState.slice(0, 3)
      ],
      7
    ),
    sources: ['connected-platforms'],
    lastObservedAt: latestIso(workspace.integrationHub.liveFeed.map((item) => item.happenedAt))
  });
}

function addWorkflowPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const openTasks = workspace.scheduler.tasks.filter((task) => task.status !== 'completed');
  const risk = localIntelligence.overdueRisk(workspace).slice(0, 4);
  const activeOpportunities = workspace.opportunities.filter((item) => !item.archivedAt);
  if (!openTasks.length && !risk.length && !activeOpportunities.length) return;

  patterns.push({
    id: 'behavior-workflow-state',
    kind: 'workflow',
    label: 'Operational workflow state has actionable pressure',
    confidence: confidenceFrom(openTasks.length + risk.length + activeOpportunities.length, 50, 4),
    evidence: uniq(
      [
        `${openTasks.length} open scheduler task${openTasks.length === 1 ? '' : 's'}`,
        `${activeOpportunities.length} active opportunit${activeOpportunities.length === 1 ? 'y' : 'ies'}`,
        ...risk.map((signal) => `${signal.label}: ${signal.reason}`)
      ],
      6
    ),
    sources: ['workflows'],
    lastObservedAt: latestIso(openTasks.map((task) => task.updatedAt))
  });
}

function addRepeatedTaskPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const taskCounts = countBy(
    workspace.scheduler.tasks.map((task) => normalizeTaskTitle(task.title))
  );
  const traceCounts = countBy((workspace.operatorTraces?.entries ?? []).map((trace) => trace.verb));
  const topTask = taskCounts.find((entry) => entry.count >= 2);
  const topTrace = traceCounts.find((entry) => entry.count >= 2);
  const top = topTask ?? topTrace;
  if (!top) return;

  const evidence: string[] = [];
  if (topTask) evidence.push(`${topTask.count} scheduler task titles match "${topTask.key}"`);
  if (topTrace) evidence.push(`${topTrace.count} operator traces match "${topTrace.key}"`);

  patterns.push({
    id: `behavior-repeated-task-${top.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    kind: 'repeated-task',
    label: `Repeated task pattern: ${top.key}`,
    confidence: confidenceFrom(top.count, 56, 9),
    evidence,
    sources: ['repeated-tasks', 'user-actions', 'workflows'],
    lastObservedAt: latestIso([
      ...workspace.scheduler.tasks.map((task) => task.updatedAt),
      ...(workspace.operatorTraces?.entries ?? []).map((trace) => trace.at)
    ])
  });
}

function addOperationalTimingPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const hours = [
    ...(workspace.operatorTraces?.entries ?? []).map((trace) => hourFromIso(trace.at)),
    ...workspace.scheduler.tasks.map((task) => hourFromIso(task.dueAt)),
    ...workspace.scheduler.tasks.map((task) => hourFromIso(task.remindAt)),
    ...workspace.publishingQueue.map((item) => hourFromIso(item.scheduledFor)),
    ...workspace.followUps.map((item) => hourFromIso(item.dueAt))
  ].filter((hour): hour is number => hour !== null);
  const top = countBy(hours.map(String))[0];
  if (!top || top.count < 2) return;
  const hour = Number(top.key);

  patterns.push({
    id: `behavior-operational-timing-${top.key}`,
    kind: 'operational-timing',
    label: `Operational timing cluster around ${hourLabel(hour)}`,
    confidence: confidenceFrom(top.count, 54, 6),
    evidence: [
      `${top.count} observed action/task/schedule timestamp${top.count === 1 ? '' : 's'} around ${hourLabel(hour)}`,
      `Workday ${workspace.settings.notificationCenter.workdayStartHour}:00-${workspace.settings.notificationCenter.workdayEndHour}:00 ${workspace.settings.timezone}`
    ],
    sources: ['operational-timing', 'scheduling-behavior'],
    lastObservedAt: latestIso([
      ...(workspace.operatorTraces?.entries ?? []).map((trace) => trace.at),
      ...workspace.scheduler.tasks.map((task) => task.updatedAt)
    ])
  });
}

function addContentPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const activeContent = workspace.contentLibrary.filter((item) => item.status !== 'archived');
  const queued = workspace.publishingQueue.filter(
    (item) => item.status !== 'posted' && item.status !== 'skipped'
  );
  if (!activeContent.length && !queued.length) return;
  const topTag = countBy(activeContent.flatMap((item) => item.tags))[0];
  const ready = activeContent.filter((item) => item.status === 'ready').length;

  patterns.push({
    id: 'behavior-content-patterns',
    kind: 'content',
    label: topTag ? `Recurring content theme: ${topTag.key}` : 'Content backlog pattern detected',
    confidence: confidenceFrom(activeContent.length + queued.length + ready, 50, 4),
    evidence: uniq(
      [
        `${activeContent.length} active content item${activeContent.length === 1 ? '' : 's'}`,
        `${queued.length} publishing queue item${queued.length === 1 ? '' : 's'}`,
        `${ready} ready content item${ready === 1 ? '' : 's'}`,
        topTag
          ? `${topTag.count} content tag occurrence${topTag.count === 1 ? '' : 's'} for "${topTag.key}"`
          : ''
      ],
      5
    ),
    sources: ['content-patterns'],
    lastObservedAt: latestIso([
      ...activeContent.map((item) => item.updatedAt),
      ...queued.map((item) => item.updatedAt)
    ])
  });
}

function addOutreachPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const activeDrafts = workspace.outreachDrafts.filter((item) => item.status !== 'archived');
  const history = workspace.outreachHistory;
  if (!activeDrafts.length && !history.length) return;
  const topCategory = countBy(activeDrafts.map((item) => item.category))[0];
  const ready = activeDrafts.filter((item) => item.status === 'ready').length;

  patterns.push({
    id: 'behavior-outreach-patterns',
    kind: 'outreach',
    label: topCategory
      ? `Outreach pattern: ${topCategory.key}`
      : 'Outreach activity pattern detected',
    confidence: confidenceFrom(activeDrafts.length + history.length + ready, 50, 5),
    evidence: uniq(
      [
        `${activeDrafts.length} active outreach draft${activeDrafts.length === 1 ? '' : 's'}`,
        `${ready} ready outreach draft${ready === 1 ? '' : 's'}`,
        `${history.length} outreach history entr${history.length === 1 ? 'y' : 'ies'}`,
        topCategory
          ? `${topCategory.count} draft${topCategory.count === 1 ? '' : 's'} in ${topCategory.key}`
          : ''
      ],
      5
    ),
    sources: ['outreach-patterns'],
    lastObservedAt: latestIso([
      ...activeDrafts.map((item) => item.updatedAt),
      ...history.map((item) => item.loggedAt)
    ])
  });
}

function addSchedulingPattern(workspace: BrandOpsData, patterns: BehavioralPattern[]) {
  const tasks = workspace.scheduler.tasks;
  const risky = tasks.filter((task) =>
    ['missed', 'due', 'due-soon', 'snoozed'].includes(task.status)
  );
  if (!tasks.length) return;
  const snoozes = tasks.reduce((sum, task) => sum + Math.max(0, task.snoozeCount), 0);

  patterns.push({
    id: 'behavior-scheduling',
    kind: 'scheduling',
    label: risky.length ? 'Schedule pressure detected' : 'Scheduling behavior is available',
    confidence: confidenceFrom(risky.length + snoozes + tasks.length, 48, 5),
    evidence: uniq(
      [
        `${tasks.length} scheduler task${tasks.length === 1 ? '' : 's'}`,
        `${risky.length} due/missed/snoozed task${risky.length === 1 ? '' : 's'}`,
        `${snoozes} total snooze${snoozes === 1 ? '' : 's'}`,
        ...risky.slice(0, 3).map((task: SchedulerTask) => `${task.title}: ${task.status}`)
      ],
      6
    ),
    sources: ['scheduling-behavior'],
    lastObservedAt: latestIso(tasks.map((task) => task.updatedAt))
  });
}

function buildPredictions(patterns: BehavioralPattern[]): BehavioralPrediction[] {
  const byKind = new Map<BehavioralPatternKind, BehavioralPattern>();
  for (const pattern of patterns) {
    const current = byKind.get(pattern.kind);
    if (!current || pattern.confidence > current.confidence) byKind.set(pattern.kind, pattern);
  }

  const predictions: BehavioralPrediction[] = [];
  const plan = byKind.get('plan');
  if (plan) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-review-approvals',
        type: 'approval-review',
        title: 'Review approval-gated PLAN items first',
        rationale:
          'PLAN behavior indicates approvals or execution receipts are part of the current operating loop.',
        confidence: plan.confidence,
        patterns: [plan]
      })
    );
  }

  const repeated = byKind.get('repeated-task');
  const timing = byKind.get('operational-timing');
  if (repeated) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-reusable-workflow',
        type: 'workflow-prioritization',
        title: 'Prepare a reusable workflow for the repeated task',
        rationale:
          'Repeated tasks and actions suggest a good candidate for a saved workflow or checklist, pending user review.',
        confidence: repeated.confidence,
        patterns: timing ? [repeated, timing] : [repeated]
      })
    );
  }

  const scheduling = byKind.get('scheduling');
  if (scheduling) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-schedule-adjustment',
        type: 'schedule-adjustment',
        title: 'Adjust the next operating schedule',
        rationale:
          'Scheduling behavior shows due, missed, snoozed, or clustered work that should be reviewed before new commitments are added.',
        confidence: scheduling.confidence,
        patterns: timing ? [scheduling, timing] : [scheduling]
      })
    );
  }

  const outreach = byKind.get('outreach');
  if (outreach) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-outreach-next-move',
        type: 'draft-prep',
        title: 'Draft the next outreach move for approval',
        rationale:
          'Outreach drafts and history indicate a likely next communication step, but sending remains approval gated.',
        confidence: outreach.confidence,
        patterns: [outreach]
      })
    );
  }

  const content = byKind.get('content');
  if (content) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-content-next-action',
        type: 'draft-prep',
        title: 'Turn the strongest content pattern into a PLAN preview',
        rationale:
          'Content and publishing patterns suggest the next useful move is drafting or sequencing content for review.',
        confidence: content.confidence,
        patterns: [content]
      })
    );
  }

  const platform = byKind.get('connected-platform');
  const workflow = byKind.get('workflow');
  if (platform || workflow) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-operational-priority',
        type: 'next-action',
        title: 'Prioritize the highest-evidence operational next action',
        rationale:
          'Connected platform context and workflow pressure can be combined into one approval-gated PLAN preview.',
        confidence: Math.max(platform?.confidence ?? 0, workflow?.confidence ?? 0),
        patterns: [platform, workflow].filter((p): p is BehavioralPattern => Boolean(p))
      })
    );
  }

  const ask = byKind.get('ask');
  if (ask) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-ask-to-plan',
        type: 'next-action',
        title: 'Convert recurring ASK context into a PLAN preview',
        rationale:
          'ASK behavior can seed a proposed plan, but execution and workspace changes stay behind user approval.',
        confidence: ask.confidence,
        patterns: [ask]
      })
    );
  }

  const action = byKind.get('user-action');
  if (action) {
    predictions.push(
      prediction({
        id: 'behavior-prediction-resume-frequent-action',
        type: 'next-action',
        title: 'Resume the frequent action with a preview first',
        rationale:
          'Recent user or assistant actions repeat enough to suggest a likely next action, pending explicit review.',
        confidence: action.confidence,
        patterns: [action]
      })
    );
  }

  return predictions
    .sort((a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title))
    .slice(0, 8);
}

export function buildBehavioralIntelligenceEngineReadout(
  workspace: BrandOpsData
): BehavioralIntelligenceEngineReadout {
  const patterns: BehavioralPattern[] = [];
  addUserActionPattern(workspace, patterns);
  addAskPattern(workspace, patterns);
  addPlanPattern(workspace, patterns);
  addPlatformPattern(workspace, patterns);
  addWorkflowPattern(workspace, patterns);
  addRepeatedTaskPattern(workspace, patterns);
  addOperationalTimingPattern(workspace, patterns);
  addContentPattern(workspace, patterns);
  addOutreachPattern(workspace, patterns);
  addSchedulingPattern(workspace, patterns);

  const sortedPatterns = patterns
    .sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label))
    .slice(0, 12);
  const predictions = buildPredictions(sortedPatterns);
  const averageConfidence = predictions.length
    ? clamp(predictions.reduce((sum, item) => sum + item.confidence, 0) / predictions.length)
    : 0;
  const signalCoverage = buildSignalCoverage(workspace);
  const activeSourceCount = SOURCE_KEYS.filter((key) => signalCoverage[key] > 0).length;

  return {
    patterns: sortedPatterns,
    predictions,
    signalCoverage,
    averageConfidence,
    approvalPolicy: APPROVAL_GATE,
    headline: predictions.length
      ? `${predictions.length} approval-gated next-action prediction${predictions.length === 1 ? '' : 's'} from ${activeSourceCount} behavioral source${activeSourceCount === 1 ? '' : 's'}.`
      : 'Behavioral Intelligence Engine is watching local signals; add activity, ASK traces, PLAN approvals, or connected context to generate approval-gated predictions.'
  };
}
