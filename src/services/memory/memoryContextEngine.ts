import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { buildBehavioralIntelligenceEngineReadout } from '../intelligence/behavioralIntelligenceEngine';
import { buildWorkflowPredictionLayerReadout } from '../plan/workflowPredictionLayer';

export type MemoryContextCategory =
  | 'goals'
  | 'preferences'
  | 'recurring-actions'
  | 'behavioral-patterns'
  | 'preferred-workflows'
  | 'approved-outputs'
  | 'rejected-outputs'
  | 'communication-style'
  | 'scheduling-habits';

export type MemoryImprovementSurface =
  | 'ask-suggestions'
  | 'plan-generation'
  | 'opportunity-prediction'
  | 'workflow-recommendations';

export interface MemoryContextEntry {
  id: string;
  category: MemoryContextCategory;
  label: string;
  value: string;
  source: string;
  confidence: number;
  editable: boolean;
}

export interface MemoryContextControls {
  viewCommand: string;
  editCommand: string;
  deleteCommand: string;
  disableCommand: string;
}

export interface MemoryContextEngineReadout {
  enabled: boolean;
  persistentStore: string;
  entries: MemoryContextEntry[];
  entriesByCategory: Record<MemoryContextCategory, MemoryContextEntry[]>;
  improvements: Record<MemoryImprovementSurface, string[]>;
  averageConfidence: number;
  controls: MemoryContextControls;
  privacyPolicy: string;
  headline: string;
}

const CATEGORIES: MemoryContextCategory[] = [
  'goals',
  'preferences',
  'recurring-actions',
  'behavioral-patterns',
  'preferred-workflows',
  'approved-outputs',
  'rejected-outputs',
  'communication-style',
  'scheduling-habits'
];

