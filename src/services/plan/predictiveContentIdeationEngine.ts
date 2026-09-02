import { quoteContextValue } from '../../services/interop/validation';
import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import { buildPlatformAwareAskReadout } from '../ai/platformAwareAskContext';
import { buildConnectedIdentityEngineReadout } from '../connectedIdentity/connectedIdentityEngine';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { buildBehavioralIntelligenceEngineReadout } from '../intelligence/behavioralIntelligenceEngine';
import { localIntelligence } from '../intelligence/localIntelligence';

export type ContentIdeationSource =
  | 'profession'
  | 'behavior'
  | 'connected-platforms'
  | 'recent-outputs'
  | 'audience-patterns'
  | 'engagement-data';

export type ContentIdeationKind =
  | 'theme'
  | 'post-idea'
  | 'campaign'
  | 'thread-structure'
  | 'creator-series'
  | 'audience-hook'
  | 'trend-opportunity';

export interface ContentIdeationItem {
  id: string;
  kind: ContentIdeationKind;
  title: string;
  idea: string;
  whyNow: string;
  confidence: number;
  evidenceUsed: string[];
  expectedImpact: string;
  suggestedFormat: string;
  generatedFrom: ContentIdeationSource[];
  askToPlanCommand: string;
}

export interface PredictiveContentIdeationReadout {
  themes: ContentIdeationItem[];
  postIdeas: ContentIdeationItem[];
  campaignIdeas: ContentIdeationItem[];
  threadStructures: ContentIdeationItem[];
  creatorSeries: ContentIdeationItem[];
  audienceHooks: ContentIdeationItem[];
  trendOpportunities: ContentIdeationItem[];
  allIdeas: ContentIdeationItem[];
  sourceCoverage: Record<ContentIdeationSource, number>;
  averageConfidence: number;
  approvalPolicy: string;
  headline: string;
}

const APPROVAL_POLICY =
  'Predictive Content Ideation drafts ideas only. The user must review and approve before ideas become scheduled content, campaigns, external posts, or workspace mutations.';

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

function confidenceFrom(...counts: number[]): number {
  return clamp(50 + Math.min(counts.reduce((sum, count) => sum + count, 0) * 2, 40));
}

