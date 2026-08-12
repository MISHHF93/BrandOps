/**
 * Relevance-based, purpose-scoped context retrieval for external agents.
 *
 * - Never returns the whole Twin or memory DB. Every bundle is a curated,
 *   capped slice built from workspace data with an explicit trust tier.
 * - Provenance is preserved on every item; verified facts are distinguished
 *   from inferred / agent-reported information.
 * - Relevance (query token overlap) + freshness (recency decay) determine
 *   ordering so stale professional context naturally loses priority.
 */
import type {
  AgentContextBundleResult,
  AgentContextPayloadItem,
  ContextBundleId,
  TrustTier
} from '../../types/agentInterop';
import type { BrandOpsData, ContentLibraryItem } from '../../types/domain';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { provenanceSummary } from './trustBoundaries';

export interface ContextRetrievalOptions {
  query?: string;
  bundles: ContextBundleId[];
  maxItemsPerBundle?: number;
  now?: Date;
}

const DEFAULT_MAX_PER_BUNDLE = 12;
const FRESHNESS_HALF_LIFE_DAYS = 60;

const tokenize = (text: string): Set<string> => {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'this',
    'that',
    'from',
    'your',
    'you',
    'are',
    'was',
    'been',
    'have',
    'has',
    'had',
    'not',
    'but',
    'its',
    'about',
    'into',
    'what',
    'when',
    'where',
    'how',
    'which',
    'will',
    'would',
    'can',
    'could',
    'should',
    'our',
    'their',
    'them',
    'they',
    'there'
  ]);
  return new Set(words.filter((word) => !stop.has(word)));
};

const tokenOverlap = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const token of a) {
    if (b.has(token)) common += 1;
  }
  return common / Math.min(a.size, b.size);
};

function relevanceScore(query: string | undefined, text: string): number {
  if (!query?.trim()) return 0.5;
  return Math.min(1, tokenOverlap(tokenize(query), tokenize(text)));
}

function freshnessScore(updatedAt: string | undefined, now: Date): number {
  if (!updatedAt) return 0.4;
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) return 0.4;
  const ageDays = Math.max(0, (now.getTime() - ts) / 86_400_000);
  return Math.max(0.05, Math.exp(-ageDays / FRESHNESS_HALF_LIFE_DAYS));
}

export function combinedScore(
  query: string | undefined,
  text: string,
  updatedAt: string | undefined,
  now: Date
): number {
  return 0.7 * relevanceScore(query, text) + 0.3 * freshnessScore(updatedAt, now);
}

interface CtxItemInput {
  bundleId: ContextBundleId;
  text: string;
  source: AgentContextPayloadItem['source'];
  entityId?: string;
  trustTier: TrustTier;
  updatedAt?: string;
  now: Date;
  provenanceRef: string;
}

const ITEM_LEN_CAP = 700;

function ctxItem(input: CtxItemInput): AgentContextPayloadItem {
  const text =
    input.text.length > ITEM_LEN_CAP ? `${input.text.slice(0, ITEM_LEN_CAP - 1)}…` : input.text;
  return {
    bundleId: input.bundleId,
    text,
    source: input.source,
    entityId: input.entityId,
    trustTier: input.trustTier,
    verified: input.trustTier === 'USER_VERIFIED' || input.trustTier === 'BRANDOPS_VERIFIED',
    relevanceScore: 0,
    freshnessScore: freshnessScore(input.updatedAt, input.now),
    retrievedAt: input.now.toISOString(),
    provenanceRef: input.provenanceRef
  };
}

function finalize(
  items: AgentContextPayloadItem[],
  query: string | undefined,
  now: Date,
  max: number
): { items: AgentContextPayloadItem[]; truncated: boolean } {
  const ranked = items
    .map((item) => ({
      ...item,
      relevanceScore: relevanceScore(query, item.text),
      freshnessScore: freshnessScoreFromAge(item, now)
    }))
    .sort((a, b) => combinedScoreFor(a, b))
    .slice(0, max);
  return { items: ranked, truncated: items.length > max };
}

function freshnessScoreFromAge(item: AgentContextPayloadItem, now: Date): number {
  return freshnessScore(item.retrievedAt, now);
}

