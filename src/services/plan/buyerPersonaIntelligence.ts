import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';
import { buildConnectedIdentityEngineReadout } from '../connectedIdentity/connectedIdentityEngine';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { localIntelligence } from '../intelligence/localIntelligence';

export type BuyerPersonaSource =
  | 'uploaded-profile'
  | 'connected-platforms'
  | 'generated-content'
  | 'outreach-patterns'
  | 'audience-behavior'
  | 'profession';

export interface IdealCustomerProfile {
  title: string;
  summary: string;
  firmographics: string[];
  pains: string[];
  buyingTriggers: string[];
  disqualifiers: string[];
  confidence: number;
}

export interface BuyerPersona {
  id: string;
  name: string;
  role: string;
  segment: string;
  coreNeed: string;
  objections: string[];
  proofNeeded: string[];
  bestChannels: string[];
  recommendedMessage: string;
  confidence: number;
}

export interface BuyerPersonaVersion {
  id: string;
  label: string;
  summary: string;
  basis: BuyerPersonaSource[];
  confidence: number;
  changes: string[];
}

export interface BuyerPersonaIntelligenceReadout {
  idealCustomerProfile: IdealCustomerProfile;
  buyerPersonas: BuyerPersona[];
  audienceSegments: string[];
  communicationRecommendations: string[];
  outreachAngles: string[];
  contentResonanceSuggestions: string[];
  supportingSignals: string[];
  sourceCoverage: Record<BuyerPersonaSource, number>;
  versions: BuyerPersonaVersion[];
  activeVersionId: string;
  averageConfidence: number;
  approvalPolicy: string;
  editCommand: string;
  approveCommand: string;
  regenerateCommand: string;
  compareVersionsCommand: string;
  headline: string;
}

const APPROVAL_POLICY =
  'Buyer Persona Intelligence is a draft intelligence layer. The user can edit, approve, regenerate, or compare versions before personas, ICPs, outreach angles, or content recommendations are saved or used externally.';

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

function topCounts(values: string[], cap = 5): string[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = compact(raw);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, cap)
    .map((row) => row.value);
}

function activeTwinSignals(twin: DigitalTwin | null): string[] {
  if (!twin) return [];
  return uniq(
    [
      twin.identity.headline,
      twin.identity.professionalPositioning,
      twin.identity.summary,
      ...twin.resumeProfile.skills,
      ...twin.resumeProfile.industries,
      ...twin.resumeProfile.achievements,
      ...twin.memory.approvedClaims,
      ...twin.memory.facts
    ],
    16
  );
}

function professionSignals(workspace: BrandOpsData): string[] {
  return uniq(
    [
      workspace.brand.positioning,
      workspace.brand.primaryOffer,
      workspace.brand.focusMetric,
      ...workspace.brandVault.serviceOfferings,
      ...workspace.brandVault.audienceSegments,
      ...workspace.brandVault.expertiseAreas,
      ...workspace.brandVault.industries,
      ...workspace.brandVault.proofPoints
    ],
    16
  );
}

function platformSignals(workspace: BrandOpsData): string[] {
  const platform = buildPlatformAwareAskReadout(workspace);
  const identity = buildConnectedIdentityEngineReadout(workspace);
  return uniq(
    [
      ...platform.connectedApps.map((app) => `${app} connected`),
      ...platform.recentActivity,
      ...workspace.integrationHub.artifacts.map((artifact) => `${artifact.title}: ${artifact.summary}`),
      ...identity.signals.map((signal) => `${signal.source}: ${signal.summary}`)
    ],
    16
  );
}

function contentSignals(workspace: BrandOpsData): string[] {
  const ranked = localIntelligence.contentPriority(workspace.contentLibrary).slice(0, 5);
  return uniq(
    [
      ...ranked.map((signal) => `${signal.label}: ${signal.reason}`),
      ...workspace.contentLibrary.flatMap((item) => item.tags),
      ...workspace.contentLibrary.map((item) => item.audience),
      ...workspace.publishingQueue.map((item) => `${item.status}: ${item.title}`)
    ],
    16
  );
}

