import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';
import { buildConnectedIdentityEngineReadout } from '../connectedIdentity/connectedIdentityEngine';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import {
  buildBehavioralIntelligenceEngineReadout,
  type BehavioralPattern
} from '../intelligence/behavioralIntelligenceEngine';
import { localIntelligence } from '../intelligence/localIntelligence';
import { buildMemoryContextEngineReadout } from '../memory/memoryContextEngine';

export type PredictiveOpportunityKind =
  | 'buyer-persona-generation'
  | 'positioning-analysis'
  | 'outreach-opportunity'
  | 'content-ideation'
  | 'workflow-optimization'
  | 'operational-improvement'
  | 'follow-up-suggestion'
  | 'growth-opportunity'
  | 'scheduling-improvement';

export type PredictiveOpportunitySource =
  | 'profession'
  | 'twin-profile'
  | 'connected-platforms'
  | 'recent-actions'
  | 'behavioral-history'
  | 'memory-patterns';

export interface PredictiveOpportunitySuggestion {
  id: string;
  kind: PredictiveOpportunityKind;
  title: string;
  suggestion: string;
  whyThisAppeared: string;
  confidence: number;
  supportingSignals: string[];
  expectedImpact: string;
  generatedFrom: PredictiveOpportunitySource[];
  approvalRequired: true;
  previewCommand: string;
}

export interface PredictiveOpportunityLayerReadout {
  suggestions: PredictiveOpportunitySuggestion[];
  totalCount: number;
  averageConfidence: number;
  sourceCoverage: Record<PredictiveOpportunitySource, number>;
  approvalPolicy: string;
  headline: string;
}

const APPROVAL_POLICY =
  'Predictive opportunities are suggestions only. The user must approve before BrandOps creates buyer personas, rewrites positioning, sends outreach, publishes content, updates workflows, changes schedules, syncs, or writes to external systems.';

const SOURCE_KEYS: PredictiveOpportunitySource[] = [
  'profession',
  'twin-profile',
  'connected-platforms',
  'recent-actions',
  'behavioral-history',
  'memory-patterns'
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function uniq(values: string[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const t = compact(value);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 240));
    if (out.length >= cap) break;
  }
  return out;
}

function score(input: {
  base: number;
  sources: PredictiveOpportunitySource[];
  signalCount: number;
  hasTwin: boolean;
  platformCount: number;
  memoryCount: number;
}): number {
  return clamp(
    input.base +
      Math.min(input.sources.length * 4, 20) +
      Math.min(input.signalCount * 2, 18) +
      (input.hasTwin ? 8 : 0) +
      Math.min(input.platformCount * 2, 10) +
      Math.min(input.memoryCount * 2, 10)
  );
}

function sourceCoverage(
  suggestions: PredictiveOpportunitySuggestion[]
): Record<PredictiveOpportunitySource, number> {
  return suggestions.reduce<Record<PredictiveOpportunitySource, number>>(
    (acc, suggestion) => {
      for (const source of suggestion.generatedFrom) acc[source] += 1;
      return acc;
    },
    {
      profession: 0,
      'twin-profile': 0,
      'connected-platforms': 0,
      'recent-actions': 0,
      'behavioral-history': 0,
      'memory-patterns': 0
    }
  );
}

function professionSignals(workspace: BrandOpsData): string[] {
  return uniq(
    [
      workspace.brand.positioning,
      workspace.brand.primaryOffer,
      workspace.brand.focusMetric,
      workspace.brand.voiceGuide,
      ...workspace.brandVault.serviceOfferings,
      ...workspace.brandVault.audienceSegments,
      ...workspace.brandVault.expertiseAreas,
      ...workspace.brandVault.industries
    ],
    10
  );
}

function twinSignals(twin: DigitalTwin | null): string[] {
  if (!twin) return [];
  return uniq(
    [
      twin.identity.headline,
      twin.identity.professionalPositioning,
      twin.identity.summary,
      `Twin confidence ${twin.confidenceScore}%`,
      ...twin.resumeProfile.skills.slice(0, 8),
      ...twin.resumeProfile.industries.slice(0, 5),
      ...twin.resumeProfile.achievements.slice(0, 5)
    ],
    12
  );
}

function memorySignals(workspace: BrandOpsData, twin: DigitalTwin | null): string[] {
  const traceBundles = workspace.aiTraceGraph?.bundles ?? [];
  const knowledgeSignals = buildConnectedIdentityEngineReadout(workspace)
    .signals.filter(
      (signal) => signal.kind === 'knowledge_memory' || signal.kind === 'content_pattern'
    )
    .map((signal) => `${signal.source}: ${signal.summary}`);

  return uniq(
    [
      ...(twin?.memory.facts ?? []),
      ...(twin?.memory.preferences ?? []),
      ...(twin?.memory.approvedClaims ?? []),
      ...knowledgeSignals,
      ...traceBundles
        .slice(0, 5)
        .map((bundle) => `Trace bundle ${bundle.surface} ${bundle.created_at}`)
    ],
    14
  );
}

