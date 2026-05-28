import clsx from 'clsx';
import type { CSSProperties } from 'react';
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
  Gauge,
  GitBranch,
  Layers,
  Lightbulb,
  Moon,
  Network,
  Radar,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
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
      source: 'Mixture of Operational Experts',
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
  deepWorkState
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
              label="AI Core artifacts"
              value={snapshot.recentAiCoreArtifacts.length}
              detail={
                snapshot.recentAiCoreArtifacts[0]
                  ? `${snapshot.recentAiCoreArtifacts[0].type}: ${snapshot.recentAiCoreArtifacts[0].title}`
                  : 'Unified outputs will appear here after ASK, PLAN, or batch runs'
              }
              tone={snapshot.recentAiCoreArtifacts.length ? 'success' : 'muted'}
            />
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
              Workspace Brain
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
              Autonomous Drafting Layer
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
  const activePlans = planCards.slice(0, 6);
  const suggestions = buildBoardSuggestions({
    snapshot,
    onConvertPredictiveOpportunityToPlan,
    onConvertContentIdeationToPlan,
    onConvertWorkflowPredictionToPlan
  });
  const sortedQueue = sortRowsSoonestFirst(snapshot.pulseTimelineRows).slice(0, 5);
  const approvals = snapshot.planPendingReviewPeek.slice(0, 4);
  const timelineItems = snapshot.crossPlatformOperationalTimeline.items.slice(0, 6);
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
                  PLAN command board
                </p>
                <h1 id="plan-board-heading" className="mt-1 text-h2 text-text">
                  What matters now, what the AI recommends, and what can run next
                </h1>
                <p className="mt-1.5 max-w-2xl text-meta leading-snug text-textMuted">
                  BrandOps is one continuous operational surface powered by ASK, PLAN, OPERATE, and
                  VERIFY. Static widgets become approvals, plans, predictions, platform actions, and
                  receipts. Turn ideas into approved next steps with receipts before anything leaves
                  the workspace.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className={clsx('bo-btn-primary bo-btn-primary--sm', btnFocus)}
                >
                  New plan
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

            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              <SummaryTile
                label="Active plans"
                value={planCards.length}
                detail={`${readyCount} ready, ${inProgressCount} in progress`}
                tone="primary"
              />
              <SummaryTile
                label="Approvals"
                value={snapshot.planPendingReviewCount}
                detail="Need human review before action"
                tone={snapshot.planPendingReviewCount ? 'warning' : 'success'}
              />
              <SummaryTile
                label="Scheduled"
                value={scheduledCount}
                detail="Due, queued, or on the timeline"
                tone={scheduledCount ? 'info' : 'muted'}
              />
              <SummaryTile
                label="Needs attention"
                value={failedCount}
                detail="Failed, rejected, or warning receipts"
                tone={failedCount ? 'danger' : 'success'}
              />
              <SummaryTile
                label="AI suggestions"
                value={suggestions.length}
                detail="Ready to preview as plans"
                tone={suggestions.length ? 'primary' : 'muted'}
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-4" aria-label="Operational mode layer">
              {modeCards.map((card) => (
                <ModeCard key={card.mode} {...card} />
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2.5">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Operator context · Profession-aware mode
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
                        onClick={() =>
                          void runCommand(twinActionPrompt('draft_outreach', twin))
                        }
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

            {showSetupHint ? (
              <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
                Add your offer, voice, and focus metric in Setup to make plans more specific.
              </p>
            ) : null}
          </div>
        </section>

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
        />

        <div className={ROW}>
          <PlanUnifiedOperationalInbox
            snapshot={snapshot}
            btnFocus={btnFocus}
            commandBusy={commandBusy}
            canRunWorkspaceCommands={canRunWorkspaceCommands}
            runCommand={runCommand}
          />
        </div>

        <section className={ROW} aria-labelledby="expert-routing-heading">
          <div className="rounded-2xl border border-info/35 bg-infoSoft/10 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-meta font-semibold uppercase tracking-[0.14em] text-info">
                  Mixture of Operational Experts
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

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[snapshot.expertOperator.ask, snapshot.expertOperator.plan, snapshot.expertOperator.operate].map(
                (mode) => (
                  <article key={mode.mode} className="rounded-xl border border-border/35 bg-bgElevated/60 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-fine font-bold uppercase tracking-[0.16em] text-primary">
                          {mode.mode}
                        </p>
                        <h3 className="mt-1 text-label font-semibold leading-tight text-text">
                          {mode.headline}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-full border border-border/45 bg-bgSubtle px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                        {mode.confidence}%
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-fine leading-snug text-textMuted">
                      {mode.summary}
                    </p>
                    <p className="mt-2 rounded-lg border border-border/30 bg-bgSubtle/45 px-2 py-1.5 text-fine leading-snug text-textSoft">
                      Experts: {mode.expertNames.join(', ') || 'General operator'}
                    </p>
                  </article>
                )
              )}
            </div>
          </div>
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
                      {plan.sourceLabel ?? 'Plan'}
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
                        <h3 className="text-label font-semibold text-text">{item.verb}</h3>
                        <p className="mt-1 text-meta leading-snug text-textMuted">
                          {item.preview || 'No preview captured yet.'}
                        </p>
                      </div>
                      <span className={clsx('rounded-full border px-2 py-0.5 text-overline font-bold uppercase', toneClass('warning'))}>
                        Waiting
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-meta">
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
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={ROW} aria-labelledby="suggested-plans-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
                Suggested next plans
              </p>
              <h2 id="suggested-plans-heading" className="mt-1 text-h3 text-text">
                What the AI recommends next
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={clsx(mobileChipClass(btnFocus), 'text-meta')}
            >
              Browse commands
            </button>
          </div>

          {suggestions.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No suggestions yet"
                body="Ask a question, connect a tool, or add workspace activity and new plan suggestions will appear here."
              />
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {suggestions.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                        {item.source}
                      </p>
                      <h3 className="mt-1 text-label font-semibold text-text">{item.title}</h3>
                    </div>
                    {typeof item.confidence === 'number' ? (
                      <span className="rounded-full border border-border/45 bg-bgSubtle px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                        {item.confidence}% fit
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-meta leading-snug text-textMuted">{item.detail}</p>
                  <p className="mt-2 rounded-xl border border-border/30 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textSoft">
                    Why now: {item.why}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-meta">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void runCommand(item.command)}
                      className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2 py-1.5 text-text disabled:opacity-45', btnFocus)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={commandBusy}
                      onClick={() => {
                        if (item.onPrimary) item.onPrimary();
                        else void runCommand(item.command);
                      }}
                      className={clsx('rounded-lg border border-success/45 bg-successSoft/20 px-2 py-1.5 text-success disabled:opacity-45', btnFocus)}
                    >
                      <Lightbulb className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                      {item.primaryLabel}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={ROW} aria-labelledby="platform-intelligence-heading">
          <div className="rounded-2xl border border-border/40 bg-bgElevated/60 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                  Connected Platform Intelligence
                </p>
                <h2 id="platform-intelligence-heading" className="mt-1 text-h3 text-text">
                  Platform-aware actions BrandOps can actually support
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

        <section className={ROW} aria-labelledby="timeline-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                <Clock3 className="h-4 w-4" aria-hidden />
                Timeline and activity
              </p>
              <h2 id="timeline-heading" className="mt-1 text-h3 text-text">
                What is scheduled, in progress, or failed
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
      </div>
    </div>
  );
};