function combinedScoreFor(a: AgentContextPayloadItem, b: AgentContextPayloadItem): number {
  const sa = 0.7 * a.relevanceScore + 0.3 * a.freshnessScore;
  const sb = 0.7 * b.relevanceScore + 0.3 * b.freshnessScore;
  return sb - sa;
}

/** Twin identity fields are extracted from user-provided material and reviewed — BRANDOPS_VERIFIED unless the item fact row is user-verified. */
const TWIN_IDENTITY_TIER: TrustTier = 'BRANDOPS_VERIFIED';

function publicIdentityItems(workspace: BrandOpsData, now: Date): AgentContextPayloadItem[] {
  const twin = getActiveDigitalTwin(workspace);
  if (!twin) return [];
  const out: AgentContextPayloadItem[] = [];
  const push = (text: string, entityId: string, tier: TrustTier, updatedAt?: string) => {
    if (!text.trim()) return;
    out.push(
      ctxItem({
        bundleId: 'PUBLIC_IDENTITY',
        text,
        source: 'digital-twin',
        entityId,
        trustTier: tier,
        updatedAt: updatedAt ?? twin.updatedAt,
        now,
        provenanceRef: `brandops://twin/${twin.id}/${entityId}`
      })
    );
  };
  push(twin.identity.headline, 'identity/headline', TWIN_IDENTITY_TIER);
  push(twin.identity.summary, 'identity/summary', TWIN_IDENTITY_TIER);
  push(twin.identity.professionalPositioning, 'identity/positioning', TWIN_IDENTITY_TIER);
  push(twin.identity.targetAudience, 'identity/audience', TWIN_IDENTITY_TIER);
  for (const strength of twin.identity.strengths.slice(0, 6))
    push(`Strength: ${strength}`, 'identity/strengths', TWIN_IDENTITY_TIER);
  for (const diff of twin.identity.differentiators.slice(0, 6))
    push(`Differentiator: ${diff}`, 'identity/differentiators', TWIN_IDENTITY_TIER);
  for (const skill of twin.resumeProfile.skills.slice(0, 12))
    push(`Skill: ${skill}`, 'resume/skills', TWIN_IDENTITY_TIER);
  for (const item of twin.resumeProfile.experience) {
    const tier = item.verificationStatus === 'verified' ? 'USER_VERIFIED' : 'UNKNOWN';
    push(
      `${item.role} @ ${item.organization} (${item.timeframe})${item.highlights.length ? `: ${item.highlights.slice(0, 4).join('; ')}` : ''}`,
      `resume/experience/${item.id}`,
      tier,
      undefined
    );
  }
  for (const item of twin.resumeProfile.projects) {
    const tier = item.verificationStatus === 'verified' ? 'USER_VERIFIED' : 'UNKNOWN';
    push(
      `Project: ${item.name} — ${item.summary}${item.tools.length ? ` (${item.tools.join(', ')})` : ''}`,
      `resume/projects/${item.id}`,
      tier
    );
  }
  return out;
}

function builderContextItems(workspace: BrandOpsData, now: Date): AgentContextPayloadItem[] {
  const out: AgentContextPayloadItem[] = [];
  const intel = workspace.workspaceIntelligence;
  const push = (
    text: string,
    entityId: string,
    tier: TrustTier,
    updatedAt?: string,
    source: AgentContextPayloadItem['source'] = 'workspace'
  ) => {
    if (!text.trim()) return;
    out.push(
      ctxItem({
        bundleId: 'BUILDER_CONTEXT',
        text,
        source,
        entityId,
        trustTier: tier,
        updatedAt: updatedAt ?? intel?.updatedAt ?? workspace.seed.seededAt,
        now,
        provenanceRef: `brandops://workspace/${entityId}`
      })
    );
  };
  if (intel) {
    push(`Profession: ${intel.dna.profession}`, 'dna/profession', 'USER_VERIFIED', intel.updatedAt);
    for (const strength of intel.dna.strengths.slice(0, 6))
      push(`Strength: ${strength}`, 'dna/strengths', 'USER_VERIFIED', intel.updatedAt);
    for (const activity of intel.dna.recurringActivities.slice(0, 6))
      push(`Recurring activity: ${activity}`, 'dna/activities', 'USER_VERIFIED', intel.updatedAt);
    for (const workflow of intel.dna.workflows.slice(0, 6))
      push(`Workflow: ${workflow}`, 'dna/workflows', 'USER_VERIFIED', intel.updatedAt);
    for (const output of intel.dna.approvedOutputs.slice(0, 6))
      push(`Approved output: ${output}`, 'dna/outputs', 'USER_VERIFIED', intel.updatedAt);
    for (const section of intel.operatingManual.slice(0, 6)) {
      push(
        `${section.title}: ${section.body}`,
        `operatingManual/${section.id}`,
        'BRANDOPS_VERIFIED',
        section.updatedAt
      );
    }
  }
  const twin = getActiveDigitalTwin(workspace);
  for (const claim of twin?.memory.approvedClaims.slice(0, 6) ?? []) {
    push(`Verified claim: ${claim}`, 'twin/claims', 'USER_VERIFIED', twin?.updatedAt);
  }
  const promoted = (workspace.externalAgentEvents?.entries ?? [])
    .filter((e) => e.status === 'promoted')
    .slice(0, 6);
  for (const event of promoted) {
    push(
      `Accomplishment: ${event.title} — ${event.detail}`,
      `event/${event.id}`,
      'USER_VERIFIED',
      event.promotedAt,
      'agent-event'
    );
  }
  return out;
}