function recentActionSignals(workspace: BrandOpsData): string[] {
  return uniq(
    [
      ...(workspace.operatorTraces?.entries ?? [])
        .slice(0, 8)
        .map((trace) => `${trace.verb}${trace.surface ? ` on ${trace.surface}` : ''}`),
      ...(workspace.aiAssistantTraces?.entries ?? [])
        .slice(0, 4)
        .map((trace) => `ASK: ${trace.user_turn_preview}`),
      ...(workspace.agentAudit?.entries ?? []).slice(0, 4).map((entry) => entry.summary)
    ],
    12
  );
}

function behavioralSignals(patterns: BehavioralPattern[]): string[] {
  return uniq(
    patterns.flatMap((pattern) => [
      `${pattern.label} (${pattern.confidence}%)`,
      ...pattern.evidence.slice(0, 2)
    ]),
    14
  );
}

function platformSignals(workspace: BrandOpsData): string[] {
  const platform = buildPlatformAwareAskReadout(workspace);
  const identity = buildConnectedIdentityEngineReadout(workspace);
  return uniq(
    [
      `Connected apps: ${platform.connectedApps.join(', ') || 'none'}`,
      ...platform.recentActivity,
      ...platform.workflowState,
      ...identity.signals.slice(0, 5).map((signal) => `${signal.source}: ${signal.summary}`)
    ],
    14
  );
}

function commandFor(suggestion: Omit<PredictiveOpportunitySuggestion, 'previewCommand'>): string {
  return `ask: Review this Predictive Opportunity Layer suggestion and convert it into a PLAN preview only. Do not execute externally or mutate workspace records. Include the why, confidence, supporting signals, expected impact, approval requirements, risks, editable draft steps, and receipt expectations.\n\nType: ${suggestion.kind}\nTitle: ${suggestion.title}\nSuggestion: ${suggestion.suggestion}\nWhy this appeared: ${suggestion.whyThisAppeared}\nConfidence: ${suggestion.confidence}%\nGenerated from: ${suggestion.generatedFrom.join(', ')}\nSupporting signals: ${suggestion.supportingSignals.join(' | ')}\nExpected impact: ${suggestion.expectedImpact}\nApproval policy: ${APPROVAL_POLICY}`;
}

function makeSuggestion(
  input: Omit<PredictiveOpportunitySuggestion, 'approvalRequired' | 'previewCommand'>
): PredictiveOpportunitySuggestion {
  const draft = {
    ...input,
    supportingSignals: input.supportingSignals.length
      ? input.supportingSignals
      : [
          'Workspace profile and local operational context are available; connect more sources to strengthen this suggestion.'
        ],
    approvalRequired: true as const
  };
  return {
    ...draft,
    previewCommand: commandFor(draft)
  };
}

