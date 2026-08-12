import type { BrandOpsData, SchedulerTask } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { buildBehavioralIntelligenceEngineReadout } from '../intelligence/behavioralIntelligenceEngine';
import { localIntelligence } from '../intelligence/localIntelligence';

export type WorkflowPredictionKind =
  | 'repeated-outreach'
  | 'repeated-scheduling'
  | 'repeated-planning'
  | 'repeated-creator-workflow'
  | 'repeated-content-pipeline';

export type WorkflowPredictionSource =
  | 'behavioral-patterns'
  | 'outreach'
  | 'scheduler'
  | 'planning'
  | 'creator'
  | 'content-pipeline'
  | 'connected-platforms';

export interface WorkflowPredictionControls {
  saveCommand: string;
  editCommand: string;
  reuseCommand: string;
  templateCommand: string;
  automateWithApprovalsCommand: string;
}

export interface WorkflowPrediction {
  id: string;
  kind: WorkflowPredictionKind;
  title: string;
  repeatedPattern: string;
  suggestion: string;
  confidence: number;
  evidence: string[];
  triggerSignals: string[];
  recommendedSteps: string[];
  reusableTemplateName: string;
  generatedFrom: WorkflowPredictionSource[];
  approvalRequired: true;
  approvalGate: string;
  controls: WorkflowPredictionControls;
}

export interface WorkflowPredictionLayerReadout {
  predictions: WorkflowPrediction[];
  sourceCoverage: Record<WorkflowPredictionSource, number>;
  averageConfidence: number;
  approvalPolicy: string;
  headline: string;
}

const APPROVAL_GATE =
  'Workflow predictions are draft-only. The user must review and approve before BrandOps saves, reuses, templates, schedules, posts, sends, syncs, or automates anything.';

const QUESTION = 'Would you like to turn this into a reusable operational workflow?';

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