function projectContextItems(workspace: BrandOpsData, now: Date): AgentContextPayloadItem[] {
  const out: AgentContextPayloadItem[] = [];
  const events = (workspace.externalAgentEvents?.entries ?? []).slice(0, 12);
  for (const event of events) {
    const tier: TrustTier =
      event.status === 'promoted' || event.status === 'verified'
        ? 'AGENT_REPORTED'
        : 'AGENT_REPORTED';
    out.push(
      ctxItem({
        bundleId: 'PROJECT_CONTEXT',
        text: `[${event.kind.replace(/_/g, ' ')}] ${event.title}: ${event.detail}${event.evidence.length ? ` (evidence: ${event.evidence.map((e) => e.label).join(', ')})` : ''}`,
        source: 'agent-event',
        entityId: event.id,
        trustTier: tier,
        updatedAt: event.createdAt,
        now,
        provenanceRef: `brandops://agent-event/${event.id}`
      })
    );
  }
  const plans = (workspace.planWorkspace?.plans ?? []).slice(0, 8);
  for (const plan of plans) {
    out.push(
      ctxItem({
        bundleId: 'PROJECT_CONTEXT',
        text: `Plan [${plan.status}]: ${plan.title}. Objective: ${plan.objective}. Steps: ${plan.steps.map((s) => s.title).join(' → ')}`,
        source: 'plan',
        entityId: plan.id,
        trustTier: 'USER_VERIFIED',
        updatedAt: plan.savedAt,
        now,
        provenanceRef: `brandops://plan/${plan.id}`
      })
    );
  }
  return out;
}

function writingVoiceItems(workspace: BrandOpsData, now: Date): AgentContextPayloadItem[] {
  const out: AgentContextPayloadItem[] = [];
  const twin = getActiveDigitalTwin(workspace);
  const push = (
    text: string,
    entityId: string,
    tier: TrustTier,
    updatedAt?: string,
    source: AgentContextPayloadItem['source'] = 'digital-twin'
  ) => {
    if (!text.trim()) return;
    out.push(
      ctxItem({
        bundleId: 'WRITING_VOICE',
        text,
        source,
        entityId,
        trustTier: tier,
        updatedAt,
        now,
        provenanceRef: `brandops://twin/${twin?.id ?? 'none'}/${entityId}`
      })
    );
  };
  if (twin) {
    push(
      `Tone of voice: ${twin.identity.toneOfVoice}`,
      'identity/tone',
      TWIN_IDENTITY_TIER,
      twin.updatedAt
    );
    for (const example of twin.memory.voiceExamples.slice(0, 6))
      push(`Voice example: ${example}`, 'memory/voice', 'USER_VERIFIED', twin.updatedAt);
    for (const claim of twin.memory.approvedClaims.slice(0, 8))
      push(`Approved claim: ${claim}`, 'memory/claims', 'USER_VERIFIED', twin.updatedAt);
  }
  if (workspace.brand.voiceGuide)
    push(
      `Brand voice guide: ${workspace.brand.voiceGuide}`,
      'brand/voice',
      'USER_VERIFIED',
      undefined,
      'workspace'
    );
  for (const tone of workspace.workspaceIntelligence?.dna.preferredTone.slice(0, 6) ?? []) {
    push(
      `Preferred tone: ${tone}`,
      'dna/tone',
      'USER_VERIFIED',
      workspace.workspaceIntelligence?.updatedAt,
      'workspace'
    );
  }
  const samples = workspace.contentLibrary.filter((c) => c.type === 'post-draft').slice(0, 6);
  for (const sample of samples) {
    push(
      `Writing sample "${sample.title}": ${sample.body}`,
      `content/${sample.id}`,
      'USER_VERIFIED',
      sample.updatedAt,
      'artifact'
    );
  }
  return out;
}