export function buildPredictiveOpportunityLayerReadout(
  workspace: BrandOpsData
): PredictiveOpportunityLayerReadout {
  const twin = getActiveDigitalTwin(workspace);
  const behavioral = buildBehavioralIntelligenceEngineReadout(workspace);
  const profession = professionSignals(workspace);
  const twinProfile = twinSignals(twin);
  const memoryContext = buildMemoryContextEngineReadout(workspace);
  const memory = uniq(
    [
      ...memorySignals(workspace, twin),
      ...memoryContext.entries.slice(0, 8).map((entry) => `${entry.label}: ${entry.value}`)
    ],
    14
  );
  const recentActions = recentActionSignals(workspace);
  const behavior = behavioralSignals(behavioral.patterns);
  const platforms = platformSignals(workspace);
  const contentSignals = localIntelligence.contentPriority(workspace.contentLibrary).slice(0, 4);
  const outreachSignals = localIntelligence.outreachUrgency(workspace.outreachDrafts).slice(0, 4);
  const followUpRisk = localIntelligence.overdueRisk(workspace).slice(0, 4);
  const closeSignals = localIntelligence.opportunitiesToClose(workspace.opportunities, 4);
  const openTasks = workspace.scheduler.tasks.filter((task) => task.status !== 'completed');
  const activePlatforms = buildPlatformAwareAskReadout(workspace).connectedApps.length;
  const hasTwin = Boolean(twin);

  const suggestions = [
    makeSuggestion({
      id: 'predictive-buyer-persona-generation',
      kind: 'buyer-persona-generation',
      title: 'Generate buyer personas from current positioning',
      suggestion:
        'Create 2-3 reviewable buyer personas based on the operator profession, service offer, audience hints, and approved memory.',
      whyThisAppeared:
        'Profession and twin profile signals can be converted into clearer buyer hypotheses for outreach and content planning.',
      confidence: score({
        base: 48,
        sources: ['profession', 'twin-profile', 'memory-patterns'],
        signalCount: profession.length + twinProfile.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq([...profession, ...twinProfile, ...memory], 8),
      expectedImpact: 'Sharper targeting for messaging, content topics, and high-fit outreach.',
      generatedFrom: ['profession', 'twin-profile', 'memory-patterns']
    }),
    makeSuggestion({
      id: 'predictive-positioning-analysis',
      kind: 'positioning-analysis',
      title: 'Analyze positioning against platform evidence',
      suggestion:
        'Compare current positioning with connected-platform summaries, approved claims, and recent ASK/PLAN behavior.',
      whyThisAppeared:
        'Brand positioning, twin memory, and platform context provide enough evidence to review what should be emphasized or clarified.',
      confidence: score({
        base: 52,
        sources: ['profession', 'twin-profile', 'connected-platforms', 'memory-patterns'],
        signalCount: profession.length + twinProfile.length + platforms.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq([...profession, ...twinProfile, ...platforms, ...memory], 8),
      expectedImpact: 'More consistent profile copy, offers, proof points, and platform messaging.',
      generatedFrom: ['profession', 'twin-profile', 'connected-platforms', 'memory-patterns']
    }),
    makeSuggestion({
      id: 'predictive-outreach-opportunity',
      kind: 'outreach-opportunity',
      title: 'Find the next high-fit outreach opportunity',
      suggestion:
        'Use active opportunities, outreach drafts, platform context, and behavioral history to propose the next outreach move for approval.',
      whyThisAppeared:
        'Outreach, opportunity, and recent action signals indicate likely relationship moves without sending anything automatically.',
      confidence: score({
        base: 55,
        sources: ['connected-platforms', 'recent-actions', 'behavioral-history', 'memory-patterns'],
        signalCount: outreachSignals.length + closeSignals.length + recentActions.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq(
        [
          ...outreachSignals.map((signal) => `${signal.label}: ${signal.reason}`),
          ...closeSignals.map((signal) => `${signal.label}: ${signal.reason}`),
          ...recentActions,
          ...behavior
        ],
        8
      ),
      expectedImpact:
        'Faster movement on warm relationships while keeping message approval explicit.',
      generatedFrom: [
        'connected-platforms',
        'recent-actions',
        'behavioral-history',
        'memory-patterns'
      ]
    }),
    makeSuggestion({
      id: 'predictive-content-ideation',
      kind: 'content-ideation',
      title: 'Create content ideas from memory and demand signals',
      suggestion:
        'Draft content ideas that connect approved memory, positioning, platform context, and current content backlog.',
      whyThisAppeared:
        'Content library state, publishing queue, profession context, and memory patterns suggest reusable themes.',
      confidence: score({
        base: 54,
        sources: ['profession', 'connected-platforms', 'behavioral-history', 'memory-patterns'],
        signalCount: contentSignals.length + workspace.publishingQueue.length + memory.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq(
        [
          ...contentSignals.map((signal) => `${signal.label}: ${signal.reason}`),
          ...workspace.publishingQueue.slice(0, 4).map((item) => `${item.status}: ${item.title}`),
          ...profession,
          ...memory
        ],
        8
      ),
      expectedImpact:
        'More consistent content ideation tied to actual positioning and approved proof.',
      generatedFrom: ['profession', 'connected-platforms', 'behavioral-history', 'memory-patterns']
    }),
    makeSuggestion({
      id: 'predictive-workflow-optimization',
      kind: 'workflow-optimization',
      title: 'Optimize repeated workflow patterns',
      suggestion:
        'Turn repeated tasks, actions, and platform workflow state into a cleaner PLAN sequence or checklist.',
      whyThisAppeared:
        'Behavioral history and workflow state show repeatable operating patterns that can be simplified.',
      confidence: score({
        base: 53,
        sources: ['connected-platforms', 'recent-actions', 'behavioral-history'],
        signalCount: openTasks.length + behavior.length + recentActions.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq(
        [
          ...openTasks.slice(0, 5).map((task) => `${task.title}: ${task.status}`),
          ...behavior,
          ...platforms
        ],
        8
      ),
      expectedImpact: 'Less context switching and fewer duplicated planning steps.',
      generatedFrom: ['connected-platforms', 'recent-actions', 'behavioral-history']
    }),
    makeSuggestion({
      id: 'predictive-operational-improvement',
      kind: 'operational-improvement',
      title: 'Improve the current operating system',
      suggestion:
        'Identify bottlenecks across approvals, tasks, follow-ups, and execution receipts before adding more work.',
      whyThisAppeared:
        'Operational signals show active tasks, approval gates, follow-up risk, or recent execution activity.',
      confidence: score({
        base: 56,
        sources: ['recent-actions', 'behavioral-history', 'memory-patterns'],
        signalCount: followUpRisk.length + openTasks.length + behavioral.predictions.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq(
        [
          ...followUpRisk.map((signal) => `${signal.label}: ${signal.reason}`),
          ...behavioral.predictions.map(
            (prediction) => `${prediction.title}: ${prediction.rationale}`
          ),
          ...recentActions
        ],
        8
      ),
      expectedImpact:
        'Higher execution reliability and fewer stale approvals or missed operational items.',
      generatedFrom: ['recent-actions', 'behavioral-history', 'memory-patterns']
    }),
    makeSuggestion({
      id: 'predictive-follow-up-suggestion',
      kind: 'follow-up-suggestion',
      title: 'Suggest follow-ups that need attention',
      suggestion:
        'Review overdue risk, active opportunities, outreach drafts, and connected communication context to propose follow-ups.',
      whyThisAppeared:
        'Follow-up risk and outreach signals indicate relationships or tasks that may need a next touch.',
      confidence: score({
        base: 58,
        sources: ['connected-platforms', 'recent-actions', 'behavioral-history'],
        signalCount: followUpRisk.length + outreachSignals.length + closeSignals.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq(
        [
          ...followUpRisk.map((signal) => `${signal.label}: ${signal.reason}`),
          ...outreachSignals.map((signal) => `${signal.label}: ${signal.reason}`),
          ...closeSignals.map((signal) => `${signal.label}: ${signal.reason}`)
        ],
        8
      ),
      expectedImpact:
        'Lower chance of stale deals, missed replies, or neglected warm relationships.',
      generatedFrom: ['connected-platforms', 'recent-actions', 'behavioral-history']
    }),
    makeSuggestion({
      id: 'predictive-growth-opportunity',
      kind: 'growth-opportunity',
      title: 'Identify growth opportunities from profile and pipeline',
      suggestion:
        'Combine profession, twin strengths, active pipeline, content themes, and platform context into growth experiments.',
      whyThisAppeared:
        'Pipeline, positioning, content, and memory signals can be turned into reviewable growth hypotheses.',
      confidence: score({
        base: 51,
        sources: ['profession', 'twin-profile', 'connected-platforms', 'memory-patterns'],
        signalCount:
          closeSignals.length + contentSignals.length + profession.length + twinProfile.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq(
        [
          ...closeSignals.map((signal) => `${signal.label}: ${signal.reason}`),
          ...contentSignals.map((signal) => `${signal.label}: ${signal.reason}`),
          ...twinProfile,
          ...platforms
        ],
        8
      ),
      expectedImpact:
        'Clearer growth bets tied to actual expertise, demand, and relationship context.',
      generatedFrom: ['profession', 'twin-profile', 'connected-platforms', 'memory-patterns']
    }),
    makeSuggestion({
      id: 'predictive-scheduling-improvement',
      kind: 'scheduling-improvement',
      title: 'Improve scheduling around operational timing',
      suggestion:
        'Review due tasks, workday settings, reminders, and behavioral timing clusters to propose schedule changes.',
      whyThisAppeared:
        'Scheduler state and behavioral timing patterns show where the operating calendar may need adjustment.',
      confidence: score({
        base: 57,
        sources: ['connected-platforms', 'recent-actions', 'behavioral-history'],
        signalCount: openTasks.length + behavior.length + workspace.followUps.length,
        hasTwin,
        platformCount: activePlatforms,
        memoryCount: memory.length
      }),
      supportingSignals: uniq(
        [
          ...openTasks.slice(0, 6).map((task) => `${task.title}: ${task.status} due ${task.dueAt}`),
          `Workday ${workspace.settings.notificationCenter.workdayStartHour}:00-${workspace.settings.notificationCenter.workdayEndHour}:00 ${workspace.settings.timezone}`,
          ...behavior.filter((signal) => /timing|schedule|task|snooze/i.test(signal))
        ],
        8
      ),
      expectedImpact:
        'Fewer missed commitments and better placement of deep work, follow-ups, and reviews.',
      generatedFrom: ['connected-platforms', 'recent-actions', 'behavioral-history']
    })
  ].sort((a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title));

  const averageConfidence = suggestions.length
    ? clamp(suggestions.reduce((sum, item) => sum + item.confidence, 0) / suggestions.length)
    : 0;
  const coverage = sourceCoverage(suggestions);
  const activeSourceCount = SOURCE_KEYS.filter((key) => coverage[key] > 0).length;

  return {
    suggestions,
    totalCount: suggestions.length,
    averageConfidence,
    sourceCoverage: coverage,
    approvalPolicy: APPROVAL_POLICY,
    headline: `${suggestions.length} predictive opportunit${suggestions.length === 1 ? 'y' : 'ies'} generated from ${activeSourceCount} source group${activeSourceCount === 1 ? '' : 's'}.`
  };
}
