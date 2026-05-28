import type { ExpertContextKey, OperationalExpertId } from './expertRegistry';
import type {
  ExpertCompositionResult,
  ExpertContribution
} from './expertCompositionEngine';

export type ExplainabilityConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface ExpertExplainabilityContributor {
  expertId: OperationalExpertId;
  name: string;
  contribution: string;
  confidence: {
    score: number;
    level: ExplainabilityConfidenceLevel;
  };
  whyIncluded: string;
}

export interface ExpertExplainabilityContext {
  key: ExpertContextKey | 'connected_platforms' | 'behavioral_memory' | 'profession' | 'twin_profile';
  label: string;
  detail: string;
}

export interface ExpertExplainabilityView {
  schemaVersion: '1.0.0';
  title: string;
  generatedUsing: string[];
  contributors: ExpertExplainabilityContributor[];
  whySuggestionsAppeared: string[];
  contextUsed: ExpertExplainabilityContext[];
  transparencyNotes: string[];
  userFacingSummary: string;
}

const CONTEXT_LABELS: Record<ExpertContextKey, string> = {
  brand_profile: 'Brand profile',
  brand_vault: 'Brand vault',
  content_library: 'Content library',
  publishing_queue: 'Publishing queue',
  outreach_drafts: 'Outreach workspace',
  contacts: 'Contacts',
  opportunities: 'Opportunity pipeline',
  follow_ups: 'Follow-ups',
  scheduler: 'Scheduler',
  integration_hub: 'Integration hub',
  external_artifacts: 'External artifacts',
  operator_traces: 'Operator traces',
  ai_assistant_traces: 'Assistant traces',
  digital_twins: 'Digital twin profile',
  connected_identity: 'Connected identity signals',
  memory_context: 'Memory context',
  app_settings: 'Workspace settings'
};

function uniq(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, ' ').trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
  }
  return out;
}

function confidenceLevel(score: number): ExplainabilityConfidenceLevel {
  if (score >= 0.74) return 'High';
  if (score >= 0.58) return 'Medium';
  return 'Low';
}

function contributionLabel(contribution: ExpertContribution): string {
  switch (contribution.kind) {
    case 'strategic_angle':
      return 'Strategic angle';
    case 'messaging_draft':
      return 'Messaging draft';
    case 'execution_sequence':
      return 'Execution sequence';
    case 'fact_validation':
      return 'Fact validation';
    case 'content_strategy':
      return 'Content strategy';
    case 'opportunity_assessment':
      return 'Opportunity assessment';
    case 'behavioral_forecast':
      return 'Behavioral forecast';
    case 'integration_readout':
      return 'Integration readout';
    default:
      return 'Operational guidance';
  }
}

function safeWhyIncluded(contribution: ExpertContribution): string {
  const missing = contribution.explainability.missingContext;
  const missingNote = missing.length
    ? ` Some context was unavailable: ${missing.map((key) => CONTEXT_LABELS[key]).join(', ')}.`
    : '';
  return `${contribution.explainability.role}${missingNote}`;
}

function contextDetailFor(key: ExpertContextKey): string {
  switch (key) {
    case 'operator_traces':
    case 'ai_assistant_traces':
    case 'connected_identity':
    case 'memory_context':
      return 'Used as local behavioral or memory context; not as autonomous execution authority.';
    case 'digital_twins':
      return 'Used for approved profile, identity, voice, or memory grounding.';
    case 'integration_hub':
    case 'external_artifacts':
      return 'Used for platform/source awareness and artifact grounding.';
    case 'app_settings':
      return 'Used for workspace mode, approval, and operating constraints.';
    default:
      return 'Used as bounded workspace context for this suggestion.';
  }
}