function currentGoalsItems(workspace: BrandOpsData, now: Date): AgentContextPayloadItem[] {
  const out: AgentContextPayloadItem[] = [];
  const intel = workspace.workspaceIntelligence;
  const twin = getActiveDigitalTwin(workspace);
  const push = (
    text: string,
    entityId: string,
    tier: TrustTier,
    updatedAt?: string,
    source: AgentContextPayloadItem['source'] = 'workspace'
  ) => {
    if (!text.trim()) return;
    out.push(
      ctxItem({
        bundleId: 'CURRENT_GOALS',
        text,
        source,
        entityId,
        trustTier: tier,
        updatedAt,
        now,
        provenanceRef: `brandops://workspace/${entityId}`
      })
    );
  };
  for (const goal of intel?.dna.goals.slice(0, 10) ?? [])
    push(`Goal: ${goal}`, 'dna/goals', 'USER_VERIFIED', intel?.updatedAt);
  for (const goal of twin?.identity.goals.slice(0, 6) ?? [])
    push(`Twin goal: ${goal}`, 'twin/goals', TWIN_IDENTITY_TIER, twin?.updatedAt, 'digital-twin');
  for (const decision of intel?.decisionMemory.slice(0, 8) ?? []) {
    push(
      `Decision (${decision.polarity}): ${decision.title} — ${decision.reason}`,
      `decisionMemory/${decision.id}`,
      decision.polarity === 'approved' ? 'USER_VERIFIED' : 'UNKNOWN',
      decision.createdAt
    );
  }
  for (const opportunity of intel?.opportunityRadar.slice(0, 6) ?? []) {
    push(
      `Opportunity: ${opportunity.title} (impact ${opportunity.expectedImpact}, confidence ${opportunity.confidence})`,
      `opportunityRadar/${opportunity.id}`,
      'BRANDOPS_VERIFIED',
      opportunity.createdAt
    );
  }
  return out;
}

function positioningContextItems(workspace: BrandOpsData, now: Date): AgentContextPayloadItem[] {
  const out: AgentContextPayloadItem[] = [];
  const twin = getActiveDigitalTwin(workspace);
  const push = (
    text: string,
    entityId: string,
    tier: TrustTier,
    source: AgentContextPayloadItem['source'] = 'workspace'
  ) => {
    if (!text.trim()) return;
    out.push(
      ctxItem({
        bundleId: 'POSITIONING_CONTEXT',
        text,
        source,
        entityId,
        trustTier: tier,
        updatedAt: workspace.workspaceIntelligence?.updatedAt,
        now,
        provenanceRef: `brandops://workspace/${entityId}`
      })
    );
  };
  push(`Positioning: ${workspace.brand.positioning}`, 'brand/positioning', 'USER_VERIFIED');
  push(`Primary offer: ${workspace.brand.primaryOffer}`, 'brand/offer', 'USER_VERIFIED');
  for (const positioning of workspace.workspaceIntelligence?.dna.positioning.slice(0, 6) ?? []) {
    push(`Positioning pillar: ${positioning}`, 'dna/positioning', 'USER_VERIFIED');
  }
  if (twin) {
    if (twin.identity.professionalPositioning)
      push(
        `Twin positioning: ${twin.identity.professionalPositioning}`,
        'twin/positioning',
        TWIN_IDENTITY_TIER,
        'digital-twin'
      );
    for (const diff of twin.identity.differentiators.slice(0, 6))
      push(`Differentiator: ${diff}`, 'twin/differentiators', TWIN_IDENTITY_TIER, 'digital-twin');
  }
  return out;
}

