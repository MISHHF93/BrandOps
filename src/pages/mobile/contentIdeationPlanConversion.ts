import type { ContentIdeationItem } from '../../services/plan/predictiveContentIdeationEngine';
import type { OperationalPlanCard } from './PlanOperationalStudio';

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function templateFor(item: ContentIdeationItem): {
  title: string;
  timeline: string[];
  approveCommand: string;
} {
  switch (item.kind) {
    case 'campaign':
      return {
        title: 'Creator Campaign',
        timeline: ['Campaign objective', 'Content arc', 'Approval gate', 'Schedule assets'],
        approveCommand: 'draft post: creator campaign plan'
      };
    case 'thread-structure':
      return {
        title: 'Thread Workflow',
        timeline: ['Thread promise', 'Outline parts', 'Approve draft', 'Repurpose highlights'],
        approveCommand: 'draft post: thread structure'
      };
    case 'creator-series':
      return {
        title: 'Creator Series',
        timeline: ['Series thesis', 'Episode list', 'Approve cadence', 'Schedule first posts'],
        approveCommand: 'draft post: creator series plan'
      };
    case 'audience-hook':
      return {
        title: 'Audience Hook Workflow',
        timeline: ['Hook bank', 'Message match', 'Approve variants', 'Test in content'],
        approveCommand: 'add content: audience hook workflow'
      };
    case 'trend-opportunity':
      return {
        title: 'Trend Opportunity Plan',
        timeline: ['Trend evidence', 'Angle selection', 'Approve response', 'Measure resonance'],
        approveCommand: 'draft post: trend opportunity'
      };
    case 'post-idea':
      return {
        title: 'Post Idea Workflow',
        timeline: ['Post promise', 'Draft body', 'Approve CTA', 'Schedule or save'],
        approveCommand: 'draft post: predictive post idea'
      };
    default:
      return {
        title: 'Content Theme Plan',
        timeline: ['Theme thesis', 'Post variations', 'Approve calendar', 'Track resonance'],
        approveCommand: 'add content: predictive content theme'
      };
  }
}

export function buildOperationalPlanFromContentIdeation(
  item: ContentIdeationItem
): OperationalPlanCard {
  const template = templateFor(item);
  return {
    id: `content-ideation-plan-${item.id}-${Math.random().toString(36).slice(2, 7)}`,
    title: compact(`${template.title}: ${item.title}`).slice(0, 120),
    kind: 'content-calendar',
    promise:
      'Converted from Predictive Content Ideation. Preview, edit, approve, retry, or export before publishing or scheduling.',
    previewCommand: item.askToPlanCommand,
    approveCommand: template.approveCommand,
    editTarget: 'palette',
    status: 'needs-input',
    progress: Math.max(20, Math.min(85, item.confidence - 10)),
    timeline: template.timeline,
    sourceLabel: 'Converted from content ideation',
    exportPayload: {
      type: 'predictive-content-ideation-plan',
      contentIdeationId: item.id,
      contentIdeationKind: item.kind,
      confidence: item.confidence,
      whyNow: item.whyNow,
      evidenceUsed: item.evidenceUsed.slice(0, 6),
      expectedImpact: item.expectedImpact,
      suggestedFormat: item.suggestedFormat
    }
  };
}
