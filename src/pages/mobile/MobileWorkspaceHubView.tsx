import clsx from 'clsx';
import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  CirclePlay,
  Compass,
  Clock3,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Gauge,
  GitBranch,
  GitFork,
  History,
  Layers,
  LineChart,
  Moon,
  Network,
  Radar,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRound,
  WandSparkles,
  XCircle
} from 'lucide-react';
import type { LaunchAccessState } from '../../shared/account/launchAccess';
import type {
  MobileWorkspaceSnapshot,
  PlanExecutionReceipt,
  PlanPendingOperatorReviewPeek
} from './buildWorkspaceSnapshot';
import type { PipelineRun } from '../../types/aiIntegrationSuite';
import type { PredictiveOpportunitySuggestion } from '../../services/plan/predictiveOpportunityLayer';
import type { ContentIdeationItem } from '../../services/plan/predictiveContentIdeationEngine';
import type { WorkflowPrediction } from '../../services/plan/workflowPredictionLayer';
import type { CrossPlatformTimelineItem } from '../../services/plan/crossPlatformOperationalTimeline';
import type { ExpertProfessionPath } from '../../services/ai/expertRoutingEngine';
import { workspaceQueueCommandLine } from './pulseTimeline';
import type { PulseTimelineRow } from './pulseTimeline';
import { PlanIdentityHeader } from './PlanIdentityHeader';
import { PlanUnifiedOperationalInbox } from './PlanUnifiedOperationalInbox';
import {
  buildOperationalPlanCards,
  type OperationalPlanCard,
  type OperationalPlanStatus
} from './PlanOperationalStudio';
import { EmptyState } from '../../shared/ui/brandopsPolish';
import { mobileChipClass } from './mobileTabPrimitives';
import { defaultBrandProfile } from '../../config/workspaceDefaults';
import { twinActionPrompt } from '../../services/digitalTwin/digitalTwin';

const SHEET = 'bo-plan-flat-root overflow-hidden rounded-2xl bg-bg';
const ROW = 'scroll-mt-28 px-4 py-4 sm:px-5';

type BoardTone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary';
type OperationalModeId = 'ASK' | 'PLAN' | 'OPERATE' | 'VERIFY';

interface PlanBoardSuggestion {
  id: string;
  source: string;
  title: string;
  detail: string;
  why: string;
  confidence?: number;
  command: string;
  primaryLabel: string;
  onPrimary?: () => void;
}

interface ProfessionModeCopy {
  label: string;
  focus: string;
  recommendedMove: string;
}

interface MemoryGraphNode {
  id: string;
  label: string;
  detail: string;
  source: string;
  confidence: number;
  tone: BoardTone;
  influences: string[];
}

interface WorkspacePulseItem {
  id: string;
  title: string;
  detail: string;
  source: string;
  confidence: number;
  urgency: string;
  tone: BoardTone;
  command: string;
}

interface TwinProgressIndicator {
  label: string;
  value: number;
  detail: string;
  tone: BoardTone;
}

interface ContextualSurface {
  title: string;
  signal: string;
  priorities: string[];
  nextActions: string[];
  tone: BoardTone;
}

interface PersonaMode {
  name: string;
  active: boolean;
  priority: string;
  guidance: string;
  tone: BoardTone;
}

interface WorkflowComposerDraft {
  id: string;
  title: string;
  trigger: string;
  steps: string[];
  integrations: string[];
  approval: string;
  timeline: string;
  confidence: number;
  command: string;
}

interface BriefingItem {
  label: string;
  detail: string;
  tone: BoardTone;
  command?: string;
}

interface AmbientSignal {
  label: string;
  detail: string;
  awareness: string;
  tone: BoardTone;
  command?: string;
}

interface EnergyMetric {
  label: string;
  value: number;
  state: string;
  detail: string;
  recommendation: string;
  tone: BoardTone;
  command?: string;
}

interface StrategicSimulation {
  id: string;
  question: string;
  forecast: string;
  risks: string[];
  dependencies: string[];
  suggestion: string;
  confidence: number;
  command: string;
}

interface TwinEcosystemMember {
  role: string;
  status: 'active' | 'ready' | 'proposed';
  contribution: string;
  collaboratesWith: string[];
  confidence: number;
  tone: BoardTone;
}

interface AutonomousDraft {
  id: string;
  title: string;
  type: string;
  preparedBecause: string;
  reviewNeed: string;
  confidence: number;
  command: string;
}

interface BrainSignal {
  label: string;
  detail: string;
  source: string;
  priority: number;
  tone: BoardTone;
}

interface SearchLens {
  scope: string;
  intent: string;
  coverage: string;
  command: string;
  tone: BoardTone;
}

interface DeepWorkState {
  active: boolean;
  objective: string;
  minimizedNoise: string[];
  elevatedPriorities: string[];
  simplifiedTimeline: string;
  command: string;
  tone: BoardTone;
}

interface OperatingTimelineEvent {
  id: string;
  label: string;
  detail: string;
  category: string;
  at: string;
  tone: BoardTone;
  command?: string;
}

interface OperationalGraphNode {
  id: string;
  label: string;
  kind: string;
  detail: string;
  strength: number;
  tone: BoardTone;
}

interface OperationalGraphEdge {
  from: string;
  to: string;
  label: string;
}

interface StrategicReflection {
  id: string;
  insight: string;
  evidence: string;
  recommendation: string;
  tone: BoardTone;
  command: string;
}

interface AdaptiveLayoutState {
  name: string;
  reason: string;
  elevatedSurfaces: string[];
  minimizedSurfaces: string[];
  tone: BoardTone;
}

interface IntelligenceScore {
  label: string;
  value: number;
  interpretation: string;
  evidence: string;
  tone: BoardTone;
}

interface SandboxScenario {
  id: string;
  title: string;
  simulation: string;
  safeBecause: string;
  expectedLearning: string;
  command: string;
}

interface CofounderInsight {
  id: string;
  challenge: string;
  gap: string;
  priority: string;
  tone: BoardTone;
  command: string;
}

interface PreparationAsset {
  id: string;
  title: string;
  assetType: string;
  preparedFor: string;
  approvalPath: string;
  command: string;
}

export interface MobileWorkspaceHubViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onOpenToday: () => void;
  launchAccess: LaunchAccessState;
  onOpenSettings: () => void;
  onOpenIntegrations: () => void;
  onOpenCommandPalette: () => void;
  /** When true, Getting started card shows above this hub (setup hint hidden until dismissed). */
  firstRunJourneyVisible?: boolean;
  canRunWorkspaceCommands: boolean;
  workspaceCommandLockReason: 'auth' | 'membership' | null;
  onDownloadPipelineRun: (run: PipelineRun) => void;
  onApproveOperatorTrace: (traceId: string) => void | Promise<void>;
  onRejectOperatorTrace?: (traceId: string) => void | Promise<void>;
  onConvertPredictiveOpportunityToPlan?: (suggestion: PredictiveOpportunitySuggestion) => void;
  onConvertContentIdeationToPlan?: (item: ContentIdeationItem) => void;
  onConvertWorkflowPredictionToPlan?: (prediction: WorkflowPrediction) => void;
  onDeleteMemoryContext?: () => void | Promise<void>;
  onDisableMemoryContext?: () => void | Promise<void>;
  onExportOperationalPlan?: (plan: OperationalPlanCard) => void;
  onExportExecutionReceipt?: (receipt: PlanExecutionReceipt) => void;
  convertedOperationalPlans?: OperationalPlanCard[];
}

function sortRowsSoonestFirst(rows: PulseTimelineRow[]): PulseTimelineRow[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.sortKey).getTime();
    const tb = new Date(b.sortKey).getTime();
    const na = Number.isNaN(ta) ? Number.MAX_SAFE_INTEGER : ta;
    const nb = Number.isNaN(tb) ? Number.MAX_SAFE_INTEGER : tb;
    return na - nb;
  });
}

function compactTime(value: string): string {
  const text = value.trim();
  if (!text) return 'Now';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function planAgentLockCopy(reason: 'auth' | 'membership' | null): string | null {
  if (reason === 'auth') return 'Sign in from Settings to run workspace commands from Plan.';
  if (reason === 'membership') return 'Activate membership to run workspace commands from Plan.';
  return null;
}

function statusLabel(status: OperationalPlanStatus): string {
  switch (status) {
    case 'needs-input':
      return 'Needs input';
    case 'in-progress':
      return 'In progress';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Ready';
  }
}

function toneClass(tone: BoardTone): string {
  switch (tone) {
    case 'success':
      return 'border-success/45 bg-successSoft/20 text-success';
    case 'warning':
      return 'border-warning/45 bg-warningSoft/20 text-warning';
    case 'danger':
      return 'border-danger/45 bg-dangerSoft/15 text-danger';
    case 'info':
      return 'border-info/45 bg-infoSoft/15 text-info';
    case 'primary':
      return 'border-primary/45 bg-primarySoft/20 text-primary';
    default:
      return 'border-border/45 bg-bgSubtle/70 text-textMuted';
  }
}

function planTone(status: OperationalPlanStatus): BoardTone {
  if (status === 'blocked') return 'warning';
  if (status === 'in-progress') return 'info';
  if (status === 'ready') return 'success';
  return 'muted';
}

function receiptTone(status: string): BoardTone {
  const s = status.toLowerCase();
  if (s.includes('fail') || s.includes('reject') || s.includes('error')) return 'danger';
  if (s.includes('pending') || s.includes('review') || s.includes('running')) return 'warning';
  if (s.includes('success') || s.includes('approved') || s.includes('recorded')) return 'success';
  return 'muted';
}

function timelineTone(item: CrossPlatformTimelineItem): BoardTone {
  if (item.kind === 'failed-operation') return 'danger';
  if (item.kind === 'approval') return 'warning';
  if (item.kind === 'scheduled-workflow' || item.kind === 'completed-operation') return 'success';
  if (item.kind === 'connected-platform-action') return 'info';
  if (item.kind === 'ai-recommendation') return 'primary';
  return 'muted';
}

function approvalPrompt(action: string, item: PlanPendingOperatorReviewPeek): string {
  return `ask: ${action} for this pending BrandOps approval item. Do not execute externally. Require human confirmation before sending, posting, publishing, scheduling, syncing, or changing workspace records.\n\nItem: ${item.verb}\nSource: ${item.source}\nPreview: ${item.preview || 'No preview available.'}`;
}

function receiptPreviewCommand(receipt: PlanExecutionReceipt): string {
  return `ask: Explain this PLAN receipt in plain language. Include what happened, why it matters, what data was used, approval status, warnings, and the safest next step. Do not claim anything external happened unless the receipt says so.\n\n${JSON.stringify(receipt, null, 2)}`;
}

function professionModeCopy(path: ExpertProfessionPath): ProfessionModeCopy {
  switch (path) {
    case 'founder':
      return {
        label: 'Founder mode',
        focus: 'Investor outreach, fundraising follow-ups, positioning, growth loops, and operating cadence.',
        recommendedMove: 'Prioritize warm follow-ups, proof-backed positioning, and approval-gated growth plans.'
      };
    case 'creator':
      return {
        label: 'Creator mode',
        focus: 'Content pipelines, audience growth, publishing rhythm, sponsors, and reusable campaign systems.',
        recommendedMove: 'Turn engagement and content signals into a calendar, sponsor queue, or repurposing plan.'
      };
    case 'recruiter':
      return {
        label: 'Recruiter mode',
        focus: 'Candidate pipelines, outreach sequences, scheduling, follow-up timing, and source health.',
        recommendedMove: 'Convert candidate signals into prioritized outreach, screening, and scheduling steps.'
      };
    default:
      return {
        label: 'General operator mode',
        focus: 'Plans, approvals, platform context, memory, and repeatable professional workflows.',
        recommendedMove: 'Use ASK to clarify intent, then convert the output into a PLAN before operating.'
      };
  }
}

function activeNextStep(plan: OperationalPlanCard): string {
  if (plan.status === 'blocked') return 'Review what is blocking it, then approve or reject.';
  if (plan.status === 'needs-input') return 'Preview it and fill in the missing context.';
  if (plan.status === 'in-progress') return 'Check progress, then run the next approved step.';
  return 'Preview it, edit if needed, then approve execution.';
}

function suggestionCommand(title: string, detail: string): string {
  return `ask: Turn this recommendation into a PLAN preview only. Explain what it is, why it matters, next steps, approval needs, risks, and receipt expectations. Do not execute externally or mutate workspace records.\n\nTitle: ${title}\nDetail: ${detail}`;
}

function buildBoardSuggestions(args: {
  snapshot: MobileWorkspaceSnapshot;
  onConvertPredictiveOpportunityToPlan: (suggestion: PredictiveOpportunitySuggestion) => void;
  onConvertContentIdeationToPlan: (item: ContentIdeationItem) => void;
  onConvertWorkflowPredictionToPlan: (prediction: WorkflowPrediction) => void;
}): PlanBoardSuggestion[] {
  const suggestions: PlanBoardSuggestion[] = [];

  for (const item of args.snapshot.operationalIntelligenceCore.recommendedActions.slice(0, 2)) {
    suggestions.push({
      id: `core-${item.id}`,
      source: 'Operational Intelligence Core',
      title: item.title,
      detail: item.detail,
      why: item.why,
      confidence: item.confidence,
      command: item.command,
      primaryLabel: item.primaryLabel
    });
  }

  for (const item of args.snapshot.predictiveOpportunityLayer.suggestions.slice(0, 2)) {
    suggestions.push({
      id: `opportunity-${item.id}`,
      source: 'Opportunity',
      title: item.title,
      detail: item.suggestion,
      why: item.whyThisAppeared,
      confidence: item.confidence,
      command: item.previewCommand,
      primaryLabel: 'Add to plans',
      onPrimary: () => args.onConvertPredictiveOpportunityToPlan(item)
    });
  }

  for (const item of args.snapshot.predictiveContentIdeationEngine.allIdeas.slice(0, 2)) {
    suggestions.push({
      id: `content-${item.id}`,
      source: 'Content',
      title: item.title,
      detail: item.idea,
      why: item.whyNow,
      confidence: item.confidence,
      command: item.askToPlanCommand,
      primaryLabel: 'Make plan',
      onPrimary: () => args.onConvertContentIdeationToPlan(item)
    });
  }

  for (const item of args.snapshot.workflowPredictionLayer.predictions.slice(0, 2)) {
    suggestions.push({
      id: `workflow-${item.id}`,
      source: 'Reusable plan',
      title: item.title,
      detail: item.suggestion,
      why: item.repeatedPattern,
      confidence: item.confidence,
      command: item.controls.saveCommand,
      primaryLabel: 'Save draft',
      onPrimary: () => args.onConvertWorkflowPredictionToPlan(item)
    });
  }

  for (const item of args.snapshot.platformActionCards.slice(0, 2)) {
    suggestions.push({
      id: `platform-${item.id}`,
      source: item.platform,
      title: item.title,
      detail: item.description,
      why: item.approvalRequirement,
      command: item.command,
      primaryLabel: 'Preview'
    });
  }

  for (const [index, guidance] of args.snapshot.expertOperator.operate.guidance.slice(0, 1).entries()) {
    suggestions.push({
      id: `ai-guidance-${index}`,
      source: 'AI recommendation',
      title: 'Next operating move',
      detail: guidance,
      why: 'Based on your current PLAN context and approval gates.',
      confidence: args.snapshot.expertOperator.operate.confidence,
      command: suggestionCommand('Next operating move', guidance),
      primaryLabel: 'Preview'
    });
  }

  return suggestions.slice(0, 6);
}

function averageConfidence(entries: Array<{ confidence: number }>): number {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((sum, item) => sum + item.confidence, 0) / entries.length);
}

function averageScore(entries: Array<{ score: number }>): number {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((sum, item) => sum + item.score, 0) / entries.length);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceTone(value: number): BoardTone {
  if (value >= 82) return 'success';
  if (value >= 66) return 'primary';
  if (value >= 48) return 'info';
  return 'warning';
}

function urgencyTone(urgency: string): BoardTone {
  if (urgency === 'critical') return 'danger';
  if (urgency === 'high') return 'warning';
  if (urgency === 'medium') return 'primary';
  return 'muted';
}

function firstUseful(values: string[], fallback: string): string {
  return values.find((value) => value.trim().length > 0) ?? fallback;
}

function buildMemoryGraphNodes(
  snapshot: MobileWorkspaceSnapshot,
  connectedPlatforms: string[],
  professionMode: ProfessionModeCopy
): MemoryGraphNode[] {
  const memory = snapshot.memoryContextEngine;
  const goals = memory.entriesByCategory.goals;
  const workflows = memory.entriesByCategory['preferred-workflows'];
  const behaviors = memory.entriesByCategory['behavioral-patterns'];
  const voice = memory.entriesByCategory['communication-style'];
  const timing = memory.entriesByCategory['scheduling-habits'];
  const approved = memory.entriesByCategory['approved-outputs'];
  const rejected = memory.entriesByCategory['rejected-outputs'];
  const platformConfidence = connectedPlatforms.length ? Math.min(92, 58 + connectedPlatforms.length * 7) : 36;

  const nodes: MemoryGraphNode[] = [
    {
      id: 'profession',
      label: professionMode.label,
      detail: snapshot.positioning || snapshot.primaryOffer || 'Profession context is still being shaped.',
      source: 'Profile + expert routing',
      confidence: snapshot.expertOperator.ask.confidence,
      tone: 'primary',
      influences: ['ASK routing', 'persona mode', 'surface priority']
    },
    {
      id: 'goals',
      label: 'Goals',
      detail: firstUseful(
        [...goals.map((item) => item.value), snapshot.focusMetric],
        'Add goals or a focus metric to sharpen predictions.'
      ),
      source: `${goals.length} memory item${goals.length === 1 ? '' : 's'}`,
      confidence: averageConfidence(goals) || (snapshot.focusMetric ? 62 : 34),
      tone: 'success',
      influences: ['opportunity radar', 'PLAN objectives', 'briefing priorities']
    },
    {
      id: 'workflows',
      label: 'Workflows',
      detail:
        snapshot.workflowPredictionLayer.predictions[0]?.repeatedPattern ||
        firstUseful(workflows.map((item) => item.label), 'Reusable workflow patterns are still learning.'),
      source: 'Workflow Prediction Layer',
      confidence: snapshot.workflowPredictionLayer.averageConfidence || averageConfidence(workflows),
      tone: 'info',
      influences: ['composer drafts', 'OPERATE sequencing', 'approval gates']
    },
    {
      id: 'content',
      label: 'Content',
      detail:
        snapshot.predictiveContentIdeationEngine.allIdeas[0]?.title ||
        snapshot.nextPublishingHint ||
        'Content and publishing signals will appear here as work accumulates.',
      source: `${snapshot.predictiveContentIdeationEngine.allIdeas.length} idea${snapshot.predictiveContentIdeationEngine.allIdeas.length === 1 ? '' : 's'}`,
      confidence: snapshot.predictiveContentIdeationEngine.averageConfidence || 52,
      tone: 'primary',
      influences: ['creator surface', 'publishing cadence', 'growth ideas']
    },
    {
      id: 'outreach',
      label: 'Outreach',
      detail:
        snapshot.outreachUrgencyTop[0]?.reason ||
        snapshot.opportunitiesToClose[0]?.reason ||
        'Outreach and relationship timing will strengthen with drafts, replies, and follow-ups.',
      source: `${snapshot.outreachDrafts} draft${snapshot.outreachDrafts === 1 ? '' : 's'} · ${snapshot.opportunities} opportunities`,
      confidence: averageScore(snapshot.outreachUrgencyTop) || averageScore(snapshot.opportunitiesToClose) || 50,
      tone: 'warning',
      influences: ['follow-up timing', 'pipeline actions', 'approval queue']
    },
    {
      id: 'platforms',
      label: 'Connected platforms',
      detail: connectedPlatforms.length
        ? connectedPlatforms.join(', ')
        : 'Connect tools to let platform activity inform ASK, PLAN, and OPERATE.',
      source: `${connectedPlatforms.length} visible source${connectedPlatforms.length === 1 ? '' : 's'}`,
      confidence: platformConfidence,
      tone: connectedPlatforms.length ? 'success' : 'muted',
      influences: ['platform actions', 'identity signals', 'operational receipts']
    },
    {
      id: 'behavior',
      label: 'Behavior patterns',
      detail:
        snapshot.behavioralIntelligenceEngine.patterns[0]?.label ||
        'Approvals, repeated work, ASK usage, and scheduling behavior become local patterns.',
      source: `${snapshot.behavioralIntelligenceEngine.patterns.length} pattern${snapshot.behavioralIntelligenceEngine.patterns.length === 1 ? '' : 's'}`,
      confidence: snapshot.behavioralIntelligenceEngine.averageConfidence || averageConfidence(behaviors),
      tone: 'info',
      influences: ['predicted next actions', 'time intelligence', 'reusable workflows']
    },
    {
      id: 'voice-trust',
      label: 'Voice + trust',
      detail: firstUseful(
        [
          ...voice.map((item) => item.value),
          ...approved.map((item) => item.value),
          rejected[0] ? `Avoids rejected output: ${rejected[0].value}` : ''
        ],
        'Approvals and rejected outputs will refine voice and trust controls.'
      ),
      source: `${approved.length} approved · ${rejected.length} rejected`,
      confidence: averageConfidence([...voice, ...approved, ...rejected]) || snapshot.activeDigitalTwin?.confidenceScore || 42,
      tone: rejected.length ? 'warning' : 'success',
      influences: ['ASK tone', 'VERIFY receipts', 'twin evolution']
    },
    {
      id: 'time',
      label: 'Operational time',
      detail:
        timing[0]?.value ||
        `${snapshot.reminderWindow}. ${snapshot.dueTodayTasks} due today, ${snapshot.missedTasks} missed.`,
      source: 'Scheduler + cadence',
      confidence: averageConfidence(timing) || (snapshot.dueTodayTasks || snapshot.missedTasks ? 64 : 48),
      tone: snapshot.missedTasks ? 'danger' : 'primary',
      influences: ['daily briefing', 'follow-up windows', 'campaign rhythm']
    }
  ];

  return nodes.map((node) => ({
    ...node,
    confidence: Math.max(0, Math.min(100, Math.round(node.confidence)))
  }));
}

