import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';
import { buildConnectedIdentityEngineReadout } from '../connectedIdentity/connectedIdentityEngine';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { localIntelligence } from '../intelligence/localIntelligence';

export type PositioningSignalSource =
  | 'background'
  | 'skills'
  | 'industry'
  | 'audience'
  | 'content'
  | 'goals'
  | 'competitors';

export interface PositioningStatement {
  id: string;
  label: string;
  statement: string;
  confidence: number;
  evidenceUsed: string[];
}

export interface PositioningIntelligenceReadout {
  positioningStatements: PositioningStatement[];
  valuePropositions: string[];
  nicheOpportunities: string[];
  differentiationAngles: string[];
  creatorPositioning: string;
  founderPositioning: string;
  professionalPositioning: string;
  evidenceUsed: Record<PositioningSignalSource, string[]>;
  strengths: string[];
  gaps: string[];
  competitorSignals: string[];
  averageConfidence: number;
  approvalPolicy: string;
  reviewCommand: string;
  regenerateCommand: string;
  approveCommand: string;
  headline: string;
}

const APPROVAL_POLICY =
  'Positioning Intelligence is advisory. The user must review and approve before positioning statements, profile copy, offers, content direction, or outreach claims are saved or used externally.';

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
    out.push(t.slice(0, 260));
    if (out.length >= cap) break;
  }
  return out;
}

function confidenceFrom(...counts: number[]): number {
  return clamp(48 + Math.min(counts.reduce((sum, count) => sum + count, 0) * 2, 38));
}

function activeTwinSignals(twin: DigitalTwin | null): {
  background: string[];
  skills: string[];
  industry: string[];
} {
  if (!twin) return { background: [], skills: [], industry: [] };
  return {
    background: uniq(
      [
        twin.displayName,
        twin.identity.headline,
        twin.identity.summary,
        twin.identity.professionalPositioning,
        ...twin.resumeProfile.achievements,
        ...twin.memory.approvedClaims,
        ...twin.memory.facts
      ],
      14
    ),
    skills: uniq(
      [...twin.resumeProfile.skills, ...twin.resumeProfile.tools, ...twin.resumeProfile.keywords],
      14
    ),
    industry: uniq(
      [
        ...twin.resumeProfile.industries,
        ...twin.resumeProfile.experience.map((item) => item.organization)
      ],
      10
    )
  };
}

function buildEvidence(workspace: BrandOpsData): Record<PositioningSignalSource, string[]> {
  const twin = getActiveDigitalTwin(workspace);
  const twinSignals = activeTwinSignals(twin);
  const platform = buildPlatformAwareAskReadout(workspace);
  const identity = buildConnectedIdentityEngineReadout(workspace);
  const contentRanked = localIntelligence.contentPriority(workspace.contentLibrary).slice(0, 5);
  const competitorRegex = /competitor|alternative|rival|versus|vs\.?|category|market/i;

  return {
    background: uniq(
      [
        ...twinSignals.background,
        workspace.brand.operatorName,
        workspace.brand.positioning,
        workspace.brand.primaryOffer,
        workspace.brandVault.positioningStatement,
        workspace.brandVault.shortBio,
        workspace.brandVault.fullAboutSummary
      ],
      14
    ),
    skills: uniq(
      [
        ...twinSignals.skills,
        ...workspace.brandVault.expertiseAreas,
        ...workspace.brandVault.serviceOfferings,
        ...workspace.brandVault.proofPoints
      ],
      14
    ),
    industry: uniq([...twinSignals.industry, ...workspace.brandVault.industries], 10),
    audience: uniq(
      [
        ...workspace.brandVault.audienceSegments,
        ...workspace.contentLibrary.map((item) => item.audience),
        ...workspace.contacts.map((contact) => `${contact.role} at ${contact.company}`),
        ...workspace.companies.map((company) => `${company.name}: ${company.relationshipStage}`),
        ...identity.signals
          .filter((signal) => signal.kind === 'professional_positioning')
          .map((signal) => signal.summary)
      ],
      14
    ),
    content: uniq(
      [
        ...contentRanked.map((signal) => `${signal.label}: ${signal.reason}`),
        ...workspace.contentLibrary.map((item) => `${item.title}: ${item.goal}`),
        ...workspace.contentLibrary.flatMap((item) => item.tags),
        ...workspace.publishingQueue.map((item) => `${item.status}: ${item.title}`)
      ],
      14
    ),
    goals: uniq(
      [
        workspace.brand.focusMetric,
        ...workspace.opportunities.map(
          (opportunity) => `${opportunity.company}: ${opportunity.nextAction}`
        ),
        ...workspace.followUps.map((followUp) => followUp.reason),
        ...workspace.scheduler.tasks.map((task) => `${task.title}: ${task.detail}`)
      ],
      12
    ),
    competitors: uniq(
      [
        ...workspace.integrationHub.artifacts
          .filter((artifact) =>
            competitorRegex.test(`${artifact.title} ${artifact.summary} ${artifact.tags.join(' ')}`)
          )
          .map((artifact) => `${artifact.title}: ${artifact.summary}`),
        ...workspace.notes
          .filter((note) => competitorRegex.test(`${note.title} ${note.detail}`))
          .map((note) => `${note.title}: ${note.detail}`),
        ...platform.recentActivity.filter((item) => competitorRegex.test(item))
      ],
      10
    )
  };
}