const PRIVACY_POLICY =
  'Memory & Context Engine is local-first and user-controlled. Users can view, edit, delete, or disable memory; BrandOps must not use memory to send, publish, schedule, sync, or automate without explicit approval.';

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compact(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function keyFor(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
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

function entry(input: Omit<MemoryContextEntry, 'id' | 'confidence'> & { confidence?: number }): MemoryContextEntry {
  return {
    id: `memory-${input.category}-${keyFor(`${input.source}-${input.label}-${input.value}`)}`,
    category: input.category,
    label: compact(input.label).slice(0, 96),
    value: compact(input.value).slice(0, 320),
    source: compact(input.source).slice(0, 96),
    confidence: clamp(input.confidence ?? 68),
    editable: input.editable
  };
}

function activeTwinMemory(twin: DigitalTwin | null): MemoryContextEntry[] {
  if (!twin) return [];
  return [
    ...uniq([...twin.identity.goals], 8).map((goal) =>
      entry({
        category: 'goals',
        label: 'Twin goal',
        value: goal,
        source: 'Active digital twin',
        confidence: twin.confidenceScore,
        editable: true
      })
    ),
    ...uniq([...twin.memory.preferences], 8).map((preference) =>
      entry({
        category: 'preferences',
        label: 'Stored preference',
        value: preference,
        source: 'Twin memory',
        confidence: twin.confidenceScore,
        editable: true
      })
    ),
    ...uniq([...twin.memory.approvedClaims, ...twin.actions.generatedAssets.map((asset) => asset.title)], 10).map(
      (approved) =>
        entry({
          category: 'approved-outputs',
          label: 'Approved output',
          value: approved,
          source: 'Twin approved memory',
          confidence: twin.confidenceScore,
          editable: true
        })
    ),
    ...uniq([...twin.memory.rejectedClaims], 8).map((rejected) =>
      entry({
        category: 'rejected-outputs',
        label: 'Rejected output',
        value: rejected,
        source: 'Twin rejected memory',
        confidence: twin.confidenceScore,
        editable: true
      })
    ),
    ...uniq([twin.identity.toneOfVoice, ...twin.memory.voiceExamples], 8).map((style) =>
      entry({
        category: 'communication-style',
        label: 'Preferred communication style',
        value: style,
        source: 'Twin voice memory',
        confidence: twin.confidenceScore,
        editable: true
      })
    )
  ];
}

function workspaceMemory(workspace: BrandOpsData): MemoryContextEntry[] {
  const repeatedActions = countBy((workspace.operatorTraces?.entries ?? []).map((trace) => trace.verb))
    .filter((row) => row.count >= 2)
    .slice(0, 6);
  const rejectedTraces = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'rejected'
  );
  const approvedTraces = (workspace.operatorTraces?.entries ?? []).filter(
    (trace) => trace.reviewStatus === 'approved'
  );
  const repeatedTasks = countBy(
    workspace.scheduler.tasks.map((task) =>
      task.title
        .toLowerCase()
        .replace(/\b(today|tomorrow|weekly|daily|monthly)\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
    )
  )
    .filter((row) => row.count >= 2)
    .slice(0, 5);

  return [
    entry({
      category: 'goals',
      label: 'Workspace focus metric',
      value: workspace.brand.focusMetric,
      source: 'Brand profile',
      confidence: workspace.brand.focusMetric ? 76 : 36,
      editable: true
    }),
    entry({
      category: 'preferences',
      label: 'Primary offer',
      value: workspace.brand.primaryOffer,
      source: 'Brand profile',
      confidence: workspace.brand.primaryOffer ? 74 : 36,
      editable: true
    }),
    ...uniq([...workspace.brandVault.preferredVoiceNotes, ...workspace.brandVault.bannedPhrases], 10).map((value) =>
      entry({
        category: 'preferences',
        label: 'Brand preference',
        value,
        source: 'Brand vault',
        confidence: 72,
        editable: true
      })
    ),
    ...repeatedActions.map((row) =>
      entry({
        category: 'recurring-actions',
        label: `${row.count} repeated actions`,
        value: row.key,
        source: 'Operator traces',
        confidence: 58 + row.count * 6,
        editable: false
      })
    ),
    ...approvedTraces.slice(0, 6).map((trace) =>
      entry({
        category: 'approved-outputs',
        label: 'Approved trace',
        value: `${trace.verb}${trace.surface ? ` on ${trace.surface}` : ''}`,
        source: 'Operator review',
        confidence: 78,
        editable: false
      })
    ),
    ...rejectedTraces.slice(0, 6).map((trace) =>
      entry({
        category: 'rejected-outputs',
        label: 'Rejected trace',
        value: `${trace.verb}${trace.surface ? ` on ${trace.surface}` : ''}`,
        source: 'Operator review',
        confidence: 78,
        editable: false
      })
    ),
    entry({
      category: 'communication-style',
      label: 'Voice guide',
      value: workspace.brand.voiceGuide,
      source: 'Brand profile',
      confidence: workspace.brand.voiceGuide ? 74 : 34,
      editable: true
    }),
    entry({
      category: 'scheduling-habits',
      label: 'Workday window',
      value: `${workspace.settings.notificationCenter.workdayStartHour}:00-${workspace.settings.notificationCenter.workdayEndHour}:00 ${workspace.settings.timezone}`,
      source: 'Notification settings',
      confidence: 70,
      editable: true
    }),
    ...repeatedTasks.map((row) =>
      entry({
        category: 'scheduling-habits',
        label: `${row.count} repeated scheduling patterns`,
        value: row.key,
        source: 'Scheduler',
        confidence: 58 + row.count * 6,
        editable: false
      })
    )
  ];
}

function intelligenceMemory(workspace: BrandOpsData): MemoryContextEntry[] {
  const behavioral = buildBehavioralIntelligenceEngineReadout(workspace);
  const workflows = buildWorkflowPredictionLayerReadout(workspace);
  return [
    ...behavioral.patterns.slice(0, 8).map((pattern) =>
      entry({
        category: 'behavioral-patterns',
        label: pattern.label,
        value: pattern.evidence.join(' | '),
        source: 'Behavioral Intelligence Engine',
        confidence: pattern.confidence,
        editable: false
      })
    ),
    ...workflows.predictions.slice(0, 8).map((workflow) =>
      entry({
        category: 'preferred-workflows',
        label: workflow.reusableTemplateName,
        value: workflow.repeatedPattern,
        source: 'Workflow Prediction Layer',
        confidence: workflow.confidence,
        editable: false
      })
    )
  ];
}

function entriesByCategory(entries: MemoryContextEntry[]): Record<MemoryContextCategory, MemoryContextEntry[]> {
  return CATEGORIES.reduce<Record<MemoryContextCategory, MemoryContextEntry[]>>((acc, category) => {
    acc[category] = entries.filter((entry) => entry.category === category).slice(0, 8);
    return acc;
  }, {} as Record<MemoryContextCategory, MemoryContextEntry[]>);
}

function controls(entries: MemoryContextEntry[]): MemoryContextControls {
  const preview = entries
    .slice(0, 10)
    .map((item) => `${item.category}: ${item.label} = ${item.value}`)
    .join(' | ');
  return {
    viewCommand: `ask: Show my Memory & Context Engine summary. Group by goals, preferences, recurring actions, behavioral patterns, preferred workflows, approved outputs, rejected outputs, communication style, and scheduling habits. Do not mutate memory.\n\nMemory: ${preview}`,
    editCommand:
      'ask: Help me edit Memory & Context Engine entries. Show editable goals, preferences, communication style, and scheduling habits first. Do not save changes until I explicitly approve exact updates.',
    deleteCommand:
      'ask: Prepare to delete Memory & Context Engine data. Explain that deletion clears active twin memory, local behavior traces, ASK trace memory, and derived memory context only after explicit confirmation.',
    disableCommand:
      'ask: Prepare to disable Memory & Context Engine learning. Explain that disabling stops new trace collection and connected identity learning while existing memory remains until deleted.'
  };
}

export function buildMemoryContextEngineReadout(workspace: BrandOpsData): MemoryContextEngineReadout {
  const twin = getActiveDigitalTwin(workspace);
  const enabled =
    workspace.settings.operatorTraceCollectionEnabled || workspace.settings.connectedIdentityLearningEnabled;
  const entries = [
    ...activeTwinMemory(twin),
    ...workspaceMemory(workspace),
    ...intelligenceMemory(workspace)
  ]
    .filter((item) => item.value.length > 0)
    .sort((a, b) => b.confidence - a.confidence || a.category.localeCompare(b.category));
  const averageConfidence = entries.length
    ? clamp(entries.reduce((sum, item) => sum + item.confidence, 0) / entries.length)
    : 0;
  const grouped = entriesByCategory(entries);

  return {
    enabled,
    persistentStore:
      'Persisted locally in BrandOps workspace data: active digital twin memory, brand profile/vault preferences, operator traces, ASK traces, scheduler habits, and approval history.',
    entries,
    entriesByCategory: grouped,
    improvements: {
      'ask-suggestions': uniq([
        ...grouped.goals.map((item) => item.value),
        ...grouped.preferences.map((item) => item.value),
        ...grouped['communication-style'].map((item) => item.value)
      ], 6),
      'plan-generation': uniq([
        ...grouped['preferred-workflows'].map((item) => item.label),
        ...grouped['scheduling-habits'].map((item) => item.value),
        ...grouped['approved-outputs'].map((item) => item.value)
      ], 6),
      'opportunity-prediction': uniq([
        ...grouped.goals.map((item) => item.value),
        ...grouped['behavioral-patterns'].map((item) => item.label),
        ...grouped['rejected-outputs'].map((item) => `Avoid: ${item.value}`)
      ], 6),
      'workflow-recommendations': uniq([
        ...grouped['recurring-actions'].map((item) => item.value),
        ...grouped['preferred-workflows'].map((item) => item.label),
        ...grouped['scheduling-habits'].map((item) => item.value)
      ], 6)
    },
    averageConfidence,
    controls: controls(entries),
    privacyPolicy: PRIVACY_POLICY,
    headline: `${entries.length} memory context item${entries.length === 1 ? '' : 's'} available across ${CATEGORIES.filter((category) => grouped[category].length > 0).length} categor${CATEGORIES.filter((category) => grouped[category].length > 0).length === 1 ? 'y' : 'ies'}. Memory learning is ${enabled ? 'enabled' : 'disabled'}.`
  };
}

