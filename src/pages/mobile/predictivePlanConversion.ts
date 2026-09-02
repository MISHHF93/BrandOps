import { quoteContextValue } from '../../services/interop/validation';
import type { PredictiveOpportunitySuggestion } from '../../services/plan/predictiveOpportunityLayer';
import type { OperationalPlanCard } from './PlanOperationalStudio';

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function keywordText(suggestion: PredictiveOpportunitySuggestion): string {
  return [
    suggestion.title,
    suggestion.suggestion,
    suggestion.whyThisAppeared,
    suggestion.expectedImpact,
    ...suggestion.supportingSignals
  ]
    .join(' ')
    .toLowerCase();
}

function planTemplate(suggestion: PredictiveOpportunitySuggestion): {
  title: string;
  kind: OperationalPlanCard['kind'];
  timeline: string[];
  approveCommand: string;
} {
  const text = keywordText(suggestion);
  if (/investor|fundrais|vc/.test(text)) {
    return {
      title: 'Investor Update Flow',
      kind: 'outreach',
      timeline: [
        'Gather updates',
        'Draft investor narrative',
        'Approve send list',
        'Queue follow-ups'
      ],
      approveCommand: 'draft outreach: investor update follow-up'
    };
  }
  if (/onboarding|new hire|activation|welcome/.test(text)) {
    return {
      title: 'Onboarding Workflow',
      kind: 'workflow',
      timeline: [
        'Intake context',
        'Map onboarding stages',
        'Approve checklist',
        'Track completion'
      ],
      approveCommand: 'add note: onboarding workflow approved'
    };
  }
  if (/hiring|recruit|candidate|interview/.test(text)) {
    return {
      title: 'Hiring Workflow',
      kind: 'workflow',
      timeline: [
        'Define role need',
        'Draft candidate flow',
        'Approve outreach',
        'Track interviews'
      ],
      approveCommand: 'add note: hiring workflow approved'
    };
  }
  if (/creator|campaign|launch|audience/.test(text)) {
    return {
      title: 'Creator Campaign',
      kind: 'content-calendar',
      timeline: [
        'Select campaign angle',
        'Draft content arc',
        'Approve calendar',
        'Schedule assets'
      ],
      approveCommand: 'draft post: creator campaign plan'
    };
  }
  if (suggestion.kind === 'content-ideation' || /content|calendar|post|publish/.test(text)) {
    return {
      title: 'Content Calendar',
      kind: 'content-calendar',
      timeline: ['Choose themes', 'Draft calendar', 'Approve posts', 'Schedule queue'],
      approveCommand: 'draft post: content calendar plan'
    };
  }
  if (
    suggestion.kind === 'outreach-opportunity' ||
    suggestion.kind === 'follow-up-suggestion' ||
    /outreach|follow[- ]?up|sales|pipeline|reply/.test(text)
  ) {
    return {
      title: 'Outreach Sequence',
      kind: 'outreach',
      timeline: ['Select target context', 'Draft sequence', 'Approve messages', 'Track replies'],
      approveCommand: 'draft outreach: reusable outreach sequence'
    };
  }
  return {
    title: 'Reusable Operational Plan',
    kind: 'workflow',
    timeline: ['Capture pattern', 'Draft workflow', 'Approve operating steps', 'Track iteration'],
    approveCommand: 'add note: reusable operational plan approved'
  };
}

export function buildOperationalPlanFromPredictiveSuggestion(
  suggestion: PredictiveOpportunitySuggestion
): OperationalPlanCard {
  const template = planTemplate(suggestion);
  const title =
    template.title === 'Reusable Operational Plan'
      ? `${suggestion.title} Plan`
      : `${template.title}: ${suggestion.title}`;
  const supportingSignals = suggestion.supportingSignals.slice(0, 5);
  return {
    id: `predictive-plan-${suggestion.id}-${Math.random().toString(36).slice(2, 7)}`,
    title: compact(title).slice(0, 120),
    kind: template.kind,
    promise:
      'Converted from a predictive opportunity. Preview, edit, approve, retry, or export before any execution.',
    previewCommand: `ask: Convert this predictive opportunity into a reusable operational plan. Include operating stages, repeatable checklist, triggers, owner handoffs, approval gates, risks, success metrics, and receipt expectations. Do not execute externally or mutate workspace records.\n\nOpportunity: ${quoteContextValue(suggestion.title)}\nType: ${suggestion.kind}\nSuggestion: ${quoteContextValue(suggestion.suggestion)}\nWhy this appeared: ${quoteContextValue(suggestion.whyThisAppeared)}\nConfidence: ${suggestion.confidence}%\nSupporting signals: ${supportingSignals.map((s) => quoteContextValue(s)).join(' | ')}\nExpected impact: ${quoteContextValue(suggestion.expectedImpact)}\nOffer to the user: Convert this into a reusable operational plan.`,
    approveCommand: template.approveCommand,
    editTarget: 'palette',
    status: 'needs-input',
    progress: Math.max(20, Math.min(85, suggestion.confidence - 10)),
    timeline: template.timeline,
    sourceLabel: 'Converted from predictive opportunity',
    exportPayload: {
      type: 'predictive-operational-plan',
      predictiveOpportunityId: suggestion.id,
      predictiveOpportunityKind: suggestion.kind,
      confidence: suggestion.confidence,
      whyThisAppeared: suggestion.whyThisAppeared,
      supportingSignals,
      expectedImpact: suggestion.expectedImpact
    }
  };
}