function first(values: string[], fallback: string): string {
  return values.find((value) => value.trim().length > 0) ?? fallback;
}

function statement(input: {
  id: string;
  label: string;
  statement: string;
  confidence: number;
  evidenceUsed: string[];
}): PositioningStatement {
  return {
    ...input,
    statement: compact(input.statement),
    evidenceUsed: uniq(input.evidenceUsed, 6),
    confidence: clamp(input.confidence)
  };
}

function actionCommand(
  action: string,
  readout: {
    headline: string;
    statements: PositioningStatement[];
    strengths: string[];
    gaps: string[];
  }
): string {
  return `ask: Positioning Intelligence ${action}. Do not save, publish, sync, send, or mutate workspace records automatically. Keep the result reviewable in PLAN and include confidence, evidence used, strengths, gaps, and approval requirements.\n\n${readout.headline}\nStatements: ${readout.statements.map((item) => `${item.label}: ${item.statement}`).join(' | ')}\nStrengths: ${readout.strengths.join(' | ')}\nGaps: ${readout.gaps.join(' | ')}`;
}

export function buildPositioningIntelligenceReadout(
  workspace: BrandOpsData
): PositioningIntelligenceReadout {
  const evidence = buildEvidence(workspace);
  const skillLead = first(evidence.skills, 'operational expertise');
  const audienceLead = first(evidence.audience, 'high-fit operators');
  const industryLead = first(evidence.industry, 'your market');
  const goalLead = first(evidence.goals, 'measurable execution outcomes');
  const backgroundLead = first(
    evidence.background,
    workspace.brand.positioning || workspace.brand.operatorName
  );
  const contentLead = first(evidence.content, 'proof-led content and operating insights');
  const hasCompetitors = evidence.competitors.length > 0;

  const positioningStatements = [
    statement({
      id: 'positioning-professional',
      label: 'Professional positioning',
      statement: `${backgroundLead} for ${audienceLead}, using ${skillLead} to create ${goalLead}.`,
      confidence: confidenceFrom(
        evidence.background.length,
        evidence.skills.length,
        evidence.audience.length,
        evidence.goals.length
      ),
      evidenceUsed: [
        ...evidence.background,
        ...evidence.skills,
        ...evidence.audience,
        ...evidence.goals
      ]
    }),
    statement({
      id: 'positioning-founder',
      label: 'Founder positioning',
      statement: `A founder-facing operator who helps ${audienceLead} turn ${contentLead} into repeatable systems, sharper decisions, and trusted follow-through.`,
      confidence: confidenceFrom(
        evidence.audience.length,
        evidence.content.length,
        evidence.goals.length
      ),
      evidenceUsed: [...evidence.audience, ...evidence.content, ...evidence.goals]
    }),
    statement({
      id: 'positioning-creator',
      label: 'Creator positioning',
      statement: `A creator-operator voice for ${industryLead}, translating ${skillLead} into practical content, outreach angles, and repeatable workflows.`,
      confidence: confidenceFrom(
        evidence.industry.length,
        evidence.skills.length,
        evidence.content.length
      ),
      evidenceUsed: [...evidence.industry, ...evidence.skills, ...evidence.content]
    })
  ];

  const valuePropositions = uniq(
    [
      `Turn ${skillLead} into repeatable operating leverage for ${audienceLead}.`,
      `Connect positioning, content, outreach, and scheduling around ${goalLead}.`,
      'Reduce generic messaging by grounding every claim in approved profile, content, and platform evidence.',
      hasCompetitors
        ? 'Differentiate against category alternatives with proof-led operating systems and visible approval gates.'
        : 'Create a clearer category point of view before comparing against competitors.'
    ],
    6
  );
  const nicheOpportunities = uniq(
    [
      `${industryLead} operators who need workflow systems, not one-off content or outreach help.`,
      `${audienceLead} with repeated follow-up, content, or GTM execution patterns.`,
      `Teams where ${skillLead} can become a measurable operating advantage.`,
      ...evidence.content
        .filter((item) => /founder|creator|growth|workflow|ai/i.test(item))
        .slice(0, 3)
    ],
    6
  );
  const differentiationAngles = uniq(
    [
      'Profession-aware intelligence tied to an active digital twin.',
      'Approval-gated PLAN and OPERATE flows instead of autonomous execution.',
      'Evidence-led positioning that shows confidence, strengths, and gaps.',
      hasCompetitors
        ? `Competitor-aware contrast: ${evidence.competitors[0]}`
        : 'Competitor gap: add competitor notes or platform summaries for sharper contrast.'
    ],
    6
  );
  const strengths = uniq(
    [
      evidence.background.length ? 'Profile/background evidence is available.' : '',
      evidence.skills.length ? 'Skill and proof signals can support specific claims.' : '',
      evidence.audience.length ? 'Audience signals are present.' : '',
      evidence.content.length ? 'Generated content provides resonance clues.' : '',
      evidence.goals.length ? 'Goals and operating pressure are visible.' : '',
      hasCompetitors ? 'Competitor/category evidence is available.' : ''
    ],
    8
  );
  const gaps = uniq(
    [
      evidence.background.length
        ? ''
        : 'Add or upload profile/resume background for stronger positioning.',
      evidence.skills.length ? '' : 'Add verified skills or proof points.',
      evidence.industry.length ? '' : 'Clarify industry or market category.',
      evidence.audience.length ? '' : 'Add audience segments or buyer context.',
      evidence.content.length ? '' : 'Create or connect content examples to measure resonance.',
      hasCompetitors ? '' : 'Add competitor/category alternatives for sharper differentiation.'
    ],
    8
  );
  const averageConfidence = clamp(
    positioningStatements.reduce((sum, item) => sum + item.confidence, 0) /
      Math.max(1, positioningStatements.length)
  );
  const headline = `${positioningStatements.length} positioning paths generated for professional, founder, and creator contexts with ${averageConfidence}% average confidence.`;

  return {
    positioningStatements,
    valuePropositions,
    nicheOpportunities,
    differentiationAngles,
    creatorPositioning:
      positioningStatements.find((item) => item.id === 'positioning-creator')?.statement ?? '',
    founderPositioning:
      positioningStatements.find((item) => item.id === 'positioning-founder')?.statement ?? '',
    professionalPositioning:
      positioningStatements.find((item) => item.id === 'positioning-professional')?.statement ?? '',
    evidenceUsed: evidence,
    strengths,
    gaps,
    competitorSignals: evidence.competitors,
    averageConfidence,
    approvalPolicy: APPROVAL_POLICY,
    reviewCommand: actionCommand('review draft', {
      headline,
      statements: positioningStatements,
      strengths,
      gaps
    }),
    regenerateCommand: actionCommand('regenerate from latest signals', {
      headline,
      statements: positioningStatements,
      strengths,
      gaps
    }),
    approveCommand: actionCommand('prepare approval packet', {
      headline,
      statements: positioningStatements,
      strengths,
      gaps
    }),
    headline
  };
}
