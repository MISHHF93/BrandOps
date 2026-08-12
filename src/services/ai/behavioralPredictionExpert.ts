import type { BrandOpsData, SchedulerTask } from '../../types/domain';
import { buildBehavioralIntelligenceEngineReadout } from '../intelligence/behavioralIntelligenceEngine';
import { localIntelligence } from '../intelligence/localIntelligence';
import { buildPredictiveContentIdeationReadout } from '../plan/predictiveContentIdeationEngine';
import { buildWorkflowPredictionLayerReadout } from '../plan/workflowPredictionLayer';

export type BehavioralPredictionCategory =
  | 'next-likely-task'
  | 'workflow-opportunity'
  | 'reusable-plan'
  | 'operational-bottleneck'
  | 'content-idea'
  | 'outreach-timing';

export type BehavioralPredictionSignalKind =
  | 'repeated-actions'
  | 'operational-habits'
  | 'scheduling-patterns'
  | 'content-behavior'
  | 'outreach-frequency'
  | 'workflow-repetition';

export interface BehavioralPredictionSignal {
  kind: BehavioralPredictionSignalKind;
  label: string;
  strength: number;
  evidence: string[];
}

export interface BehavioralExpertPrediction {
  id: string;
  category: BehavioralPredictionCategory;
  title: string;
  suggestion: string;
  confidence: number;
  evidence: string[];
  dataUsed: BehavioralPredictionSignalKind[];
  approvalRequired: true;
  autonomyPolicy: string;
  planPreviewCommand: string;
}

export interface BehavioralPredictionExpertReadout {
  expertId: 'behavioral-expert';
  signals: BehavioralPredictionSignal[];
  nextLikelyTasks: BehavioralExpertPrediction[];
  workflowOpportunities: BehavioralExpertPrediction[];
  reusablePlans: BehavioralExpertPrediction[];
  operationalBottlenecks: BehavioralExpertPrediction[];
  contentIdeas: BehavioralExpertPrediction[];
  outreachTiming: BehavioralExpertPrediction[];
  allPredictions: BehavioralExpertPrediction[];
  averageConfidence: number;
  approvalPolicy: string;
  headline: string;
}

const APPROVAL_POLICY =
  'Behavioral Prediction Expert outputs suggestions only. The user must approve before BrandOps sends, posts, schedules, syncs, saves, templates, automates, updates external systems, or mutates workspace records.';

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compact(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniq(values: unknown[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const t = compact(value);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 260));
    if (out.length >= cap) break;
  }
  return out;
}

