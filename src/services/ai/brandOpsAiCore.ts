import type { BrandOpsData, DigitalTwin } from '../../types/domain';
import type {
  BrandOpsAIArtifact,
  BrandOpsAIArtifactStatus,
  BrandOpsAIArtifactType,
  BrandOpsAIBatchRun,
  BrandOpsAICoreState,
  BrandOpsAIRequest,
  BrandOpsAIResponse,
  BrandOpsAISafetyLevel
} from '../../types/brandOpsAiCore';
import { getActiveDigitalTwin } from '../digitalTwin/digitalTwin';
import { buildMemoryContextEngineReadout } from '../memory/memoryContextEngine';
import { buildPlatformAwareAskReadout } from './platformAwareAskContext';
import { buildExpertOperatorIntegrationReadout } from './expertOperatorIntegration';
import { buildPredictiveOpportunityLayerReadout } from '../plan/predictiveOpportunityLayer';
import { buildWorkflowPredictionLayerReadout } from '../plan/workflowPredictionLayer';
import { buildPredictiveContentIdeationReadout } from '../plan/predictiveContentIdeationEngine';
import { buildPositioningIntelligenceReadout } from '../plan/positioningIntelligence';
import { buildBuyerPersonaIntelligenceReadout } from '../plan/buyerPersonaIntelligence';
import {
  buildOperatingTimelineEventsFromAiCoreResponse,
  prependOperatingTimelineEvents
} from '../operatingTimeline/operatingTimeline';

export const BRANDOPS_AI_CORE_SCHEMA_VERSION = '1.0.0';
export const MAX_BRANDOPS_AI_CORE_ARTIFACTS = 160;
export const MAX_BRANDOPS_AI_CORE_BATCH_RUNS = 40;

const EXTERNAL_ARTIFACT_TYPES = new Set<BrandOpsAIArtifactType>([
  'bio',
  'pitch',
  'outreach draft',
  'content idea',
  'content plan',
  'buyer persona',
  'positioning statement',
  'opportunity analysis',
  'meeting prep'
]);

const DEFAULT_BATCH_OUTPUTS: BrandOpsAIArtifactType[] = [
  'resume summary',
  'bio',
  'positioning statement',
  'buyer persona',
  'outreach draft',
  'content idea',
  'opportunity analysis',
  'workflow plan',
  'operational plan'
];

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 1200): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function uniq(values: unknown[], cap = 10): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = clean(value, 260);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= cap) break;
  }
  return out;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function workspaceId(workspace: BrandOpsData): string {
  return workspace.digitalTwins?.twins[0]?.workspaceId || 'local-workspace';
}

function resolveTwin(workspace: BrandOpsData, twinId?: string): DigitalTwin | null {
  const twins = workspace.digitalTwins?.twins ?? [];
  if (twinId) return twins.find((twin) => twin.id === twinId) ?? null;
  return getActiveDigitalTwin(workspace);
}

function sourceFacts(workspace: BrandOpsData, twin: DigitalTwin | null): string[] {
  const memory = buildMemoryContextEngineReadout(workspace);
  const platform = buildPlatformAwareAskReadout(workspace);
  return uniq(
    [
      workspace.brand.operatorName,
      workspace.brand.positioning,
      workspace.brand.primaryOffer,
      workspace.brand.focusMetric,
      twin?.displayName,
      twin?.identity.headline,
      twin?.identity.professionalPositioning,
      ...(twin?.resumeProfile.skills ?? []).slice(0, 6),
      ...memory.entries.slice(0, 8).map((entry) => `${entry.label}: ${entry.value}`),
      ...platform.connectedApps.map((app) => `${app} connected`)
    ],
    14
  );
}

function missingFactWarnings(workspace: BrandOpsData, twin: DigitalTwin | null): string[] {
  return [
    twin ? '' : 'No active digital twin was available; profile claims must remain conservative.',
    workspace.brand.positioning.trim() ? '' : 'Positioning is missing.',
    workspace.brand.primaryOffer.trim() ? '' : 'Primary offer is missing.',
    workspace.brand.voiceGuide.trim() ? '' : 'Voice guide is missing.',
    twin && twin.resumeProfile.experience.length === 0
      ? 'Twin work history has no verified experience rows.'
      : '',
    twin && twin.resumeProfile.skills.length < 3 ? 'Twin has fewer than three verified skills.' : ''
  ].filter(Boolean);
}

