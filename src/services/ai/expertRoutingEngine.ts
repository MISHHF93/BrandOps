import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import {
  getOperationalExpert,
  listOperationalExpertIds,
  routeOperationalExperts,
  type ExpertContextKey,
  type ExpertRouteCandidate,
  type OperationalExpertId,
  type OperationalExpertTask,
  type OperationalMode
} from './expertRegistry';

export type ExpertWorkflowType =
  | 'investor_outreach'
  | 'founder_ops'
  | 'creator_growth'
  | 'recruiter_ops'
  | 'positioning'
  | 'outreach'
  | 'content'
  | 'planning'
  | 'opportunity'
  | 'behavioral'
  | 'integration'
  | 'twin_memory'
  | 'general';

export type ExpertProfessionPath = 'founder' | 'creator' | 'recruiter' | 'general';

export interface ExpertRoutingTwinProfile {
  headline?: string;
  professionalPositioning?: string;
  industries?: readonly string[];
  skills?: readonly string[];
  hasApprovedMemory?: boolean;
}

export interface ExpertRoutingBehavioralMemory {
  hasSignals?: boolean;
  signalCount?: number;
  labels?: readonly string[];
}

export interface ExpertRoutingEngineInput {
  userIntent: string;
  mode: OperationalMode;
  workspace?: BrandOpsData;
  profession?: string;
  twinProfile?: ExpertRoutingTwinProfile;
  connectedPlatforms?: readonly string[];
  behavioralMemory?: ExpertRoutingBehavioralMemory;
  workflowType?: ExpertWorkflowType;
  maxExperts?: number;
}

export interface ExpertActivation {
  expertId: OperationalExpertId;
  name: string;
  score: number;
  confidenceBand: 'high' | 'medium' | 'low';
  reasons: string[];
  missingContext: ExpertContextKey[];
  matchedRoutingConditions: string[];
}

export interface ExpertDeactivation {
  expertId: OperationalExpertId;
  reason: string;
}

export interface ExpertRoutingTrace {
  schemaVersion: '1.0.0';
  workflowType: ExpertWorkflowType;
  professionPath: ExpertProfessionPath;
  mode: OperationalMode;
  inferredTaskHints: OperationalExpertTask[];
  availableContext: ExpertContextKey[];
  observedSignals: string[];
  consideredExpertCount: number;
  deactivatedExperts: ExpertDeactivation[];
}

export interface ExpertRoutingResolution {
  activatedExperts: ExpertActivation[];
  trace: ExpertRoutingTrace;
}

interface WorkflowProfile {
  workflowType: ExpertWorkflowType;
  label: string;
  expertIds: readonly OperationalExpertId[];
  taskHints: readonly OperationalExpertTask[];
  keywords: readonly string[];
  defaultMaxExperts: number;
}