function twinSignals(twin: DigitalTwin | null): string[] {
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

function professionSignals(workspace: BrandOpsData, twin: DigitalTwin | null): string[] {
  return uniq(
    [
      workspace.brand.positioning,
      workspace.brand.primaryOffer,
      workspace.brand.focusMetric,
      ...workspace.brandVault.signatureThemes,
      ...workspace.brandVault.expertiseAreas,
      ...workspace.brandVault.industries,
      ...workspace.brandVault.proofPoints,
      ...twinSignals(twin)
    ],
    18
  );
}

function behaviorSignals(workspace: BrandOpsData): string[] {
  const behavioral = buildBehavioralIntelligenceEngineReadout(workspace);
  return uniq(
    [
      ...behavioral.patterns.flatMap((pattern) => [
        `${pattern.label} (${pattern.confidence}%)`,
        ...pattern.evidence
      ]),
      ...(workspace.operatorTraces?.entries ?? []).slice(0, 6).map((trace) => trace.verb),
      ...(workspace.aiAssistantTraces?.entries ?? [])
        .slice(0, 5)
        .map((trace) => `ASK: ${trace.user_turn_preview}`)
    ],
    18
  );
}

function platformSignals(workspace: BrandOpsData): string[] {
  const platform = buildPlatformAwareAskReadout(workspace);
  const identity = buildConnectedIdentityEngineReadout(workspace);
  return uniq(
    [
      ...platform.connectedApps.map((app) => `${app} connected`),
      ...platform.recentActivity,
      ...workspace.integrationHub.liveFeed.map(
        (feed) => `${feed.source}: ${feed.title} ${feed.detail}`
      ),
      ...workspace.integrationHub.artifacts.map(
        (artifact) => `${artifact.title}: ${artifact.summary}`
      ),
      ...identity.signals.map((signal) => `${signal.source}: ${signal.summary}`)
    ],
    18
  );
}

function recentOutputSignals(workspace: BrandOpsData): string[] {
  const ranked = localIntelligence.contentPriority(workspace.contentLibrary).slice(0, 6);
  return uniq(
    [
      ...ranked.map((signal) => `${signal.label}: ${signal.reason}`),
      ...workspace.contentLibrary.map((item) => `${item.status}: ${item.title} (${item.goal})`),
      ...workspace.publishingQueue.map((item) => `${item.status}: ${item.title}`),
      ...(workspace.aiPipelineRuns?.entries ?? [])
        .slice(0, 4)
        .map((run) => `${run.pipeline_id}: ${run.status}`)
    ],
    18
  );
}

function audiencePatternSignals(workspace: BrandOpsData): string[] {
  return uniq(
    [
      ...workspace.brandVault.audienceSegments,
      ...workspace.contentLibrary.map((item) => item.audience),
      ...workspace.contacts.map((contact) => `${contact.role} at ${contact.company}`),
      ...workspace.companies.map((company) => `${company.name}: ${company.relationshipStage}`),
      ...workspace.opportunities.map(
        (opp) => `${opp.company}: ${opp.opportunityType} ${opp.status}`
      )
    ],
    18
  );
}

function engagementSignals(workspace: BrandOpsData): string[] {
  const engagementRegex =
    /engagement|impression|comment|reply|reaction|like|share|click|view|open rate|ctr|resonance|perform/i;
  return uniq(
    [
      ...workspace.integrationHub.artifacts
        .filter((artifact) =>
          engagementRegex.test(`${artifact.title} ${artifact.summary} ${artifact.tags.join(' ')}`)
        )
        .map((artifact) => `${artifact.title}: ${artifact.summary}`),
      ...workspace.integrationHub.liveFeed
        .filter((feed) => engagementRegex.test(`${feed.title} ${feed.detail}`))
        .map((feed) => `${feed.source}: ${feed.title} ${feed.detail}`),
      ...workspace.notes
        .filter((note) => engagementRegex.test(`${note.title} ${note.detail}`))
        .map((note) => `${note.title}: ${note.detail}`)
    ],
    12
  );
}

function sourceCoverage(items: ContentIdeationItem[]): Record<ContentIdeationSource, number> {
  return items.reduce<Record<ContentIdeationSource, number>>(
    (acc, item) => {
      for (const source of item.generatedFrom) acc[source] += 1;
      return acc;
    },
    {
      profession: 0,
      behavior: 0,
      'connected-platforms': 0,
      'recent-outputs': 0,
      'audience-patterns': 0,
      'engagement-data': 0
    }
  );
}

function first(values: string[], fallback: string): string {
  return values.find((value) => value.trim().length > 0) ?? fallback;
}

function commandFor(item: Omit<ContentIdeationItem, 'askToPlanCommand'>): string {
  return `ask: Convert this predictive content idea into a PLAN-ready content workflow. Include content objective, target audience, format, outline, approval gate, repurposing path, schedule recommendation, success metric, and receipt expectations. Do not publish, schedule, sync, or mutate workspace records automatically.\n\nIdea: ${quoteContextValue(item.title)}\nKind: ${item.kind}\nWhy now: ${quoteContextValue(item.whyNow)}\nConfidence: ${item.confidence}%\nEvidence: ${quoteContextValue(item.evidenceUsed.join(' | '))}\nExpected impact: ${quoteContextValue(item.expectedImpact)}\nSuggested format: ${quoteContextValue(item.suggestedFormat)}`;
}

function item(input: Omit<ContentIdeationItem, 'askToPlanCommand'>): ContentIdeationItem {
  return {
    ...input,
    evidenceUsed: input.evidenceUsed.length
      ? uniq(input.evidenceUsed, 8)
      : [
          'Workspace profile and content context are available; add more outputs or engagement data to strengthen this idea.'
        ],
    askToPlanCommand: commandFor(input)
  };
}

export function buildPredictiveContentIdeationReadout(
  workspace: BrandOpsData
): PredictiveContentIdeationReadout {
  const twin = getActiveDigitalTwin(workspace);
  const profession = professionSignals(workspace, twin);
  const behavior = behaviorSignals(workspace);
  const platforms = platformSignals(workspace);
  const outputs = recentOutputSignals(workspace);
  const audience = audiencePatternSignals(workspace);
  const engagement = engagementSignals(workspace);
  const topic = first(
    [...workspace.brandVault.signatureThemes, ...workspace.contentLibrary.flatMap((c) => c.tags)],
    'operator systems'
  );
  const audienceLead = first(audience, 'high-fit operators');
  const proof = first(
    [...workspace.brandVault.proofPoints, ...profession],
    'approved proof and operating experience'
  );
  const platformLead = first(platforms, 'BrandOps workspace context');
  const engagementLead = first(engagement, 'available audience response signals');
  const hasEngagement = engagement.length > 0;

  const allIdeas = [
    item({
      id: 'content-theme-operating-system',
      kind: 'theme',
      title: `${topic} as an operating system`,
      idea: `Build a theme around how ${audienceLead} can turn scattered work into repeatable operating systems.`,
      whyNow:
        'Profession, recent outputs, and audience patterns point to repeatable systems as a strong content lane.',
      confidence: confidenceFrom(profession.length, outputs.length, audience.length),
      evidenceUsed: [...profession, ...outputs, ...audience],
      expectedImpact:
        'Creates a durable content pillar that can support posts, campaigns, and outreach.',
      suggestedFormat: 'Weekly theme pillar',
      generatedFrom: ['profession', 'recent-outputs', 'audience-patterns']
    }),
    item({
      id: 'post-idea-proof-led-breakdown',
      kind: 'post-idea',
      title: 'Proof-led breakdown post',
      idea: `Write a practical post showing how ${proof} turns into a measurable workflow improvement.`,
      whyNow:
        'Recent profile and content signals can support a specific proof-led post without inventing claims.',
      confidence: confidenceFrom(profession.length, outputs.length),
      evidenceUsed: [...profession, ...outputs],
      expectedImpact: 'Improves credibility and gives ASK/PLAN a reusable proof asset.',
      suggestedFormat: 'LinkedIn post',
      generatedFrom: ['profession', 'recent-outputs']
    }),
    item({
      id: 'campaign-creator-operating-loop',
      kind: 'campaign',
      title: 'Creator operating loop campaign',
      idea: `Create a campaign that connects positioning, content, outreach, and follow-up into one creator operating loop.`,
      whyNow:
        'Behavioral and platform context show enough workflow signal to package a campaign instead of one-off posts.',
      confidence: confidenceFrom(behavior.length, platforms.length, outputs.length),
      evidenceUsed: [...behavior, ...platforms, ...outputs],
      expectedImpact: 'Turns repeated content and outreach patterns into a larger narrative arc.',
      suggestedFormat: '2-week campaign',
      generatedFrom: ['behavior', 'connected-platforms', 'recent-outputs']
    }),
    item({
      id: 'thread-structure-before-after-system',
      kind: 'thread-structure',
      title: 'Before/after workflow thread',
      idea: `Structure a thread around before/after states: scattered work, operating friction, system design, approved next action.`,
      whyNow:
        'Audience and content signals show workflow bottlenecks as a useful educational structure.',
      confidence: confidenceFrom(audience.length, outputs.length, profession.length),
      evidenceUsed: [...audience, ...outputs, ...profession],
      expectedImpact:
        'Gives the audience a clear mental model and a practical sequence to remember.',
      suggestedFormat: '5-part thread',
      generatedFrom: ['audience-patterns', 'recent-outputs', 'profession']
    }),
    item({
      id: 'creator-series-ai-operator',
      kind: 'creator-series',
      title: 'AI operator field notes',
      idea: `Launch a creator series documenting how ${audienceLead} can use AI-assisted planning while keeping approval and trust visible.`,
      whyNow:
        'Profession and connected-platform context support a recurring creator series with clear guardrails.',
      confidence: confidenceFrom(profession.length, platforms.length, behavior.length),
      evidenceUsed: [...profession, ...platforms, ...behavior],
      expectedImpact: 'Builds trust and consistency while reinforcing differentiated positioning.',
      suggestedFormat: 'Recurring creator series',
      generatedFrom: ['profession', 'connected-platforms', 'behavior']
    }),
    item({
      id: 'audience-hook-hidden-cost',
      kind: 'audience-hook',
      title: 'The hidden cost of unowned workflows',
      idea: `Hook the audience with the cost of repeated work that never becomes a system.`,
      whyNow: 'Behavioral history and audience patterns point to repeated operational friction.',
      confidence: confidenceFrom(behavior.length, audience.length),
      evidenceUsed: [...behavior, ...audience],
      expectedImpact: 'Creates a sharp opening for posts, outreach, and campaign copy.',
      suggestedFormat: 'Hook bank entry',
      generatedFrom: ['behavior', 'audience-patterns']
    }),
    item({
      id: 'trend-opportunity-engagement-signal',
      kind: 'trend-opportunity',
      title: hasEngagement
        ? 'Double down on resonance signals'
        : 'Start tracking content resonance',
      idea: hasEngagement
        ? `Use ${engagementLead} to identify a timely trend or content angle worth expanding.`
        : 'Create a lightweight resonance loop so future ideas can use engagement, replies, comments, and saves.',
      whyNow: hasEngagement
        ? 'Engagement data is available and can improve prioritization.'
        : 'No engagement data is visible yet, so BrandOps should prompt for measurable audience response.',
      confidence: confidenceFrom(engagement.length, outputs.length, platforms.length),
      evidenceUsed: [...engagement, ...outputs, platformLead],
      expectedImpact:
        'Improves timing and reduces generic ideation by weighting audience response.',
      suggestedFormat: hasEngagement ? 'Trend response post' : 'Engagement tracking prompt',
      generatedFrom: hasEngagement
        ? ['engagement-data', 'recent-outputs', 'connected-platforms']
        : ['recent-outputs', 'connected-platforms']
    })
  ].sort((a, b) => b.confidence - a.confidence || a.title.localeCompare(b.title));

  const byKind = (kind: ContentIdeationKind) => allIdeas.filter((idea) => idea.kind === kind);
  const averageConfidence = allIdeas.length
    ? clamp(allIdeas.reduce((sum, idea) => sum + idea.confidence, 0) / allIdeas.length)
    : 0;
  const coverage = sourceCoverage(allIdeas);

  return {
    themes: byKind('theme'),
    postIdeas: byKind('post-idea'),
    campaignIdeas: byKind('campaign'),
    threadStructures: byKind('thread-structure'),
    creatorSeries: byKind('creator-series'),
    audienceHooks: byKind('audience-hook'),
    trendOpportunities: byKind('trend-opportunity'),
    allIdeas,
    sourceCoverage: coverage,
    averageConfidence,
    approvalPolicy: APPROVAL_POLICY,
    headline: `${allIdeas.length} predictive content ideation item${allIdeas.length === 1 ? '' : 's'} generated across themes, posts, campaigns, threads, series, hooks, and trends.`
  };
}