function validationWarnings(args: {
  workspace: BrandOpsData;
  twin: DigitalTwin | null;
  request: BrandOpsAIRequest;
  artifactTypes: BrandOpsAIArtifactType[];
}): string[] {
  const warnings = missingFactWarnings(args.workspace, args.twin);
  const externalOutput =
    args.request.safetyLevel === 'external' ||
    args.artifactTypes.some((type) => EXTERNAL_ARTIFACT_TYPES.has(type));
  if (externalOutput && !args.request.approvalRequired) {
    warnings.push('External-facing outputs require approval before use.');
  }
  if (/guarantee|guaranteed|definitely|proven #?1/i.test(args.request.userInput ?? args.request.intent)) {
    warnings.push('Unsupported certainty language detected; label claims as inferred unless verified.');
  }
  return uniq(warnings, 12);
}

function approvalRequiredFor(
  type: BrandOpsAIArtifactType,
  safetyLevel: BrandOpsAISafetyLevel,
  explicitApproval: boolean
): boolean {
  return explicitApproval || safetyLevel === 'external' || EXTERNAL_ARTIFACT_TYPES.has(type);
}

function artifactTitle(type: BrandOpsAIArtifactType, workspace: BrandOpsData): string {
  const name = workspace.brand.operatorName.trim() || 'Workspace operator';
  const titles: Record<BrandOpsAIArtifactType, string> = {
    bio: `${name} professional bio`,
    pitch: `${name} pitch draft`,
    'outreach draft': 'Approval-gated outreach draft',
    'content idea': 'Predictive content idea',
    'content plan': 'Content operating plan',
    'workflow plan': 'Reusable workflow plan',
    'buyer persona': 'Buyer persona hypothesis',
    'positioning statement': 'Positioning statement draft',
    'opportunity analysis': 'Opportunity analysis',
    'resume summary': 'Resume summary',
    'meeting prep': 'Meeting prep packet',
    'operational plan': 'Operational plan',
    'approval item': 'Approval item',
    'timeline event': 'Timeline event'
  };
  return titles[type];
}