function outreachSignals(workspace: BrandOpsData): string[] {
  const urgency = localIntelligence.outreachUrgency(workspace.outreachDrafts).slice(0, 5);
  return uniq(
    [
      ...urgency.map((signal) => `${signal.label}: ${signal.reason}`),
      ...workspace.outreachDrafts.map((draft) => `${draft.category}: ${draft.outreachGoal}`),
      ...workspace.outreachTemplates.map((template) => `${template.category}: ${template.name}`),
      ...workspace.outreachHistory.map((entry) => `${entry.status}: ${entry.summary}`)
    ],
    16
  );
}

function audienceBehaviorSignals(workspace: BrandOpsData): string[] {
  return uniq(
    [
      ...workspace.contacts.map((contact) => `${contact.role} at ${contact.company}: ${contact.relationshipStage}`),
      ...workspace.companies.map((company) => `${company.name}: ${company.relationshipStage}`),
      ...workspace.opportunities.map(
        (opportunity) =>
          `${opportunity.company}: ${opportunity.opportunityType} ${opportunity.status} ${opportunity.nextAction}`
      ),
      ...workspace.notes.map((note) => `${note.entityType}: ${note.title} ${note.detail}`)
    ],
    18
  );
}

function sourceCoverage(input: {
  profile: string[];
  platforms: string[];
  content: string[];
  outreach: string[];
  audience: string[];
  profession: string[];
}): Record<BuyerPersonaSource, number> {
  return {
    'uploaded-profile': input.profile.length,
    'connected-platforms': input.platforms.length,
    'generated-content': input.content.length,
    'outreach-patterns': input.outreach.length,
    'audience-behavior': input.audience.length,
    profession: input.profession.length
  };
}

function confidenceFrom(...counts: number[]): number {
  return clamp(46 + Math.min(counts.reduce((sum, count) => sum + count, 0) * 2, 36));
}

function buildIcp(input: {
  profession: string[];
  profile: string[];
  platforms: string[];
  content: string[];
  outreach: string[];
  audience: string[];
}): IdealCustomerProfile {
  const audienceHints = topCounts(
    [
      ...input.profession,
      ...input.profile,
      ...input.content,
      ...input.audience
    ].filter((item) => /founder|leader|operator|manager|creator|saas|product|engineering|growth/i.test(item)),
    6
  );
  return {
    title: audienceHints[0] ?? 'High-fit operator buyer',
    summary:
      'Best-fit buyers are people or teams whose current operating pressure matches the operator profile, proof points, outreach history, and content themes already present in BrandOps.',
    firmographics: uniq(
      [
        ...input.profession.filter((item) => /saas|founder|product|engineering|ai|creator|growth/i.test(item)),
        ...input.audience.filter((item) => / at |company|labs|inc|studio|team/i.test(item))
      ],
      6
    ),
    pains: uniq(
      [
        'Need clearer operating systems, not one-off advice.',
        'Need proof-led execution and trusted follow-through.',
        ...input.content.filter((item) => /bottleneck|workflow|growth|execution|lead/i.test(item)),
        ...input.outreach.filter((item) => /call|follow|reply|proposal|intro/i.test(item))
      ],
      6
    ),
    buyingTriggers: uniq(
      [
        'Recent reply, proposal, intro, or follow-up activity.',
        'Repeated workflow, content, or outreach patterns.',
        ...input.platforms.slice(0, 3),
        ...input.audience.filter((item) => /proposal|discovery|negotiation|next/i.test(item))
      ],
      6
    ),
    disqualifiers: uniq(
      [
        'No clear operating pain or measurable next action.',
        'Requires unsupported claims or private platform data not approved by the user.',
        'Audience segment does not match the active profession or verified proof.'
      ],
      5
    ),
    confidence: confidenceFrom(
      input.profession.length,
      input.profile.length,
      input.content.length,
      input.outreach.length,
      input.audience.length
    )
  };
}

