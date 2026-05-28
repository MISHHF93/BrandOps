import clsx from 'clsx';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  CirclePlay,
  Clock3,
  Download,
  Eye,
  FileText,
  Lightbulb,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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
import { workspaceQueueCommandLine } from './pulseTimeline';
import type { PulseTimelineRow } from './pulseTimeline';
import { PlanIdentityHeader } from './PlanIdentityHeader';
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
          />
        </div>

        <section className={clsx(ROW, 'pt-1')} aria-labelledby="plan-board-heading">
          <div className="rounded-2xl border border-primary/25 bg-primarySoft/10 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
                  PLAN command board
                </p>
                <h1 id="plan-board-heading" className="mt-1 text-h2 text-text">
                  Turn ideas into approved next steps
                </h1>
                <p className="mt-1.5 max-w-2xl text-meta leading-snug text-textMuted">
                  ASK is where you think with the AI. PLAN is where those ideas become structured
                  workflows, approvals, timelines, and safe execution steps.
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

            <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2.5">
                <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
                  Operator context
                </p>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  {twin
                    ? `${twin.displayName} is active with ${twin.confidenceScore}% confidence. PLAN uses approved profile facts, voice, memory, and current workspace context.`
                    : 'No active digital twin yet. PLAN still works, but profile, voice, and proof improve after setup.'}
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

        <section className={ROW} aria-labelledby="pending-approvals-heading">
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