function synthesizeContent(args: {
  type: BrandOpsAIArtifactType;
  workspace: BrandOpsData;
  twin: DigitalTwin | null;
  request: BrandOpsAIRequest;
  generatedText?: string;
}): { content: string; confidence: number; nextActions: string[] } {
  const { type, workspace, twin, request, generatedText } = args;
  const predictive = buildPredictiveOpportunityLayerReadout(workspace);
  const workflows = buildWorkflowPredictionLayerReadout(workspace);
  const contentIdeas = buildPredictiveContentIdeationReadout(workspace);
  const positioning = buildPositioningIntelligenceReadout(workspace);
  const personas = buildBuyerPersonaIntelligenceReadout(workspace);
  const expert = buildExpertOperatorIntegrationReadout(workspace, request.intent);
  const baseConfidence = clampPercent(
    Math.max(
      twin?.confidenceScore ?? 0,
      predictive.averageConfidence,
      workflows.averageConfidence,
      positioning.averageConfidence,
      expert.ask.confidence,
      42
    )
  );

  if (generatedText) {
    return {
      content: generatedText.slice(0, 5000),
      confidence: baseConfidence,
      nextActions: ['Review output', 'Approve or reject', 'Capture receipt']
    };
  }

  switch (type) {
    case 'bio':
      return {
        content: `${workspace.brand.operatorName || twin?.displayName || 'The operator'} helps ${workspace.brand.primaryOffer || 'their professional audience'} with ${workspace.brand.focusMetric || 'measurable outcomes'}. Verified or source-backed details should come from twin memory before external use.`,
        confidence: baseConfidence,
        nextActions: ['Review verified claims', 'Approve for external profile use']
      };
    case 'positioning statement':
      return {
        content:
          positioning.positioningStatements[0]?.statement ||
          workspace.brand.positioning ||
          'Positioning requires more approved profile and audience evidence.',
        confidence: positioning.averageConfidence || baseConfidence,
        nextActions: ['Review evidence', 'Approve positioning', 'Use in PLAN']
      };
    case 'buyer persona':
      return {
        content:
          personas.buyerPersonas[0]?.recommendedMessage ||
          personas.idealCustomerProfile.summary ||
          'Buyer persona remains a hypothesis until audience and pipeline evidence are approved.',
        confidence: personas.averageConfidence || baseConfidence,
        nextActions: ['Validate against contacts', 'Approve persona hypothesis']
      };
    case 'outreach draft':
      return {
        content:
          predictive.suggestions.find((item) => item.kind === 'outreach-opportunity')?.suggestion ||
          'Draft a concise outreach message after selecting a target and verified proof point.',
        confidence: baseConfidence,
        nextActions: ['Select recipient', 'Review message', 'Approve before sending']
      };
    case 'content idea':
      return {
        content:
          contentIdeas.allIdeas[0]?.idea ||
          predictive.suggestions.find((item) => item.kind === 'content-ideation')?.suggestion ||
          'Content idea needs stronger positioning or content history.',
        confidence: contentIdeas.averageConfidence || baseConfidence,
        nextActions: ['Choose angle', 'Draft content', 'Approve publishing window']
      };
    case 'content plan':
      return {
        content:
          contentIdeas.campaignIdeas[0]?.idea ||
          'Build a content plan from the strongest approved positioning and publishing cadence.',
        confidence: contentIdeas.averageConfidence || baseConfidence,
        nextActions: ['Pick campaign lane', 'Review cadence', 'Approve schedule']
      };
    case 'workflow plan':
      return {
        content:
          workflows.predictions[0]?.recommendedSteps.join(' -> ') ||
          'No repeated workflow is strong enough yet; start with an approval-gated checklist.',
        confidence: workflows.averageConfidence || baseConfidence,
        nextActions: ['Review steps', 'Save workflow draft', 'Require approvals']
      };
    case 'opportunity analysis':
      return {
        content:
          predictive.suggestions[0]?.expectedImpact ||
          'Opportunity analysis will improve once pipeline, memory, and platform signals are available.',
        confidence: predictive.averageConfidence || baseConfidence,
        nextActions: ['Inspect signals', 'Convert to PLAN', 'Approve next action']
      };
    case 'resume summary':
      return {
        content:
          twin?.identity.summary ||
          workspace.settings.operatorTwin.resumeArtifact?.slice(0, 1200) ||
          'No resume artifact is available yet.',
        confidence: twin?.confidenceScore ?? 36,
        nextActions: ['Review missing facts', 'Approve twin memory']
      };
    case 'meeting prep':
      return {
        content: 'Prepare agenda, context, desired outcome, risks, and follow-up rules from current workspace state.',
        confidence: baseConfidence,
        nextActions: ['Confirm meeting objective', 'Review prep packet']
      };
    case 'pitch':
      return {
        content: `Pitch draft based on ${workspace.brand.primaryOffer || 'the current offer'} and ${workspace.brand.focusMetric || 'the current focus metric'}. Claims require evidence before external use.`,
        confidence: baseConfidence,
        nextActions: ['Attach proof', 'Review externally', 'Approve']
      };
    case 'approval item':
      return {
        content: generatedText || 'Approval required before this AI output can affect external surfaces or workspace records.',
        confidence: baseConfidence,
        nextActions: ['Preview', 'Approve or reject', 'Record receipt']
      };
    case 'timeline event':
      return {
        content: 'AI Core timeline event captured for operational continuity.',
        confidence: baseConfidence,
        nextActions: ['Inspect timeline', 'Confirm next step']
      };
    case 'operational plan':
    default:
      return {
        content:
          expert.plan.guidance.join(' ') ||
          'Operational plan should sequence objective, dependencies, approval gates, execution steps, and receipt capture.',
        confidence: baseConfidence,
        nextActions: ['Review plan', 'Approve execution gates', 'Capture receipt']
      };
  }
}