function buildWorkspacePulseItems(
  snapshot: MobileWorkspaceSnapshot,
  suggestions: PlanBoardSuggestion[]
): WorkspacePulseItem[] {
  const dashboard = snapshot.predictiveOperationsDashboard;
  const items = [
    ...dashboard.operationalBottlenecks.slice(0, 2),
    ...dashboard.pendingApprovals.slice(0, 2),
    ...dashboard.nextBestActions.slice(0, 3),
    ...dashboard.platformInsights.slice(0, 2),
    ...dashboard.suggestedWorkflows.slice(0, 2)
  ];
  const seen = new Set<string>();
  const mapped = items
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      source: item.sourceLabel,
      confidence: item.confidence,
      urgency: item.urgency,
      tone: urgencyTone(item.urgency),
      command: item.command
    }));

  if (mapped.length) return mapped.slice(0, 6);

  return suggestions.slice(0, 4).map((item) => ({
    id: `pulse-${item.id}`,
    title: item.title,
    detail: item.detail,
    source: item.source,
    confidence: item.confidence ?? 52,
    urgency: 'low',
    tone: 'muted' as const,
    command: item.command
  }));
}

function buildTwinProgressIndicators(snapshot: MobileWorkspaceSnapshot): TwinProgressIndicator[] {
  const memory = snapshot.memoryContextEngine;
  const voiceConfidence =
    averageConfidence(memory.entriesByCategory['communication-style']) ||
    snapshot.activeDigitalTwin?.confidenceScore ||
    38;
  const approvalMemory = averageConfidence([
    ...memory.entriesByCategory['approved-outputs'],
    ...memory.entriesByCategory['rejected-outputs']
  ]);
  const expertAverage = averageConfidence([
    snapshot.expertOperator.ask,
    snapshot.expertOperator.plan,
    snapshot.expertOperator.operate
  ]);

  return [
    {
      label: 'Positioning confidence',
      value: snapshot.positioningIntelligence.averageConfidence || snapshot.activeDigitalTwin?.confidenceScore || 42,
      detail: 'Improves as profile facts, proof, audience, and connected evidence become clearer.',
      tone: confidenceTone(snapshot.positioningIntelligence.averageConfidence)
    },
    {
      label: 'Workflow intelligence',
      value: snapshot.workflowPredictionLayer.averageConfidence || 40,
      detail: 'Strengthens when repeated plans, approvals, tasks, and platform activity appear.',
      tone: confidenceTone(snapshot.workflowPredictionLayer.averageConfidence)
    },
    {
      label: 'Voice understanding',
      value: voiceConfidence,
      detail: 'Grounded in voice guide, approved memory, rejected output, and examples.',
      tone: confidenceTone(voiceConfidence)
    },
    {
      label: 'Operational specialization',
      value: expertAverage || snapshot.predictiveOperationsDashboard.liveScore,
      detail: `Currently tuned for ${snapshot.expertOperator.professionPath} / ${snapshot.expertOperator.workflowType.replace(/_/g, ' ')} work.`,
      tone: confidenceTone(expertAverage)
    },
    {
      label: 'Approval learning',
      value: approvalMemory || (snapshot.planPendingReviewCount ? 58 : 36),
      detail: 'Approvals and rejections teach the twin what to repeat, avoid, and verify.',
      tone: approvalMemory ? confidenceTone(approvalMemory) : 'warning'
    }
  ].map((item) => ({ ...item, value: Math.max(0, Math.min(100, Math.round(item.value))) }));
}

function buildContextualSurface(snapshot: MobileWorkspaceSnapshot): ContextualSurface {
  const text = [
    snapshot.positioning,
    snapshot.primaryOffer,
    snapshot.focusMetric,
    snapshot.activeDigitalTwin?.identity.professionalPositioning,
    ...(snapshot.activeDigitalTwin?.identity.goals ?? [])
  ]
    .join(' ')
    .toLowerCase();

  if (snapshot.expertOperator.professionPath === 'founder' || /fundrais|investor|seed|venture|capital/.test(text)) {
    return {
      title: 'Fundraising and founder operating surface',
      signal: 'Founder context detected from profession, goals, or positioning.',
      priorities: ['Investor outreach', 'Pitch generation', 'Warm follow-ups', 'Meeting prep'],
      nextActions: ['Draft investor sequence', 'Prepare proof-backed pitch points', 'Review follow-up timing'],
      tone: 'primary'
    };
  }

  if (
    snapshot.expertOperator.professionPath === 'creator' ||
    snapshot.predictiveContentIdeationEngine.allIdeas.length + snapshot.queuedPublishing > snapshot.outreachDrafts
  ) {
    return {
      title: 'Creator and content operating surface',
      signal: 'Content, publishing cadence, or creator-positioning signals are strongest.',
      priorities: ['Content pipeline', 'Publishing cadence', 'Sponsorship ideas', 'Audience engagement'],
      nextActions: ['Compose a content workflow', 'Convert a top idea into PLAN', 'Review best publishing window'],
      tone: 'success'
    };
  }

  if (snapshot.expertOperator.professionPath === 'recruiter' || /candidate|recruit|hiring|talent/.test(text)) {
    return {
      title: 'Recruiting and relationship operating surface',
      signal: 'Recruiting or candidate pipeline context is active.',
      priorities: ['Candidate outreach', 'Screening workflow', 'Interview prep', 'Follow-up cadence'],
      nextActions: ['Prioritize warm candidates', 'Draft screening sequence', 'Review scheduling density'],
      tone: 'info'
    };
  }

  if (snapshot.outreachUrgencyTop.length || snapshot.incompleteFollowUps > 0) {
    return {
      title: 'Outreach and pipeline operating surface',
      signal: 'Relationship movement, follow-ups, or opportunity close signals are active.',
      priorities: ['Follow-ups', 'Pipeline health', 'Outreach drafts', 'Approval-safe sends'],
      nextActions: ['Rank follow-ups by urgency', 'Draft next outreach move', 'Create a pipeline plan'],
      tone: 'warning'
    };
  }

  return {
    title: 'Adaptive workspace operating surface',
    signal: 'BrandOps is balancing ASK, PLAN, OPERATE, and VERIFY from current local context.',
    priorities: ['Daily briefing', 'Reusable workflows', 'Approvals', 'Memory transparency'],
    nextActions: ['Ask for a chief-of-staff briefing', 'Compose a workflow', 'Connect a platform'],
    tone: 'muted'
  };
}

function buildPersonaModes(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface,
  activePlanCount: number,
  scheduledCount: number,
  failedCount: number
): PersonaMode[] {
  const hasGrowth = snapshot.predictiveOpportunityLayer.suggestions.some((item) =>
    ['growth-opportunity', 'positioning-analysis', 'buyer-persona-generation'].includes(item.kind)
  );
  const overload = snapshot.missedTasks > 0 || scheduledCount > snapshot.maxDailyTasks;
  const outreachActive =
    snapshot.outreachUrgencyTop.length > 0 || snapshot.incompleteFollowUps > 0 || snapshot.outreachDrafts > 0;

  return [
    {
      name: 'Strategic Founder',
      active:
        snapshot.expertOperator.professionPath === 'founder' ||
        contextualSurface.title.toLowerCase().includes('founder'),
      priority: 'Positioning, investor motion, proof, and decisive operating cadence.',
      guidance: 'Suggestions emphasize growth bets, relationship leverage, and approved next actions.',
      tone: 'primary'
    },
    {
      name: 'Creator Operator',
      active: snapshot.expertOperator.professionPath === 'creator',
      priority: 'Content systems, audience growth, publishing rhythm, and monetization ideas.',
      guidance: 'Recommendations bias toward series, cadence, sponsor angles, and reusable content workflows.',
      tone: 'success'
    },
    {
      name: 'Growth Mode',
      active: hasGrowth,
      priority: 'Opportunities, positioning gaps, buyer clarity, and measurable experiments.',
      guidance: 'Radar items include expected impact and confidence before conversion into a plan.',
      tone: 'info'
    },
    {
      name: 'Deep Work Mode',
      active: overload,
      priority: 'Reduce overload, protect focus windows, and avoid reactive task stacking.',
      guidance: 'Time intelligence recommends safer sequencing before adding more commitments.',
      tone: overload ? 'warning' : 'muted'
    },
    {
      name: 'Outreach Sprint',
      active: outreachActive,
      priority: 'Warm follow-ups, replies, pipeline actions, and approval-gated messages.',
      guidance: 'The assistant drafts and schedules only after explicit preview and approval.',
      tone: 'warning'
    },
    {
      name: 'Planning Mode',
      active: activePlanCount > 0 || snapshot.planPendingReviewCount > 0 || failedCount > 0,
      priority: 'Turn intelligence into clear PLAN steps with approvals and receipts.',
      guidance: 'ASK output becomes structured operations before OPERATE can act.',
      tone: failedCount ? 'danger' : 'primary'
    }
  ];
}

function buildWorkflowComposerDrafts(
  snapshot: MobileWorkspaceSnapshot,
  connectedPlatforms: string[]
): WorkflowComposerDraft[] {
  const platformNames = connectedPlatforms.length ? connectedPlatforms : ['Workspace'];
  const predictions = snapshot.workflowPredictionLayer.predictions.slice(0, 3).map((workflow) => ({
    id: workflow.id,
    title: workflow.reusableTemplateName,
    trigger: workflow.triggerSignals.join(' · ') || workflow.repeatedPattern,
    steps: workflow.recommendedSteps,
    integrations: platformNames.slice(0, 4),
    approval: workflow.approvalGate,
    timeline: snapshot.cadenceHeadline || snapshot.reminderWindow,
    confidence: workflow.confidence,
    command: workflow.controls.templateCommand
  }));

  if (predictions.length) return predictions;

  return snapshot.predictiveOpportunityLayer.suggestions.slice(0, 2).map((suggestion) => ({
    id: `composer-${suggestion.id}`,
    title: `${suggestion.title} workflow`,
    trigger: suggestion.whyThisAppeared,
    steps: ['Clarify objective', 'Gather context', 'Draft output', 'Preview approval', 'Create receipt'],
    integrations: platformNames.slice(0, 4),
    approval: snapshot.predictiveOpportunityLayer.approvalPolicy,
    timeline: 'Review now, operate only after approval.',
    confidence: suggestion.confidence,
    command: suggestion.previewCommand
  }));
}

function buildExecutiveBriefingItems(
  snapshot: MobileWorkspaceSnapshot,
  suggestions: PlanBoardSuggestion[],
  sortedQueue: PulseTimelineRow[],
  failedCount: number,
  contextualSurface: ContextualSurface
): BriefingItem[] {
  const topPulse = snapshot.predictiveOperationsDashboard.nextBestActions[0];
  const topSuggestion = suggestions[0];
  return [
    {
      label: 'Priority',
      detail:
        snapshot.planPendingReviewCount > 0
          ? `${snapshot.planPendingReviewCount} approval${snapshot.planPendingReviewCount === 1 ? '' : 's'} need review before execution can move.`
          : topPulse?.title || topSuggestion?.title || contextualSurface.nextActions[0] || 'Review the workspace pulse.',
      tone: snapshot.planPendingReviewCount ? 'warning' : 'primary',
      command: topPulse?.command || topSuggestion?.command
    },
    {
      label: 'Risk',
      detail: failedCount
        ? `${failedCount} failed, rejected, or warning item${failedCount === 1 ? '' : 's'} should be resolved before retry.`
        : snapshot.missedTasks
          ? `${snapshot.missedTasks} missed task${snapshot.missedTasks === 1 ? '' : 's'} may need rescheduling.`
          : 'No urgent execution risk detected.',
      tone: failedCount || snapshot.missedTasks ? 'danger' : 'success'
    },
    {
      label: 'Next action',
      detail:
        topPulse?.detail ||
        topSuggestion?.why ||
        'Ask BrandOps to turn the active surface into a PLAN preview.',
      tone: topPulse ? urgencyTone(topPulse.urgency) : topSuggestion ? 'primary' : 'muted',
      command: topPulse?.command || topSuggestion?.command
    },
    {
      label: 'Timing',
      detail: sortedQueue[0]
        ? `${sortedQueue[0].title} is the soonest queued item (${compactTime(sortedQueue[0].sortKey)}).`
        : `${snapshot.reminderWindow}. No soonest queue item is active.`,
      tone: sortedQueue.length ? 'info' : 'muted'
    },
    {
      label: 'Context',
      detail: `${contextualSurface.title}: ${contextualSurface.signal}`,
      tone: contextualSurface.tone
    }
  ];
}

function buildTimeIntelligenceItems(
  snapshot: MobileWorkspaceSnapshot,
  sortedQueue: PulseTimelineRow[],
  scheduledCount: number
): BriefingItem[] {
  const timingPattern = snapshot.behavioralIntelligenceEngine.patterns.find(
    (pattern) => pattern.kind === 'operational-timing' || pattern.kind === 'scheduling'
  );
  const nextQueue = sortedQueue[0];
  return [
    {
      label: 'Rhythm',
      detail:
        timingPattern?.evidence.join(' ') ||
        `${snapshot.cadenceHeadline}. Workday ${snapshot.workdayStartHour}:00-${snapshot.workdayEndHour}:00.`,
      tone: timingPattern ? confidenceTone(timingPattern.confidence) : 'muted',
      command: snapshot.behavioralIntelligenceEngine.predictions.find(
        (prediction) => prediction.type === 'schedule-adjustment'
      )?.suggestedCommand
    },
    {
      label: 'Load',
      detail: `${scheduledCount} scheduled/due items against a daily capacity of ${snapshot.maxDailyTasks}.`,
      tone: scheduledCount > snapshot.maxDailyTasks ? 'warning' : scheduledCount ? 'info' : 'success'
    },
    {
      label: 'Follow-up window',
      detail: snapshot.incompleteFollowUps
        ? `${snapshot.incompleteFollowUps} follow-up${snapshot.incompleteFollowUps === 1 ? '' : 's'} are incomplete; review timing before new outreach.`
        : 'No incomplete follow-ups are visible right now.',
      tone: snapshot.incompleteFollowUps ? 'warning' : 'success'
    },
    {
      label: 'Publishing cadence',
      detail: snapshot.nextPublishingHint || 'No publishing window is currently queued.',
      tone: snapshot.nextPublishingHint ? 'primary' : 'muted'
    },
    {
      label: 'Soonest move',
      detail: nextQueue
        ? `${nextQueue.title}: ${nextQueue.subtitle}`
        : 'Nothing is queued; compose the next approved workflow when ready.',
      tone: nextQueue ? 'info' : 'muted'
    }
  ];
}

function buildAmbientSignals(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface,
  pulseItems: WorkspacePulseItem[],
  sortedQueue: PulseTimelineRow[]
): AmbientSignal[] {
  const topPulse = pulseItems[0];
  const timingPattern = snapshot.behavioralIntelligenceEngine.patterns.find(
    (pattern) => pattern.kind === 'operational-timing'
  );
  const platformActivity = snapshot.platformAwareAsk.recentActivity[0];

  return [
    {
      label: 'Adaptive focus',
      detail: contextualSurface.title,
      awareness: contextualSurface.signal,
      tone: contextualSurface.tone,
      command: suggestionCommand('Adaptive focus', contextualSurface.nextActions.join(' | '))
    },
    {
      label: 'Quiet urgency',
      detail: topPulse?.title || snapshot.predictiveOperationsDashboard.stateLine,
      awareness: topPulse
        ? `${topPulse.source} is ${topPulse.urgency} with ${topPulse.confidence}% confidence.`
        : 'No urgent pulse item is active.',
      tone: topPulse ? topPulse.tone : 'success',
      command: topPulse?.command
    },
    {
      label: 'Rhythm awareness',
      detail: timingPattern?.label || snapshot.cadenceHeadline,
      awareness: sortedQueue[0]
        ? `Next queued: ${sortedQueue[0].title} on ${compactTime(sortedQueue[0].sortKey)}.`
        : `${snapshot.reminderWindow}; no immediate queue pressure.`,
      tone: timingPattern ? confidenceTone(timingPattern.confidence) : 'muted'
    },
    {
      label: 'Platform presence',
      detail: platformActivity || `${snapshot.platformAwareAsk.connectedApps.length} connected apps visible.`,
      awareness:
        snapshot.platformAwareAsk.connectedApps.length > 0
          ? 'Connected context can shape suggestions without unsupported external actions.'
          : 'Connect platforms to expand ambient context.',
      tone: snapshot.platformAwareAsk.connectedApps.length ? 'info' : 'muted'
    }
  ];
}

function buildEnergyMetrics(args: {
  snapshot: MobileWorkspaceSnapshot;
  planCount: number;
  readyCount: number;
  inProgressCount: number;
  scheduledCount: number;
  failedCount: number;
  suggestionsCount: number;
}): EnergyMetric[] {
  const {
    snapshot,
    planCount,
    readyCount,
    inProgressCount,
    scheduledCount,
    failedCount,
    suggestionsCount
  } = args;
  const openExecution = inProgressCount + snapshot.planPendingReviewCount + scheduledCount;
  const executionGap = Math.max(0, readyCount + suggestionsCount - inProgressCount - snapshot.planPendingReviewCount);
  const contextSwitchRows =
    snapshot.platformAwareAsk.connectedApps.length +
    snapshot.unifiedOperationalInbox.items.length +
    snapshot.crossPlatformOperationalTimeline.items.length;
  const overload = scheduledCount + snapshot.missedTasks + snapshot.incompleteFollowUps;

  const rebalanceCommand = (label: string, detail: string) =>
    `ask: Rebalance my Operational Energy System for "${label}". Be calm and strategic. Do not mutate records or execute externally. Diagnose momentum, overload, execution gaps, workflow pressure, context switching, and the safest next PLAN step.\n\nContext: ${detail}`;

  return [
    {
      label: 'Operational momentum',
      value: clampPercent(42 + inProgressCount * 12 + readyCount * 6 + snapshot.planExecutionReceipts.length * 3 - failedCount * 10),
      state: openExecution > 0 ? 'moving' : 'quiet',
      detail: `${planCount} plans, ${inProgressCount} in progress, ${readyCount} ready, ${snapshot.planExecutionReceipts.length} receipts.`,
      recommendation: openExecution > 0 ? 'Keep momentum by clearing the next approval or receipt.' : 'Choose one plan to move from intent to execution.',
      tone: openExecution > 0 ? 'success' : 'muted',
      command: rebalanceCommand('Operational momentum', `${inProgressCount} in progress; ${readyCount} ready`)
    },
    {
      label: 'Overload pressure',
      value: clampPercent(overload * 12 + Math.max(0, scheduledCount - snapshot.maxDailyTasks) * 10),
      state: overload > snapshot.maxDailyTasks ? 'overloaded' : overload > 0 ? 'watching' : 'clear',
      detail: `${scheduledCount} scheduled/due, ${snapshot.missedTasks} missed, ${snapshot.incompleteFollowUps} incomplete follow-ups.`,
      recommendation:
        overload > snapshot.maxDailyTasks
          ? 'Minimize non-critical suggestions and recover the schedule before adding new work.'
          : 'Maintain a calm queue and avoid stacking unnecessary commitments.',
      tone: overload > snapshot.maxDailyTasks ? 'warning' : overload > 0 ? 'info' : 'success',
      command: rebalanceCommand('Overload pressure', `${scheduledCount} scheduled; ${snapshot.maxDailyTasks} daily capacity`)
    },
    {
      label: 'Execution gap',
      value: clampPercent(executionGap * 16),
      state: executionGap > 3 ? 'over-planning' : executionGap > 0 ? 'needs conversion' : 'balanced',
      detail: `${executionGap} more ready/suggested items than active execution lanes.`,
      recommendation:
        executionGap > 0
          ? 'Convert one high-confidence item into an approval-gated next action.'
          : 'Planning and execution are currently aligned.',
      tone: executionGap > 3 ? 'warning' : executionGap > 0 ? 'primary' : 'success',
      command: rebalanceCommand('Execution gap', `${executionGap} execution gap`)
    },
    {
      label: 'Workflow pressure',
      value: clampPercent(
        snapshot.workflowPredictionLayer.predictions.length * 12 +
          snapshot.behavioralIntelligenceEngine.predictions.length * 8
      ),
      state: snapshot.workflowPredictionLayer.predictions.length ? 'repeatable patterns' : 'learning',
      detail: `${snapshot.workflowPredictionLayer.predictions.length} reusable workflow suggestions and ${snapshot.behavioralIntelligenceEngine.predictions.length} behavioral predictions.`,
      recommendation: 'Save repeatable workflows only when they reduce future decision load.',
      tone: snapshot.workflowPredictionLayer.predictions.length ? 'primary' : 'muted',
      command: snapshot.workflowPredictionLayer.predictions[0]?.controls.saveCommand
    },
    {
      label: 'Context switching',
      value: clampPercent(contextSwitchRows * 3),
      state: contextSwitchRows > 18 ? 'fragmented' : contextSwitchRows > 8 ? 'active' : 'contained',
      detail: `${contextSwitchRows} cross-surface rows across platforms, inbox, and timeline.`,
      recommendation:
        contextSwitchRows > 18
          ? 'Use Deep Work Mode to collapse non-critical surfaces around one objective.'
          : 'Keep ambient awareness visible without expanding every surface.',
      tone: contextSwitchRows > 18 ? 'warning' : contextSwitchRows > 8 ? 'info' : 'success',
      command: rebalanceCommand('Context switching', `${contextSwitchRows} context rows`)
    }
  ];
}