function confidenceFrom(signalCount: number, sourceCount: number, base = 52): number {
  return clamp(base + Math.min(signalCount * 5, 28) + Math.min(sourceCount * 4, 12));
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

function workflowCommand(action: string, prediction: Omit<WorkflowPrediction, 'controls'>): string {
  return `ask: Workflow Prediction Layer ${action}. ${QUESTION} Keep this reviewable in PLAN. Do not save, publish, schedule, send, sync, template, reuse, automate, or mutate workspace records without explicit approval.\n\nWorkflow: ${prediction.title}\nPattern: ${prediction.repeatedPattern}\nConfidence: ${prediction.confidence}%\nEvidence: ${prediction.evidence.join(' | ')}\nRecommended steps: ${prediction.recommendedSteps.join(' | ')}\nTemplate name: ${prediction.reusableTemplateName}\nApproval gate: ${prediction.approvalGate}`;
}

function prediction(
  input: Omit<WorkflowPrediction, 'approvalRequired' | 'approvalGate' | 'controls'>
): WorkflowPrediction {
  const draft = {
    ...input,
    evidence: input.evidence.length
      ? uniq(input.evidence, 8)
      : [
          'Repeated workspace activity is available; add more traces or connected platforms to strengthen this workflow prediction.'
        ],
    triggerSignals: uniq(input.triggerSignals, 6),
    recommendedSteps: uniq(input.recommendedSteps, 8),
    approvalRequired: true as const,
    approvalGate: APPROVAL_GATE
  };
  return {
    ...draft,
    controls: {
      saveCommand: workflowCommand('save as a reusable workflow draft', draft),
      editCommand: workflowCommand('edit the reusable workflow draft', draft),
      reuseCommand: workflowCommand('reuse this workflow for the next matching situation', draft),
      templateCommand: workflowCommand('turn this workflow into a named template', draft),
      automateWithApprovalsCommand: workflowCommand(
        'prepare approval-gated automation for this workflow',
        draft
      )
    }
  };
}

function repeatedSchedulerSignals(tasks: SchedulerTask[]): string[] {
  const repeated = countBy(tasks.map((task) => normalizeTaskTitle(task.title))).filter(
    (entry) => entry.count >= 2
  );
  return uniq(
    [
      ...repeated.map((entry) => `${entry.count} repeated scheduler task pattern: ${entry.key}`),
      ...tasks
        .slice(0, 6)
        .map((task) => `${task.status}: ${task.title}${task.dueAt ? ` due ${task.dueAt}` : ''}`)
    ],
    8
  );
}

function sourceCoverage(
  predictions: WorkflowPrediction[]
): Record<WorkflowPredictionSource, number> {
  return predictions.reduce<Record<WorkflowPredictionSource, number>>(
    (acc, prediction) => {
      for (const source of prediction.generatedFrom) acc[source] += 1;
      return acc;
    },
    {
      'behavioral-patterns': 0,
      outreach: 0,
      scheduler: 0,
      planning: 0,
      creator: 0,
      'content-pipeline': 0,
      'connected-platforms': 0
    }
  );
}

export function buildWorkflowPredictionLayerReadout(
  workspace: BrandOpsData
): WorkflowPredictionLayerReadout {
  const twin = getActiveDigitalTwin(workspace);
  const behavioral = buildBehavioralIntelligenceEngineReadout(workspace);
  const platform = buildPlatformAwareAskReadout(workspace);
  const behaviorWorkflowSignals = behavioral.patterns.filter((pattern) =>
    /repeat|workflow|outreach|schedule|planning|content|creator/i.test(
      `${pattern.kind} ${pattern.label} ${pattern.evidence.join(' ')}`
    )
  );
  const outreachUrgency = localIntelligence.outreachUrgency(workspace.outreachDrafts).slice(0, 5);
  const contentSignals = localIntelligence.contentPriority(workspace.contentLibrary).slice(0, 5);
  const schedulerSignals = repeatedSchedulerSignals(workspace.scheduler.tasks);
  const planningSignals = uniq(
    [
      ...(workspace.operatorTraces?.entries ?? [])
        .filter((trace) =>
          /plan|workflow|review|approve|queue/i.test(`${trace.surface} ${trace.verb}`)
        )
        .slice(0, 8)
        .map((trace) => `${trace.verb}${trace.surface ? ` on ${trace.surface}` : ''}`),
      ...(workspace.aiAssistantTraces?.entries ?? [])
        .filter((trace) => /plan|workflow|strategy|sequence|steps/i.test(trace.user_turn_preview))
        .slice(0, 5)
        .map((trace) => `ASK: ${trace.user_turn_preview}`),
      ...(workspace.aiPipelineRuns?.entries ?? [])
        .slice(0, 5)
        .map((run) => `${run.pipeline_id}: ${run.status}`),
      ...(twin?.memory.preferences ?? []),
      ...(twin?.identity.goals ?? [])
    ],
    10
  );
  const creatorSignals = uniq(
    [
      ...workspace.brandVault.signatureThemes.filter((theme) =>
        /creator|series|campaign|audience/i.test(theme)
      ),
      ...workspace.brandVault.expertiseAreas.filter((area) =>
        /creator|content|audience|community/i.test(area)
      ),
      ...(twin?.memory.approvedClaims ?? []).filter((claim) =>
        /creator|content|audience|community|workflow/i.test(claim)
      ),
      ...(twin?.memory.preferences ?? []).filter((preference) =>
        /creator|content|audience|community|workflow/i.test(preference)
      ),
      ...workspace.contentLibrary
        .filter((item) =>
          /creator|series|campaign|audience|linkedin|post/i.test(
            `${item.title} ${item.tags.join(' ')} ${item.notes}`
          )
        )
        .map((item) => `${item.status}: ${item.title}`)
    ],
    10
  );
  const contentPipelineSignals = uniq(
    [
      ...contentSignals.map((signal) => `${signal.label}: ${signal.reason}`),
      ...workspace.contentLibrary.map((item) => `${item.status}: ${item.title}`),
      ...workspace.publishingQueue.map((item) => `${item.status}: ${item.title}`)
    ],
    12
  );
  const platformSignals = uniq(
    [
      ...platform.workflowState,
      ...platform.connectedApps.map((app) => `${app} connected`),
      ...workspace.integrationHub.liveFeed.map(
        (feed) => `${feed.source}: ${feed.title} ${feed.detail}`
      )
    ],
    8
  );

  const predictions: WorkflowPrediction[] = [];

  const outreachEvidence = uniq(
    [
      ...outreachUrgency.map((signal) => `${signal.label}: ${signal.reason}`),
      ...workspace.outreachDrafts.map(
        (draft) => `${draft.status}: ${draft.targetName} ${draft.outreachGoal}`
      ),
      ...workspace.outreachTemplates.map((template) => `Template: ${template.name}`),
      ...workspace.outreachHistory.map((entry) => `${entry.status}: ${entry.summary}`),
      ...platformSignals,
      ...behaviorWorkflowSignals
        .filter((pattern) =>
          /outreach|follow|reply|sales|pipeline/i.test(
            `${pattern.label} ${pattern.evidence.join(' ')}`
          )
        )
        .flatMap((pattern) => [pattern.label, ...pattern.evidence])
    ],
    10
  );
  if (outreachEvidence.length >= 2) {
    predictions.push(
      prediction({
        id: 'workflow-repeated-outreach',
        kind: 'repeated-outreach',
        title: 'Repeated outreach workflow detected',
        repeatedPattern:
          'Outreach drafts, templates, history, follow-ups, or relationship moves are recurring.',
        suggestion: QUESTION,
        confidence: confidenceFrom(outreachEvidence.length, 3, 56),
        evidence: outreachEvidence,
        triggerSignals: [
          'new warm relationship',
          'draft created',
          'follow-up due',
          'reply or next action detected'
        ],
        recommendedSteps: [
          'Select target context',
          'Draft message',
          'Approve send',
          'Queue follow-up',
          'Track reply'
        ],
        reusableTemplateName: 'Reusable Outreach Workflow',
        generatedFrom: ['outreach', 'behavioral-patterns', 'connected-platforms']
      })
    );
  }

  if (schedulerSignals.length >= 2) {
    predictions.push(
      prediction({
        id: 'workflow-repeated-scheduling',
        kind: 'repeated-scheduling',
        title: 'Repeated scheduling workflow detected',
        repeatedPattern:
          'Scheduler rows and due windows show repeatable calendar or reminder behavior.',
        suggestion: QUESTION,
        confidence: confidenceFrom(schedulerSignals.length, 2, 54),
        evidence: schedulerSignals,
        triggerSignals: [
          'task due soon',
          'missed task',
          'repeated reminder',
          'workday window reached'
        ],
        recommendedSteps: [
          'Collect timing context',
          'Choose operating window',
          'Approve reminder',
          'Review completion'
        ],
        reusableTemplateName: 'Reusable Scheduling Workflow',
        generatedFrom: ['scheduler', 'behavioral-patterns']
      })
    );
  }

  if (
    planningSignals.length >= 2 ||
    behaviorWorkflowSignals.some((pattern) => pattern.kind === 'plan')
  ) {
    predictions.push(
      prediction({
        id: 'workflow-repeated-planning',
        kind: 'repeated-planning',
        title: 'Repeated planning workflow detected',
        repeatedPattern:
          'ASK, PLAN, pipeline, or review behavior repeatedly turns strategy into operating steps.',
        suggestion: QUESTION,
        confidence: confidenceFrom(planningSignals.length + behaviorWorkflowSignals.length, 3, 53),
        evidence: uniq(
          [
            ...planningSignals,
            ...behaviorWorkflowSignals.flatMap((pattern) => [pattern.label, ...pattern.evidence])
          ],
          10
        ),
        triggerSignals: [
          'new strategic ask',
          'PLAN review pending',
          'pipeline run complete',
          'approval checkpoint needed'
        ],
        recommendedSteps: [
          'Capture objective',
          'Draft plan',
          'Review dependencies',
          'Approve next actions',
          'Export receipt'
        ],
        reusableTemplateName: 'Reusable Planning Workflow',
        generatedFrom: ['planning', 'behavioral-patterns']
      })
    );
  }

  if (creatorSignals.length >= 2) {
    predictions.push(
      prediction({
        id: 'workflow-repeated-creator',
        kind: 'repeated-creator-workflow',
        title: 'Repeated creator workflow detected',
        repeatedPattern:
          'Creator themes, campaigns, audiences, or publishing patterns are recurring.',
        suggestion: QUESTION,
        confidence: confidenceFrom(creatorSignals.length, 3, 55),
        evidence: creatorSignals,
        triggerSignals: [
          'creator theme appears',
          'campaign idea emerges',
          'audience hook drafted',
          'publishing cadence active'
        ],
        recommendedSteps: [
          'Choose creator angle',
          'Draft series arc',
          'Approve assets',
          'Schedule cadence',
          'Measure resonance'
        ],
        reusableTemplateName: 'Reusable Creator Workflow',
        generatedFrom: ['creator', 'content-pipeline', 'behavioral-patterns']
      })
    );
  }

  if (contentPipelineSignals.length >= 3) {
    predictions.push(
      prediction({
        id: 'workflow-repeated-content-pipeline',
        kind: 'repeated-content-pipeline',
        title: 'Repeated content pipeline detected',
        repeatedPattern:
          'Ideas, drafts, ready content, and publishing queue items form a repeatable content pipeline.',
        suggestion: QUESTION,
        confidence: confidenceFrom(contentPipelineSignals.length, 3, 56),
        evidence: uniq([...contentPipelineSignals, ...platformSignals], 10),
        triggerSignals: [
          'content idea captured',
          'draft ready',
          'publishing queue updated',
          'resonance review needed'
        ],
        recommendedSteps: [
          'Select theme',
          'Draft asset',
          'Approve final copy',
          'Schedule or save',
          'Review performance'
        ],
        reusableTemplateName: 'Reusable Content Pipeline',
        generatedFrom: ['content-pipeline', 'behavioral-patterns', 'connected-platforms']
      })
    );
  }

  const sorted = predictions.sort(
    (a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title)
  );
  const averageConfidence = sorted.length
    ? clamp(sorted.reduce((sum, item) => sum + item.confidence, 0) / sorted.length)
    : 0;
  const activeSources = Object.values(sourceCoverage(sorted)).filter((count) => count > 0).length;

  return {
    predictions: sorted,
    sourceCoverage: sourceCoverage(sorted),
    averageConfidence,
    approvalPolicy: APPROVAL_GATE,
    headline: sorted.length
      ? `${sorted.length} workflow prediction${sorted.length === 1 ? '' : 's'} detected across ${activeSources} source group${activeSources === 1 ? '' : 's'}.`
      : 'No repeated workflow pattern is strong enough yet; BrandOps will suggest reusable workflows once repetition appears.'
  };
}