function createArtifact(args: {
  workspace: BrandOpsData;
  twin: DigitalTwin | null;
  request: BrandOpsAIRequest;
  type: BrandOpsAIArtifactType;
  expertsUsed: string[];
  facts: string[];
  warnings: string[];
  generatedText?: string;
}): BrandOpsAIArtifact {
  const createdAt = nowIso();
  const synthesized = synthesizeContent({
    type: args.type,
    workspace: args.workspace,
    twin: args.twin,
    request: args.request,
    generatedText: args.generatedText
  });
  const approvalRequired = approvalRequiredFor(
    args.type,
    args.request.safetyLevel,
    args.request.approvalRequired
  );
  const receipt = {
    id: uid('ai-core-receipt'),
    createdAt,
    mode: args.request.mode,
    validationStatus: args.warnings.length ? 'needs_review' as const : 'passed' as const,
    approvalRequired,
    warnings: args.warnings,
    sourceFactsUsed: args.facts,
    expertsUsed: args.expertsUsed
  };
  const status: BrandOpsAIArtifactStatus = approvalRequired ? 'draft' : 'approved';

  return {
    id: uid('ai-artifact'),
    type: args.type,
    title: artifactTitle(args.type, args.workspace),
    content: synthesized.content,
    sourcePrompt: clean(args.request.userInput || args.request.intent, 2000),
    twinId: args.twin?.id,
    workspaceId: args.request.workspaceId || workspaceId(args.workspace),
    createdAt,
    status,
    confidenceScore: synthesized.confidence,
    sourceFactsUsed: args.facts,
    expertsUsed: args.expertsUsed,
    nextActions: synthesized.nextActions,
    auditReceipt: receipt
  };
}

function outputsForRequest(request: BrandOpsAIRequest): BrandOpsAIArtifactType[] {
  if (request.requiredOutputs?.length) return request.requiredOutputs;
  if (request.mode === 'batch') return DEFAULT_BATCH_OUTPUTS;
  if (request.mode === 'ask') return ['operational plan'];
  if (request.mode === 'plan') return ['operational plan', 'workflow plan'];
  if (request.mode === 'predict') return ['opportunity analysis'];
  return ['approval item'];
}

export async function runBrandOpsAI(args: {
  workspace: BrandOpsData;
  request: BrandOpsAIRequest;
  generatedText?: string;
}): Promise<BrandOpsAIResponse> {
  const twin = resolveTwin(args.workspace, args.request.twinId);
  const facts = sourceFacts(args.workspace, twin);
  const expert = buildExpertOperatorIntegrationReadout(args.workspace, args.request.intent);
  const expertsUsed = uniq(expert.generatedUsing, 8);
  const requestedTypes = outputsForRequest(args.request);
  const warnings = validationWarnings({
    workspace: args.workspace,
    twin,
    request: args.request,
    artifactTypes: requestedTypes
  });
  const artifacts = requestedTypes.map((type) =>
    createArtifact({
      workspace: args.workspace,
      twin,
      request: args.request,
      type,
      expertsUsed,
      facts,
      warnings,
      generatedText: args.generatedText
    })
  );
  const approvals = artifacts
    .filter((artifact) => artifact.auditReceipt.approvalRequired)
    .map((artifact) => ({
      id: uid('ai-approval'),
      artifactId: artifact.id,
      reason: `${artifact.type} requires human review before external use or workspace mutation.`,
      requiredBefore: 'send, publish, schedule, sync, save externally, or execute'
    }));
  const batchRun =
    args.request.mode === 'batch'
      ? buildBatchRun(args.request, artifacts, warnings)
      : undefined;

  return {
    assistantMessage: args.generatedText || summarizeCoreRun(args.request, artifacts, warnings),
    artifacts,
    planSteps: uniq(artifacts.flatMap((artifact) => artifact.nextActions), 10),
    requiredApprovals: approvals,
    warnings,
    receipts: artifacts.map((artifact) => artifact.auditReceipt),
    nextActions: uniq(artifacts.flatMap((artifact) => artifact.nextActions), 10),
    ...(batchRun ? { batchRun } : {})
  };
}

function summarizeCoreRun(
  request: BrandOpsAIRequest,
  artifacts: BrandOpsAIArtifact[],
  warnings: string[]
): string {
  const artifactLine = artifacts.map((artifact) => artifact.type).join(', ');
  const warningLine = warnings.length ? ` ${warnings.length} validation warning(s) need review.` : '';
  return `BrandOps AI Core handled ${request.mode} intent "${request.intent}" and captured ${artifacts.length} artifact(s): ${artifactLine}.${warningLine}`;
}