function simulationCommand(input: StrategicSimulation): string {
  return `ask: Run Strategic Simulation Mode for this scenario. Use profession-aware experts, memory context, connected-platform context, behavioral patterns, and current operating state. Return a structured forecast, likely outcomes, risks, dependencies, bottlenecks, confidence, and approval-gated operational suggestions. Do not execute externally or mutate records.\n\nScenario: ${input.question}\nInitial forecast: ${input.forecast}\nKnown risks: ${input.risks.join(' | ')}\nDependencies: ${input.dependencies.join(' | ')}`;
}

function buildStrategicSimulations(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface
): StrategicSimulation[] {
  const creatorConfidence = snapshot.predictiveContentIdeationEngine.averageConfidence || 56;
  const outreachConfidence =
    averageScore(snapshot.outreachUrgencyTop) ||
    snapshot.predictiveOpportunityLayer.suggestions.find((item) => item.kind === 'outreach-opportunity')?.confidence ||
    54;
  const positioningConfidence = snapshot.positioningIntelligence.averageConfidence || 52;
  const scaleConfidence = snapshot.predictiveOperationsDashboard.liveScore;
  const drafts: Omit<StrategicSimulation, 'command'>[] = [
    {
      id: 'simulate-creator-growth',
      question: 'What happens if I focus on creator growth for 30 days?',
      forecast:
        'A focused content cadence should improve positioning clarity and audience learning if publishing, feedback, and repurposing stay consistent.',
      risks: ['Publishing load may exceed current rhythm', 'Audience signal may lag content volume'],
      dependencies: ['Clear content themes', 'Reusable content pipeline', 'Reviewable publishing windows'],
      suggestion: contextualSurface.title.includes('Creator')
        ? 'Use the active creator surface as the simulation baseline.'
        : 'Simulate creator growth as a strategic branch before changing the workspace focus.',
      confidence: creatorConfidence
    },
    {
      id: 'simulate-outreach-conversion',
      question: 'What outreach strategy is most likely to convert?',
      forecast:
        'Warm, proof-backed follow-ups are likely to outperform broad outbound when relationship and timing signals are visible.',
      risks: ['Over-contacting warm leads', 'Sending before message approval', 'Weak proof alignment'],
      dependencies: ['Outreach history', 'Follow-up timing', 'Approved voice and offer memory'],
      suggestion: 'Compare warm reconnect, founder intro, and direct value-offer sequences.',
      confidence: outreachConfidence
    },
    {
      id: 'simulate-content-positioning',
      question: 'What content direction aligns best with my positioning?',
      forecast:
        'The strongest direction should connect current positioning, proof points, audience segments, and content backlog patterns.',
      risks: ['Content may drift from offer', 'Too many themes may dilute positioning'],
      dependencies: ['Positioning statement', 'Audience evidence', 'Approved claims and rejected phrases'],
      suggestion: 'Forecast 2-3 content lanes, then convert the strongest lane into PLAN.',
      confidence: positioningConfidence
    },
    {
      id: 'simulate-operational-scale',
      question: 'What bottlenecks will emerge if I scale this operating rhythm?',
      forecast:
        'Approvals, follow-ups, and scheduling density are the likely first constraints before platform execution becomes the bottleneck.',
      risks: ['Approval backlog', 'Missed follow-ups', 'Context switching across surfaces'],
      dependencies: ['Human review capacity', 'Workflow templates', 'Connected platform reliability'],
      suggestion: 'Stress-test the current plan count, approvals, and daily capacity before adding new loops.',
      confidence: scaleConfidence
    }
  ];

  return drafts.map((draft) => {
    const full = { ...draft, command: '' };
    return { ...full, command: simulationCommand(full) };
  });
}

function buildTwinEcosystem(snapshot: MobileWorkspaceSnapshot, connectedPlatforms: string[]): TwinEcosystemMember[] {
  const activeTwin = snapshot.activeDigitalTwin;
  const baseConfidence = activeTwin?.confidenceScore ?? 38;
  const creatorReady = snapshot.expertOperator.professionPath === 'creator' || snapshot.predictiveContentIdeationEngine.allIdeas.length > 0;
  const founderReady = snapshot.expertOperator.professionPath === 'founder' || /founder|investor|fundrais/i.test(snapshot.positioning);
  const salesReady = snapshot.outreachDrafts > 0 || snapshot.opportunities > 0;
  const recruitingReady = snapshot.expertOperator.professionPath === 'recruiter';
  const brandReady = snapshot.positioningIntelligence.averageConfidence > 0 || snapshot.memoryContextEngine.entriesByCategory.preferences.length > 0;

  const members: TwinEcosystemMember[] = [
    {
      role: 'Founder Twin',
      status: founderReady ? 'active' : 'proposed',
      contribution: 'Strategic goals, investor narrative, growth bets, and operating cadence.',
      collaboratesWith: ['Sales Twin', 'Brand Twin'],
      confidence: founderReady ? Math.max(baseConfidence, snapshot.expertOperator.plan.confidence) : 42,
      tone: founderReady ? 'primary' : 'muted'
    },
    {
      role: 'Creator Twin',
      status: creatorReady ? 'ready' : 'proposed',
      contribution: 'Content lanes, publishing rhythm, audience learning, and sponsorship ideas.',
      collaboratesWith: ['Brand Twin', 'Sales Twin'],
      confidence: creatorReady ? snapshot.predictiveContentIdeationEngine.averageConfidence || 62 : 40,
      tone: creatorReady ? 'success' : 'muted'
    },
    {
      role: 'Sales Twin',
      status: salesReady ? 'ready' : 'proposed',
      contribution: 'Outreach strategy, follow-up timing, pipeline movement, and conversion plans.',
      collaboratesWith: ['Founder Twin', 'Brand Twin'],
      confidence: salesReady ? averageScore(snapshot.outreachUrgencyTop) || 60 : 38,
      tone: salesReady ? 'warning' : 'muted'
    },
    {
      role: 'Recruiting Twin',
      status: recruitingReady ? 'ready' : 'proposed',
      contribution: 'Candidate communication, screening flow, interview prep, and scheduling.',
      collaboratesWith: ['Brand Twin'],
      confidence: recruitingReady ? snapshot.expertOperator.ask.confidence : 34,
      tone: recruitingReady ? 'info' : 'muted'
    },
    {
      role: 'Brand Twin',
      status: brandReady || connectedPlatforms.length ? 'ready' : 'proposed',
      contribution: 'Positioning, voice memory, proof, approved claims, and trust boundaries.',
      collaboratesWith: ['Founder Twin', 'Creator Twin', 'Sales Twin'],
      confidence: brandReady ? snapshot.positioningIntelligence.averageConfidence || baseConfidence : 40,
      tone: brandReady ? 'primary' : 'muted'
    }
  ];

  return members.map((member) => ({ ...member, confidence: clampPercent(member.confidence) }));
}

function buildAutonomousDrafts(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface,
  sortedQueue: PulseTimelineRow[]
): AutonomousDraft[] {
  const drafts: AutonomousDraft[] = [];
  const followUp = snapshot.predictiveOpportunityLayer.suggestions.find(
    (item) => item.kind === 'follow-up-suggestion' || item.kind === 'outreach-opportunity'
  );
  if (followUp) {
    drafts.push({
      id: `draft-${followUp.id}`,
      title: 'Follow-up or outreach sequence',
      type: 'outreach',
      preparedBecause: followUp.whyThisAppeared,
      reviewNeed: 'Review recipient, message, timing, and proof before any send.',
      confidence: followUp.confidence,
      command: followUp.previewCommand
    });
  }

  const content = snapshot.predictiveContentIdeationEngine.allIdeas[0];
  if (content) {
    drafts.push({
      id: `draft-content-${content.id}`,
      title: content.title,
      type: 'content outline',
      preparedBecause: content.whyNow,
      reviewNeed: 'Review angle, voice, claim strength, and publishing window.',
      confidence: content.confidence,
      command: content.askToPlanCommand
    });
  }

  const workflow = snapshot.workflowPredictionLayer.predictions[0];
  if (workflow) {
    drafts.push({
      id: `draft-workflow-${workflow.id}`,
      title: workflow.reusableTemplateName,
      type: 'workflow continuation',
      preparedBecause: workflow.repeatedPattern,
      reviewNeed: 'Review steps and approval gates before saving or reusing.',
      confidence: workflow.confidence,
      command: workflow.controls.reuseCommand
    });
  }

  if (sortedQueue[0]) {
    drafts.push({
      id: `draft-meeting-${sortedQueue[0].id}`,
      title: 'Meeting or task prep packet',
      type: 'meeting prep',
      preparedBecause: `${sortedQueue[0].title} is next in the operating queue.`,
      reviewNeed: 'Review context, desired outcome, agenda, and follow-up rules.',
      confidence: 64,
      command: workspaceQueueCommandLine(sortedQueue[0])
    });
  }

  if (!drafts.length) {
    drafts.push({
      id: 'draft-contextual-plan',
      title: `${contextualSurface.title} starter draft`,
      type: 'planning draft',
      preparedBecause: contextualSurface.signal,
      reviewNeed: 'Review objective, dependencies, and approval requirements before converting.',
      confidence: 48,
      command: suggestionCommand(contextualSurface.title, contextualSurface.nextActions.join(' | '))
    });
  }

  return drafts.slice(0, 4);
}

function buildBrainSignals(
  snapshot: MobileWorkspaceSnapshot,
  energyMetrics: EnergyMetric[],
  contextualSurface: ContextualSurface
): BrainSignal[] {
  const topEnergy = [...energyMetrics].sort((a, b) => b.value - a.value)[0];
  const signals: BrainSignal[] = [
    {
      label: 'Recommendation priority',
      detail: snapshot.predictiveOperationsDashboard.nextBestActions[0]?.title || contextualSurface.nextActions[0],
      source: 'Predictive Operations + context surface',
      priority: snapshot.predictiveOperationsDashboard.liveScore,
      tone: 'primary'
    },
    {
      label: 'Pattern detection',
      detail: snapshot.behavioralIntelligenceEngine.headline,
      source: 'Behavioral Intelligence Engine',
      priority: snapshot.behavioralIntelligenceEngine.averageConfidence,
      tone: confidenceTone(snapshot.behavioralIntelligenceEngine.averageConfidence)
    },
    {
      label: 'Expert routing',
      detail: `${snapshot.expertOperator.professionPath} / ${snapshot.expertOperator.workflowType.replace(/_/g, ' ')} via ${snapshot.expertOperator.generatedUsing.join(', ') || 'general experts'}.`,
      source: 'Routing experts',
      priority: averageConfidence([
        snapshot.expertOperator.ask,
        snapshot.expertOperator.plan,
        snapshot.expertOperator.operate
      ]),
      tone: 'info'
    },
    {
      label: 'Memory continuity',
      detail: snapshot.memoryContextEngine.headline,
      source: snapshot.memoryContextEngine.persistentStore,
      priority: snapshot.memoryContextEngine.averageConfidence,
      tone: confidenceTone(snapshot.memoryContextEngine.averageConfidence)
    },
    {
      label: 'Energy rebalance',
      detail: topEnergy
        ? `${topEnergy.label}: ${topEnergy.recommendation}`
        : 'Operational energy is stable.',
      source: 'Operational Energy System',
      priority: topEnergy?.value ?? 40,
      tone: topEnergy?.tone ?? 'muted'
    }
  ];

  return signals.map((signal) => ({ ...signal, priority: clampPercent(signal.priority) }));
}

function buildSearchLenses(snapshot: MobileWorkspaceSnapshot): SearchLens[] {
  const commandForLens = (scope: string, intent: string, coverage: string) =>
    `ask: Search my BrandOps workspace semantically for "${intent}". Search across ${scope}. Use profession, active goals, memory, approvals, drafts, opportunities, connected platform context, conversations, and timelines where available. Return operationally useful matches, why each matters, suggested next action, confidence, and approval requirements. Do not mutate records.\n\nCoverage visible now: ${coverage}`;

  const lenses = [
    {
      scope: 'plans and workflows',
      intent: 'find the next plan or reusable workflow I should act on',
      coverage: `${snapshot.workflowPredictionLayer.predictions.length} workflow predictions · ${snapshot.predictiveOperationsDashboard.suggestedWorkflows.length} suggested workflows`,
      tone: 'primary' as const
    },
    {
      scope: 'approvals, receipts, and VERIFY timeline',
      intent: 'find anything waiting for approval or trust review',
      coverage: `${snapshot.planPendingReviewCount} pending approvals · ${snapshot.planExecutionReceipts.length} receipts`,
      tone: snapshot.planPendingReviewCount ? 'warning' as const : 'success' as const
    },
    {
      scope: 'memory, goals, and conversations',
      intent: 'find the memory that is influencing current recommendations',
      coverage: `${snapshot.memoryContextEngine.entries.length} memory entries · ${snapshot.memoryTraceSummary.bundleCount} ASK trace bundles`,
      tone: 'info' as const
    },
    {
      scope: 'opportunities, outreach, content, and platforms',
      intent: 'find growth opportunities hidden in current operations',
      coverage: `${snapshot.predictiveOpportunityLayer.totalCount} radar opportunities · ${snapshot.platformAwareAsk.connectedApps.length} connected apps`,
      tone: 'success' as const
    }
  ];

  return lenses.map((lens) => ({
    ...lens,
    command: commandForLens(lens.scope, lens.intent, lens.coverage)
  }));
}

function buildDeepWorkState(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface,
  energyMetrics: EnergyMetric[],
  sortedQueue: PulseTimelineRow[]
): DeepWorkState {
  const overloaded = energyMetrics.some(
    (metric) =>
      (metric.label === 'Overload pressure' || metric.label === 'Context switching') && metric.value >= 60
  );
  const executionGap = energyMetrics.find((metric) => metric.label === 'Execution gap');
  const active = overloaded || snapshot.missedTasks > 0 || (executionGap?.value ?? 0) >= 48;
  const objective =
    contextualSurface.nextActions[0] ||
    snapshot.predictiveOperationsDashboard.nextBestActions[0]?.title ||
    'Choose one operational objective';
  const simplifiedTimeline = sortedQueue.length
    ? sortedQueue
        .slice(0, 3)
        .map((row) => `${row.title} (${compactTime(row.sortKey)})`)
        .join(' -> ')
    : 'No active queue; protect one focused execution block.';

  return {
    active,
    objective,
    minimizedNoise: [
      'non-critical platform activity',
      'low-confidence suggestions',
      'secondary workflow ideas'
    ],
    elevatedPriorities: [
      objective,
      snapshot.planPendingReviewCount ? 'clear approval bottlenecks' : 'advance one execution step',
      snapshot.missedTasks ? 'recover missed commitments' : 'preserve operating rhythm'
    ],
    simplifiedTimeline,
    command: `ask: Enter Deep Work Mode for this objective. Reduce noise, elevate critical priorities, simplify timeline, and produce an execution-focused PLAN preview. Do not mutate records or execute externally.\n\nObjective: ${objective}\nContext: ${contextualSurface.signal}\nTimeline: ${simplifiedTimeline}`,
    tone: active ? 'primary' : 'muted'
  };
}

function buildOperatingTimelineEvents(
  snapshot: MobileWorkspaceSnapshot,
  pulseItems: WorkspacePulseItem[],
  composerDrafts: WorkflowComposerDraft[],
  autonomousDrafts: AutonomousDraft[]
): OperatingTimelineEvent[] {
  const events: OperatingTimelineEvent[] = [];
  const push = (event: OperatingTimelineEvent) => {
    events.push(event);
  };

  for (const event of snapshot.recentOperatingTimelineEvents.slice(0, 8)) {
    push({
      id: `persisted-${event.id}`,
      label: event.title,
      detail: `${event.detail} Source: ${event.source}.`,
      category: event.category.replace(/-/g, ' '),
      at: event.at,
      tone: event.tone,
      command: event.replayCommand
    });
  }

  for (const artifact of snapshot.recentAiCoreArtifacts.slice(0, 4)) {
    push({
      id: `ai-core-${artifact.id}`,
      label: artifact.title,
      detail: `${artifact.type} captured in the AI work ledger with ${artifact.confidenceScore}% confidence.`,
      category: artifact.status,
      at: artifact.createdAt,
      tone: artifact.status === 'rejected' ? 'danger' : artifact.status === 'approved' ? 'success' : 'primary',
      command: `ask: Replay this AI work ledger artifact as part of my operating memory timeline. Explain source facts, experts used, approval status, next actions, and strategic meaning.\n\nArtifact: ${artifact.title}\nType: ${artifact.type}\nContent: ${artifact.content.slice(0, 1200)}`
    });
  }

  for (const item of snapshot.planPendingReviewPeek.slice(0, 3)) {
    push({
      id: `approval-${item.id}`,
      label: item.verb,
      detail: item.preview || 'Approval item waiting for review.',
      category: 'approval',
      at: item.at,
      tone: 'warning',
      command: approvalPrompt('Replay this approval decision', item)
    });
  }

  for (const receipt of snapshot.planExecutionReceipts.slice(0, 3)) {
    push({
      id: `receipt-${receipt.id}`,
      label: receipt.action,
      detail: receipt.reasoningSummary,
      category: receipt.executionStatus,
      at: receipt.startedAt,
      tone: receiptTone(receipt.executionStatus),
      command: receiptPreviewCommand(receipt)
    });
  }

  for (const event of snapshot.crossPlatformOperationalTimeline.items.slice(0, 3)) {
    push({
      id: `timeline-${event.id}`,
      label: event.whatHappened,
      detail: `${event.whereItHappened}: ${event.whatAiDid}`,
      category: event.kind,
      at: event.at,
      tone: timelineTone(event),
      command: event.command
    });
  }

  for (const [index, item] of pulseItems.slice(0, 2).entries()) {
    push({
      id: `recommendation-${item.id}`,
      label: item.title,
      detail: item.detail,
      category: 'AI recommendation',
      at: new Date(Date.now() - index * 60_000).toISOString(),
      tone: item.tone,
      command: item.command
    });
  }

  for (const draft of autonomousDrafts.slice(0, 2)) {
    push({
      id: `prepared-${draft.id}`,
      label: draft.title,
      detail: `Prepared ahead: ${draft.preparedBecause}`,
      category: draft.type,
      at: new Date().toISOString(),
      tone: 'info',
      command: draft.command
    });
  }

  for (const workflow of composerDrafts.slice(0, 2)) {
    push({
      id: `workflow-${workflow.id}`,
      label: workflow.title,
      detail: `Workflow evolution: ${workflow.trigger}`,
      category: 'workflow evolution',
      at: new Date().toISOString(),
      tone: confidenceTone(workflow.confidence),
      command: workflow.command
    });
  }

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);
}