const WORKFLOW_PROFILES: readonly WorkflowProfile[] = [
  {
    workflowType: 'investor_outreach',
    label: 'Investor outreach',
    expertIds: ['positioning-expert', 'outreach-expert', 'planning-expert'],
    taskHints: ['positioning_strategy', 'outreach_drafting', 'plan_generation'],
    keywords: ['investor', 'vc', 'angel', 'fundraising', 'capital', 'pitch', 'warm intro'],
    defaultMaxExperts: 3
  },
  {
    workflowType: 'founder_ops',
    label: 'Founder operations',
    expertIds: ['positioning-expert', 'outreach-expert', 'planning-expert'],
    taskHints: ['positioning_strategy', 'outreach_drafting', 'plan_generation'],
    keywords: ['founder', 'startup', 'fundraising', 'go-to-market', 'gtm', 'customer discovery'],
    defaultMaxExperts: 3
  },
  {
    workflowType: 'creator_growth',
    label: 'Creator growth',
    expertIds: ['content-expert', 'opportunity-expert', 'behavioral-expert'],
    taskHints: ['content_ideation', 'opportunity_scoring', 'behavior_prediction'],
    keywords: ['creator', 'growth', 'audience', 'followers', 'newsletter', 'youtube', 'community'],
    defaultMaxExperts: 3
  },
  {
    workflowType: 'recruiter_ops',
    label: 'Recruiter operations',
    expertIds: ['outreach-expert', 'planning-expert', 'integration-expert'],
    taskHints: ['outreach_drafting', 'plan_generation', 'integration_mapping'],
    keywords: ['recruiter', 'recruiting', 'candidate', 'hiring', 'talent', 'ats', 'sourcing'],
    defaultMaxExperts: 3
  },
  {
    workflowType: 'positioning',
    label: 'Positioning',
    expertIds: ['positioning-expert', 'twin-memory-expert'],
    taskHints: ['positioning_strategy', 'message_refinement', 'twin_grounding'],
    keywords: ['positioning', 'audience', 'niche', 'offer', 'headline', 'bio', 'differentiate'],
    defaultMaxExperts: 2
  },
  {
    workflowType: 'outreach',
    label: 'Outreach',
    expertIds: ['outreach-expert', 'positioning-expert', 'planning-expert'],
    taskHints: ['outreach_drafting', 'relationship_follow_up', 'message_refinement'],
    keywords: ['outreach', 'reply', 'dm', 'intro', 'follow-up', 'follow up', 'reconnect'],
    defaultMaxExperts: 3
  },
  {
    workflowType: 'content',
    label: 'Content',
    expertIds: ['content-expert', 'positioning-expert'],
    taskHints: ['content_ideation', 'content_drafting', 'content_repurposing'],
    keywords: ['content', 'post', 'publish', 'hook', 'outline', 'repurpose'],
    defaultMaxExperts: 2
  },
  {
    workflowType: 'planning',
    label: 'Planning',
    expertIds: ['planning-expert'],
    taskHints: ['plan_generation', 'plan_prioritization', 'execution_readiness'],
    keywords: ['plan', 'roadmap', 'prioritize', 'next steps', 'workflow'],
    defaultMaxExperts: 1
  },
  {
    workflowType: 'opportunity',
    label: 'Opportunity',
    expertIds: ['opportunity-expert', 'planning-expert'],
    taskHints: ['opportunity_scoring', 'pipeline_movement', 'deal_risk_review'],
    keywords: ['opportunity', 'pipeline', 'deal', 'stage', 'proposal', 'revenue'],
    defaultMaxExperts: 2
  },
  {
    workflowType: 'behavioral',
    label: 'Behavioral',
    expertIds: ['behavioral-expert'],
    taskHints: ['behavior_prediction', 'cadence_optimization', 'habit_signal_review'],
    keywords: ['predict', 'likely', 'behavior', 'cadence', 'habit', 'timing', 'pattern'],
    defaultMaxExperts: 1
  },
  {
    workflowType: 'integration',
    label: 'Integration',
    expertIds: ['integration-expert', 'planning-expert'],
    taskHints: ['integration_mapping', 'artifact_sync_review', 'source_health_review'],
    keywords: ['integration', 'connect', 'sync', 'source', 'artifact', 'notion', 'github', 'slack'],
    defaultMaxExperts: 2
  },
  {
    workflowType: 'twin_memory',
    label: 'Twin memory',
    expertIds: ['twin-memory-expert', 'positioning-expert'],
    taskHints: ['memory_retrieval', 'twin_grounding', 'missing_info_detection'],
    keywords: ['twin', 'memory', 'remember', 'approved claim', 'voice', 'grounded'],
    defaultMaxExperts: 2
  },
  {
    workflowType: 'general',
    label: 'General',
    expertIds: [],
    taskHints: [],
    keywords: [],
    defaultMaxExperts: 3
  }
] as const;

const WORKFLOW_BY_TYPE = new Map(WORKFLOW_PROFILES.map((profile) => [profile.workflowType, profile]));

