import type { PlatformAwareAskReadout } from '../../services/ai/platformAwareAskContext';
import type { BehavioralIntelligenceEngineReadout } from '../../services/intelligence/behavioralIntelligenceEngine';
import type {
  PredictiveOpportunityKind,
  PredictiveOpportunityLayerReadout,
  PredictiveOpportunitySuggestion
} from '../../services/plan/predictiveOpportunityLayer';
import type {
  ContentIdeationItem,
  PredictiveContentIdeationReadout
} from '../../services/plan/predictiveContentIdeationEngine';
import type {
  WorkflowPrediction,
  WorkflowPredictionLayerReadout
} from '../../services/plan/workflowPredictionLayer';
import type { MemoryContextEngineReadout } from '../../services/memory/memoryContextEngine';
import type { DigitalTwin } from '../../types/domain';

export interface PredictiveAskPrompt {
  id: string;
  title: string;
  prompt: string;
  why: string;
  confidence: number;
  command: string;
  sourceSuggestion?: PredictiveOpportunitySuggestion;
  sourceContentIdeation?: ContentIdeationItem;
  sourceWorkflowPrediction?: WorkflowPrediction;
}

export interface PredictiveAskPromptGroup {
  id: string;
  label: string;
  prompts: PredictiveAskPrompt[];
}

export interface BuildPredictiveAskPromptGroupsInput {
  predictiveOpportunityLayer?: PredictiveOpportunityLayerReadout;
  predictiveContentIdeationEngine?: PredictiveContentIdeationReadout;
  workflowPredictionLayer?: WorkflowPredictionLayerReadout;
  memoryContextEngine?: MemoryContextEngineReadout;
  behavioralIntelligenceEngine?: BehavioralIntelligenceEngineReadout;
  activeDigitalTwin?: DigitalTwin | null;
  platformAwareAsk?: PlatformAwareAskReadout;
  recentCommandLines?: string[];
}

const GROUP_ORDER: PredictiveOpportunityKind[] = [
  'outreach-opportunity',
  'follow-up-suggestion',
  'content-ideation',
  'growth-opportunity',
  'workflow-optimization',
  'scheduling-improvement',
  'positioning-analysis',
  'buyer-persona-generation',
  'operational-improvement'
];

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
    out.push(t.slice(0, 220));
    if (out.length >= cap) break;
  }
  return out;
}

function phraseFromSignals(signals: string[], fallback: string): string {
  const text = signals.join(' ').toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/\binvestor|fundrais|vc\b/, 'investor outreach'],
    [/\bfounder|ceo|operator\b/, 'founder outreach'],
    [/\bsales|pipeline|crm|lead|deal\b/, 'sales outreach'],
    [/\bcreator|content|linkedin|publishing|post\b/, 'creator content'],
    [/\bfollow[- ]?up|reply|warm\b/, 'follow-up work'],
    [/\bschedule|calendar|meeting|deep[- ]?work\b/, 'scheduling'],
    [/\bworkflow|checklist|repeat|repeated\b/, 'repeatable workflow'],
    [/\bpositioning|profile|offer\b/, 'positioning']
  ];
  return patterns.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}