function buildOperationalGraphIntelligence(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface,
  connectedPlatforms: string[]
): { nodes: OperationalGraphNode[]; edges: OperationalGraphEdge[] } {
  const rawNodes: OperationalGraphNode[] = [
    {
      id: 'operator',
      label: snapshot.operatorName || 'Workspace operator',
      kind: 'person',
      detail: snapshot.positioning || 'Professional identity is still being refined.',
      strength: snapshot.activeDigitalTwin?.confidenceScore ?? 42,
      tone: 'primary'
    },
    {
      id: 'goals',
      label: 'Active goals',
      kind: 'goals',
      detail: snapshot.focusMetric || contextualSurface.signal,
      strength: snapshot.memoryContextEngine.entriesByCategory.goals.length ? 72 : 44,
      tone: contextualSurface.tone
    },
    {
      id: 'workflows',
      label: 'Workflows',
      kind: 'workflow',
      detail:
        snapshot.workflowPredictionLayer.predictions[0]?.title ||
        'Workflow suggestions will strengthen as repeated operations appear.',
      strength: snapshot.workflowPredictionLayer.averageConfidence || 40,
      tone: 'info'
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      kind: 'opportunity',
      detail:
        snapshot.predictiveOpportunityLayer.suggestions[0]?.title ||
        `${snapshot.activeOpportunities} active opportunities`,
      strength:
        snapshot.predictiveOpportunityLayer.averageConfidence ||
        Math.min(70, snapshot.pipelineProjection.activeDealCount * 15),
      tone: 'success'
    },
    {
      id: 'content',
      label: 'Content',
      kind: 'content',
      detail:
        snapshot.predictiveContentIdeationEngine.allIdeas[0]?.title ||
        `${snapshot.publishingQueue} content assets`,
      strength: snapshot.predictiveContentIdeationEngine.averageConfidence || 48,
      tone: 'primary'
    },
    {
      id: 'outreach',
      label: 'Outreach',
      kind: 'outreach',
      detail:
        snapshot.outreachUrgencyTop[0]?.label ||
        `${snapshot.outreachDrafts} drafts and ${snapshot.incompleteFollowUps} follow-ups`,
      strength: averageScore(snapshot.outreachUrgencyTop) || 46,
      tone: 'warning'
    },
    {
      id: 'time',
      label: 'Tasks + meetings',
      kind: 'time',
      detail: `${snapshot.dueTodayTasks} due today, ${snapshot.missedTasks} missed, ${snapshot.cockpitSchedulerTaskPeek.length} visible tasks.`,
      strength: snapshot.missedTasks ? 72 : snapshot.dueTodayTasks ? 64 : 38,
      tone: snapshot.missedTasks ? 'danger' : snapshot.dueTodayTasks ? 'info' : 'muted'
    },
    {
      id: 'approvals',
      label: 'Approvals',
      kind: 'approval',
      detail: `${snapshot.planPendingReviewCount} pending decisions`,
      strength: snapshot.planPendingReviewCount ? 82 : 32,
      tone: snapshot.planPendingReviewCount ? 'warning' : 'success'
    },
    {
      id: 'platforms',
      label: 'Connected platforms',
      kind: 'platform',
      detail: connectedPlatforms.length ? connectedPlatforms.join(', ') : 'Workspace-only context',
      strength: connectedPlatforms.length ? Math.min(92, 52 + connectedPlatforms.length * 8) : 30,
      tone: connectedPlatforms.length ? 'info' : 'muted'
    }
  ];
  const nodes = rawNodes.map((node) => ({ ...node, strength: clampPercent(node.strength) }));

  const edges: OperationalGraphEdge[] = [
    { from: 'operator', to: 'goals', label: 'drives' },
    { from: 'goals', to: 'workflows', label: 'shapes' },
    { from: 'workflows', to: 'approvals', label: 'requires' },
    { from: 'opportunities', to: 'outreach', label: 'activates' },
    { from: 'content', to: 'opportunities', label: 'creates demand' },
    { from: 'time', to: 'workflows', label: 'constrains' },
    { from: 'platforms', to: 'outreach', label: 'informs' },
    { from: 'approvals', to: 'operator', label: 'teaches memory' }
  ];

  return { nodes, edges };
}

function buildStrategicReflections(
  snapshot: MobileWorkspaceSnapshot,
  energyMetrics: EnergyMetric[],
  contextualSurface: ContextualSurface
): StrategicReflection[] {
  const executionGap = energyMetrics.find((metric) => metric.label === 'Execution gap');
  const overload = energyMetrics.find((metric) => metric.label === 'Overload pressure');
  const timingPattern = snapshot.behavioralIntelligenceEngine.patterns.find(
    (pattern) => pattern.kind === 'operational-timing'
  );
  const contentSignal = snapshot.predictiveContentIdeationEngine.allIdeas[0];
  const workflow = snapshot.workflowPredictionLayer.predictions[0];

  const reflections: StrategicReflection[] = [
    {
      id: 'reflection-planning-execution',
      insight:
        executionGap && executionGap.value >= 48
          ? 'You are planning faster than you are moving work through approval and execution.'
          : 'Planning and execution are close to balanced right now.',
      evidence: executionGap?.detail || 'No execution gap signal is active.',
      recommendation:
        executionGap && executionGap.value >= 48
          ? 'Pick one high-confidence plan, approve the next gate, and defer lower-confidence suggestions.'
          : 'Keep using PLAN to preserve execution clarity.',
      tone: executionGap && executionGap.value >= 48 ? 'warning' : 'success',
      command: suggestionCommand('Strategic reflection: planning to execution', executionGap?.detail || contextualSurface.signal)
    },
    {
      id: 'reflection-overload',
      insight:
        overload && overload.value >= 60
          ? 'Operational pressure is high enough that more suggestions may create drag.'
          : 'Operational load is manageable; keep the surface calm.',
      evidence: overload?.detail || 'No overload signal is active.',
      recommendation:
        overload && overload.value >= 60
          ? 'Use Deep Work Mode or reduce the queue before adding new workflows.'
          : 'Let ambient intelligence surface only the strongest next action.',
      tone: overload && overload.value >= 60 ? 'warning' : 'muted',
      command: suggestionCommand('Strategic reflection: operational load', overload?.detail || contextualSurface.signal)
    }
  ];

  if (timingPattern) {
    reflections.push({
      id: 'reflection-timing',
      insight: `Your operational timing clusters around ${timingPattern.label.replace(/^Operational timing cluster around /, '')}.`,
      evidence: timingPattern.evidence.join(' '),
      recommendation: 'Use this rhythm for follow-ups, reviews, and focused execution windows.',
      tone: confidenceTone(timingPattern.confidence),
      command: snapshot.behavioralIntelligenceEngine.predictions.find(
        (prediction) => prediction.type === 'schedule-adjustment'
      )?.suggestedCommand || suggestionCommand('Strategic timing reflection', timingPattern.evidence.join(' | '))
    });
  }

  if (contentSignal) {
    reflections.push({
      id: 'reflection-content-positioning',
      insight: 'Your content direction should stay anchored to positioning and audience proof.',
      evidence: `${contentSignal.title}: ${contentSignal.whyNow}`,
      recommendation: 'Convert the strongest content signal into a reviewed PLAN before expanding more themes.',
      tone: confidenceTone(contentSignal.confidence),
      command: contentSignal.askToPlanCommand
    });
  }

  if (workflow) {
    reflections.push({
      id: 'reflection-repeat-workflow',
      insight: 'You repeat similar workflows often enough to consider a reusable operating pattern.',
      evidence: workflow.repeatedPattern,
      recommendation: 'Save a workflow draft with approvals instead of automating it immediately.',
      tone: confidenceTone(workflow.confidence),
      command: workflow.controls.saveCommand
    });
  }

  return reflections.slice(0, 5);
}

function buildAdaptiveLayoutState(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface,
  deepWorkState: DeepWorkState,
  energyMetrics: EnergyMetric[]
): AdaptiveLayoutState {
  const outreachActive =
    snapshot.outreachUrgencyTop.length > 0 || snapshot.incompleteFollowUps > 0 || snapshot.outreachDrafts > 0;
  const creatorActive =
    snapshot.expertOperator.professionPath === 'creator' ||
    snapshot.predictiveContentIdeationEngine.allIdeas.length > snapshot.outreachDrafts;
  const founderActive =
    snapshot.expertOperator.professionPath === 'founder' ||
    /fundrais|investor|founder/i.test(`${snapshot.positioning} ${snapshot.focusMetric}`);
  const planningPressure = (energyMetrics.find((metric) => metric.label === 'Execution gap')?.value ?? 0) > 40;

  if (deepWorkState.active) {
    return {
      name: 'Deep Work layout',
      reason: 'Execution pressure or overload suggests collapsing the workspace around one objective.',
      elevatedSurfaces: ['Deep Work Mode', 'Approvals', 'Operational Time', 'AI work ledger'],
      minimizedSurfaces: ['Low-confidence suggestions', 'Secondary platform activity', 'Exploratory simulations'],
      tone: 'primary'
    };
  }
  if (founderActive) {
    return {
      name: 'Founder Fundraising layout',
      reason: 'Founder/fundraising signals are active in profession, goals, or positioning.',
      elevatedSurfaces: ['Opportunity Radar', 'Outreach', 'Pitch/positioning', 'Meeting prep'],
      minimizedSurfaces: ['Generic dashboards', 'Unrelated content ideas', 'Low-priority tasks'],
      tone: 'primary'
    };
  }
  if (creatorActive) {
    return {
      name: 'Creator Publishing layout',
      reason: 'Content and audience cadence signals are strongest.',
      elevatedSurfaces: ['Content pipeline', 'Publishing cadence', 'Audience hooks', 'Sponsor opportunities'],
      minimizedSurfaces: ['Pipeline-only views', 'Unrelated admin work', 'Raw metrics blocks'],
      tone: 'success'
    };
  }
  if (outreachActive) {
    return {
      name: 'Outreach Sprint layout',
      reason: 'Follow-up, outreach, or relationship movement needs attention.',
      elevatedSurfaces: ['Warm follow-ups', 'Draft review', 'Pipeline context', 'Timing intelligence'],
      minimizedSurfaces: ['Exploratory strategy', 'Non-critical content', 'Long audit lists'],
      tone: 'warning'
    };
  }
  if (planningPressure) {
    return {
      name: 'Planning Focus layout',
      reason: 'Planning volume is outpacing active execution.',
      elevatedSurfaces: ['PLAN cards', 'Approval gates', 'Workflow Composer', 'Receipts'],
      minimizedSurfaces: ['New idea intake', 'Optional simulations', 'Disconnected suggestions'],
      tone: 'info'
    };
  }
  return {
    name: 'Personal Operating System layout',
    reason: contextualSurface.signal,
    elevatedSurfaces: ['Command Center', 'Memory Timeline', 'Workspace coordination', 'Next best action'],
    minimizedSurfaces: ['Static dashboards', 'Duplicate panels', 'Unsupported actions'],
    tone: contextualSurface.tone
  };
}

function buildIntelligenceScores(
  snapshot: MobileWorkspaceSnapshot,
  energyMetrics: EnergyMetric[],
  timelineEvents: OperatingTimelineEvent[]
): IntelligenceScore[] {
  const approvalsTotal =
    snapshot.planPendingReviewCount +
    snapshot.planExecutionReceipts.filter((receipt) => receipt.approvals.length > 0).length;
  const approvedReceipts = snapshot.planExecutionReceipts.filter((receipt) =>
    receipt.approvals.some((approval) => /approved|recorded|generated/i.test(approval))
  ).length;
  const executionMomentum = energyMetrics.find((metric) => metric.label === 'Operational momentum')?.value ?? 42;
  const executionGap = energyMetrics.find((metric) => metric.label === 'Execution gap')?.value ?? 0;
  const bottleneckPressure = snapshot.predictiveOperationsDashboard.operationalBottlenecks.length;

  return [
    {
      label: 'Workflow consistency',
      value: clampPercent(snapshot.workflowPredictionLayer.averageConfidence || timelineEvents.length * 6),
      interpretation: 'How clearly repeatable operating patterns are emerging.',
      evidence: snapshot.workflowPredictionLayer.headline,
      tone: confidenceTone(snapshot.workflowPredictionLayer.averageConfidence || 48)
    },
    {
      label: 'Approval efficiency',
      value: clampPercent(approvalsTotal ? (approvedReceipts / approvalsTotal) * 100 : snapshot.planPendingReviewCount ? 36 : 72),
      interpretation: 'Whether decisions are clearing or collecting in the review queue.',
      evidence: `${snapshot.planPendingReviewCount} pending approvals and ${approvedReceipts} approval-backed receipts.`,
      tone: snapshot.planPendingReviewCount ? 'warning' : 'success'
    },
    {
      label: 'Execution speed',
      value: executionMomentum,
      interpretation: 'Whether plans are becoming action and receipts.',
      evidence: energyMetrics.find((metric) => metric.label === 'Operational momentum')?.detail || 'Momentum is learning.',
      tone: confidenceTone(executionMomentum)
    },
    {
      label: 'Content cadence',
      value: clampPercent(snapshot.queuedPublishing * 14 + snapshot.predictiveContentIdeationEngine.averageConfidence / 2),
      interpretation: 'Whether content ideas, plans, and publishing rhythm are coherent.',
      evidence: `${snapshot.queuedPublishing} queued publishing items; ${snapshot.predictiveContentIdeationEngine.allIdeas.length} predictive ideas.`,
      tone: snapshot.queuedPublishing ? 'primary' : 'muted'
    },
    {
      label: 'Outreach follow-through',
      value: clampPercent(72 - snapshot.incompleteFollowUps * 10 + averageScore(snapshot.outreachUrgencyTop) / 4),
      interpretation: 'Whether relationship actions are being carried forward.',
      evidence: `${snapshot.incompleteFollowUps} incomplete follow-ups and ${snapshot.outreachDrafts} outreach drafts.`,
      tone: snapshot.incompleteFollowUps ? 'warning' : 'success'
    },
    {
      label: 'Organizational clarity',
      value: clampPercent(
        snapshot.memoryContextEngine.averageConfidence / 2 +
          snapshot.predictiveOperationsDashboard.liveScore / 2 -
          bottleneckPressure * 4 -
          executionGap / 5
      ),
      interpretation: 'How clearly BrandOps can prioritize without adding noise.',
      evidence: `${snapshot.memoryContextEngine.entries.length} memory entries, ${bottleneckPressure} bottleneck signals.`,
      tone: bottleneckPressure ? 'warning' : 'primary'
    }
  ];
}

function buildSandboxScenarios(
  snapshot: MobileWorkspaceSnapshot,
  contextualSurface: ContextualSurface,
  simulations: StrategicSimulation[]
): SandboxScenario[] {
  const scenarioCommand = (title: string, simulation: string) =>
    `ask: Run Workspace Sandbox Mode. Simulate this safely without mutating live data. Include assumptions, expected outcomes, risks, dependencies, what would change if approved, and what should remain untouched.\n\nScenario: ${title}\nSimulation: ${simulation}`;

  const topWorkflow = snapshot.workflowPredictionLayer.predictions[0];
  const topOpportunity = snapshot.predictiveOpportunityLayer.suggestions[0];
  const topContent = snapshot.predictiveContentIdeationEngine.allIdeas[0];

  return [
    {
      id: 'sandbox-workflow',
      title: topWorkflow ? `Simulate ${topWorkflow.reusableTemplateName}` : 'Simulate a reusable workflow',
      simulation: topWorkflow?.repeatedPattern || 'Test a workflow sequence before saving it.',
      safeBecause: 'Sandbox mode does not save, schedule, send, or mutate workspace records.',
      expectedLearning: 'Which steps, approvals, and dependencies would matter before execution.',
      command: scenarioCommand(
        topWorkflow ? `Simulate ${topWorkflow.reusableTemplateName}` : 'Simulate a reusable workflow',
        topWorkflow?.repeatedPattern || contextualSurface.signal
      )
    },
    {
      id: 'sandbox-outreach',
      title: 'Simulate an outreach campaign',
      simulation: topOpportunity?.suggestion || 'Compare outreach angles before drafting messages.',
      safeBecause: 'No messages are sent and no contacts are changed.',
      expectedLearning: 'Likely conversion path, proof gaps, timing risks, and approval needs.',
      command: scenarioCommand('Simulate an outreach campaign', topOpportunity?.suggestion || contextualSurface.signal)
    },
    {
      id: 'sandbox-content',
      title: 'Simulate a content plan',
      simulation: topContent?.idea || simulations[0]?.forecast || 'Test a content direction against positioning.',
      safeBecause: 'No posts are created, queued, or published.',
      expectedLearning: 'Best content lane, cadence pressure, audience fit, and positioning drift risk.',
      command: scenarioCommand('Simulate a content plan', topContent?.idea || contextualSurface.signal)
    },
    {
      id: 'sandbox-positioning',
      title: 'Simulate a positioning pivot',
      simulation: snapshot.positioningIntelligence.positioningStatements[0]?.statement || contextualSurface.signal,
      safeBecause: 'The active profile and twin memory remain unchanged until approved.',
      expectedLearning: 'What opportunities, content, and workflows would shift if the pivot were adopted.',
      command: scenarioCommand('Simulate a positioning pivot', snapshot.positioningIntelligence.headline)
    }
  ];
}

function buildCofounderInsights(
  snapshot: MobileWorkspaceSnapshot,
  reflections: StrategicReflection[],
  energyMetrics: EnergyMetric[],
  contextualSurface: ContextualSurface
): CofounderInsight[] {
  const bottleneck = snapshot.predictiveOperationsDashboard.operationalBottlenecks[0];
  const opportunity = snapshot.predictiveOpportunityLayer.suggestions[0];
  const executionGap = energyMetrics.find((metric) => metric.label === 'Execution gap');
  const reflection = reflections[0];
  const command = (challenge: string, gap: string, priority: string) =>
    `ask: Act as BrandOps AI Co-Founder Mode. Challenge assumptions, identify gaps, recommend priorities, monitor risks, and propose an approval-gated PLAN. Keep tone strategic and direct; do not mutate records.\n\nChallenge: ${challenge}\nGap: ${gap}\nPriority: ${priority}`;

  return [
    {
      id: 'cofounder-assumption',
      challenge:
        reflection?.insight ||
        'The current operating surface may be optimizing for activity instead of strategic progress.',
      gap: reflection?.evidence || contextualSurface.signal,
      priority: reflection?.recommendation || contextualSurface.nextActions[0],
      tone: reflection?.tone || contextualSurface.tone,
      command: command(
        reflection?.insight || 'Validate the current operating assumption.',
        reflection?.evidence || contextualSurface.signal,
        reflection?.recommendation || contextualSurface.nextActions[0]
      )
    },
    {
      id: 'cofounder-bottleneck',
      challenge: bottleneck
        ? `Operational bottleneck: ${bottleneck.title}`
        : 'No major bottleneck is obvious, but execution still needs a next decisive move.',
      gap: bottleneck?.detail || executionGap?.detail || 'No bottleneck detail is active.',
      priority: bottleneck ? 'Resolve the bottleneck before adding new work.' : 'Choose one strategic next action.',
      tone: bottleneck ? urgencyTone(bottleneck.urgency) : 'muted',
      command: command(
        bottleneck ? `Resolve ${bottleneck.title}` : 'Find the next decisive move.',
        bottleneck?.detail || executionGap?.detail || contextualSurface.signal,
        bottleneck ? 'Resolve before adding work.' : contextualSurface.nextActions[0]
      )
    },
    {
      id: 'cofounder-opportunity',
      challenge: opportunity
        ? `Missed opportunity risk: ${opportunity.title}`
        : 'Opportunity signal is still forming.',
      gap: opportunity?.whyThisAppeared || 'More approved memory and platform context would sharpen opportunity detection.',
      priority: opportunity?.expectedImpact || 'Strengthen the input signals before acting.',
      tone: opportunity ? confidenceTone(opportunity.confidence) : 'muted',
      command: opportunity?.previewCommand || command('Review opportunity signal', contextualSurface.signal, contextualSurface.nextActions[0])
    }
  ];
}

function buildPreparationAssets(
  snapshot: MobileWorkspaceSnapshot,
  sortedQueue: PulseTimelineRow[],
  autonomousDrafts: AutonomousDraft[],
  contextualSurface: ContextualSurface
): PreparationAsset[] {
  const assets: PreparationAsset[] = [];
  const nextQueue = sortedQueue[0];
  if (nextQueue) {
    assets.push({
      id: `prep-queue-${nextQueue.id}`,
      title: `${nextQueue.title} prep brief`,
      assetType: 'next operational brief',
      preparedFor: nextQueue.subtitle,
      approvalPath: 'Review brief, confirm objective, then approve follow-up actions.',
      command: workspaceQueueCommandLine(nextQueue)
    });
  }

  for (const draft of autonomousDrafts.slice(0, 3)) {
    assets.push({
      id: `prep-${draft.id}`,
      title: draft.title,
      assetType: draft.type,
      preparedFor: draft.preparedBecause,
      approvalPath: draft.reviewNeed,
      command: draft.command
    });
  }

  assets.push({
    id: 'prep-next-day-brief',
    title: 'Next-day operational brief',
    assetType: 'daily brief',
    preparedFor:
      snapshot.predictiveOperationsDashboard.stateLine ||
      `${contextualSurface.title}: ${contextualSurface.signal}`,
    approvalPath: 'Review priorities, pending approvals, risks, opportunities, and timing before operating.',
    command: `ask: Prepare my next-day operational brief. Include priorities, pending approvals, meetings/tasks, workflow risks, opportunities, recommended actions, and what not to focus on. Do not mutate records.\n\nContext: ${contextualSurface.signal}`
  });

  return assets.slice(0, 5);
}

function SummaryTile({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: number | string;
  detail: string;
  tone: BoardTone;
}) {
  return (
    <div className={clsx('rounded-xl border px-3 py-2.5', toneClass(tone))}>
      <p className="text-fine font-semibold uppercase tracking-wide opacity-85">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-none text-text">{value}</p>
      <p className="mt-1 text-fine leading-snug text-textMuted">{detail}</p>
    </div>
  );
}

function ModeCard({
  mode,
  title,
  metric,
  detail,
  tone
}: {
  mode: OperationalModeId;
  title: string;
  metric: string;
  detail: string;
  tone: BoardTone;
}) {
  return (
    <div className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-fine font-bold uppercase tracking-[0.16em] text-primary">{mode}</p>
          <p className="mt-1 text-label font-semibold leading-tight text-text">{title}</p>
        </div>
        <span
          className={clsx(
            'shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
            toneClass(tone)
          )}
        >
          {metric}
        </span>
      </div>
      <p className="mt-2 text-fine leading-snug text-textMuted">{detail}</p>
    </div>
  );
}