function clean(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function normalized(value: string | undefined): string {
  return clean(value).toLowerCase();
}

function uniq<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function hasAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function workflowProfileFor(type: ExpertWorkflowType): WorkflowProfile {
  return WORKFLOW_BY_TYPE.get(type) ?? WORKFLOW_BY_TYPE.get('general')!;
}

function professionCorpus(input: ExpertRoutingEngineInput, twin: DigitalTwin | null): string {
  return normalized(
    [
      input.profession,
      input.workspace?.brand.positioning,
      input.workspace?.brand.primaryOffer,
      ...(input.workspace?.brandVault.expertiseAreas ?? []),
      ...(input.workspace?.brandVault.industries ?? []),
      input.twinProfile?.headline,
      input.twinProfile?.professionalPositioning,
      ...(input.twinProfile?.industries ?? []),
      ...(input.twinProfile?.skills ?? []),
      twin?.identity.headline,
      twin?.identity.professionalPositioning,
      twin?.identity.summary,
      ...(twin?.resumeProfile.industries ?? []),
      ...(twin?.resumeProfile.skills ?? [])
    ].join(' ')
  );
}

function inferProfessionPath(
  input: ExpertRoutingEngineInput,
  twin: DigitalTwin | null
): ExpertProfessionPath {
  const corpus = professionCorpus(input, twin);
  if (hasAny(corpus, ['recruiter', 'recruiting', 'talent acquisition', 'sourcer', 'hiring'])) {
    return 'recruiter';
  }
  if (hasAny(corpus, ['creator', 'content creator', 'newsletter', 'audience', 'community builder'])) {
    return 'creator';
  }
  if (hasAny(corpus, ['founder', 'startup', 'entrepreneur', 'operator founder', 'ceo'])) {
    return 'founder';
  }
  return 'general';
}

function textCorpus(input: ExpertRoutingEngineInput, twin: DigitalTwin | null): string {
  const twinProfile = input.twinProfile;
  return normalized(
    [
      input.userIntent,
      input.profession,
      input.workspace?.brand.positioning,
      input.workspace?.brand.primaryOffer,
      twinProfile?.headline,
      twinProfile?.professionalPositioning,
      ...(twinProfile?.industries ?? []),
      ...(twinProfile?.skills ?? []),
      twin?.identity.headline,
      twin?.identity.professionalPositioning,
      twin?.identity.summary,
      ...(input.connectedPlatforms ?? [])
    ].join(' ')
  );
}

function professionWorkflowFor(path: ExpertProfessionPath): ExpertWorkflowType | null {
  switch (path) {
    case 'founder':
      return 'founder_ops';
    case 'creator':
      return 'creator_growth';
    case 'recruiter':
      return 'recruiter_ops';
    default:
      return null;
  }
}

function classifyWorkflow(
  input: ExpertRoutingEngineInput,
  twin: DigitalTwin | null,
  professionPath: ExpertProfessionPath
): ExpertWorkflowType {
  if (input.workflowType) return input.workflowType;

  const corpus = textCorpus(input, twin);
  const investorTerms = ['investor', 'vc', 'angel', 'fundraising', 'capital', 'pitch deck'];
  const outreachTerms = ['outreach', 'intro', 'dm', 'email', 'message', 'follow up', 'follow-up'];
  if (hasAny(corpus, investorTerms) && (hasAny(corpus, outreachTerms) || input.mode === 'plan')) {
    return 'investor_outreach';
  }

  if (hasAny(corpus, ['creator growth', 'creator', 'audience growth', 'followers', 'community growth'])) {
    return 'creator_growth';
  }

  const professionWorkflow = professionWorkflowFor(professionPath);
  if (professionWorkflow && input.mode === 'plan') return professionWorkflow;

  for (const profile of WORKFLOW_PROFILES) {
    if (profile.workflowType === 'general' || profile.workflowType === 'investor_outreach') continue;
    if (profile.workflowType === 'creator_growth') continue;
    if (profile.workflowType === 'founder_ops' || profile.workflowType === 'recruiter_ops') continue;
    if (hasAny(corpus, profile.keywords)) return profile.workflowType;
  }

  if (professionWorkflow) return professionWorkflow;
  if (input.mode === 'plan') return 'planning';
  return 'general';
}

function inferTwinProfile(workspace?: BrandOpsData): ExpertRoutingTwinProfile | undefined {
  if (!workspace) return undefined;
  const twin = getActiveDigitalTwin(workspace);
  if (!twin) return undefined;
  return {
    headline: twin.identity.headline,
    professionalPositioning: twin.identity.professionalPositioning,
    industries: twin.resumeProfile.industries,
    skills: twin.resumeProfile.skills,
    hasApprovedMemory:
      twin.memory.approvedClaims.length > 0 ||
      twin.memory.preferences.length > 0 ||
      twin.memory.voiceExamples.length > 0
  };
}

function connectedPlatformsFromWorkspace(workspace?: BrandOpsData): string[] {
  if (!workspace) return [];
  const platforms: string[] = [];
  if (workspace.settings.syncHub.google.connectionStatus === 'connected') platforms.push('google');
  if (workspace.settings.syncHub.github.connectionStatus === 'connected') platforms.push('github');
  if (workspace.settings.syncHub.linkedin.connectionStatus === 'connected') platforms.push('linkedin');
  platforms.push(
    ...workspace.integrationHub.sources
      .filter((source) => source.status === 'connected' || source.status === 'monitoring')
      .map((source) => source.kind)
  );
  return uniq(platforms);
}

function behavioralMemoryFromWorkspace(workspace?: BrandOpsData): ExpertRoutingBehavioralMemory {
  if (!workspace) return {};
  const signalCount =
    (workspace.operatorTraces?.entries.length ?? 0) +
    (workspace.aiAssistantTraces?.entries.length ?? 0) +
    workspace.scheduler.tasks.length +
    (workspace.connectedIdentityEngine?.signals.length ?? 0);
  return {
    hasSignals: signalCount > 0,
    signalCount,
    labels: [
      workspace.operatorTraces?.entries.length ? 'operator_traces' : '',
      workspace.aiAssistantTraces?.entries.length ? 'ask_traces' : '',
      workspace.scheduler.tasks.length ? 'scheduler' : '',
      workspace.connectedIdentityEngine?.signals.length ? 'connected_identity' : ''
    ].filter(Boolean)
  };
}

export function inferAvailableExpertContext(input: ExpertRoutingEngineInput): ExpertContextKey[] {
  const workspace = input.workspace;
  const contexts: ExpertContextKey[] = [];

  if (workspace) {
    contexts.push('app_settings');
    if (clean(workspace.brand.operatorName) || clean(workspace.brand.positioning)) {
      contexts.push('brand_profile');
    }
    if (
      clean(workspace.brandVault.positioningStatement) ||
      workspace.brandVault.proofPoints.length ||
      workspace.brandVault.audienceSegments.length ||
      workspace.brandVault.expertiseAreas.length
    ) {
      contexts.push('brand_vault');
    }
    if (workspace.contentLibrary.length) contexts.push('content_library');
    if (workspace.publishingQueue.length) contexts.push('publishing_queue');
    if (workspace.outreachDrafts.length || workspace.outreachHistory.length) contexts.push('outreach_drafts');
    if (workspace.contacts.length) contexts.push('contacts');
    if (workspace.opportunities.length) contexts.push('opportunities');
    if (workspace.followUps.length) contexts.push('follow_ups');
    if (workspace.scheduler.tasks.length) contexts.push('scheduler');
    if (
      workspace.integrationHub.sources.length ||
      workspace.integrationHub.artifacts.length ||
      workspace.integrationHub.liveFeed.length
    ) {
      contexts.push('integration_hub');
    }
    if (workspace.integrationHub.artifacts.length || workspace.externalSync.links.length) {
      contexts.push('external_artifacts');
    }
    if (workspace.operatorTraces?.entries.length) contexts.push('operator_traces');
    if (workspace.aiAssistantTraces?.entries.length) contexts.push('ai_assistant_traces');
    if (workspace.digitalTwins?.twins.length) contexts.push('digital_twins');
    if (workspace.connectedIdentityEngine?.signals.length || workspace.settings.connectedIdentityLearningEnabled) {
      contexts.push('connected_identity');
    }
  }

  const twinProfile = input.twinProfile ?? inferTwinProfile(workspace);
  if (twinProfile) {
    contexts.push('digital_twins');
    if (twinProfile.hasApprovedMemory) contexts.push('memory_context');
  }

  const platforms = input.connectedPlatforms ?? connectedPlatformsFromWorkspace(workspace);
  if (platforms.length) {
    contexts.push('integration_hub', 'connected_identity');
  }

  const behavioralMemory = input.behavioralMemory ?? behavioralMemoryFromWorkspace(workspace);
  if (behavioralMemory.hasSignals || (behavioralMemory.signalCount ?? 0) > 0) {
    contexts.push('operator_traces', 'memory_context');
  }

  if (input.profession) contexts.push('brand_profile');

  return uniq(contexts);
}

function inferTaskHints(input: ExpertRoutingEngineInput, workflow: WorkflowProfile): OperationalExpertTask[] {
  const text = normalized(input.userIntent);
  const hints: OperationalExpertTask[] = [...workflow.taskHints];

  if (input.mode === 'plan') hints.push('plan_generation', 'plan_prioritization');
  if (input.mode === 'operate') hints.push('execution_readiness');
  if (workflow.workflowType === 'founder_ops') {
    hints.push('positioning_strategy', 'outreach_drafting', 'plan_generation');
  }
  if (workflow.workflowType === 'creator_growth') {
    hints.push('content_ideation', 'opportunity_scoring', 'behavior_prediction');
  }
  if (workflow.workflowType === 'recruiter_ops') {
    hints.push('outreach_drafting', 'relationship_follow_up', 'plan_generation', 'integration_mapping');
  }
  if (hasAny(text, ['position', 'audience', 'offer', 'headline'])) hints.push('positioning_strategy');
  if (hasAny(text, ['outreach', 'intro', 'dm', 'email', 'follow up', 'follow-up'])) {
    hints.push('outreach_drafting', 'relationship_follow_up');
  }
  if (hasAny(text, ['content', 'post', 'publish', 'creator', 'newsletter'])) {
    hints.push('content_ideation', 'content_drafting');
  }
  if (hasAny(text, ['opportunity', 'pipeline', 'deal', 'growth', 'revenue'])) {
    hints.push('opportunity_scoring');
  }
  if (hasAny(text, ['predict', 'behavior', 'cadence', 'timing', 'pattern', 'growth'])) {
    hints.push('behavior_prediction');
  }
  if (hasAny(text, ['integration', 'connect', 'sync', 'source', 'artifact'])) {
    hints.push('integration_mapping');
  }
  if (hasAny(text, ['twin', 'memory', 'remember', 'voice', 'grounded'])) {
    hints.push('twin_grounding', 'memory_retrieval');
  }

  return uniq(hints);
}

function observedSignals(
  input: ExpertRoutingEngineInput,
  workflow: ExpertWorkflowType,
  professionPath: ExpertProfessionPath
): string[] {
  const workspace = input.workspace;
  const platforms = input.connectedPlatforms ?? connectedPlatformsFromWorkspace(workspace);
  const twinProfile = input.twinProfile ?? inferTwinProfile(workspace);
  const behavior = input.behavioralMemory ?? behavioralMemoryFromWorkspace(workspace);
  return [
    `intent:${clean(input.userIntent).slice(0, 120)}`,
    `mode:${input.mode}`,
    `workflow:${workflow}`,
    `profession:${professionPath}`,
    twinProfile ? 'twin_profile:present' : 'twin_profile:missing',
    platforms.length ? `connected_platforms:${platforms.join(',')}` : 'connected_platforms:none',
    behavior.hasSignals || behavior.signalCount ? `behavioral_memory:${behavior.signalCount ?? 'present'}` : 'behavioral_memory:none'
  ];
}

function candidateScore(candidate: ExpertRouteCandidate, profile: WorkflowProfile): number {
  let score = candidate.score;
  if (profile.expertIds.includes(candidate.expert.id)) score += 0.16;
  if (candidate.missingContext.length === 0) score += 0.04;
  return Number(Math.min(1, score).toFixed(3));
}

function confidenceBand(score: number): ExpertActivation['confidenceBand'] {
  if (score >= 0.74) return 'high';
  if (score >= 0.58) return 'medium';
  return 'low';
}

function activationReasons(candidate: ExpertRouteCandidate, profile: WorkflowProfile): string[] {
  return uniq([
    `workflow:${profile.workflowType}`,
    ...candidate.reasons,
    ...candidate.matchedRoutingConditions.map((condition) => `condition:${condition}`)
  ]);
}

function activationFrom(candidate: ExpertRouteCandidate, profile: WorkflowProfile): ExpertActivation {
  const score = candidateScore(candidate, profile);
  return {
    expertId: candidate.expert.id,
    name: candidate.expert.name,
    score,
    confidenceBand: confidenceBand(score),
    reasons: activationReasons(candidate, profile),
    missingContext: candidate.missingContext,
    matchedRoutingConditions: candidate.matchedRoutingConditions
  };
}

function deactivatedExperts(
  activated: readonly ExpertActivation[],
  profile: WorkflowProfile
): ExpertDeactivation[] {
  const active = new Set(activated.map((item) => item.expertId));
  const allowed = new Set(profile.expertIds);
  return listOperationalExpertIds()
    .filter((id) => !active.has(id))
    .map((id) => ({
      expertId: id,
      reason:
        profile.workflowType !== 'general' && !allowed.has(id)
          ? `outside_${profile.workflowType}_workflow`
          : 'below_activation_threshold'
    }));
}

function sortActivationsForProfile(
  activations: ExpertActivation[],
  profile: WorkflowProfile
): ExpertActivation[] {
  if (profile.workflowType === 'general') {
    return activations.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }
  return activations.sort((a, b) => {
    const ai = profile.expertIds.indexOf(a.expertId);
    const bi = profile.expertIds.indexOf(b.expertId);
    return ai - bi || b.score - a.score || a.name.localeCompare(b.name);
  });
}

function profileFallbackActivations(
  activations: readonly ExpertActivation[],
  profile: WorkflowProfile,
  availableContext: readonly ExpertContextKey[],
  professionPath: ExpertProfessionPath
): ExpertActivation[] {
  if (profile.workflowType === 'general') return [...activations];
  const active = new Set(activations.map((activation) => activation.expertId));
  const available = new Set(availableContext);
  const additions = profile.expertIds
    .filter((expertId) => !active.has(expertId))
    .map((expertId): ExpertActivation | null => {
      const expert = getOperationalExpert(expertId);
      if (!expert) return null;
      const missingContext = expert.requiredContext.filter((key) => !available.has(key));
      const score = Number(Math.max(0.5, 0.64 - missingContext.length * 0.03).toFixed(3));
      return {
        expertId,
        name: expert.name,
        score,
        confidenceBand: confidenceBand(score),
        reasons: [`profession_path:${professionPath}`, `workflow:${profile.workflowType}`],
        missingContext,
        matchedRoutingConditions: [`profession-${professionPath}`]
      };
    })
    .filter((activation): activation is ExpertActivation => Boolean(activation));
  return [...activations, ...additions];
}

export function routeExpertSlate(input: ExpertRoutingEngineInput): ExpertRoutingResolution {
  const activeTwin = input.workspace ? getActiveDigitalTwin(input.workspace) : null;
  const professionPath = inferProfessionPath(input, activeTwin);
  const workflowType = classifyWorkflow(input, activeTwin, professionPath);
  const profile = workflowProfileFor(workflowType);
  const inferredTaskHints = inferTaskHints(input, profile);
  const availableContext = inferAvailableExpertContext(input);
  const text = [
    input.userIntent,
    input.profession,
    ...(input.connectedPlatforms ?? connectedPlatformsFromWorkspace(input.workspace)),
    ...(input.behavioralMemory?.labels ?? []),
    input.twinProfile?.headline,
    input.twinProfile?.professionalPositioning,
    activeTwin?.identity.headline,
    activeTwin?.identity.professionalPositioning
  ]
    .filter(Boolean)
    .join(' ');

  const allowedExpertIds = new Set(profile.expertIds);
  const rawCandidates = routeOperationalExperts({
    text,
    mode: input.mode,
    taskHints: inferredTaskHints,
    availableContext,
    maxExperts: listOperationalExpertIds().length
  });

  const scopedCandidates =
    profile.workflowType === 'general'
      ? rawCandidates
      : rawCandidates.filter((candidate) => allowedExpertIds.has(candidate.expert.id));

  const maxExperts = input.maxExperts ?? profile.defaultMaxExperts;
  const activatedExperts = sortActivationsForProfile(
    profileFallbackActivations(
      scopedCandidates
        .map((candidate) => activationFrom(candidate, profile))
        .filter((activation) => activation.score >= 0.5),
      profile,
      availableContext,
      professionPath
    ),
    profile
  ).slice(0, maxExperts);

  return {
    activatedExperts,
    trace: {
      schemaVersion: '1.0.0',
      workflowType,
      professionPath,
      mode: input.mode,
      inferredTaskHints,
      availableContext,
      observedSignals: observedSignals(input, workflowType, professionPath),
      consideredExpertCount: rawCandidates.length,
      deactivatedExperts: deactivatedExperts(activatedExperts, profile)
    }
  };
}

export function summarizeExpertRoutingResolution(resolution: ExpertRoutingResolution): string[] {
  return [
    `workflow=${resolution.trace.workflowType}`,
    `activated=${resolution.activatedExperts.map((expert) => expert.expertId).join(',') || 'none'}`,
    `tasks=${resolution.trace.inferredTaskHints.join(',') || 'none'}`,
    `context=${resolution.trace.availableContext.join(',') || 'none'}`
  ];
}

export function activatedExpertDefinitions(resolution: ExpertRoutingResolution) {
  return resolution.activatedExperts
    .map((activation) => getOperationalExpert(activation.expertId))
    .filter(Boolean);
}