function countBy(values: unknown[]): Array<{ key: string; count: number }> {
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

function confidenceFrom(signalCount: number, base = 54, step = 5): number {
  return clamp(base + Math.min(signalCount * step, 38));
}

function commandFor(input: {
  title: string;
  category: BehavioralPredictionCategory;
  suggestion: string;
  confidence: number;
  evidence: string[];
}): string {
  return `ask: Review this Behavioral Prediction Expert suggestion and turn it into a PLAN preview only. Do not execute externally, send, publish, schedule, sync, save, automate, or mutate workspace records without explicit approval.\n\nCategory: ${input.category}\nTitle: ${input.title}\nSuggestion: ${input.suggestion}\nConfidence: ${input.confidence}%\nEvidence: ${input.evidence.join(' | ')}\nApproval policy: ${APPROVAL_POLICY}`;
}

function prediction(
  input: Omit<
    BehavioralExpertPrediction,
    'approvalRequired' | 'autonomyPolicy' | 'planPreviewCommand'
  >
): BehavioralExpertPrediction {
  const evidence = input.evidence.length
    ? uniq(input.evidence, 8)
    : [
        'Add more local behavior, schedule, content, outreach, or workflow history to strengthen this suggestion.'
      ];
  const draft = {
    ...input,
    evidence,
    confidence: clamp(input.confidence),
    dataUsed: Array.from(new Set(input.dataUsed)),
    approvalRequired: true as const,
    autonomyPolicy: APPROVAL_POLICY
  };
  return {
    ...draft,
    planPreviewCommand: commandFor(draft)
  };
}

function signal(
  input: Omit<BehavioralPredictionSignal, 'evidence'> & { evidence: unknown[] }
): BehavioralPredictionSignal {
  return {
    ...input,
    strength: clamp(input.strength),
    evidence: uniq(input.evidence, 8)
  };
}

function repeatedActionsSignal(workspace: BrandOpsData): BehavioralPredictionSignal | null {
  const traces = workspace.operatorTraces?.entries ?? [];
  const repeated = countBy(traces.map((trace) => trace.verb)).filter((row) => row.count >= 2);
  if (!repeated.length) return null;
  const top = repeated[0];
  return signal({
    kind: 'repeated-actions',
    label: `Repeated action: ${top.key}`,
    strength: confidenceFrom(top.count, 50, 9),
    evidence: repeated.map((row) => `${row.count} trace${row.count === 1 ? '' : 's'}: ${row.key}`)
  });
}

function operationalHabitsSignal(workspace: BrandOpsData): BehavioralPredictionSignal | null {
  const behavioral = buildBehavioralIntelligenceEngineReadout(workspace);
  const habitPatterns = behavioral.patterns.filter((pattern) =>
    ['user-action', 'operational-timing', 'scheduling', 'workflow', 'repeated-task'].includes(
      pattern.kind
    )
  );
  if (!habitPatterns.length) return null;
  return signal({
    kind: 'operational-habits',
    label: `${habitPatterns.length} operational habit signal${habitPatterns.length === 1 ? '' : 's'}`,
    strength: confidenceFrom(habitPatterns.length, behavioral.averageConfidence || 48, 4),
    evidence: habitPatterns.flatMap((pattern) => [pattern.label, ...pattern.evidence])
  });
}

function schedulingPatternSignal(workspace: BrandOpsData): BehavioralPredictionSignal | null {
  const tasks = workspace.scheduler.tasks;
  if (!tasks.length) return null;
  const risky = tasks.filter((task) =>
    ['missed', 'due', 'due-soon', 'snoozed'].includes(task.status)
  );
  const repeated = countBy(tasks.map((task) => normalizeTaskTitle(task.title))).filter(
    (row) => row.count >= 2
  );
  const hours = [
    ...tasks.map((task) => hourFromIso(task.dueAt)),
    ...tasks.map((task) => hourFromIso(task.remindAt))
  ].filter((hour): hour is number => hour !== null);
  const topHour = countBy(hours.map(String))[0];
  return signal({
    kind: 'scheduling-patterns',
    label: risky.length ? 'Schedule pressure pattern' : 'Scheduling pattern',
    strength: confidenceFrom(risky.length + repeated.length + (topHour?.count ?? 0), 52, 6),
    evidence: [
      `${tasks.length} scheduler task${tasks.length === 1 ? '' : 's'}`,
      `${risky.length} due/missed/snoozed task${risky.length === 1 ? '' : 's'}`,
      ...repeated.map((row) => `${row.count} repeated task title pattern: ${row.key}`),
      topHour
        ? `${topHour.count} timing signal${topHour.count === 1 ? '' : 's'} around ${topHour.key}:00`
        : ''
    ]
  });
}

function contentBehaviorSignal(workspace: BrandOpsData): BehavioralPredictionSignal | null {
  const activeContent = workspace.contentLibrary.filter((item) => item.status !== 'archived');
  const queued = workspace.publishingQueue.filter(
    (item) => item.status !== 'posted' && item.status !== 'skipped'
  );
  if (!activeContent.length && !queued.length) return null;
  const topTags = countBy(activeContent.flatMap((item) => item.tags)).slice(0, 3);
  const ready = activeContent.filter((item) => item.status === 'ready').length;
  return signal({
    kind: 'content-behavior',
    label: topTags[0] ? `Content behavior: ${topTags[0].key}` : 'Content behavior pattern',
    strength: confidenceFrom(activeContent.length + queued.length + ready, 50, 4),
    evidence: [
      `${activeContent.length} active content item${activeContent.length === 1 ? '' : 's'}`,
      `${queued.length} publishing queue item${queued.length === 1 ? '' : 's'}`,
      `${ready} ready content item${ready === 1 ? '' : 's'}`,
      ...topTags.map(
        (row) => `${row.count} tag occurrence${row.count === 1 ? '' : 's'}: ${row.key}`
      )
    ]
  });
}

function outreachFrequencySignal(workspace: BrandOpsData): BehavioralPredictionSignal | null {
  const activeDrafts = workspace.outreachDrafts.filter((draft) => draft.status !== 'archived');
  const history = workspace.outreachHistory;
  const openFollowUps = workspace.followUps.filter((followUp) => !followUp.completed);
  if (!activeDrafts.length && !history.length && !openFollowUps.length) return null;
  const categories = countBy(activeDrafts.map((draft) => draft.category)).slice(0, 3);
  const ready = activeDrafts.filter((draft) => draft.status === 'ready').length;
  return signal({
    kind: 'outreach-frequency',
    label: categories[0]
      ? `Outreach frequency: ${categories[0].key}`
      : 'Outreach frequency pattern',
    strength: confidenceFrom(
      activeDrafts.length + history.length + openFollowUps.length + ready,
      50,
      5
    ),
    evidence: [
      `${activeDrafts.length} active outreach draft${activeDrafts.length === 1 ? '' : 's'}`,
      `${ready} ready outreach draft${ready === 1 ? '' : 's'}`,
      `${history.length} outreach history entr${history.length === 1 ? 'y' : 'ies'}`,
      `${openFollowUps.length} open follow-up${openFollowUps.length === 1 ? '' : 's'}`,
      ...categories.map((row) => `${row.count} draft${row.count === 1 ? '' : 's'} in ${row.key}`)
    ]
  });
}

function workflowRepetitionSignal(workspace: BrandOpsData): BehavioralPredictionSignal | null {
  const workflows = buildWorkflowPredictionLayerReadout(workspace);
  if (!workflows.predictions.length) return null;
  return signal({
    kind: 'workflow-repetition',
    label: `${workflows.predictions.length} reusable workflow candidate${workflows.predictions.length === 1 ? '' : 's'}`,
    strength: workflows.averageConfidence,
    evidence: workflows.predictions.flatMap((workflow) => [
      workflow.title,
      workflow.repeatedPattern,
      ...workflow.evidence.slice(0, 2)
    ])
  });
}

function buildSignals(workspace: BrandOpsData): BehavioralPredictionSignal[] {
  return [
    repeatedActionsSignal(workspace),
    operationalHabitsSignal(workspace),
    schedulingPatternSignal(workspace),
    contentBehaviorSignal(workspace),
    outreachFrequencySignal(workspace),
    workflowRepetitionSignal(workspace)
  ]
    .filter((item): item is BehavioralPredictionSignal => Boolean(item))
    .sort((a, b) => b.strength - a.strength || a.label.localeCompare(b.label));
}

function nextLikelyTasks(workspace: BrandOpsData): BehavioralExpertPrediction[] {
  const behavioral = buildBehavioralIntelligenceEngineReadout(workspace);
  const dueTasks = workspace.scheduler.tasks
    .filter((task) => ['due', 'due-soon', 'missed', 'snoozed'].includes(task.status))
    .slice(0, 3);
  return [
    ...behavioral.predictions.slice(0, 3).map((item) =>
      prediction({
        id: `behavioral-expert-next-${item.id}`,
        category: 'next-likely-task',
        title: item.title,
        suggestion: item.rationale,
        confidence: item.confidence,
        evidence: item.sourcePatternIds,
        dataUsed: ['operational-habits', 'workflow-repetition']
      })
    ),
    ...dueTasks.map((task: SchedulerTask) =>
      prediction({
        id: `behavioral-expert-next-task-${task.id}`,
        category: 'next-likely-task',
        title: `Review ${task.title}`,
        suggestion: `This task is ${task.status}; prepare a PLAN preview before changing its schedule or status.`,
        confidence: task.status === 'missed' ? 88 : task.status === 'due' ? 78 : 66,
        evidence: [`${task.status}: ${task.detail}`, `Due ${task.dueAt}`],
        dataUsed: ['scheduling-patterns']
      })
    )
  ]
    .sort((a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title))
    .slice(0, 5);
}

function workflowOpportunities(workspace: BrandOpsData): BehavioralExpertPrediction[] {
  const workflows = buildWorkflowPredictionLayerReadout(workspace);
  return workflows.predictions.slice(0, 5).map((workflow) =>
    prediction({
      id: `behavioral-expert-workflow-${workflow.id}`,
      category: 'workflow-opportunity',
      title: workflow.title,
      suggestion: workflow.suggestion,
      confidence: workflow.confidence,
      evidence: workflow.evidence,
      dataUsed: ['workflow-repetition', 'operational-habits']
    })
  );
}

function reusablePlans(workspace: BrandOpsData): BehavioralExpertPrediction[] {
  const workflows = buildWorkflowPredictionLayerReadout(workspace);
  return workflows.predictions.slice(0, 5).map((workflow) =>
    prediction({
      id: `behavioral-expert-plan-${workflow.id}`,
      category: 'reusable-plan',
      title: workflow.reusableTemplateName,
      suggestion: `Prepare a reusable PLAN draft with steps: ${workflow.recommendedSteps.join(' -> ')}.`,
      confidence: workflow.confidence,
      evidence: [...workflow.triggerSignals, ...workflow.evidence],
      dataUsed: ['workflow-repetition', 'repeated-actions']
    })
  );
}

function operationalBottlenecks(workspace: BrandOpsData): BehavioralExpertPrediction[] {
  const risk = localIntelligence.overdueRisk(workspace).slice(0, 5);
  const pending = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'pending'
  );
  const overloaded =
    workspace.scheduler.tasks.filter((task) => task.status !== 'completed').length >
    workspace.settings.notificationCenter.maxDailyTasks;
  return [
    ...risk.map((signal) =>
      prediction({
        id: `behavioral-expert-bottleneck-risk-${signal.id}`,
        category: 'operational-bottleneck',
        title: signal.label,
        suggestion:
          'Review this bottleneck and create a recovery sequence before adding more work.',
        confidence: signal.score,
        evidence: [signal.reason],
        dataUsed: ['scheduling-patterns', 'operational-habits']
      })
    ),
    ...(pending.length
      ? [
          prediction({
            id: 'behavioral-expert-bottleneck-approvals',
            category: 'operational-bottleneck',
            title: 'Clear pending approvals',
            suggestion:
              'Review pending approval traces before reusing memory or executing related workflows.',
            confidence: confidenceFrom(pending.length, 64, 7),
            evidence: pending.map(
              (trace) => `${trace.verb}${trace.surface ? ` on ${trace.surface}` : ''}`
            ),
            dataUsed: ['operational-habits', 'workflow-repetition']
          })
        ]
      : []),
    ...(overloaded
      ? [
          prediction({
            id: 'behavioral-expert-bottleneck-capacity',
            category: 'operational-bottleneck',
            title: 'Open task load exceeds operating capacity',
            suggestion: 'Create a prioritization PLAN before accepting or scheduling more tasks.',
            confidence: 84,
            evidence: [
              `${workspace.scheduler.tasks.filter((task) => task.status !== 'completed').length} open tasks`,
              `${workspace.settings.notificationCenter.maxDailyTasks} max daily tasks`
            ],
            dataUsed: ['scheduling-patterns']
          })
        ]
      : [])
  ]
    .sort((a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function contentIdeas(workspace: BrandOpsData): BehavioralExpertPrediction[] {
  const content = buildPredictiveContentIdeationReadout(workspace);
  return content.allIdeas.slice(0, 5).map((idea) =>
    prediction({
      id: `behavioral-expert-content-${idea.id}`,
      category: 'content-idea',
      title: idea.title,
      suggestion: idea.idea,
      confidence: idea.confidence,
      evidence: idea.evidenceUsed,
      dataUsed: ['content-behavior', 'operational-habits']
    })
  );
}

function outreachTiming(workspace: BrandOpsData): BehavioralExpertPrediction[] {
  const outreach = localIntelligence.outreachUrgency(workspace.outreachDrafts).slice(0, 5);
  const signal = outreachFrequencySignal(workspace);
  return outreach.map((item) =>
    prediction({
      id: `behavioral-expert-outreach-${item.id}`,
      category: 'outreach-timing',
      title: `Review outreach timing for ${item.label}`,
      suggestion:
        'Prepare the next outreach step for approval; do not send until the operator approves the final message and timing.',
      confidence: item.score,
      evidence: signal ? [item.reason, ...signal.evidence] : [item.reason],
      dataUsed: ['outreach-frequency', 'scheduling-patterns']
    })
  );
}

function allPredictions(
  groups: Omit<
    BehavioralPredictionExpertReadout,
    'allPredictions' | 'averageConfidence' | 'approvalPolicy' | 'headline' | 'signals' | 'expertId'
  >
): BehavioralExpertPrediction[] {
  return [
    ...groups.nextLikelyTasks,
    ...groups.workflowOpportunities,
    ...groups.reusablePlans,
    ...groups.operationalBottlenecks,
    ...groups.contentIdeas,
    ...groups.outreachTiming
  ]
    .sort((a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title))
    .slice(0, 24);
}

export function buildBehavioralPredictionExpertReadout(
  workspace: BrandOpsData
): BehavioralPredictionExpertReadout {
  const signals = buildSignals(workspace);
  const groups = {
    nextLikelyTasks: nextLikelyTasks(workspace),
    workflowOpportunities: workflowOpportunities(workspace),
    reusablePlans: reusablePlans(workspace),
    operationalBottlenecks: operationalBottlenecks(workspace),
    contentIdeas: contentIdeas(workspace),
    outreachTiming: outreachTiming(workspace)
  };
  const predictions = allPredictions(groups);
  const averageConfidence = predictions.length
    ? clamp(predictions.reduce((sum, item) => sum + item.confidence, 0) / predictions.length)
    : 0;
  const activeCategories = new Set(predictions.map((item) => item.category)).size;

  return {
    expertId: 'behavioral-expert',
    signals,
    ...groups,
    allPredictions: predictions,
    averageConfidence,
    approvalPolicy: APPROVAL_POLICY,
    headline: predictions.length
      ? `Behavioral Prediction Expert found ${predictions.length} suggestion${predictions.length === 1 ? '' : 's'} across ${activeCategories} prediction categor${activeCategories === 1 ? 'y' : 'ies'}.`
      : 'Behavioral Prediction Expert needs repeated actions, schedules, content, outreach, or workflow history before suggesting next moves.'
  };
}

export function summarizeBehavioralPredictionExpert(
  readout: BehavioralPredictionExpertReadout
): string[] {
  return [
    `signals=${readout.signals.length}`,
    `predictions=${readout.allPredictions.length}`,
    `categories=${Array.from(new Set(readout.allPredictions.map((item) => item.category))).join(',') || 'none'}`,
    `approval_required=${readout.allPredictions.every((item) => item.approvalRequired) ? 'yes' : 'no'}`
  ];
}