function contentContextItems(workspace: BrandOpsData, now: Date): AgentContextPayloadItem[] {
  const out: AgentContextPayloadItem[] = [];
  const push = (
    text: string,
    entityId: string,
    updatedAt?: string,
    source: AgentContextPayloadItem['source'] = 'artifact'
  ) => {
    if (!text.trim()) return;
    out.push(
      ctxItem({
        bundleId: 'CONTENT_CONTEXT',
        text,
        source,
        entityId,
        trustTier: 'USER_VERIFIED',
        updatedAt,
        now,
        provenanceRef: `brandops://workspace/${entityId}`
      })
    );
  };
  for (const item of workspace.contentLibrary.slice(0, 10)) {
    push(
      `Content [${item.status}]: ${item.title} — ${item.body}${item.tags.length ? ` (tags: ${item.tags.join(', ')})` : ''}`,
      `contentLibrary/${item.id}`,
      item.updatedAt
    );
  }
  for (const draft of workspace.publishingQueue.slice(0, 6)) {
    push(
      `Publishing draft [${draft.status}]: ${draft.title} — ${draft.body}`,
      `publishingQueue/${draft.id}`,
      draft.updatedAt
    );
  }
  for (const draft of workspace.outreachDrafts.slice(0, 4)) {
    push(
      `Outreach draft [${draft.status}]: ${draft.messageBody}`,
      `outreachDrafts/${draft.id}`,
      draft.updatedAt
    );
  }
  return out;
}

const BUNDLE_BUILDERS: Readonly<
  Record<ContextBundleId, (workspace: BrandOpsData, now: Date) => AgentContextPayloadItem[]>
> = {
  PUBLIC_IDENTITY: publicIdentityItems,
  BUILDER_CONTEXT: builderContextItems,
  PROJECT_CONTEXT: projectContextItems,
  WRITING_VOICE: writingVoiceItems,
  CURRENT_GOALS: currentGoalsItems,
  POSITIONING_CONTEXT: positioningContextItems,
  CONTENT_CONTEXT: contentContextItems
};

export function retrieveAgentContext(
  workspace: BrandOpsData,
  options: ContextRetrievalOptions
): AgentContextBundleResult[] {
  const now = options.now ?? new Date();
  const query = options.query?.trim() || undefined;
  const max = options.maxItemsPerBundle ?? DEFAULT_MAX_PER_BUNDLE;
  return options.bundles.map((bundleId) => {
    const builder = BUNDLE_BUILDERS[bundleId];
    const items = builder ? builder(workspace, now) : [];
    const { items: ranked, truncated } = finalize(items, query, now, max);
    return { bundleId, items: ranked, truncated, provenance: provenanceSummary(ranked) };
  });
}

/** Deterministic artifact search used by `brandops_search_artifacts`. */
export function searchArtifacts(
  workspace: BrandOpsData,
  query: string,
  limit = 10
): Array<{
  id: string;
  kind: string;
  title: string;
  summary: string;
  updatedAt?: string;
  provenanceRef: string;
}> {
  const matches: Array<{
    id: string;
    kind: string;
    title: string;
    summary: string;
    updatedAt?: string;
    provenanceRef: string;
    score: number;
  }> = [];
  const consider = (
    title: string,
    body: string,
    id: string,
    kind: string,
    updatedAt?: string,
    provenanceRef = `brandops://workspace/${id}`
  ) => {
    const text = `${title} ${body}`;
    const score = combinedScore(query, text, updatedAt, new Date());
    if (score > 0.02) {
      matches.push({
        id,
        kind,
        title: title.slice(0, 200),
        summary: (body || title).replace(/\s+/g, ' ').slice(0, 400),
        updatedAt,
        provenanceRef,
        score
      });
    }
  };
  for (const item of workspace.integrationHub.artifacts)
    consider(item.title, item.summary, item.id, `artifact:${item.artifactType}`, item.updatedAt);
  for (const item of workspace.contentLibrary)
    consider(item.title, item.body, item.id, `content:${item.type}`, item.updatedAt);
  for (const item of workspace.publishingQueue)
    consider(item.title, item.body, item.id, `publishing:${item.status}`, item.updatedAt);
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...rest }) => rest);
}

/** Fresh content samples — used by WRITING_VOICE / content prompts without leaking unrelated memory. */
export function contentLibrarySamples(workspace: BrandOpsData, limit = 5): ContentLibraryItem[] {
  return workspace.contentLibrary.filter((item) => item.status !== 'archived').slice(0, limit);
}