function ProductionReadinessPath({
  snapshot,
  btnFocus,
  disabled,
  runCommand,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenToday
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  onOpenToday: () => void;
}) {
  const twin = snapshot.activeDigitalTwin;
  const missingInfo = twin?.memory.missingInfo.slice(0, 3) ?? [];
  const steps = [
    {
      label: twin ? 'Twin ready' : 'Create twin',
      detail: twin
        ? `${twin.displayName} has ${twin.confidenceScore}% confidence with verified profile memory.`
        : 'Paste a resume or profile, review facts, and generate the first AI digital twin.',
      action: twin ? 'Improve facts' : 'Create twin',
      onClick: onOpenSettings,
      tone: twin ? 'success' as const : 'warning' as const
    },
    {
      label: 'ASK',
      detail: 'Ask for reasoning, positioning, buyer personas, content ideas, or next best moves.',
      action: 'Ask twin',
      onClick: () =>
        void runCommand(
          'ask: Using only verified workspace and digital twin facts, identify my strongest positioning and next best operational move. If facts are missing, ask questions before making claims.'
        ),
      tone: 'primary' as const
    },
    {
      label: 'PLAN',
      detail: 'Turn useful answers into workflows, timelines, outreach plans, content plans, and approval queues.',
      action: 'New plan',
      onClick: onOpenCommandPalette,
      tone: 'info' as const
    },
    {
      label: 'VERIFY',
      detail: 'Review approvals, receipts, timeline events, warnings, confidence, and what data was used.',
      action: 'Review receipts',
      onClick: onOpenToday,
      tone: snapshot.planPendingReviewCount ? 'warning' as const : 'success' as const
    }
  ];

  return (
    <section
      className="mt-3 rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5"
      aria-labelledby="production-path-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            Launch-ready operating path
          </p>
          <h2 id="production-path-heading" className="mt-1 text-h3 text-text">
            Create twin, ask, plan, approve, and track
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps stays simple on the surface: your twin uses verified facts, missing facts become
            questions, and external actions pause for approval before execution.
          </p>
        </div>
        <span
          className={clsx(
            'rounded-full border px-2 py-1 text-fine font-semibold uppercase',
            toneClass(missingInfo.length ? 'warning' : twin ? 'success' : 'muted')
          )}
        >
          {missingInfo.length ? `${missingInfo.length} fact gap${missingInfo.length === 1 ? '' : 's'}` : twin ? 'ready' : 'setup'}
        </span>
      </div>

      {missingInfo.length ? (
        <p className="mt-2 rounded-xl border border-warning/35 bg-warningSoft/15 px-3 py-2 text-meta leading-snug text-warning">
          Missing facts to resolve before stronger claims: {missingInfo.join(' · ')}.
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {steps.map((step) => (
          <article key={step.label} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-label font-semibold leading-tight text-text">{step.label}</h3>
              <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(step.tone))}>
                {step.tone}
              </span>
            </div>
            <p className="mt-2 text-fine leading-snug text-textMuted">{step.detail}</p>
            <button
              type="button"
              disabled={disabled && step.label === 'ASK'}
              onClick={step.onClick}
              className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
            >
              {step.action}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AutonomyLevelsPanel() {
  const levels = [
    {
      label: 'Observe',
      detail: 'Read-only insight, summaries, context, and risk detection.',
      tone: 'success' as const
    },
    {
      label: 'Advise',
      detail: 'Suggestions, drafts, simulations, and recommended plans only.',
      tone: 'primary' as const
    },
    {
      label: 'Act with approval',
      detail: 'Default for sends, posts, schedules, syncs, edits, and workspace changes.',
      tone: 'warning' as const
    },
    {
      label: 'Autonomous',
      detail: 'Disabled unless a future guarded capability explicitly supports it.',
      tone: 'muted' as const
    }
  ];

  return (
    <section
      className="mt-3 rounded-2xl border border-warning/30 bg-warningSoft/10 p-3.5"
      aria-labelledby="autonomy-levels-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-[0.14em] text-warning">
            Autonomy and approval policy
          </p>
          <h2 id="autonomy-levels-heading" className="mt-1 text-h3 text-text">
            External actions default to human approval
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps can observe, advise, and prepare work. It does not send, publish, delete,
            charge, sync, or modify external systems without explicit approval and a receipt.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {levels.map((level) => (
          <article key={level.label} className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
            <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(level.tone))}>
              {level.label}
            </span>
            <p className="mt-2 text-fine leading-snug text-textMuted">{level.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function flipSetValue(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function BoardCardControl({
  children,
  onClick,
  btnFocus,
  disabled = false
}: {
  children: ReactNode;
  onClick: () => void;
  btnFocus: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-meta font-semibold text-text disabled:opacity-45',
        btnFocus
      )}
    >
      {children}
    </button>
  );
}

function BoardCardUtilityControls({
  id,
  btnFocus,
  pinned,
  archived,
  duplicated,
  saved,
  onPin,
  onArchive,
  onDuplicate,
  onSave
}: {
  id: string;
  btnFocus: string;
  pinned: Set<string>;
  archived: Set<string>;
  duplicated: Set<string>;
  saved: Set<string>;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSave: (id: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <BoardCardControl btnFocus={btnFocus} onClick={() => onPin(id)}>
        {pinned.has(id) ? 'Pinned' : 'Pin'}
      </BoardCardControl>
      <BoardCardControl btnFocus={btnFocus} onClick={() => onArchive(id)}>
        {archived.has(id) ? 'Archived' : 'Archive'}
      </BoardCardControl>
      <BoardCardControl btnFocus={btnFocus} onClick={() => onDuplicate(id)}>
        {duplicated.has(id) ? 'Duplicated' : 'Duplicate'}
      </BoardCardControl>
      <BoardCardControl btnFocus={btnFocus} onClick={() => onSave(id)}>
        {saved.has(id) ? 'Saved' : 'Save'}
      </BoardCardControl>
    </div>
  );
}

function scoreTone(value: number): BoardTone {
  if (value >= 82) return 'success';
  if (value >= 64) return 'primary';
  if (value >= 42) return 'warning';
  return 'muted';
}

function WorkspaceIntelligenceCorePanel({
  snapshot,
  btnFocus,
  disabled,
  runCommand,
  onOpenSettings
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onOpenSettings: () => void;
}) {
  const intelligence = snapshot.workspaceIntelligence;
  const dna = intelligence.dna;
  const decisions = intelligence.decisionMemory;
  const approvedCount = decisions.filter((decision) => decision.polarity === 'approved').length;
  const rejectedCount = decisions.filter((decision) => decision.polarity === 'rejected').length;
  const topOpportunity = intelligence.opportunityRadar[0];
  const playbookSection = intelligence.operatingManual[0];
  const primaryScore = intelligence.scorecard[0];

  return (
    <section
      className="mt-3 rounded-2xl border border-primary/25 bg-primarySoft/10 p-3.5"
      aria-labelledby="workspace-intelligence-core-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <BrainCircuit className="h-4 w-4" aria-hidden />
            Workspace Intelligence Core
          </p>
          <h2 id="workspace-intelligence-core-heading" className="mt-1 text-h3 text-text">
            Workspace DNA, decisions, opportunities, and playbook
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps learns how this operator thinks, decides, and works. ASK, PLAN, OPERATE, and
            VERIFY now share the same living workspace identity instead of isolated feature state.
          </p>
        </div>
        {primaryScore ? (
          <span
            className={clsx(
              'rounded-full border px-2 py-1 text-fine font-semibold uppercase',
              toneClass(scoreTone(primaryScore.value))
            )}
          >
            {primaryScore.value}% DNA
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {intelligence.scorecard.map((metric) => (
          <div key={metric.id} className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                {metric.label}
              </p>
              <span
                className={clsx(
                  'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                  toneClass(scoreTone(metric.value))
                )}
              >
                {metric.value}%
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full border border-border/30 bg-bg"
              role="progressbar"
              aria-valuenow={metric.value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={metric.label}
            >
              <span className="block h-full rounded-full bg-primary" style={{ width: `${metric.value}%` }} />
            </div>
            <p className="mt-2 text-fine leading-snug text-textMuted">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Living Workspace DNA
          </p>
          <p className="mt-1 text-label font-semibold text-text">{dna.profession}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <DnaList label="Goals" items={dna.goals} fallback="No approved goals yet" />
            <DnaList label="Audience" items={dna.audience} fallback="Audience still needs approval" />
            <DnaList label="Tone" items={dna.preferredTone} fallback="Tone will learn from decisions" />
            <DnaList label="Workflows" items={dna.workflows} fallback="Approve a PLAN to seed workflows" />
          </div>
        </div>

        <div className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Decision Memory
          </p>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            Approved and rejected decisions become constraints for future AI outputs.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SummaryTile
              label="Approved"
              value={approvedCount}
              detail="Reusable decisions"
              tone={approvedCount ? 'success' : 'muted'}
            />
            <SummaryTile
              label="Rejected"
              value={rejectedCount}
              detail="Avoidance rules"
              tone={rejectedCount ? 'warning' : 'muted'}
            />
          </div>
          {decisions[0] ? (
            <p className="mt-2 rounded-lg border border-border/30 bg-bgSubtle/45 px-2 py-1.5 text-fine leading-snug text-textMuted">
              Latest: {decisions[0].polarity} · {decisions[0].title}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Opportunity Radar
          </p>
          {topOpportunity ? (
            <>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-label font-semibold leading-tight text-text">
                    {topOpportunity.title}
                  </h3>
                  <p className="mt-1 text-fine leading-snug text-textMuted">
                    {topOpportunity.detail}
                  </p>
                </div>
                <span className="rounded-full border border-success/45 bg-successSoft/15 px-2 py-0.5 text-overline font-bold uppercase text-success">
                  {topOpportunity.expectedImpact} impact
                </span>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void runCommand(topOpportunity.suggestedAction)}
                className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
              >
                Turn into PLAN
              </button>
            </>
          ) : (
            <p className="mt-2 text-meta leading-snug text-textMuted">
              No major opportunity gap detected. New signals appear as the twin, decisions, and
              receipts compound.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            BrandOps Playbook
          </p>
          {playbookSection ? (
            <>
              <h3 className="mt-2 text-label font-semibold leading-tight text-text">
                {playbookSection.title}
              </h3>
              <p className="mt-1 text-fine leading-snug text-textMuted">{playbookSection.body}</p>
              <p className="mt-2 text-fine text-textSoft">
                {playbookSection.evidenceCount} evidence signal
                {playbookSection.evidenceCount === 1 ? '' : 's'} used.
              </p>
            </>
          ) : (
            <p className="mt-2 text-meta leading-snug text-textMuted">
              The playbook starts once BrandOps has enough DNA, decisions, and operating history.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                void runCommand(
                  'ask: Generate my BrandOps Playbook from Workspace DNA, Decision Memory, approvals, receipts, and connected platform context. Keep it human-reviewable and do not execute externally.'
                )
              }
              className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
            >
              Generate playbook
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className={clsx(mobileChipClass(btnFocus), 'text-fine')}
            >
              Improve DNA
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DnaList({
  label,
  items,
  fallback
}: {
  label: string;
  items: string[];
  fallback: string;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">{label}</p>
      <p className="mt-1 text-fine leading-snug text-textMuted">
        {items.length ? items.slice(0, 3).join(' · ') : fallback}
      </p>
    </div>
  );
}

function ProgressMeter({ item }: { item: TwinProgressIndicator }) {
  return (
    <div className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">{item.label}</p>
        <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(item.tone))}>
          {item.value}%
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full border border-border/30 bg-bg"
        role="progressbar"
        aria-valuenow={item.value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={item.label}
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${item.value}%` }}
        />
      </div>
      <p className="mt-2 text-fine leading-snug text-textMuted">{item.detail}</p>
    </div>
  );
}

function WorkspaceOSLayer({
  snapshot,
  btnFocus,
  disabled,
  runCommand,
  onOpenSettings,
  onOpenIntegrations,
  onOpenCommandPalette,
  onOpenToday,
  onConvertPredictiveOpportunityToPlan,
  memoryGraphNodes,
  pulseItems,
  twinProgress,
  contextualSurface,
  personaModes,
  composerDrafts,
  briefingItems,
  timeItems,
  ambientSignals,
  energyMetrics,
  simulations,
  twinEcosystem,
  autonomousDrafts,
  brainSignals,
  searchLenses,
  deepWorkState,
  operatingTimeline,
  operationalGraph,
  strategicReflections,
  adaptiveLayout,
  intelligenceScores,
  sandboxScenarios,
  cofounderInsights,
  preparationAssets
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenIntegrations: () => void;
  onOpenCommandPalette: () => void;
  onOpenToday: () => void;
  onConvertPredictiveOpportunityToPlan: (suggestion: PredictiveOpportunitySuggestion) => void;
  memoryGraphNodes: MemoryGraphNode[];
  pulseItems: WorkspacePulseItem[];
  twinProgress: TwinProgressIndicator[];
  contextualSurface: ContextualSurface;
  personaModes: PersonaMode[];
  composerDrafts: WorkflowComposerDraft[];
  briefingItems: BriefingItem[];
  timeItems: BriefingItem[];
  ambientSignals: AmbientSignal[];
  energyMetrics: EnergyMetric[];
  simulations: StrategicSimulation[];
  twinEcosystem: TwinEcosystemMember[];
  autonomousDrafts: AutonomousDraft[];
  brainSignals: BrainSignal[];
  searchLenses: SearchLens[];
  deepWorkState: DeepWorkState;
  operatingTimeline: OperatingTimelineEvent[];
  operationalGraph: { nodes: OperationalGraphNode[]; edges: OperationalGraphEdge[] };
  strategicReflections: StrategicReflection[];
  adaptiveLayout: AdaptiveLayoutState;
  intelligenceScores: IntelligenceScore[];
  sandboxScenarios: SandboxScenario[];
  cofounderInsights: CofounderInsight[];
  preparationAssets: PreparationAsset[];
}) {
  const activePersonas = personaModes.filter((persona) => persona.active);
  const radarItems = snapshot.predictiveOpportunityLayer.suggestions.slice(0, 4);
  const memoryInfluenceCount = snapshot.memoryContextEngine.entries.length;
  const topEnergyMetric = [...energyMetrics].sort((a, b) => b.value - a.value)[0];

  return (
    <section className={ROW} aria-labelledby="workspace-os-heading">
      <div className="bo-category-os-layer rounded-2xl border border-primary/30 bg-primarySoft/10 p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
              <Activity className="h-4 w-4" aria-hidden />
              BrandOps OS intelligence layer
            </p>
            <h2 id="workspace-os-heading" className="mt-1 text-h3 text-text">
              Workspace memory, pulse, persona, time, and workflow intelligence
            </h2>
            <p className="mt-1 max-w-3xl text-meta leading-snug text-textMuted">
              This layer shows what the workspace knows, how that memory shapes outputs, what needs
              attention now, and which operating mode BrandOps is using before anything becomes an
              approved action.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void runCommand(snapshot.memoryContextEngine.controls.viewCommand)}
              className={clsx(mobileChipClass(btnFocus), 'text-meta disabled:opacity-50')}
            >
              View memory
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className={clsx(mobileChipClass(btnFocus), 'text-meta')}
            >
              Edit controls
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <FlaskConical className="h-4 w-4" aria-hidden />
              Workspace Simulation Sandbox
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Experiment with workflows, campaigns, content plans, team structures, and positioning
              pivots without affecting live operational data.
            </p>
            <div className="mt-3 space-y-2">
              {sandboxScenarios.map((scenario) => (
                <article key={scenario.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <h4 className="text-label font-semibold leading-tight text-text">{scenario.title}</h4>
                  <p className="mt-1 text-fine leading-snug text-textMuted">{scenario.simulation}</p>
                  <p className="mt-2 rounded-lg border border-success/30 bg-successSoft/10 px-2 py-1.5 text-fine leading-snug text-success">
                    Safe: {scenario.safeBecause}
                  </p>
                  <p className="mt-1 text-fine leading-snug text-textSoft">{scenario.expectedLearning}</p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(scenario.command)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Open sandbox
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <UserRound className="h-4 w-4" aria-hidden />
              AI Co-Founder / Operator Mode
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              BrandOps proactively challenges assumptions, identifies gaps, recommends priorities,
              monitors risks, and points to missed opportunities.
            </p>
            <div className="mt-3 space-y-2">
              {cofounderInsights.map((insight) => (
                <article key={insight.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-label font-semibold leading-tight text-text">{insight.challenge}</h4>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(insight.tone))}>
                      operator
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textMuted">Gap: {insight.gap}</p>
                  <p className="mt-1 text-fine leading-snug text-textSoft">Priority: {insight.priority}</p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(insight.command)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Challenge assumptions
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <WandSparkles className="h-4 w-4" aria-hidden />
              Operational Preparation Layer
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Likely-needed assets are quietly prepared ahead of time while staying reviewable and
              approval-gated.
            </p>
            <div className="mt-3 space-y-2">
              {preparationAssets.map((asset) => (
                <article key={asset.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <p className="text-fine font-semibold uppercase tracking-wide text-primary">{asset.assetType}</p>
                  <h4 className="mt-1 text-label font-semibold leading-tight text-text">{asset.title}</h4>
                  <p className="mt-1 text-fine leading-snug text-textMuted">Prepared for: {asset.preparedFor}</p>
                  <p className="mt-2 rounded-lg border border-warning/30 bg-warningSoft/10 px-2 py-1.5 text-fine leading-snug text-warning">
                    Approval path: {asset.approvalPath}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(asset.command)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Review prep
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                <Compass className="h-4 w-4" aria-hidden />
                AI Executive Command Center
              </p>
              <h3 className="mt-1 text-label font-semibold leading-tight text-text">
                Operate the digital organization, not another dashboard
              </h3>
              <p className="mt-1 max-w-3xl text-meta leading-snug text-textMuted">
                The command center compresses priorities, goals, momentum, approvals,
                opportunities, twin intelligence, platform status, and execution health into one
                calm operating readout.
              </p>
            </div>
            <span className={clsx('rounded-full border px-3 py-1 text-label font-bold', toneClass(topEnergyMetric?.tone ?? 'muted'))}>
              {topEnergyMetric ? `${topEnergyMetric.label}: ${topEnergyMetric.state}` : 'Balanced'}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Strategic goals"
              value={snapshot.memoryContextEngine.entriesByCategory.goals.length || (snapshot.focusMetric ? 1 : 0)}
              detail={snapshot.focusMetric || contextualSurface.signal}
              tone={contextualSurface.tone}
            />
            <SummaryTile
              label="Momentum"
              value={`${energyMetrics.find((metric) => metric.label === 'Operational momentum')?.value ?? 0}%`}
              detail={energyMetrics.find((metric) => metric.label === 'Operational momentum')?.recommendation ?? 'Momentum is learning.'}
              tone={energyMetrics.find((metric) => metric.label === 'Operational momentum')?.tone ?? 'muted'}
            />
            <SummaryTile
              label="Execution health"
              value={snapshot.predictiveOperationsDashboard.liveScore}
              detail={snapshot.predictiveOperationsDashboard.stateLine}
              tone={snapshot.predictiveOperationsDashboard.urgentCount ? 'warning' : 'success'}
            />
            <SummaryTile
              label="Twin team"
              value={twinEcosystem.filter((member) => member.status !== 'proposed').length}
              detail="Operational identities ready to coordinate through shared memory and plans"
              tone={twinEcosystem.some((member) => member.status === 'active') ? 'primary' : 'muted'}
            />
            <SummaryTile
              label="AI work ledger"
              value={snapshot.recentAiCoreArtifacts.length}
              detail={
                snapshot.recentAiCoreArtifacts[0]
                ? `${snapshot.recentAiCoreArtifacts[0].type}: ${snapshot.recentAiCoreArtifacts[0].title}`
                : 'Unified outputs will appear here after ASK, PLAN, or batch runs'
              }
              tone={snapshot.recentAiCoreArtifacts.length ? 'success' : 'muted'}
            />
          </div>
          {snapshot.recentAiCoreBatchRuns.length ? (
            <div className="mt-3 rounded-xl border border-primary/25 bg-primarySoft/10 px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                    AI Batch Run progress
                  </p>
                  <p className="mt-1 text-meta leading-snug text-textMuted">
                    {snapshot.recentAiCoreBatchRuns[0].finalSummary}
                  </p>
                </div>
                <span className="rounded-full border border-border/40 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
                  {snapshot.recentAiCoreBatchRuns[0].status} ·{' '}
                  {snapshot.recentAiCoreBatchRuns[0].completedArtifacts.length}/
                  {snapshot.recentAiCoreBatchRuns[0].steps.length}
                </span>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                {snapshot.recentAiCoreBatchRuns[0].steps.slice(0, 6).map((step) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2 py-1.5"
                  >
                    <p className="text-fine font-semibold text-text">{step.artifactType}</p>
                    <p className="mt-0.5 text-fine text-textMuted">
                      {step.status}
                      {step.error ? ` · ${step.error}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              {snapshot.recentAiCoreBatchRuns[0].failedArtifacts.length ? (
                <p className="mt-2 rounded-lg border border-warning/30 bg-warningSoft/10 px-2 py-1.5 text-fine text-warning">
                  Retry: {snapshot.recentAiCoreBatchRuns[0].failedArtifacts.map((item) => item.retryCommand).join(' · ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                  <History className="h-4 w-4" aria-hidden />
                  AI Operating Memory Timeline
                </p>
                <h3 className="mt-1 text-label font-semibold leading-tight text-text">
                  Replay the strategic evolution of the workspace
                </h3>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  Decisions, plans, approvals, rejected ideas, workflow evolution, positioning
                  changes, recommendations, and platform events become a living memory stream.
                </p>
              </div>
              <span className="rounded-full border border-border/35 bg-bgSubtle px-2 py-1 text-fine font-semibold text-textMuted">
                {operatingTimeline.length} memory events
              </span>
            </div>
            <div className="bo-operating-timeline mt-3 space-y-2">
              {operatingTimeline.map((event) => (
                <article key={event.id} className="bo-operating-timeline__item rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                        {event.category} · {compactTime(event.at)}
                      </p>
                      <h4 className="mt-1 text-label font-semibold leading-tight text-text">{event.label}</h4>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{event.detail}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(event.tone))}>
                      memory
                    </span>
                  </div>
                  {event.command ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void runCommand(event.command!)}
                      className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                    >
                      Replay
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <GitFork className="h-4 w-4" aria-hidden />
              Operational Graph Intelligence
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              People, goals, workflows, content, opportunities, outreach, tasks, approvals, and
              platforms are linked into lightweight intelligence for prediction and search.
            </p>
            <div className="bo-operational-graph mt-3" aria-label="Operational graph intelligence">
              {operationalGraph.nodes.map((node) => (
                <article key={node.id} className={clsx('rounded-xl border px-2.5 py-2', toneClass(node.tone))}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-overline font-bold uppercase tracking-wide opacity-80">{node.kind}</p>
                      <h4 className="mt-1 text-label font-semibold leading-tight text-text">{node.label}</h4>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/35 bg-bg/50 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                      {node.strength}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-fine leading-snug text-textMuted">{node.detail}</p>
                </article>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {operationalGraph.edges.slice(0, 8).map((edge) => (
                <span key={`${edge.from}-${edge.to}`} className="rounded-full border border-border/35 bg-bgSubtle px-2 py-1 text-fine text-textMuted">
                  {edge.from} {edge.label} {edge.to}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <LineChart className="h-4 w-4" aria-hidden />
              AI Strategic Reflection
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Executive-level reflection turns behavior, workflow efficiency, positioning,
              consistency, and bottlenecks into calm recommendations.
            </p>
            <div className="mt-3 space-y-2">
              {strategicReflections.map((reflection) => (
                <article key={reflection.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-label font-semibold leading-tight text-text">{reflection.insight}</h4>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(reflection.tone))}>
                      reflect
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textMuted">Evidence: {reflection.evidence}</p>
                  <p className="mt-1 text-fine leading-snug text-textSoft">{reflection.recommendation}</p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(reflection.command)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Reflect deeper
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Layers className="h-4 w-4" aria-hidden />
              Adaptive Workspace Layout
            </p>
            <h3 className="mt-1 text-label font-semibold leading-tight text-text">{adaptiveLayout.name}</h3>
            <p className="mt-1 text-meta leading-snug text-textMuted">{adaptiveLayout.reason}</p>
            <div className="mt-3 grid gap-2">
              <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">Elevated</p>
                <p className="mt-1 text-fine leading-snug text-textMuted">{adaptiveLayout.elevatedSurfaces.join(' · ')}</p>
              </div>
              <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">Minimized</p>
                <p className="mt-1 text-fine leading-snug text-textMuted">{adaptiveLayout.minimizedSurfaces.join(' · ')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={clsx(mobileChipClass(btnFocus), 'mt-3 text-fine')}
            >
              Open focused commands
            </button>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Gauge className="h-4 w-4" aria-hidden />
              Operational Intelligence Scoring
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Strategic operating indicators help you improve execution without gamifying the work.
            </p>
            <div className="mt-3 space-y-2">
              {intelligenceScores.map((score) => (
                <div key={score.label} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-label font-semibold leading-tight text-text">{score.label}</p>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{score.interpretation}</p>
                    </div>
                    <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(score.tone))}>
                      {score.value}
                    </span>
                  </div>
                  <p className="mt-1 text-fine leading-snug text-textSoft">{score.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Activity className="h-4 w-4" aria-hidden />
              Ambient intelligence workspace
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Subtle awareness indicators react to operational context, workflow timing, platform
              activity, behavioral patterns, and active goals without expanding into noisy widgets.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ambientSignals.map((signal) => (
                <article key={signal.label} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{signal.label}</h3>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{signal.detail}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(signal.tone))}>
                      aware
                    </span>
                  </div>
                  <p className="mt-2 rounded-lg border border-border/30 bg-bgElevated/55 px-2 py-1.5 text-fine leading-snug text-textSoft">
                    {signal.awareness}
                  </p>
                  {signal.command ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void runCommand(signal.command!)}
                      className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                    >
                      Focus this
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Gauge className="h-4 w-4" aria-hidden />
              Operational Energy System
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Momentum, overload, execution gaps, workflow pressure, and context switching are
              monitored as support signals, not scores to chase.
            </p>
            <div className="mt-3 space-y-2">
              {energyMetrics.map((metric) => (
                <article key={metric.label} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{metric.label}</h3>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{metric.detail}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(metric.tone))}>
                      {metric.value}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full border border-border/30 bg-bg">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${metric.value}%` }} />
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textSoft">{metric.recommendation}</p>
                  {metric.command ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void runCommand(metric.command!)}
                      className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                    >
                      Rebalance
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                  <BrainCircuit className="h-4 w-4" aria-hidden />
                  Workspace Memory Graph
                </p>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  {snapshot.memoryContextEngine.headline} {memoryInfluenceCount} signals can influence
                  ASK, PLAN, opportunity prediction, and reusable workflows.
                </p>
              </div>
              <span className={clsx('rounded-full border px-2 py-1 text-fine font-semibold uppercase', toneClass(confidenceTone(snapshot.memoryContextEngine.averageConfidence)))}>
                {snapshot.memoryContextEngine.averageConfidence}% confidence
              </span>
            </div>

            <div className="bo-memory-graph mt-3" aria-label="Workspace memory graph">
              <div className="bo-memory-graph__core">
                <Network className="mx-auto h-5 w-5 text-primary" aria-hidden />
                <p className="mt-1 text-fine font-bold uppercase tracking-[0.16em] text-primary">
                  Twin memory core
                </p>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  Local-first, editable, approval-aware
                </p>
              </div>
              {memoryGraphNodes.map((node, index) => (
                <article
                  key={node.id}
                  className={clsx('bo-memory-graph__node rounded-xl border px-3 py-2.5', toneClass(node.tone))}
                  style={{ '--node-index': index } as CSSProperties}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{node.label}</h3>
                      <p className="mt-1 line-clamp-2 text-fine leading-snug text-textMuted">
                        {node.detail}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/35 bg-bg/60 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                      {node.confidence}%
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textSoft">Source: {node.source}</p>
                  <p className="mt-1 text-fine leading-snug text-textSoft">
                    Influences: {node.influences.join(', ')}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {(['ask-suggestions', 'plan-generation', 'opportunity-prediction', 'workflow-recommendations'] as const).map(
                (surface) => (
                  <div key={surface} className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                    <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                      {surface.replace(/-/g, ' ')}
                    </p>
                    <p className="mt-1 line-clamp-3 text-fine leading-snug text-textMuted">
                      {snapshot.memoryContextEngine.improvements[surface].join(' · ') ||
                        'Needs more approved memory.'}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                    <Activity className="h-4 w-4" aria-hidden />
                    AI Operating Pulse
                  </p>
                  <p className="mt-1 text-meta leading-snug text-textMuted">
                    {snapshot.predictiveOperationsDashboard.stateLine}
                  </p>
                </div>
                <span className="bo-operating-score rounded-full border border-primary/35 bg-primarySoft/20 px-3 py-1 text-label font-bold text-primary">
                  {snapshot.predictiveOperationsDashboard.liveScore}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {pulseItems.slice(0, 4).map((item) => (
                  <article key={item.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-label font-semibold leading-tight text-text">{item.title}</h3>
                        <p className="mt-1 line-clamp-2 text-fine leading-snug text-textMuted">
                          {item.detail}
                        </p>
                      </div>
                      <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(item.tone))}>
                        {item.urgency}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-border/30 bg-bg/50 px-2 py-0.5 text-fine text-textSoft">
                        {item.source} · {item.confidence}%
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(item.command)}
                        className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
                      >
                        Preview action
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                <WandSparkles className="h-4 w-4" aria-hidden />
                Executive assistant briefing
              </p>
              <div className="mt-2 space-y-2">
                {briefingItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                          {item.label}
                        </p>
                        <p className="mt-1 text-fine leading-snug text-textMuted">{item.detail}</p>
                      </div>
                      <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(item.tone))}>
                        {item.tone}
                      </span>
                    </div>
                    {item.command ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(item.command!)}
                        className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                      >
                        Ask chief-of-staff
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Sparkles className="h-4 w-4" aria-hidden />
              Twin Evolution Engine
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Your AI twin becomes smarter as approvals, rejected outputs, workflows, platforms, and
              operating history accumulate.
            </p>
            <div className="mt-3 grid gap-2">
              {twinProgress.map((item) => (
                <ProgressMeter key={item.label} item={item} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Network className="h-4 w-4" aria-hidden />
              Contextual workspace surface
            </p>
            <h3 className="mt-1 text-label font-semibold leading-tight text-text">
              {contextualSurface.title}
            </h3>
            <p className="mt-1 rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textMuted">
              {contextualSurface.signal}
            </p>
            <div className="mt-3 grid gap-2">
              <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Prioritized now
                </p>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  {contextualSurface.priorities.join(' · ')}
                </p>
              </div>
              <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Recommended moves
                </p>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  {contextualSurface.nextActions.join(' · ')}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className={clsx(mobileChipClass(btnFocus), 'text-fine')}
              >
                Compose around this
              </button>
              <button
                type="button"
                onClick={onOpenToday}
                className={clsx(mobileChipClass(btnFocus), 'text-fine')}
              >
                View rhythm
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <BrainCircuit className="h-4 w-4" aria-hidden />
              Dynamic AI personas
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Active: {activePersonas.map((persona) => persona.name).join(', ') || 'Baseline operator'}.
              All personas remain grounded in the same digital twin.
            </p>
            <div className="mt-3 grid gap-2">
              {personaModes.map((persona) => (
                <article
                  key={persona.name}
                  className={clsx(
                    'rounded-xl border px-2.5 py-2',
                    persona.active ? toneClass(persona.tone) : 'border-border/30 bg-bgSubtle/35 text-textMuted'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-label font-semibold leading-tight text-text">{persona.name}</h3>
                    <span className="shrink-0 rounded-full border border-border/35 bg-bg/50 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                      {persona.active ? 'active' : 'available'}
                    </span>
                  </div>
                  <p className="mt-1 text-fine leading-snug text-textMuted">{persona.priority}</p>
                  <p className="mt-1 text-fine leading-snug text-textSoft">{persona.guidance}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <BrainCircuit className="h-4 w-4" aria-hidden />
              Workspace coordination
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              The invisible orchestration layer coordinates memory, experts, workflows,
              predictions, integrations, and operational context into a single priority model.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {brainSignals.map((signal) => (
                <article key={signal.label} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{signal.label}</h3>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{signal.detail}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(signal.tone))}>
                      {signal.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textSoft">Source: {signal.source}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Moon className="h-4 w-4" aria-hidden />
              Deep Work Mode
            </p>
            <h3 className="mt-1 text-label font-semibold leading-tight text-text">
              {deepWorkState.active ? 'Focus mode recommended' : 'Focus mode ready'}
            </h3>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Objective: {deepWorkState.objective}. Non-critical alerts collapse, execution-focused
              suggestions rise, and the timeline simplifies around one intentional work block.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Minimized
                </p>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  {deepWorkState.minimizedNoise.join(' · ')}
                </p>
              </div>
              <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Elevated
                </p>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  {deepWorkState.elevatedPriorities.join(' · ')}
                </p>
              </div>
              <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Timeline
                </p>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  {deepWorkState.simplifiedTimeline}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void runCommand(deepWorkState.command)}
              className={clsx('bo-btn-primary bo-btn-primary--sm mt-3 disabled:opacity-50', btnFocus)}
            >
              Start Deep Work preview
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Compass className="h-4 w-4" aria-hidden />
              Strategic Simulation Mode
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Simulate strategic outcomes before converting ideas into plans. Forecasts use
              profession-aware experts, memory, platforms, and current operating pressure.
            </p>
            <div className="mt-3 space-y-2">
              {simulations.map((simulation) => (
                <article key={simulation.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-label font-semibold leading-tight text-text">
                      {simulation.question}
                    </h3>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(confidenceTone(simulation.confidence)))}>
                      {simulation.confidence}%
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textMuted">{simulation.forecast}</p>
                  <p className="mt-2 text-fine leading-snug text-textSoft">
                    Risks: {simulation.risks.join(' · ')}
                  </p>
                  <p className="mt-1 text-fine leading-snug text-textSoft">
                    Dependencies: {simulation.dependencies.join(' · ')}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(simulation.command)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Simulate
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Layers className="h-4 w-4" aria-hidden />
              Multi-Twin Ecosystem
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              BrandOps models multiple operational identities as one AI-native team sharing memory,
              workflows, and coordinated planning.
            </p>
            <div className="mt-3 space-y-2">
              {twinEcosystem.map((member) => (
                <article key={member.role} className={clsx('rounded-xl border px-3 py-2.5', toneClass(member.tone))}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{member.role}</h3>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{member.contribution}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/35 bg-bg/50 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                      {member.status} · {member.confidence}%
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textSoft">
                    Collaborates with: {member.collaboratesWith.join(', ')}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <FileText className="h-4 w-4" aria-hidden />
              Prepared drafts
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              BrandOps prepares likely next drafts early, but every draft remains preview-only and
              human-reviewed before execution.
            </p>
            <div className="mt-3 space-y-2">
              {autonomousDrafts.map((draft) => (
                <article key={draft.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                        {draft.type}
                      </p>
                      <h3 className="mt-1 text-label font-semibold leading-tight text-text">{draft.title}</h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/35 bg-bg/50 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                      {draft.confidence}%
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textMuted">
                    Prepared because: {draft.preparedBecause}
                  </p>
                  <p className="mt-2 rounded-lg border border-warning/30 bg-warningSoft/10 px-2 py-1.5 text-fine leading-snug text-warning">
                    Human review: {draft.reviewNeed}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(draft.command)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Preview draft
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                <Search className="h-4 w-4" aria-hidden />
                Operational Search Engine
              </p>
              <p className="mt-1 max-w-3xl text-meta leading-snug text-textMuted">
                Search is framed around operational intent, not keywords. Lenses understand plans,
                workflows, approvals, drafts, memories, opportunities, platforms, conversations, and
                timelines in the context of profession and active goals.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {searchLenses.map((lens) => (
              <article key={lens.scope} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-label font-semibold leading-tight text-text">{lens.scope}</h3>
                    <p className="mt-1 text-fine leading-snug text-textMuted">{lens.intent}</p>
                  </div>
                  <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(lens.tone))}>
                    lens
                  </span>
                </div>
                <p className="mt-2 text-fine leading-snug text-textSoft">{lens.coverage}</p>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void runCommand(lens.command)}
                  className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                >
                  Search this
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_1fr]">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <GitBranch className="h-4 w-4" aria-hidden />
              AI Workflow Composer
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Natural-language workflow drafts use recommended steps, integrations, approvals, and
              timeline hints. They stay drafts until approved.
            </p>
            <div className="mt-3 space-y-2">
              {composerDrafts.map((draft) => (
                <article key={draft.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{draft.title}</h3>
                      <p className="mt-1 text-fine leading-snug text-textMuted">Trigger: {draft.trigger}</p>
                    </div>
                    <span className="rounded-full border border-border/35 bg-bg/50 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                      {draft.confidence}%
                    </span>
                  </div>
                  <ol className="mt-2 space-y-1 text-fine leading-snug text-textMuted">
                    {draft.steps.slice(0, 5).map((step, index) => (
                      <li key={`${draft.id}-${step}`}>
                        {index + 1}. {step}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 rounded-lg border border-border/30 bg-bgElevated/55 px-2 py-1.5 text-fine leading-snug text-textSoft">
                    Integrations: {draft.integrations.join(', ')} · Timeline: {draft.timeline}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(draft.command)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Compose workflow
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Radar className="h-4 w-4" aria-hidden />
              Opportunity Radar
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              {snapshot.predictiveOpportunityLayer.headline} Every radar item includes confidence,
              impact, and one-click conversion into an operational plan.
            </p>
            <div className="mt-3 space-y-2">
              {radarItems.map((item) => (
                <article key={item.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-fine leading-snug text-textMuted">
                        {item.expectedImpact}
                      </p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(confidenceTone(item.confidence)))}>
                      {item.confidence}%
                    </span>
                  </div>
                  <p className="mt-2 text-fine leading-snug text-textSoft">
                    Why now: {item.whyThisAppeared}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void runCommand(item.previewCommand)}
                      className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-meta text-text disabled:opacity-45', btnFocus)}
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => onConvertPredictiveOpportunityToPlan(item)}
                      className={clsx('rounded-lg border border-success/45 bg-successSoft/20 px-2 py-1.5 text-meta text-success', btnFocus)}
                    >
                      Make plan
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-bgElevated/65 p-3.5">
            <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
              <Timer className="h-4 w-4" aria-hidden />
              Operational Time Intelligence
            </p>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Time is treated as an operating layer: deadlines, patterns, overload, publishing,
              outreach, and review windows shape the next suggested move.
            </p>
            <div className="mt-3 space-y-2">
              {timeItems.map((item) => (
                <article key={item.label} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-label font-semibold leading-tight text-text">{item.label}</h3>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{item.detail}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(item.tone))}>
                      {item.tone}
                    </span>
                  </div>
                  {item.command ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void runCommand(item.command!)}
                      className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                    >
                      Improve timing
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
          <p className="text-meta font-semibold uppercase tracking-wide text-textSoft">
            OS continuity
          </p>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            ASK generates thinking, PLAN structures operations, OPERATE executes through supported
            integrations after approval, and VERIFY keeps receipts, provenance, memory influence,
            and human controls visible.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={clsx(mobileChipClass(btnFocus), 'text-fine')}
            >
              ASK to PLAN
            </button>
            <button
              type="button"
              onClick={onOpenIntegrations}
              className={clsx(mobileChipClass(btnFocus), 'text-fine')}
            >
              OPERATE platforms
            </button>
            <button
              type="button"
              onClick={onOpenToday}
              className={clsx(mobileChipClass(btnFocus), 'text-fine')}
            >
              VERIFY timeline
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export const MobileWorkspaceHubView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  onOpenToday,
  launchAccess,
  onOpenSettings,
  onOpenIntegrations,
  onOpenCommandPalette,
  firstRunJourneyVisible = false,
  canRunWorkspaceCommands,
  workspaceCommandLockReason,
  onDownloadPipelineRun: _onDownloadPipelineRun,
  onApproveOperatorTrace,
  onRejectOperatorTrace = () => {},
  onConvertPredictiveOpportunityToPlan = () => {},
  onConvertContentIdeationToPlan = () => {},
  onConvertWorkflowPredictionToPlan = () => {},
  onDeleteMemoryContext: _onDeleteMemoryContext = () => {},
  onDisableMemoryContext: _onDisableMemoryContext = () => {},
  onExportOperationalPlan = () => {},
  onExportExecutionReceipt = () => {},
  convertedOperationalPlans = []
}: MobileWorkspaceHubViewProps) => {
  const [pinnedBoardCards, setPinnedBoardCards] = useState<Set<string>>(() => new Set());
  const [archivedBoardCards, setArchivedBoardCards] = useState<Set<string>>(() => new Set());
  const [duplicatedBoardCards, setDuplicatedBoardCards] = useState<Set<string>>(() => new Set());
  const [savedBoardCards, setSavedBoardCards] = useState<Set<string>>(() => new Set());
  const pinCard = (id: string) => setPinnedBoardCards((current) => flipSetValue(current, id));
  const archiveCard = (id: string) => setArchivedBoardCards((current) => flipSetValue(current, id));
  const duplicateCard = (id: string) => setDuplicatedBoardCards((current) => flipSetValue(current, id));
  const saveCard = (id: string) => setSavedBoardCards((current) => flipSetValue(current, id));
  const profileIncomplete =
    snapshot.operatorName.trim() === defaultBrandProfile.operatorName.trim() ||
    !snapshot.primaryOffer.trim() ||
    !snapshot.voiceGuide.trim() ||
    !snapshot.focusMetric.trim();
  const showSetupHint = profileIncomplete && !firstRunJourneyVisible;
  const lockHint = planAgentLockCopy(workspaceCommandLockReason);
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const twin = snapshot.activeDigitalTwin;
  const planCards = [...convertedOperationalPlans, ...buildOperationalPlanCards(snapshot)];
  const activePlans = planCards
    .filter((plan) => !archivedBoardCards.has(`plan-${plan.id}`))
    .slice(0, 6);
  const suggestions = buildBoardSuggestions({
    snapshot,
    onConvertPredictiveOpportunityToPlan,
    onConvertContentIdeationToPlan,
    onConvertWorkflowPredictionToPlan
  }).filter((item) => !archivedBoardCards.has(`recommendation-${item.id}`));
  const opportunities = snapshot.predictiveOpportunityLayer.suggestions
    .filter((item) => !archivedBoardCards.has(`opportunity-${item.id}`))
    .slice(0, 6);
  const sortedQueue = sortRowsSoonestFirst(snapshot.pulseTimelineRows).slice(0, 5);
  const approvals = snapshot.planPendingReviewPeek
    .filter((item) => !archivedBoardCards.has(`approval-${item.id}`))
    .slice(0, 4);
  const timelineItems = snapshot.crossPlatformOperationalTimeline.items
    .filter((item) => !archivedBoardCards.has(`timeline-${item.id}`))
    .slice(0, 6);
  const receipts = snapshot.planExecutionReceipts.slice(0, 4);
  const failedCount =
    snapshot.crossPlatformOperationalTimeline.countsByKind['failed-operation'] +
    snapshot.planExecutionReceipts.filter((receipt) => receipt.warningsErrors.length > 0).length +
    snapshot.recentAiPipelineRuns.filter((run) => run.status === 'failure').length;
  const scheduledCount =
    snapshot.crossPlatformOperationalTimeline.countsByKind['scheduled-workflow'] +
    snapshot.dueTodayTasks +
    snapshot.queuedPublishing;
  const inProgressCount = planCards.filter((plan) => plan.status === 'in-progress').length;
  const readyCount = planCards.filter((plan) => plan.status === 'ready').length;
  const connectedPlatforms = snapshot.platformAwareAsk.connectedApps.length
    ? snapshot.platformAwareAsk.connectedApps
    : snapshot.integrationHubSources.map((source) => source.name);
  const operationalCore = snapshot.operationalIntelligenceCore;
  const dailyLoop = snapshot.dailyOperatingLoop;
  const missingOperationalCoreQuestion = operationalCore.missingFactQuestions[0];
  const topChiefOfStaffAlert = dailyLoop.chiefOfStaffAlerts[0];
  const topRelationshipMemory = dailyLoop.relationshipMemory[0];
  const activeExpertNames = snapshot.expertOperator.generatedUsing.slice(0, 3);
  const professionMode = professionModeCopy(snapshot.expertOperator.professionPath);
  const platformCards = snapshot.platformActionCards.slice(0, 6);
  const pulseState =
    failedCount > 0
      ? `${failedCount} attention`
      : snapshot.planPendingReviewCount > 0
        ? `${snapshot.planPendingReviewCount} approvals`
        : suggestions.length > 0
          ? `${suggestions.length} suggestions`
          : 'clear';
  const modeCards: Array<{
    mode: OperationalModeId;
    title: string;
    metric: string;
    detail: string;
    tone: BoardTone;
  }> = [
    {
      mode: 'ASK' as const,
      title: 'Strategic intelligence',
      metric: `${snapshot.expertOperator.ask.confidence}%`,
      detail: activeExpertNames.length
        ? `Routed through ${activeExpertNames.join(', ')}.`
        : 'Routes questions through operational experts when context is available.',
      tone: 'primary' as const
    },
    {
      mode: 'PLAN' as const,
      title: 'Execution board',
      metric: `${planCards.length}`,
      detail: `${readyCount} ready plan${readyCount === 1 ? '' : 's'} and ${inProgressCount} in progress.`,
      tone: planCards.length ? 'info' : 'muted'
    },
    {
      mode: 'OPERATE' as const,
      title: 'Approval-gated action',
      metric: `${snapshot.planPendingReviewCount}`,
      detail: 'Drafts, sends, schedules, syncs, and workspace changes wait for human approval.',
      tone: snapshot.planPendingReviewCount ? 'warning' : 'success'
    },
    {
      mode: 'VERIFY' as const,
      title: 'Receipts and trust',
      metric: `${snapshot.planExecutionReceipts.length}`,
      detail: 'Every AI action keeps experts, data used, reasoning summary, status, and warnings visible.',
      tone: failedCount ? 'danger' : 'success'
    }
  ];
  const memoryGraphNodes = buildMemoryGraphNodes(snapshot, connectedPlatforms, professionMode);
  const pulseItems = buildWorkspacePulseItems(snapshot, suggestions);
  const twinProgress = buildTwinProgressIndicators(snapshot);
  const contextualSurface = buildContextualSurface(snapshot);
  const personaModes = buildPersonaModes(
    snapshot,
    contextualSurface,
    planCards.length,
    scheduledCount,
    failedCount
  );
  const composerDrafts = buildWorkflowComposerDrafts(snapshot, connectedPlatforms);
  const briefingItems = buildExecutiveBriefingItems(
    snapshot,
    suggestions,
    sortedQueue,
    failedCount,
    contextualSurface
  );
  const timeItems = buildTimeIntelligenceItems(snapshot, sortedQueue, scheduledCount);
  const ambientSignals = buildAmbientSignals(snapshot, contextualSurface, pulseItems, sortedQueue);
  const energyMetrics = buildEnergyMetrics({
    snapshot,
    planCount: planCards.length,
    readyCount,
    inProgressCount,
    scheduledCount,
    failedCount,
    suggestionsCount: suggestions.length
  });
  const simulations = buildStrategicSimulations(snapshot, contextualSurface);
  const twinEcosystem = buildTwinEcosystem(snapshot, connectedPlatforms);
  const autonomousDrafts = buildAutonomousDrafts(snapshot, contextualSurface, sortedQueue);
  const brainSignals = buildBrainSignals(snapshot, energyMetrics, contextualSurface);
  const searchLenses = buildSearchLenses(snapshot);
  const deepWorkState = buildDeepWorkState(
    snapshot,
    contextualSurface,
    energyMetrics,
    sortedQueue
  );
  const operatingTimeline = buildOperatingTimelineEvents(
    snapshot,
    pulseItems,
    composerDrafts,
    autonomousDrafts
  );
  const operationalGraph = buildOperationalGraphIntelligence(
    snapshot,
    contextualSurface,
    connectedPlatforms
  );
  const strategicReflections = buildStrategicReflections(
    snapshot,
    energyMetrics,
    contextualSurface
  );
  const adaptiveLayout = buildAdaptiveLayoutState(
    snapshot,
    contextualSurface,
    deepWorkState,
    energyMetrics
  );
  const intelligenceScores = buildIntelligenceScores(snapshot, energyMetrics, operatingTimeline);
  const sandboxScenarios = buildSandboxScenarios(snapshot, contextualSurface, simulations);
  const cofounderInsights = buildCofounderInsights(
    snapshot,
    strategicReflections,
    energyMetrics,
    contextualSurface
  );
  const preparationAssets = buildPreparationAssets(
    snapshot,
    sortedQueue,
    autonomousDrafts,
    contextualSurface
  );

  return (
    <div className="space-y-3" aria-label="Plan">
      <span className="sr-only">
        Plan turns ASK ideas into structured workflows, approvals, timelines, receipts, and
        execution steps.
      </span>

      <div className={SHEET}>
        <div className={ROW}>
          <PlanIdentityHeader
            variant="sheet"
            btnFocus={btnFocus}
            operatorName={snapshot.operatorName}
            positioningPreview={snapshot.positioning}
            launchAccess={launchAccess}
            onOpenSettings={onOpenSettings}
            activeDigitalTwin={snapshot.activeDigitalTwin}
            connectedPlatforms={connectedPlatforms}
            predictiveOpportunityCount={snapshot.predictiveOpportunityLayer.totalCount}
            activePlanCount={planCards.length}
            approvalCount={snapshot.planPendingReviewCount}
          />
        </div>

        <section className={clsx(ROW, 'pt-1')} aria-labelledby="plan-board-heading">
          <div className="rounded-2xl border border-primary/25 bg-primarySoft/10 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                  <span className="bo-operational-pulse" aria-hidden />
                  Operational Command Board
                </p>
                <h1 id="plan-board-heading" className="mt-1 text-h2 text-text">
                  Plan
                </h1>
                <p className="mt-1.5 max-w-2xl text-meta leading-snug text-textMuted">
                  Everything operational lives here: twin status, recommended actions, approvals,
                  opportunities, active plans, saved insights, activity, and receipts.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className={clsx('bo-btn-primary bo-btn-primary--sm', btnFocus)}
                >
                  Add plan
                </button>
                <button
                  type="button"
                  onClick={onOpenToday}
                  className={clsx(mobileChipClass(btnFocus), 'text-meta')}
                >
                  Open Today
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              <SummaryTile
                label="Twin Status"
                value={twin?.confidenceScore ?? 0}
                detail={twin ? `${twin.displayName} active` : 'Create a digital twin'}
                tone={twin ? 'success' : 'warning'}
              />
              <SummaryTile
                label="Recommended Actions"
                value={suggestions.length}
                detail={suggestions[0]?.title || 'No recommendation yet'}
                tone={suggestions.length ? 'primary' : 'muted'}
              />
              <SummaryTile
                label="Pending Approvals"
                value={snapshot.planPendingReviewCount}
                detail="Review before anything changes"
                tone={snapshot.planPendingReviewCount ? 'warning' : 'success'}
              />
              <SummaryTile
                label="Opportunities"
                value={Math.max(opportunities.length, snapshot.predictiveOpportunityLayer.totalCount)}
                detail={opportunities[0]?.title || 'No opportunity signal yet'}
                tone={opportunities.length || snapshot.predictiveOpportunityLayer.totalCount ? 'success' : 'muted'}
              />
              <SummaryTile
                label="Active Plans"
                value={activePlans.length}
                detail={`${readyCount} ready, ${inProgressCount} in progress`}
                tone={activePlans.length ? 'info' : 'muted'}
              />
            </div>

            <div className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                    Operational pulse
                  </p>
                  <p className="mt-1 text-meta leading-snug text-textMuted">
                    {pulseState} · {professionMode.label} · {snapshot.expertOperator.workflowType.replace(/_/g, ' ')} workflow
                  </p>
                </div>
                <span className={clsx('rounded-full border px-2 py-1 text-fine font-semibold uppercase', toneClass(failedCount ? 'danger' : snapshot.planPendingReviewCount ? 'warning' : 'success'))}>
                  {failedCount ? 'attention' : snapshot.planPendingReviewCount ? 'review' : 'stable'}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-primary/30 bg-bgElevated/70 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                    Daily Operating Loop
                  </p>
                  <h2 className="mt-1 text-h3 text-text">{dailyLoop.greeting}</h2>
                  <p className="mt-1 text-meta leading-snug text-textMuted">
                    {dailyLoop.headline}. {dailyLoop.morningBriefing}
                  </p>
                </div>
                <div className="rounded-2xl border border-success/35 bg-successSoft/15 px-3 py-2 text-right">
                  <p className="text-overline font-bold uppercase tracking-wide text-success">
                    Workspace Health
                  </p>
                  <p className="text-h3 text-text">{dailyLoop.workspaceHealth.score}/100</p>
                  <p className="text-fine text-textMuted">{dailyLoop.workspaceHealth.label}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {dailyLoop.metrics.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                        {item.label}
                      </p>
                      <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(item.tone))}>
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-fine leading-snug text-textMuted">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/35 px-3 py-2">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Health categories
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dailyLoop.workspaceHealth.categories.map((item) => (
                    <span
                      key={item.id}
                      className={clsx('rounded-full border px-2 py-1 text-fine font-semibold', toneClass(item.tone))}
                      title={item.improvement}
                    >
                      {item.label} {item.score}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                    Recommended priority
                  </p>
                  <div className="mt-2 space-y-2">
                    {dailyLoop.recommendedPriorities.length ? (
                      dailyLoop.recommendedPriorities.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primarySoft/15 text-overline font-bold text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-label font-semibold leading-tight text-text">{item.title}</p>
                            <p className="line-clamp-2 text-fine leading-snug text-textMuted">{item.detail}</p>
                          </div>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void runCommand(item.command)}
                            className={clsx(mobileChipClass(btnFocus), 'shrink-0 text-fine disabled:opacity-50')}
                          >
                            Preview
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-fine leading-snug text-textMuted">
                        Answer the next missing fact to unlock stronger daily priorities.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                    AI Chief of Staff
                  </p>
                  {topChiefOfStaffAlert ? (
                    <>
                      <h3 className="mt-2 text-label font-semibold text-text">{topChiefOfStaffAlert.title}</h3>
                      <p className="mt-1 text-fine leading-snug text-textMuted">{topChiefOfStaffAlert.detail}</p>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(topChiefOfStaffAlert.command)}
                        className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                      >
                        Review alert
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 text-fine leading-snug text-textMuted">
                      No urgent alert. BrandOps will flag stalled follow-ups, pending approvals, weak cadence, and health gaps here.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                    Strategic gaps
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dailyLoop.strategicGaps.slice(0, 4).map((gap) => (
                      <button
                        key={gap.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(gap.command)}
                        className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
                      >
                        Missing: {gap.title}
                      </button>
                    ))}
                    {dailyLoop.strategicGaps.length === 0 ? (
                      <span className="text-fine text-textMuted">No major strategic gap detected.</span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                    End-of-day reflection
                  </p>
                  <p className="mt-1 text-fine leading-snug text-textMuted">
                    {dailyLoop.endOfDayReflection.headline}
                  </p>
                  <p className="mt-1 text-fine leading-snug text-textSoft">
                    Tomorrow: {dailyLoop.tomorrowPreview.slice(0, 3).join(' · ') || 'Review the next priority.'}
                  </p>
                </div>
              </div>

              {topRelationshipMemory ? (
                <div className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                        Relationship Memory
                      </p>
                      <p className="mt-1 text-label font-semibold text-text">{topRelationshipMemory.name}</p>
                      <p className="text-fine leading-snug text-textMuted">
                        {topRelationshipMemory.signal} · {topRelationshipMemory.nextAction}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void runCommand(topRelationshipMemory.command)}
                      className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
                    >
                      Build capsule
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-primary/25 bg-primarySoft/10 px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                    Operational Intelligence Core
                  </p>
                  <p className="mt-1 text-label font-semibold leading-tight text-text">
                    {operationalCore.headline}
                  </p>
                  <p className="mt-1 text-fine leading-snug text-textMuted">
                    {operationalCore.operatingStance}
                  </p>
                </div>
                <span className="rounded-full border border-border/45 bg-bgSubtle px-2 py-1 text-fine font-semibold uppercase text-textMuted">
                  {operationalCore.receiptContext.pendingApprovals} approvals
                </span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {operationalCore.briefing.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/30 bg-bgElevated/55 px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                        {item.label}
                      </p>
                      <span className={clsx('rounded-full border px-1.5 py-0.5 text-overline font-bold uppercase', toneClass(item.tone))}>
                        {item.tone}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-fine leading-snug text-textMuted">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
              {missingOperationalCoreQuestion ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void runCommand(missingOperationalCoreQuestion.command)}
                  className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                >
                  Answer next missing fact
                </button>
              ) : null}
            </div>

            {showSetupHint ? (
              <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
                Add your offer, voice, and focus metric in Setup to make plans more specific.
              </p>
            ) : null}
          </div>
        </section>

        <section className={ROW} aria-labelledby="plan-ownership-heading">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                  Plan owns the operation
                </p>
                <h2 id="plan-ownership-heading" className="mt-1 text-h3 text-text">
                  One place to manage BrandOps
                </h2>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  If it creates, changes, configures, approves, tracks, or connects something, it
                  belongs in Plan.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                <div className="flex items-center gap-2 text-text">
                  <UserRound className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-label font-semibold">Twin, DNA, and memory</h3>
                </div>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  Create the twin, manage Workspace DNA, approve memory, and tune settings.
                </p>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine')}
                >
                  Open Setup
                </button>
              </article>
              <article className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                <div className="flex items-center gap-2 text-text">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-label font-semibold">Actions and plans</h3>
                </div>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  Convert Ask insights, review recommendations, and manage active work.
                </p>
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine')}
                >
                  Browse actions
                </button>
              </article>
              <article className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                <div className="flex items-center gap-2 text-text">
                  <Network className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-label font-semibold">Sources and integrations</h3>
                </div>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  Connect platforms and keep operational context visible in one workspace.
                </p>
                <button
                  type="button"
                  onClick={onOpenIntegrations}
                  className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine')}
                >
                  Open Sources
                </button>
              </article>
              <article className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
                <div className="flex items-center gap-2 text-text">
                  <Activity className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-label font-semibold">Activity and receipts</h3>
                </div>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  Review timelines, notifications, receipts, and completed operational work.
                </p>
                <button
                  type="button"
                  onClick={onOpenToday}
                  className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine')}
                >
                  Open Activity
                </button>
              </article>
            </div>
          </div>
        </section>

        <div className={ROW}>
          <PlanUnifiedOperationalInbox
            snapshot={snapshot}
            btnFocus={btnFocus}
            commandBusy={commandBusy}
            canRunWorkspaceCommands={canRunWorkspaceCommands}
            runCommand={runCommand}
          />
        </div>

        <section className={ROW} aria-labelledby="recommended-next-actions-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
                Recommended Actions
              </p>
              <h2 id="recommended-next-actions-heading" className="mt-1 text-h3 text-text">
                What should I do next?
              </h2>
              <p className="mt-1 text-meta leading-snug text-textMuted">
                Simple next moves from current plans, approvals, opportunities, twin context, and
                supported integrations.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={clsx(mobileChipClass(btnFocus), 'text-meta')}
            >
              Browse actions
            </button>
          </div>

          {suggestions.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No recommendations yet"
                body="Ask a question, convert an ASK output, connect a tool, or add workspace activity and BrandOps will recommend the next move."
              />
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {suggestions.map((item) => {
                const cardId = `recommendation-${item.id}`;
                return (
                  <details
                    key={item.id}
                    className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5"
                  >
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                            RecommendationCard · {item.source}
                          </p>
                          <h3 className="mt-1 text-label font-semibold text-text">{item.title}</h3>
                          <p className="mt-1 line-clamp-2 text-meta leading-snug text-textMuted">
                            {item.detail}
                          </p>
                        </div>
                        {typeof item.confidence === 'number' ? (
                          <span className="rounded-full border border-border/45 bg-bgSubtle px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                            {item.confidence}% fit
                          </span>
                        ) : null}
                      </div>
                    </summary>
                    <div className="mt-3 rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textSoft">
                      <p><span className="font-semibold text-text">Why now:</span> {item.why}</p>
                      <p className="mt-1"><span className="font-semibold text-text">What happens next:</span> Preview it, save it, or convert it into a PLAN draft. External action still requires approval.</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-meta">
                      <BoardCardControl
                        btnFocus={btnFocus}
                        disabled={disabled}
                        onClick={() => {
                          if (item.onPrimary) item.onPrimary();
                          else void runCommand(item.command);
                        }}
                      >
                        Start
                      </BoardCardControl>
                      <BoardCardControl
                        btnFocus={btnFocus}
                        disabled={disabled}
                        onClick={() => void runCommand(item.command)}
                      >
                        Preview
                      </BoardCardControl>
                    </div>
                    <BoardCardUtilityControls
                      id={cardId}
                      btnFocus={btnFocus}
                      pinned={pinnedBoardCards}
                      archived={archivedBoardCards}
                      duplicated={duplicatedBoardCards}
                      saved={savedBoardCards}
                      onPin={pinCard}
                      onArchive={archiveCard}
                      onDuplicate={duplicateCard}
                      onSave={saveCard}
                    />
                  </details>
                );
              })}
            </div>
          )}
        </section>

        <section className={ROW} aria-labelledby="active-plans-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                Active plans
              </p>
              <h2 id="active-plans-heading" className="mt-1 text-h3 text-text">
                What exists and what happens next
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={clsx(mobileChipClass(btnFocus), 'text-meta')}
            >
              Create another
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {activePlans.map((plan) => (
              <article
                key={plan.id}
                className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5"
                aria-labelledby={`${plan.id}-heading`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                      PlanCard · {plan.sourceLabel ?? 'Plan'}
                    </p>
                    <h3 id={`${plan.id}-heading`} className="mt-1 text-label font-semibold text-text">
                      {plan.title}
                    </h3>
                  </div>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                      toneClass(planTone(plan.status))
                    )}
                  >
                    {statusLabel(plan.status)}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2 text-fine text-textSoft">
                    <span>Progress</span>
                    <span>{plan.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full border border-border/30 bg-bgSubtle">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${plan.progress}%` }} />
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-meta">
                  <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                    <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                      What this is
                    </p>
                    <p className="mt-1 leading-snug text-textMuted">{plan.promise}</p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                    <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                      Next step
                    </p>
                    <p className="mt-1 leading-snug text-textMuted">{activeNextStep(plan)}</p>
                  </div>
                </div>

                <details className="mt-3 rounded-xl border border-border/30 bg-bgSubtle/35 px-2.5 py-2">
                  <summary className="cursor-pointer list-none text-fine font-semibold uppercase tracking-wide text-textSoft [&::-webkit-details-marker]:hidden">
                    Expand workflow, timeline, approvals, assets, and activity
                  </summary>
                  <div className="mt-2 grid gap-2 text-fine leading-snug text-textMuted sm:grid-cols-2">
                    <div className="rounded-lg border border-border/25 bg-bgElevated/45 px-2 py-1.5">
                      <span className="font-semibold text-text">Workflow:</span>{' '}
                      {plan.timeline.join(' -> ')}
                    </div>
                    <div className="rounded-lg border border-border/25 bg-bgElevated/45 px-2 py-1.5">
                      <span className="font-semibold text-text">Approvals:</span> Preview and approve
                      before execution.
                    </div>
                    <div className="rounded-lg border border-border/25 bg-bgElevated/45 px-2 py-1.5">
                      <span className="font-semibold text-text">Generated assets:</span>{' '}
                      {plan.exportPayload ? Object.keys(plan.exportPayload).slice(0, 4).join(', ') : 'Plan preview'}
                    </div>
                    <div className="rounded-lg border border-border/25 bg-bgElevated/45 px-2 py-1.5">
                      <span className="font-semibold text-text">Activity log:</span> Created from{' '}
                      {plan.sourceLabel ?? 'workspace context'}.
                    </div>
                  </div>
                </details>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-meta">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(plan.previewCommand)}
                    className={clsx(
                      'rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-text disabled:opacity-45',
                      btnFocus
                    )}
                  >
                    <Eye className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(plan.approveCommand)}
                    className={clsx(
                      'rounded-lg border border-success/45 bg-successSoft/20 px-2 py-1.5 text-success disabled:opacity-45',
                      btnFocus
                    )}
                  >
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (plan.editTarget === 'settings') onOpenSettings();
                      else if (plan.editTarget === 'today') onOpenToday();
                      else onOpenCommandPalette();
                    }}
                    className={clsx(
                      'rounded-lg border border-border/45 bg-bgSubtle/60 px-2 py-1.5 text-text',
                      btnFocus
                    )}
                  >
                    <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportOperationalPlan(plan)}
                    className={clsx(
                      'rounded-lg border border-border/45 bg-bgSubtle/60 px-2 py-1.5 text-text',
                      btnFocus
                    )}
                  >
                    <Download className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    Export
                  </button>
                </div>
                <BoardCardUtilityControls
                  id={`plan-${plan.id}`}
                  btnFocus={btnFocus}
                  pinned={pinnedBoardCards}
                  archived={archivedBoardCards}
                  duplicated={duplicatedBoardCards}
                  saved={savedBoardCards}
                  onPin={pinCard}
                  onArchive={archiveCard}
                  onDuplicate={duplicateCard}
                  onSave={saveCard}
                />
              </article>
            ))}
          </div>
        </section>

        <section
          id="plan-human-approval-queue"
          className={ROW}
          aria-labelledby="pending-approvals-heading"
        >
          <div className="rounded-2xl border border-warning/35 bg-warningSoft/10 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-warning">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Pending approvals
                </p>
                <h2 id="pending-approvals-heading" className="mt-1 text-h3 text-text">
                  Review before anything changes
                </h2>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  These items need your decision before BrandOps takes the next step.
                </p>
              </div>
              <span className="rounded-full border border-warning/35 bg-bgElevated px-2 py-1 text-fine font-semibold text-warning">
                {snapshot.planPendingReviewCount} pending
              </span>
            </div>

            {approvals.length === 0 ? (
              <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
                No pending approvals. New drafts, scheduled actions, and generated outputs that need
                your review will appear here.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {approvals.map((item) => (
                  <article key={item.id} className="rounded-xl border border-border/40 bg-bgElevated/65 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-fine font-semibold uppercase tracking-wide text-warning">
                          ApprovalCard
                        </p>
                        <h3 className="text-label font-semibold text-text">{item.verb}</h3>
                        <p className="mt-1 text-meta leading-snug text-textMuted">
                          {item.preview || 'No preview captured yet.'}
                        </p>
                      </div>
                      <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass('warning'))}>
                        Waiting
                      </span>
                    </div>
                    <details className="mt-3 rounded-xl border border-border/30 bg-bgSubtle/35 px-2.5 py-2">
                      <summary className="cursor-pointer list-none text-fine font-semibold uppercase tracking-wide text-textSoft [&::-webkit-details-marker]:hidden">
                        Why this needs approval
                      </summary>
                      <p className="mt-2 text-fine leading-snug text-textMuted">
                        {item.annotatorNote || 'BrandOps needs your review before the next action can change workspace or external state.'}
                      </p>
                    </details>
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-meta sm:grid-cols-5">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(approvalPrompt('Preview the item', item))}
                        className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-text disabled:opacity-45', btnFocus)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(approvalPrompt('Edit this approval item', item))}
                        className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-text disabled:opacity-45', btnFocus)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(approvalPrompt('Regenerate this approval item', item))}
                        className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-text disabled:opacity-45', btnFocus)}
                      >
                        Regenerate
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void onRejectOperatorTrace(item.id)}
                        className={clsx('rounded-lg border border-danger/40 bg-dangerSoft/15 px-2 py-1.5 text-danger disabled:opacity-45', btnFocus)}
                      >
                        <XCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void onApproveOperatorTrace(item.id)}
                        className={clsx('rounded-lg border border-success/45 bg-successSoft/20 px-2 py-1.5 text-success disabled:opacity-45', btnFocus)}
                      >
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        Approve
                      </button>
                    </div>
                    <BoardCardUtilityControls
                      id={`approval-${item.id}`}
                      btnFocus={btnFocus}
                      pinned={pinnedBoardCards}
                      archived={archivedBoardCards}
                      duplicated={duplicatedBoardCards}
                      saved={savedBoardCards}
                      onPin={pinCard}
                      onArchive={archiveCard}
                      onDuplicate={duplicateCard}
                      onSave={saveCard}
                    />
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={ROW} aria-labelledby="opportunity-feed-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                <Radar className="h-4 w-4" aria-hidden />
                Opportunities
              </p>
              <h2 id="opportunity-feed-heading" className="mt-1 text-h3 text-text">
                What opportunities exist?
              </h2>
              <p className="mt-1 text-meta leading-snug text-textMuted">
                Growth, positioning, outreach, content, and workflow openings from the current
                workspace signals.
              </p>
            </div>
          </div>

          {opportunities.length === 0 ? (
            <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
              No opportunity signals yet. ASK outputs, twin memory, connected platforms, and activity
              will feed this stream.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {opportunities.map((item) => {
                const cardId = `opportunity-${item.id}`;
                return (
                  <details
                    key={item.id}
                    className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5"
                  >
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                            OpportunityCard · {item.kind.replace(/-/g, ' ')}
                          </p>
                          <h3 className="mt-1 text-label font-semibold text-text">{item.title}</h3>
                          <p className="mt-1 line-clamp-2 text-meta leading-snug text-textMuted">
                            {item.suggestion}
                          </p>
                        </div>
                        <span className="rounded-full border border-success/45 bg-successSoft/15 px-2 py-0.5 text-overline font-bold uppercase text-success">
                          {item.confidence}% confidence
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3 grid gap-2 text-fine leading-snug text-textMuted">
                      <p className="rounded-lg border border-border/25 bg-bgSubtle/45 px-2 py-1.5">
                        <span className="font-semibold text-text">Impact score:</span>{' '}
                        {item.expectedImpact}
                      </p>
                      <p className="rounded-lg border border-border/25 bg-bgSubtle/45 px-2 py-1.5">
                        <span className="font-semibold text-text">Source signal:</span>{' '}
                        {item.supportingSignals.slice(0, 3).join(' · ') || item.whyThisAppeared}
                      </p>
                      <p className="rounded-lg border border-border/25 bg-bgSubtle/45 px-2 py-1.5">
                        <span className="font-semibold text-text">Why now:</span>{' '}
                        {item.whyThisAppeared}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-meta">
                      <BoardCardControl
                        btnFocus={btnFocus}
                        onClick={() => onConvertPredictiveOpportunityToPlan(item)}
                      >
                        Convert to plan
                      </BoardCardControl>
                      <BoardCardControl
                        btnFocus={btnFocus}
                        disabled={disabled}
                        onClick={() => void runCommand(item.previewCommand)}
                      >
                        Preview
                      </BoardCardControl>
                    </div>
                    <BoardCardUtilityControls
                      id={cardId}
                      btnFocus={btnFocus}
                      pinned={pinnedBoardCards}
                      archived={archivedBoardCards}
                      duplicated={duplicatedBoardCards}
                      saved={savedBoardCards}
                      onPin={pinCard}
                      onArchive={archiveCard}
                      onDuplicate={duplicateCard}
                      onSave={saveCard}
                    />
                  </details>
                );
              })}
            </div>
          )}
        </section>

        <section className={ROW} aria-labelledby="saved-ask-insights-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                Saved insights from Ask My Twin
              </p>
              <h2 id="saved-ask-insights-heading" className="mt-1 text-h3 text-text">
                Thinking ready to become operations
              </h2>
              <p className="mt-1 text-meta leading-snug text-textMuted">
                Ask stays conversational. Saved, pinned, or converted answers show up here as plan,
                mission, memory, positioning, content, or outreach inputs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCommandPalette()}
              className={clsx(mobileChipClass(btnFocus), 'text-meta')}
            >
              Add from Ask
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {convertedOperationalPlans.length ? (
              convertedOperationalPlans.slice(0, 4).map((plan) => (
                <article key={plan.id} className="rounded-xl border border-border/40 bg-bgElevated/60 p-3">
                  <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                    Converted from Ask My Twin
                  </p>
                  <h3 className="mt-1 text-label font-semibold text-text">{plan.title}</h3>
                  <p className="mt-1 line-clamp-2 text-meta leading-snug text-textMuted">
                    {plan.promise}
                  </p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(plan.previewCommand)}
                    className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                  >
                    Preview as plan
                  </button>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta leading-snug text-textMuted">
                No saved Ask insights yet. Use Save, Pin, or Convert to Plan from Ask My Twin when a
                conversation produces something operational.
              </p>
            )}
          </div>
        </section>

        <section className={ROW} aria-labelledby="timeline-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                <Clock3 className="h-4 w-4" aria-hidden />
                Operational Timeline
              </p>
              <h2 id="timeline-heading" className="mt-1 text-h3 text-text">
                What has already happened?
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenToday}
              className={clsx(mobileChipClass(btnFocus), 'text-meta')}
            >
              Open full Today
            </button>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-2">
              {timelineItems.length === 0 ? (
                <p className="rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
                  No activity yet. Approved plans, scheduled tasks, drafts, and platform previews
                  will appear here.
                </p>
              ) : (
                timelineItems.map((item) => (
                  <article key={item.id} className="rounded-xl border border-border/40 bg-bgElevated/65 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                          TimelineCard · {item.kind.replace(/-/g, ' ')}
                        </p>
                        <h3 className="text-label font-semibold text-text">{item.whatHappened}</h3>
                        <p className="mt-0.5 text-fine text-textSoft">
                          {item.whereItHappened} - {compactTime(item.at)}
                        </p>
                      </div>
                      <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(timelineTone(item)))}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-meta leading-snug text-textMuted">{item.whatAiDid}</p>
                    <details className="mt-2 rounded-lg border border-border/30 bg-bgSubtle/35 px-2 py-1.5">
                      <summary className="cursor-pointer list-none text-fine font-semibold uppercase tracking-wide text-textSoft [&::-webkit-details-marker]:hidden">
                        Activity detail
                      </summary>
                      <p className="mt-1 text-fine leading-snug text-textMuted">
                        Plan created, updated, requested, completed, retried, or reviewed in the
                        workspace timeline. Developer traces stay hidden from this board.
                      </p>
                    </details>
                    {item.command ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(item.command!)}
                        className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                      >
                        {item.kind === 'failed-operation' ? (
                          <RefreshCw className="me-1 inline h-3 w-3 align-text-bottom" aria-hidden />
                        ) : (
                          <CirclePlay className="me-1 inline h-3 w-3 align-text-bottom" aria-hidden />
                        )}
                        {item.kind === 'failed-operation' ? 'Retry' : 'Inspect'}
                      </button>
                    ) : null}
                    <BoardCardUtilityControls
                      id={`timeline-${item.id}`}
                      btnFocus={btnFocus}
                      pinned={pinnedBoardCards}
                      archived={archivedBoardCards}
                      duplicated={duplicatedBoardCards}
                      saved={savedBoardCards}
                      onPin={pinCard}
                      onArchive={archiveCard}
                      onDuplicate={duplicateCard}
                      onSave={saveCard}
                    />
                  </article>
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3">
                <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                  <CalendarCheck2 className="h-4 w-4" aria-hidden />
                  Soonest queue
                </p>
                {sortedQueue.length === 0 ? (
                  <p className="mt-2 text-meta text-textMuted">Nothing queued yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {sortedQueue.map((row) => (
                      <div key={row.id} className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-label font-semibold text-text">{row.title}</p>
                            <p className="mt-0.5 text-fine leading-snug text-textSoft">{row.subtitle}</p>
                          </div>
                          <button
                            type="button"
                            disabled={commandBusy}
                            onClick={() => void runCommand(workspaceQueueCommandLine(row))}
                            className={clsx(mobileChipClass(btnFocus), 'shrink-0 text-fine disabled:opacity-50')}
                          >
                            Run
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3">
                <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-wide text-textSoft">
                  <FileText className="h-4 w-4" aria-hidden />
                  Recent receipts
                </p>
                {receipts.length === 0 ? (
                  <p className="mt-2 text-meta text-textMuted">No receipts yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {receipts.map((receipt) => (
                      <article key={receipt.id} className="rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-label font-semibold text-text">{receipt.action}</p>
                            <p className="mt-0.5 line-clamp-2 text-fine leading-snug text-textSoft">
                              {receipt.reasoningSummary}
                            </p>
                          </div>
                          <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass(receiptTone(receipt.executionStatus)))}>
                            {receipt.executionStatus}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void runCommand(receiptPreviewCommand(receipt))}
                            className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
                          >
                            Explain
                          </button>
                          <button
                            type="button"
                            onClick={() => onExportExecutionReceipt(receipt)}
                            className={clsx(mobileChipClass(btnFocus), 'text-fine')}
                          >
                            Export
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {failedCount ? (
                <div className="rounded-2xl border border-danger/35 bg-dangerSoft/10 p-3">
                  <p className="flex items-start gap-2 text-meta leading-snug text-danger">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {failedCount} item{failedCount === 1 ? '' : 's'} need attention. Review the
                    failed activity or receipt before retrying.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <details className={ROW}>
          <summary className="cursor-pointer rounded-2xl border border-border/40 bg-bgElevated/65 px-3.5 py-3 text-meta font-semibold text-text outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            Advanced workspace intelligence
            <span className="ml-2 font-normal text-textMuted">
              Twin context, safety policy, experts, platform support, and deeper operating memory.
            </span>
          </summary>

          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-4" aria-label="ASK PLAN OPERATE VERIFY mental model">
              {modeCards.map((card) => (
                <ModeCard key={card.mode} {...card} />
              ))}
            </div>

            <ProductionReadinessPath
              snapshot={snapshot}
              btnFocus={btnFocus}
              disabled={disabled}
              runCommand={runCommand}
              onOpenSettings={onOpenSettings}
              onOpenCommandPalette={onOpenCommandPalette}
              onOpenToday={onOpenToday}
            />

            <AutonomyLevelsPanel />

            <WorkspaceIntelligenceCorePanel
              snapshot={snapshot}
              btnFocus={btnFocus}
              disabled={disabled}
              runCommand={runCommand}
              onOpenSettings={onOpenSettings}
            />

            <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2.5">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Digital twin context
                </p>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  {twin
                    ? `${twin.displayName} is active with ${twin.confidenceScore}% confidence. PLAN uses approved profile facts, voice, memory, and current workspace context.`
                    : 'No active digital twin yet. PLAN still works, but profile, voice, and proof improve after setup.'}
                </p>
                <p className="mt-2 rounded-lg border border-border/30 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textSoft">
                  {professionMode.label}: {professionMode.focus} Recommended next move:{' '}
                  {professionMode.recommendedMove} Connected context:{' '}
                  {connectedPlatforms.length ? connectedPlatforms.join(', ') : 'workspace only'}.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className={clsx(mobileChipClass(btnFocus), 'text-fine')}
                  >
                    {twin ? 'Improve twin' : 'Set up profile'}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenIntegrations}
                    className={clsx(mobileChipClass(btnFocus), 'text-fine')}
                  >
                    Connect tools
                  </button>
                  {twin ? (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(twinActionPrompt('draft_outreach', twin))}
                        className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
                      >
                        Create outreach plan
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          void runCommand(twinActionPrompt('create_30_day_content_plan', twin))
                        }
                        className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
                      >
                        Build content plan
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2.5">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Safety rule
                </p>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  Nothing sends, posts, syncs, schedules, or changes workspace records until you
                  preview and approve it.
                </p>
                {lockHint ? (
                  <p className="mt-2 rounded-lg border border-warning/30 bg-warningSoft/15 px-2 py-1.5 text-fine text-warning">
                    {lockHint}
                  </p>
                ) : null}
              </div>
            </div>

            <section aria-labelledby="expert-routing-heading">
              <div className="rounded-2xl border border-info/35 bg-infoSoft/10 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-meta font-semibold uppercase tracking-[0.14em] text-info">
                      Routing experts
                    </p>
                    <h2 id="expert-routing-heading" className="mt-1 text-h3 text-text">
                      Experts activated without exposing hidden reasoning
                    </h2>
                    <p className="mt-1 text-meta leading-snug text-textMuted">
                      BrandOps routes ASK, PLAN, and OPERATE through specialized experts based on
                      profession, workflow, twin memory, behavior, and platform context.
                    </p>
                  </div>
                  <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
                    {snapshot.expertOperator.generatedUsing.length} expert{snapshot.expertOperator.generatedUsing.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </section>

            <section aria-labelledby="platform-intelligence-heading">
              <div className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                      Connected Platform Support
                    </p>
                    <h2 id="platform-intelligence-heading" className="mt-1 text-h3 text-text">
                      Platform actions BrandOps can actually support
                    </h2>
                    <p className="mt-1 text-meta leading-snug text-textMuted">
                      Action cards only appear when connected or approved context exists. Unsupported
                      Gmail, LinkedIn, Calendar, Slack, Notion, HubSpot, or X actions are not faked.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenIntegrations}
                    className={clsx(mobileChipClass(btnFocus), 'text-meta')}
                  >
                    Manage platforms
                  </button>
                </div>

                {platformCards.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-warning/30 bg-warningSoft/10 px-3 py-2 text-meta leading-snug text-warning">
                    No supported platform action cards yet. Connect a source or approve platform
                    summaries before BrandOps suggests external-platform workflows.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {platformCards.map((card) => (
                      <article key={card.id} className="rounded-xl border border-border/35 bg-bgSubtle/50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                              {card.platform}
                            </p>
                            <h3 className="mt-1 text-label font-semibold text-text">{card.title}</h3>
                          </div>
                          <span className="rounded-full border border-success/35 bg-successSoft/15 px-2 py-0.5 text-overline font-bold uppercase text-success">
                            Supported
                          </span>
                        </div>
                        <p className="mt-2 text-meta leading-snug text-textMuted">{card.description}</p>
                        <p className="mt-2 rounded-lg border border-border/30 bg-bgElevated/60 px-2 py-1.5 text-fine leading-snug text-textSoft">
                          Approval: {card.approvalRequirement}
                        </p>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => void runCommand(card.command)}
                          className={clsx(mobileChipClass(btnFocus), 'mt-2 text-fine disabled:opacity-50')}
                        >
                          Preview action
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="-mx-4 sm:-mx-5">
              <WorkspaceOSLayer
                snapshot={snapshot}
                btnFocus={btnFocus}
                disabled={disabled}
                runCommand={runCommand}
                onOpenSettings={onOpenSettings}
                onOpenIntegrations={onOpenIntegrations}
                onOpenCommandPalette={onOpenCommandPalette}
                onOpenToday={onOpenToday}
                onConvertPredictiveOpportunityToPlan={onConvertPredictiveOpportunityToPlan}
                memoryGraphNodes={memoryGraphNodes}
                pulseItems={pulseItems}
                twinProgress={twinProgress}
                contextualSurface={contextualSurface}
                personaModes={personaModes}
                composerDrafts={composerDrafts}
                briefingItems={briefingItems}
                timeItems={timeItems}
                ambientSignals={ambientSignals}
                energyMetrics={energyMetrics}
                simulations={simulations}
                twinEcosystem={twinEcosystem}
                autonomousDrafts={autonomousDrafts}
                brainSignals={brainSignals}
                searchLenses={searchLenses}
                deepWorkState={deepWorkState}
                operatingTimeline={operatingTimeline}
                operationalGraph={operationalGraph}
                strategicReflections={strategicReflections}
                adaptiveLayout={adaptiveLayout}
                intelligenceScores={intelligenceScores}
                sandboxScenarios={sandboxScenarios}
                cofounderInsights={cofounderInsights}
                preparationAssets={preparationAssets}
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