function persona(input: {
  id: string;
  name: string;
  role: string;
  segment: string;
  coreNeed: string;
  objections: string[];
  proofNeeded: string[];
  bestChannels: string[];
  recommendedMessage: string;
  confidence: number;
}): BuyerPersona {
  return {
    ...input,
    objections: uniq(input.objections, 4),
    proofNeeded: uniq(input.proofNeeded, 4),
    bestChannels: uniq(input.bestChannels, 4)
  };
}

function buildPersonas(input: {
  profession: string[];
  profile: string[];
  platforms: string[];
  content: string[];
  outreach: string[];
  audience: string[];
}): BuyerPersona[] {
  const channels = uniq(
    [
      ...input.platforms
        .filter((signal) => /linkedin|gmail|slack|notion/i.test(signal))
        .map((signal) => signal.split(' ')[0]),
      'LinkedIn',
      'Email'
    ],
    4
  );
  const proof = uniq([...input.profile, ...input.profession, ...input.content], 5);
  return [
    persona({
      id: 'persona-founder-operator',
      name: 'Founder Operator',
      role: 'Founder, CEO, or owner-operator',
      segment: 'Growth-stage operators with strategic execution pressure',
      coreNeed: 'Turn scattered ideas, pipeline, and content into a reliable operating system.',
      objections: ['Too busy to adopt another tool', 'Needs proof this will create business leverage'],
      proofNeeded: proof,
      bestChannels: channels,
      recommendedMessage:
        'Lead with operational clarity, fast time-to-value, and proof that repeated work becomes a reusable system.',
      confidence: confidenceFrom(input.profession.length, input.audience.length, input.outreach.length)
    }),
    persona({
      id: 'persona-product-growth-leader',
      name: 'Product/Growth Leader',
      role: 'Product, growth, or GTM leader',
      segment: 'Teams translating AI, content, or outreach ideas into measurable workflows',
      coreNeed: 'Prioritize the right campaigns, content, and follow-ups without losing execution rhythm.',
      objections: ['Needs strategic specificity', 'Will reject generic marketing or AI hype'],
      proofNeeded: proof,
      bestChannels: channels,
      recommendedMessage:
        'Frame BrandOps as a profession-aware operating layer that connects positioning, content, outreach, and scheduling.',
      confidence: confidenceFrom(input.profile.length, input.content.length, input.platforms.length)
    }),
    persona({
      id: 'persona-creator-business-builder',
      name: 'Creator Business Builder',
      role: 'Creator, advisor, consultant, or expert-led business owner',
      segment: 'People turning expertise into content, partnerships, and repeatable revenue motions',
      coreNeed: 'Find resonant content, credible outreach angles, and repeatable campaign workflows.',
      objections: ['Does not want generic content prompts', 'Needs voice and proof to stay accurate'],
      proofNeeded: proof,
      bestChannels: channels,
      recommendedMessage:
        'Emphasize voice fit, approved proof, content resonance, and reusable creator campaign systems.',
      confidence: confidenceFrom(input.content.length, input.outreach.length, input.profile.length)
    })
  ].sort((a, b) => b.confidence - a.confidence);
}

function actionCommand(action: string, details: string): string {
  return `ask: Buyer Persona Intelligence ${action}. Do not save, send, sync, or mutate workspace records automatically. Keep the result reviewable in PLAN with approval, regenerate, edit, and compare-version options.\n\n${details}`;
}