function professionContext(twin?: DigitalTwin | null): string {
  if (!twin) return 'your current operating context';
  return (
    twin.identity.professionalPositioning ||
    twin.identity.headline ||
    twin.identity.summary ||
    twin.displayName
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function memoryContext(memory?: MemoryContextEngineReadout): string {
  if (!memory?.entries.length) return 'No persistent memory context yet.';
  const goals = memory.entriesByCategory.goals.slice(0, 2).map((item) => item.value);
  const prefs = memory.entriesByCategory.preferences.slice(0, 2).map((item) => item.value);
  const style = memory.entriesByCategory['communication-style'].slice(0, 2).map((item) => item.value);
  return [...goals, ...prefs, ...style].length
    ? [...goals, ...prefs, ...style].join(' | ')
    : memory.entries.slice(0, 4).map((item) => `${item.label}: ${item.value}`).join(' | ');
}

function recencyCopy(input: {
  suggestion: PredictiveOpportunitySuggestion;
  behavioral?: BehavioralIntelligenceEngineReadout;
  recentCommandLines: string[];
}): string {
  const signals = uniq([
    ...input.suggestion.supportingSignals,
    ...(input.behavioral?.patterns.flatMap((pattern) => [pattern.label, ...pattern.evidence]) ?? []),
    ...input.recentCommandLines.slice(0, 6)
  ]);
  const topic = phraseFromSignals(signals, input.suggestion.title.toLowerCase());
  const behaviorSeen =
    input.recentCommandLines.length > 0 ||
    (input.behavioral?.patterns.length ?? 0) > 0 ||
    input.suggestion.generatedFrom.includes('recent-actions') ||
    input.suggestion.generatedFrom.includes('behavioral-history');

  return behaviorSeen ? `You recently worked on ${topic}.` : `BrandOps sees signal around ${topic}.`;
}

function promptQuestion(input: {
  suggestion: PredictiveOpportunitySuggestion;
  context: string;
  recentLead: string;
}): string {
  const { suggestion, context, recentLead } = input;
  switch (suggestion.kind) {
    case 'buyer-persona-generation':
      return `${recentLead} Want to generate buyer personas for ${context}?`;
    case 'positioning-analysis':
      return `${recentLead} Want a positioning analysis with proof, gaps, and sharper angles?`;
    case 'outreach-opportunity':
      return `${recentLead} Want to generate a follow-up sequence for approval?`;
    case 'content-ideation':
      return `${recentLead} Want content ideas that fit ${context}?`;
    case 'workflow-optimization':
      return `${recentLead} Want to turn it into a reusable workflow?`;
    case 'operational-improvement':
      return `${recentLead} Want an operating-system improvement plan?`;
    case 'follow-up-suggestion':
      return `${recentLead} Want prioritized follow-up suggestions?`;
    case 'growth-opportunity':
      return `${recentLead} Want a growth analysis based on the latest signals?`;
    case 'scheduling-improvement':
      return `${recentLead} Want scheduling improvements for the next operating window?`;
    default:
      return `${recentLead} Want ASK to turn this into a PLAN-ready recommendation?`;
  }
}

function commandFor(input: {
  prompt: string;
  suggestion: PredictiveOpportunitySuggestion;
  context: string;
  memory?: MemoryContextEngineReadout;
}): string {
  return `ask: ${input.prompt}\n\nUse profession context: ${input.context}. Use persistent memory context when relevant: ${memoryContext(input.memory)}. Use the Predictive Opportunity Layer suggestion "${input.suggestion.title}" with confidence ${input.suggestion.confidence}%. Explain why this is timely, cite supporting signals, estimate expected impact, and propose next steps. Do not execute externally or mutate workspace records; keep outputs approval-ready for PLAN.`;
}

function toPrompt(input: {
  suggestion: PredictiveOpportunitySuggestion;
  behavioral?: BehavioralIntelligenceEngineReadout;
  activeDigitalTwin?: DigitalTwin | null;
  recentCommandLines: string[];
  memory?: MemoryContextEngineReadout;
}): PredictiveAskPrompt {
  const context = professionContext(input.activeDigitalTwin);
  const recentLead = recencyCopy({
    suggestion: input.suggestion,
    behavioral: input.behavioral,
    recentCommandLines: input.recentCommandLines
  });
  const prompt = promptQuestion({ suggestion: input.suggestion, context, recentLead });
  return {
    id: `ask-${input.suggestion.id}`,
    title: input.suggestion.title,
    prompt,
    why: input.suggestion.whyThisAppeared,
    confidence: input.suggestion.confidence,
    command: commandFor({ prompt, suggestion: input.suggestion, context, memory: input.memory }),
    sourceSuggestion: input.suggestion
  };
}

function toContentIdeationPrompt(item: ContentIdeationItem): PredictiveAskPrompt {
  const prompt = `This content idea is timely: ${item.title}. Want to turn it into a PLAN-ready content workflow?`;
  return {
    id: `ask-${item.id}`,
    title: item.title,
    prompt,
    why: item.whyNow,
    confidence: item.confidence,
    command: item.askToPlanCommand,
    sourceContentIdeation: item
  };
}

function toWorkflowPredictionPrompt(prediction: WorkflowPrediction): PredictiveAskPrompt {
  const prompt = `${prediction.title}. ${prediction.suggestion}`;
  return {
    id: `ask-${prediction.id}`,
    title: prediction.title,
    prompt,
    why: prediction.repeatedPattern,
    confidence: prediction.confidence,
    command: prediction.controls.reuseCommand,
    sourceWorkflowPrediction: prediction
  };
}

function fallbackPrompt(input: BuildPredictiveAskPromptGroupsInput): PredictiveAskPrompt {
  const context = professionContext(input.activeDigitalTwin);
  const connected = input.platformAwareAsk?.connectedApps.join(', ') || 'BrandOps workspace';
  const prompt = `Your ASK context is set up for ${context}. Want a timely next-action scan across ${connected}?`;
  return {
    id: 'ask-predictive-context-scan',
    title: 'Scan for timely next actions',
    prompt,
    why: 'Generated from current twin/profile and connected platform visibility.',
    confidence: input.activeDigitalTwin ? 64 : 52,
    command: `ask: ${prompt}\n\nUse connected platform context, recent activity, workflow state, profession context, and persistent memory context when relevant: ${memoryContext(input.memoryContextEngine)}. Explain why each suggestion is timely, include confidence and supporting signals, and keep every next action approval-ready. Do not execute externally.`
  };
}

function groupLabel(kind: PredictiveOpportunityKind): string {
  switch (kind) {
    case 'outreach-opportunity':
    case 'follow-up-suggestion':
      return 'Timely outreach';
    case 'content-ideation':
    case 'growth-opportunity':
      return 'Growth and content';
    case 'workflow-optimization':
    case 'operational-improvement':
    case 'scheduling-improvement':
      return 'Operating rhythm';
    case 'positioning-analysis':
    case 'buyer-persona-generation':
      return 'Positioning and buyers';
    default:
      return 'Predictive prompts';
  }
}

export function buildPredictiveAskPromptGroups(
  input: BuildPredictiveAskPromptGroupsInput
): PredictiveAskPromptGroup[] {
  const suggestions = [...(input.predictiveOpportunityLayer?.suggestions ?? [])].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.kind);
    const bi = GROUP_ORDER.indexOf(b.kind);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || b.confidence - a.confidence;
  });
  const prompts = suggestions
    .slice(0, 6)
    .map((suggestion) =>
      toPrompt({
        suggestion,
        behavioral: input.behavioralIntelligenceEngine,
        activeDigitalTwin: input.activeDigitalTwin,
        recentCommandLines: input.recentCommandLines ?? [],
        memory: input.memoryContextEngine
      })
    );
  const contentPrompts = (input.predictiveContentIdeationEngine?.allIdeas ?? [])
    .slice(0, 3)
    .map(toContentIdeationPrompt);
  const workflowPrompts = (input.workflowPredictionLayer?.predictions ?? [])
    .slice(0, 3)
    .map(toWorkflowPredictionPrompt);

  const finalPrompts = [...workflowPrompts, ...contentPrompts, ...prompts].length
    ? [...workflowPrompts, ...contentPrompts, ...prompts]
    : [fallbackPrompt(input)];
  const grouped = new Map<string, PredictiveAskPrompt[]>();
  for (const prompt of finalPrompts) {
    const source = suggestions.find((suggestion) => `ask-${suggestion.id}` === prompt.id);
    const label = prompt.sourceWorkflowPrediction
      ? 'Workflow predictions'
      : prompt.sourceContentIdeation
      ? 'Predictive content'
      : source
        ? groupLabel(source.kind)
        : 'Context-aware ASK';
    grouped.set(label, [...(grouped.get(label) ?? []), prompt]);
  }

  return Array.from(grouped, ([label, rows], index) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `predictive-${index}`,
    label,
    prompts: rows.slice(0, 3)
  })).slice(0, 4);
}