function buildBatchRun(
  request: BrandOpsAIRequest,
  artifacts: BrandOpsAIArtifact[],
  warnings: string[]
): BrandOpsAIBatchRun {
  const failed = warnings
    .filter((warning) => /missing|No active digital twin|No resume/i.test(warning))
    .slice(0, 4)
    .map((warning) => ({
      artifactType: 'resume summary' as BrandOpsAIArtifactType,
      error: warning,
      retryCommand: 'Open Twin setup and add verified resume/profile facts, then rerun AI Batch Run.'
    }));
  return {
    id: uid('ai-batch'),
    createdAt: nowIso(),
    completedAt: nowIso(),
    status: failed.length ? 'partial' : 'completed',
    intent: request.intent,
    completedArtifacts: artifacts.map((artifact) => artifact.id),
    failedArtifacts: failed,
    steps: artifacts.map((artifact) => ({
      id: uid('ai-batch-step'),
      artifactType: artifact.type,
      status: 'completed',
      artifactId: artifact.id,
      retryCommand: `ask: Retry AI Core batch artifact ${artifact.type}`
    })),
    finalSummary: `AI Batch Run produced ${artifacts.length} artifact(s) with ${failed.length} retry item(s).`
  };
}

export function prependBrandOpsAICoreResult(
  workspace: BrandOpsData,
  response: BrandOpsAIResponse
): BrandOpsData {
  const current = normalizeBrandOpsAICoreState(workspace.aiCore);
  const artifacts = [...response.artifacts, ...current.artifacts].slice(0, MAX_BRANDOPS_AI_CORE_ARTIFACTS);
  const batchRuns = response.batchRun
    ? [response.batchRun, ...current.batchRuns].slice(0, MAX_BRANDOPS_AI_CORE_BATCH_RUNS)
    : current.batchRuns;
  return {
    ...workspace,
    aiCore: {
      schemaVersion: BRANDOPS_AI_CORE_SCHEMA_VERSION,
      artifacts,
      batchRuns
    },
    operatingTimeline: prependOperatingTimelineEvents(
      workspace.operatingTimeline,
      buildOperatingTimelineEventsFromAiCoreResponse(response)
    )
  };
}

export function normalizeBrandOpsAICoreState(value: unknown): BrandOpsAICoreState {
  if (!value || typeof value !== 'object') {
    return { schemaVersion: BRANDOPS_AI_CORE_SCHEMA_VERSION, artifacts: [], batchRuns: [] };
  }
  const raw = value as { artifacts?: unknown; batchRuns?: unknown };
  const artifacts = Array.isArray(raw.artifacts)
    ? raw.artifacts.map(normalizeArtifact).filter((item): item is BrandOpsAIArtifact => Boolean(item))
    : [];
  const batchRuns = Array.isArray(raw.batchRuns)
    ? raw.batchRuns.map(normalizeBatchRun).filter((item): item is BrandOpsAIBatchRun => Boolean(item))
    : [];
  return {
    schemaVersion: BRANDOPS_AI_CORE_SCHEMA_VERSION,
    artifacts: artifacts.slice(0, MAX_BRANDOPS_AI_CORE_ARTIFACTS),
    batchRuns: batchRuns.slice(0, MAX_BRANDOPS_AI_CORE_BATCH_RUNS)
  };
}

function normalizeArtifact(value: unknown): BrandOpsAIArtifact | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as BrandOpsAIArtifact;
  if (!item.id || !item.type || !item.title || !item.createdAt || !item.auditReceipt) return null;
  return {
    ...item,
    title: clean(item.title, 180),
    content: clean(item.content, 8000),
    sourcePrompt: clean(item.sourcePrompt, 2000),
    workspaceId: clean(item.workspaceId || 'local-workspace', 120),
    confidenceScore: clampPercent(item.confidenceScore),
    sourceFactsUsed: uniq(item.sourceFactsUsed ?? [], 16),
    expertsUsed: uniq(item.expertsUsed ?? [], 10),
    nextActions: uniq(item.nextActions ?? [], 10),
    status: ['draft', 'approved', 'rejected', 'executed', 'archived'].includes(item.status)
      ? item.status
      : 'draft'
  };
}

function normalizeBatchRun(value: unknown): BrandOpsAIBatchRun | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as BrandOpsAIBatchRun;
  if (!item.id || !item.createdAt || !item.intent) return null;
  return {
    ...item,
    intent: clean(item.intent, 600),
    completedArtifacts: uniq(item.completedArtifacts ?? [], 80),
    failedArtifacts: Array.isArray(item.failedArtifacts) ? item.failedArtifacts.slice(0, 20) : [],
    steps: Array.isArray(item.steps) ? item.steps.slice(0, 40) : [],
    finalSummary: clean(item.finalSummary, 1000),
    status: ['running', 'completed', 'partial', 'failed'].includes(item.status) ? item.status : 'partial'
  };
}