export function buildBuyerPersonaIntelligenceReadout(
  workspace: BrandOpsData
): BuyerPersonaIntelligenceReadout {
  const twin = getActiveDigitalTwin(workspace);
  const profile = activeTwinSignals(twin);
  const profession = professionSignals(workspace);
  const platforms = platformSignals(workspace);
  const content = contentSignals(workspace);
  const outreach = outreachSignals(workspace);
  const audience = audienceBehaviorSignals(workspace);
  const coverage = sourceCoverage({ profile, platforms, content, outreach, audience, profession });
  const icp = buildIcp({ profile, platforms, content, outreach, audience, profession });
  const personas = buildPersonas({ profile, platforms, content, outreach, audience, profession });
  const audienceSegments = uniq(
    [
      ...workspace.brandVault.audienceSegments,
      ...personas.map((p) => p.segment),
      ...topCounts(workspace.contentLibrary.map((item) => item.audience), 4),
      ...workspace.contacts.map((contact) => contact.role)
    ],
    10
  );
  const communicationRecommendations = uniq(
    [
      'Use proof-led, profession-aware language instead of broad AI or marketing claims.',
      'Ask for missing facts before referencing private profile, resume, or platform details.',
      'Lead with the buyer pain, then show the reusable operating system or workflow.',
      ...workspace.brandVault.preferredVoiceNotes,
      ...workspace.outreachDrafts.map((draft) => `${draft.tone}: ${draft.outreachGoal}`)
    ],
    8
  );
  const outreachAngles = uniq(
    [
      ...workspace.brandVault.outreachAngles,
      'Turn repeated operational friction into a reusable workflow.',
      'Convert approved content and proof into a sharper buyer-specific follow-up.',
      'Use current timing or pipeline pressure as the reason to start the conversation.',
      ...workspace.outreachDrafts.map((draft) => draft.outreachGoal)
    ],
    10
  );
  const contentResonanceSuggestions = uniq(
    [
      'Show the before/after operating system behind a real workflow.',
      'Translate buyer pains into tactical posts with a specific next action.',
      'Reuse approved proof points across content, outreach, and follow-ups.',
      ...localIntelligence.contentPriority(workspace.contentLibrary)
        .slice(0, 4)
        .map((signal) => `${signal.label}: ${signal.reason}`)
    ],
    8
  );
  const supportingSignals = uniq([...profile, ...profession, ...platforms, ...content, ...outreach, ...audience], 14);
  const versions: BuyerPersonaVersion[] = [
    {
      id: 'buyer-persona-v1-profile-led',
      label: 'Profile-led',
      summary: 'Prioritizes uploaded profile/resume, profession, brand vault, and approved twin memory.',
      basis: ['uploaded-profile', 'profession'],
      confidence: confidenceFrom(profile.length, profession.length),
      changes: ['Sharper ICP from positioning and proof', 'More conservative claims when evidence is missing']
    },
    {
      id: 'buyer-persona-v2-behavior-led',
      label: 'Behavior-led',
      summary: 'Weights connected platforms, generated content, outreach patterns, and audience behavior.',
      basis: ['connected-platforms', 'generated-content', 'outreach-patterns', 'audience-behavior'],
      confidence: confidenceFrom(platforms.length, content.length, outreach.length, audience.length),
      changes: ['More timely outreach angles', 'More content resonance and follow-up triggers']
    }
  ];
  const averageConfidence = clamp(
    (icp.confidence + personas.reduce((sum, p) => sum + p.confidence, 0)) / (personas.length + 1)
  );
  const detail = [
    `ICP: ${icp.title}`,
    `Personas: ${personas.map((p) => p.name).join(', ')}`,
    `Audience segments: ${audienceSegments.join(' | ')}`,
    `Signals: ${supportingSignals.slice(0, 8).join(' | ')}`
  ].join('\n');

  return {
    idealCustomerProfile: icp,
    buyerPersonas: personas,
    audienceSegments,
    communicationRecommendations,
    outreachAngles,
    contentResonanceSuggestions,
    supportingSignals,
    sourceCoverage: coverage,
    versions,
    activeVersionId: versions[0]?.id ?? 'buyer-persona-v1-profile-led',
    averageConfidence,
    approvalPolicy: APPROVAL_POLICY,
    editCommand: actionCommand('edit draft', detail),
    approveCommand: actionCommand('prepare approval packet', detail),
    regenerateCommand: actionCommand('regenerate personas from latest signals', detail),
    compareVersionsCommand: actionCommand(
      'compare versions',
      `${detail}\n\nVersions: ${versions.map((v) => `${v.label}: ${v.summary}`).join(' | ')}`
    ),
    headline: `${personas.length} buyer persona${personas.length === 1 ? '' : 's'} and ${audienceSegments.length} audience segment${audienceSegments.length === 1 ? '' : 's'} generated from profile, profession, platform, content, outreach, and audience behavior signals.`
  };
}