function parseObservedSignal(signal: string): ExpertExplainabilityContext | null {
  const [kind, rawValue = ''] = signal.split(':');
  const value = rawValue.trim();
  switch (kind) {
    case 'profession':
      return value === 'present'
        ? {
            key: 'profession',
            label: 'Profession context',
            detail: 'Used role or professional positioning to shape the recommendation.'
          }
        : null;
    case 'twin_profile':
      return value === 'present'
        ? {
            key: 'twin_profile',
            label: 'Twin profile',
            detail: 'Used reviewed twin profile signals when available.'
          }
        : null;
    case 'connected_platforms':
      return value && value !== 'none'
        ? {
            key: 'connected_platforms',
            label: 'Connected platforms',
            detail: `Used platform presence: ${value}.`
          }
        : null;
    case 'behavioral_memory':
      return value && value !== 'none'
        ? {
            key: 'behavioral_memory',
            label: 'Behavioral memory',
            detail: `Used ${value} local behavioral signal${value === '1' ? '' : 's'} as advisory context.`
          }
        : null;
    default:
      return null;
  }
}

function contextUsed(result: ExpertCompositionResult): ExpertExplainabilityContext[] {
  const fromContext = result.trace.routingTrace.availableContext.map((key) => ({
    key,
    label: CONTEXT_LABELS[key],
    detail: contextDetailFor(key)
  }));
  const fromSignals = result.trace.routingTrace.observedSignals
    .map(parseObservedSignal)
    .filter((item): item is ExpertExplainabilityContext => Boolean(item));
  const byLabel = new Map<string, ExpertExplainabilityContext>();
  for (const item of [...fromContext, ...fromSignals]) {
    byLabel.set(item.label, item);
  }
  return Array.from(byLabel.values());
}

function whySuggestionsAppeared(result: ExpertCompositionResult): string[] {
  return uniq([
    `The request matched the ${result.trace.workflowType.replace(/_/g, ' ')} workflow.`,
    ...result.expertContributions.map(
      (contribution) => `${contribution.expertName}: ${contribution.summary}`
    ),
    result.planWorkflow.readiness === 'needs_input'
      ? 'Some suggestions require missing facts before execution.'
      : '',
    result.planWorkflow.readiness === 'needs_review'
      ? 'Suggestions remain reviewable and approval-gated before external action.'
      : ''
  ]);
}

export function buildExpertExplainabilityView(
  result: ExpertCompositionResult
): ExpertExplainabilityView {
  const generatedUsing = result.expertContributions.map((contribution) => contribution.expertName);
  const contributors = result.expertContributions.map((contribution) => ({
    expertId: contribution.expertId,
    name: contribution.expertName,
    contribution: contributionLabel(contribution),
    confidence: {
      score: contribution.confidence,
      level: confidenceLevel(contribution.confidence)
    },
    whyIncluded: safeWhyIncluded(contribution)
  }));
  const context = contextUsed(result);

  return {
    schemaVersion: '1.0.0',
    title: 'Generated using',
    generatedUsing,
    contributors,
    whySuggestionsAppeared: whySuggestionsAppeared(result),
    contextUsed: context,
    transparencyNotes: [
      'Shows operational routing and context usage only.',
      'Detailed model reasoning is intentionally omitted.',
      'External actions remain approval-gated.'
    ],
    userFacingSummary: `Generated using: ${generatedUsing.join(', ')}. Context used: ${
      context.map((item) => item.label).join(', ') || 'bounded request context'
    }.`
  };
}

export function formatExpertExplainabilityLines(view: ExpertExplainabilityView): string[] {
  return [
    `${view.title}:`,
    ...view.generatedUsing.map((name) => `- ${name}`),
    `Confidence: ${view.contributors
      .map((contributor) => `${contributor.name} ${contributor.confidence.level}`)
      .join(', ')}`,
    `Why this appeared: ${view.whySuggestionsAppeared.join(' ')}`,
    `Context used: ${view.contextUsed.map((item) => item.label).join(', ') || 'bounded request context'}`,
    ...view.transparencyNotes.map((note) => `Note: ${note}`)
  ];
}
