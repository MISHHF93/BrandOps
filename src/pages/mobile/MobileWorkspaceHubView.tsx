import clsx from 'clsx';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileText,
  History,
  Lightbulb,
  Radar,
  ShieldCheck,
  Sparkles,
  UserRound
} from 'lucide-react';
import type { LaunchAccessState } from '../../shared/account/launchAccess';
import type { Plan } from '../../types/domain';
import type {
  MobileWorkspaceSnapshot,
  PlanExecutionReceipt,
  PlanPendingOperatorReviewPeek
} from './buildWorkspaceSnapshot';
import type { PipelineRun } from '../../types/aiIntegrationSuite';
import type { PredictiveOpportunitySuggestion } from '../../services/plan/predictiveOpportunityLayer';
import type { ContentIdeationItem } from '../../services/plan/predictiveContentIdeationEngine';
import type { WorkflowPrediction } from '../../services/plan/workflowPredictionLayer';
import type { PulseTimelineRow } from './pulseTimeline';
import { workspaceQueueCommandLine } from './pulseTimeline';
import { buildOperationalPlanCards, type OperationalPlanCard } from './PlanOperationalStudio';
import { mobileChipClass } from './mobileTabPrimitives';
import { defaultBrandProfile } from '../../config/workspaceDefaults';

type FeedKind =
  | 'approval'
  | 'opportunity'
  | 'recommendation'
  | 'active-plan'
  | 'completed-action'
  | 'saved-insight'
  | 'twin-update'
  | 'integration-reminder';
type FeedTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'muted';
type FeedFilter = 'all' | 'attention' | 'approvals' | 'opportunities' | 'active' | 'recent';

interface FeedItem {
  id: string;
  kind: FeedKind;
  title: string;
  summary: string;
  status: string;
  tone: FeedTone;
  priority: number;
  primaryAction: string;
  onPrimary?: () => void | Promise<void>;
  primaryDisabled?: boolean;
  details: string[];
  timeline: string[];
  approvals: string[];
  receipts: string[];
  secondaryActions?: Array<{
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
    tone?: FeedTone;
  }>;
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
  firstRunJourneyVisible?: boolean;
  canRunWorkspaceCommands: boolean;
  workspaceCommandLockReason: 'auth' | 'membership' | null;
  onDownloadPipelineRun: (run: PipelineRun) => void;
  onApproveOperatorTrace: (traceId: string) => void | Promise<void>;
  onRejectOperatorTrace?: (traceId: string) => void | Promise<void>;
  onExecutePlan?: (planId: string) => void | Promise<void>;
  onConvertPredictiveOpportunityToPlan?: (suggestion: PredictiveOpportunitySuggestion) => void;
  onConvertContentIdeationToPlan?: (item: ContentIdeationItem) => void;
  onConvertWorkflowPredictionToPlan?: (prediction: WorkflowPrediction) => void;
  onDeleteMemoryContext?: () => void | Promise<void>;
  onDisableMemoryContext?: () => void | Promise<void>;
  onExportOperationalPlan?: (plan: OperationalPlanCard) => void;
  onExportExecutionReceipt?: (receipt: PlanExecutionReceipt) => void;
  convertedOperationalPlans?: OperationalPlanCard[];
}

const FEED_LABELS: Record<FeedKind, string> = {
  approval: 'Needs approval',
  opportunity: 'Opportunity',
  recommendation: 'Recommended next move',
  'active-plan': 'Active plan',
  'completed-action': 'Recent receipt',
  'saved-insight': 'Saved insight',
  'twin-update': 'Twin update',
  'integration-reminder': 'Integration reminder'
};

const FEED_ICONS: Record<FeedKind, typeof ShieldCheck> = {
  approval: ShieldCheck,
  opportunity: Radar,
  recommendation: Lightbulb,
  'active-plan': Compass,
  'completed-action': History,
  'saved-insight': FileText,
  'twin-update': UserRound,
  'integration-reminder': AlertTriangle
};

const FEED_FILTERS: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'What should I do?' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'active', label: 'Active' },
  { id: 'recent', label: 'Recent' }
];

function toneClass(tone: FeedTone): string {
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

function compactTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Recent';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function planAgentLockCopy(reason: 'auth' | 'membership' | null): string | null {
  if (reason === 'auth')
    return 'Unlock local preview access in Settings to run workspace commands from Plan.';
  if (reason === 'membership')
    return 'Enable the local development membership demo to run workspace commands from Plan.';
  return null;
}

function planTone(plan: OperationalPlanCard): FeedTone {
  if (plan.status === 'blocked') return 'warning';
  if (plan.status === 'in-progress') return 'info';
  if (plan.status === 'ready') return 'success';
  return 'muted';
}

function savedPlanTone(plan: Plan): FeedTone {
  if (plan.status === 'draft' || plan.status === 'pending-approval') return 'warning';
  if (plan.status === 'opportunity') return 'primary';
  if (plan.status === 'rejected') return 'danger';
  if (plan.status === 'executing') return 'info';
  return 'success';
}

/** 'rejected'/'executed' are terminal — the review or the work is done, so this card belongs under "Recent", not the "Active" filter (which matches on `kind === 'active-plan'`). */
function savedPlanFeedKind(status: Plan['status']): FeedKind {
  if (status === 'opportunity') return 'opportunity';
  if (status === 'rejected' || status === 'executed') return 'completed-action';
  return 'active-plan';
}

function savedPlanToFeedItem(
  plan: Plan,
  runCommand: MobileWorkspaceHubViewProps['runCommand'],
  disabled: boolean,
  onExecutePlan: NonNullable<MobileWorkspaceHubViewProps['onExecutePlan']>
): FeedItem {
  return {
    id: `saved-plan-${plan.id}`,
    kind: savedPlanFeedKind(plan.status),
    title: plan.title,
    summary: plan.objective,
    status: plan.status === 'pending-approval' ? 'approval pending' : plan.status,
    tone: savedPlanTone(plan),
    priority: plan.status === 'pending-approval' ? 15 : plan.status === 'draft' ? 40 : 60,
    primaryAction: plan.status === 'draft' ? 'Fill gaps' : 'Preview',
    primaryDisabled: disabled,
    onPrimary: () =>
      runCommand(
        `ask: Preview this saved PLAN without executing it. Explain attention, approvals, missing inputs, risks, receipts, and next safe action.\n\n${JSON.stringify(plan, null, 2)}`
      ),
    details: [
      `Created from Ask My Twin response ${plan.sourceResponseId}.`,
      `Expected output: ${plan.expectedOutput}`,
      `Confidence: ${plan.confidenceScore}%`,
      /** Otherwise `plan.thoughtTree` is only ever shown once, in the Convert-to-Plan preview drawer, then becomes permanently invisible once saved. */
      ...(plan.thoughtTree ? [`Chosen path: ${plan.thoughtTree.chosenPath}`] : [])
    ],
    timeline: plan.timeline.map((item) => `${item.title}: ${item.timing}`),
    approvals: plan.requiredApprovals.length
      ? plan.requiredApprovals
      : ['External actions still require explicit approval.'],
    receipts: [`Receipt: ${plan.receiptId}`, `Saved ${compactTime(plan.savedAt)}`],
    /** Only `approved` plans are executable — the executor (planExecutor.ts) refuses anything else. */
    ...(plan.status === 'approved'
      ? {
          secondaryActions: [
            {
              label: 'Execute',
              onClick: () => onExecutePlan(plan.id),
              disabled,
              tone: 'success' as FeedTone
            }
          ]
        }
      : {})
  };
}

function operationalCardToFeedItem(
  plan: OperationalPlanCard,
  runCommand: MobileWorkspaceHubViewProps['runCommand'],
  disabled: boolean,
  onExportOperationalPlan?: (plan: OperationalPlanCard) => void
): FeedItem {
  const nextStep =
    plan.status === 'blocked'
      ? 'Resolve the blocker, then approve or reject.'
      : plan.status === 'needs-input'
        ? 'Fill missing context before activation.'
        : plan.status === 'in-progress'
          ? 'Check progress, then run the next approved step.'
          : 'Preview it, edit if needed, then approve execution.';
  return {
    id: `plan-${plan.id}`,
    kind: 'active-plan',
    title: plan.title,
    summary: plan.promise,
    status: plan.status.replace(/-/g, ' '),
    tone: planTone(plan),
    priority: plan.status === 'blocked' ? 18 : plan.status === 'needs-input' ? 45 : 65,
    primaryAction: plan.status === 'needs-input' ? 'Add input' : 'Preview',
    primaryDisabled: disabled,
    onPrimary: () => runCommand(plan.previewCommand),
    details: [
      nextStep,
      `Source: ${plan.sourceLabel ?? 'Workspace'}`,
      `Progress: ${plan.progress}%`
    ],
    timeline: plan.timeline,
    approvals: ['Preview and approve before execution.'],
    receipts: Object.keys(plan.exportPayload ?? {}).slice(0, 4),
    secondaryActions: [
      {
        label: 'Approve',
        onClick: () => runCommand(plan.approveCommand),
        disabled,
        tone: 'success'
      },
      { label: 'Export', onClick: () => onExportOperationalPlan?.(plan), tone: 'muted' }
    ]
  };
}

function approvalPrompt(action: string, item: PlanPendingOperatorReviewPeek): string {
  return `ask: ${action}. Explain the output, what changes if approved, missing facts, risks, and receipt expectations. Do not execute externally.\n\n${JSON.stringify(item, null, 2)}`;
}

function approvalToFeedItem(args: {
  item: PlanPendingOperatorReviewPeek;
  runCommand: MobileWorkspaceHubViewProps['runCommand'];
  onApproveOperatorTrace: MobileWorkspaceHubViewProps['onApproveOperatorTrace'];
  onRejectOperatorTrace: NonNullable<MobileWorkspaceHubViewProps['onRejectOperatorTrace']>;
  disabled: boolean;
}): FeedItem {
  const { item, runCommand, onApproveOperatorTrace, onRejectOperatorTrace, disabled } = args;
  return {
    id: `approval-${item.id}`,
    kind: 'approval',
    title: item.verb,
    summary: item.preview || 'Review this generated output before anything changes.',
    status: 'waiting',
    tone: 'warning',
    priority: 5,
    primaryAction: 'Review',
    primaryDisabled: disabled,
    onPrimary: () => runCommand(approvalPrompt('Preview this approval item', item)),
    details: [
      item.annotatorNote || 'This needs human confirmation before execution.',
      item.surface ? `Surface: ${item.surface}` : '',
      item.entityType ? `Entity: ${item.entityType}` : ''
    ].filter(Boolean),
    timeline: [item.at, item.route ?? 'Approval queue'].filter(Boolean),
    approvals: ['Human decision required before workspace or external state changes.'],
    receipts: [`Trace: ${item.id}`, ...(item.labels ?? [])],
    secondaryActions: [
      {
        label: 'Approve',
        onClick: () => onApproveOperatorTrace(item.id),
        disabled,
        tone: 'success'
      },
      { label: 'Reject', onClick: () => onRejectOperatorTrace(item.id), disabled, tone: 'danger' }
    ]
  };
}

function opportunityToFeedItem(args: {
  item: PredictiveOpportunitySuggestion;
  runCommand: MobileWorkspaceHubViewProps['runCommand'];
  onConvertPredictiveOpportunityToPlan: NonNullable<
    MobileWorkspaceHubViewProps['onConvertPredictiveOpportunityToPlan']
  >;
  disabled: boolean;
}): FeedItem {
  const { item, runCommand, onConvertPredictiveOpportunityToPlan, disabled } = args;
  return {
    id: `opportunity-${item.id}`,
    kind: 'opportunity',
    title: item.title,
    summary: item.suggestion,
    status: `${item.confidence}% confidence`,
    tone: 'primary',
    priority: 30,
    primaryAction: 'Convert',
    onPrimary: () => onConvertPredictiveOpportunityToPlan(item),
    details: [item.whyThisAppeared, `Expected impact: ${item.expectedImpact}`],
    timeline: ['Evaluate', 'Run small experiment', 'Capture receipt'],
    approvals: ['Approve experiments before outreach, publishing, or record changes.'],
    receipts: item.supportingSignals.slice(0, 4),
    secondaryActions: [
      { label: 'Preview', onClick: () => runCommand(item.previewCommand), disabled }
    ]
  };
}

function recommendationToFeedItem(
  item: {
    id: string;
    title: string;
    detail: string;
    why: string;
    command: string;
    confidence?: number;
  },
  runCommand: MobileWorkspaceHubViewProps['runCommand'],
  disabled: boolean
): FeedItem {
  return {
    id: `recommendation-${item.id}`,
    kind: 'recommendation',
    title: item.title,
    summary: item.detail,
    status: item.confidence ? `${item.confidence}% confidence` : 'suggested',
    tone: 'info',
    priority: 35,
    primaryAction: 'Preview',
    primaryDisabled: disabled,
    onPrimary: () => runCommand(item.command),
    details: [item.why],
    timeline: ['Review recommendation', 'Approve next action', 'Track outcome'],
    approvals: ['Actions that change state require approval.'],
    receipts: ['Recommendation from operational intelligence']
  };
}

function queueToFeedItem(
  row: PulseTimelineRow,
  runCommand: MobileWorkspaceHubViewProps['runCommand'],
  disabled: boolean
): FeedItem {
  const urgent = row.badge === 'due' || row.badge === 'due-soon' || row.subtitle.includes('due');
  return {
    id: `queue-${row.id}`,
    kind: 'recommendation',
    title: row.title,
    summary: row.subtitle,
    status: row.badge ?? row.kind,
    tone: urgent ? 'warning' : 'muted',
    priority: urgent ? 28 : 42,
    primaryAction: 'Handle',
    primaryDisabled: disabled,
    onPrimary: () => runCommand(workspaceQueueCommandLine(row)),
    details: [row.subtitle, row.badge ?? row.kind],
    timeline: [compactTime(row.sortKey)],
    approvals: ['Review before sending, publishing, or modifying records.'],
    receipts: [`Queue item: ${row.id}`]
  };
}

function receiptToFeedItem(
  receipt: PlanExecutionReceipt,
  runCommand: MobileWorkspaceHubViewProps['runCommand'],
  disabled: boolean,
  onExportExecutionReceipt?: (receipt: PlanExecutionReceipt) => void
): FeedItem {
  const hasWarnings = receipt.warningsErrors.length > 0;
  return {
    id: `receipt-${receipt.id}`,
    kind: 'completed-action',
    title: receipt.action,
    summary: receipt.reasoningSummary,
    status: receipt.executionStatus,
    tone: hasWarnings ? 'warning' : 'success',
    priority: hasWarnings ? 25 : 90,
    primaryAction: 'Explain',
    primaryDisabled: disabled,
    onPrimary: () =>
      runCommand(
        `ask: Explain this PLAN receipt. Be clear about what happened, what did not happen externally, approvals, warnings, and source facts.\n\n${JSON.stringify(receipt, null, 2)}`
      ),
    details: receipt.sourceFactsUsed,
    timeline: [receipt.startedAt, receipt.endedAt ?? 'Recorded'],
    approvals: receipt.approvals,
    receipts: receipt.generatedOutputs.length ? receipt.generatedOutputs : [receipt.sourceLabel],
    secondaryActions: [{ label: 'Export', onClick: () => onExportExecutionReceipt?.(receipt) }]
  };
}

function twinFeedItem(snapshot: MobileWorkspaceSnapshot, onOpenSettings: () => void): FeedItem {
  const twin = snapshot.activeDigitalTwin;
  const missing = twin?.memory.missingInfo ?? [];
  return {
    id: 'twin-status',
    kind: 'twin-update',
    title: twin ? `${twin.displayName} is guiding PLAN` : 'Set up your twin context',
    summary: twin
      ? twin.identity.professionalPositioning || twin.identity.summary || 'Twin context is active.'
      : 'Add profile, offer, voice, and proof so PLAN can make better decisions.',
    status: twin ? `${twin.confidenceScore}% confidence` : 'setup needed',
    tone: missing.length ? 'warning' : twin ? 'success' : 'warning',
    priority: twin && missing.length === 0 ? 80 : 12,
    primaryAction: twin ? 'Review gaps' : 'Set up',
    onPrimary: onOpenSettings,
    details: [
      snapshot.primaryOffer ? `Offer: ${snapshot.primaryOffer}` : '',
      snapshot.focusMetric ? `Focus metric: ${snapshot.focusMetric}` : '',
      missing.length
        ? `Missing: ${missing.slice(0, 3).join(', ')}`
        : 'No urgent twin gaps detected.'
    ].filter(Boolean),
    timeline: ['Ask thinks', 'PLAN structures execution', 'Approvals gate external action'],
    approvals: ['Identity-level claims should be reviewed before public use.'],
    receipts: twin?.memory.approvedClaims.slice(0, 3) ?? []
  };
}

function integrationReminder(
  snapshot: MobileWorkspaceSnapshot,
  onOpenIntegrations: () => void
): FeedItem | null {
  const connected =
    snapshot.platformAwareAsk.connectedApps.length + snapshot.syncProvidersConnected;
  if (connected > 0) return null;
  return {
    id: 'integration-reminder',
    kind: 'integration-reminder',
    title: 'No connected platforms yet',
    summary: 'PLAN can draft workflows, but unsupported integrations stay marked as setup needed.',
    status: 'needs setup',
    tone: 'warning',
    priority: 55,
    primaryAction: 'Open setup',
    onPrimary: onOpenIntegrations,
    details: [
      'External actions are never faked.',
      'Connect a platform before syncing or operating there.'
    ],
    timeline: ['Draft safely', 'Connect platform', 'Approve external action'],
    approvals: ['Permission scope requires user approval.'],
    receipts: ['Unsupported integrations show as setup needed.']
  };
}

function buildOperationalFeed(args: {
  snapshot: MobileWorkspaceSnapshot;
  convertedOperationalPlans: OperationalPlanCard[];
  runCommand: MobileWorkspaceHubViewProps['runCommand'];
  onOpenSettings: () => void;
  onOpenIntegrations: () => void;
  onApproveOperatorTrace: MobileWorkspaceHubViewProps['onApproveOperatorTrace'];
  onRejectOperatorTrace: NonNullable<MobileWorkspaceHubViewProps['onRejectOperatorTrace']>;
  onExecutePlan: NonNullable<MobileWorkspaceHubViewProps['onExecutePlan']>;
  onConvertPredictiveOpportunityToPlan: NonNullable<
    MobileWorkspaceHubViewProps['onConvertPredictiveOpportunityToPlan']
  >;
  onExportOperationalPlan?: (plan: OperationalPlanCard) => void;
  onExportExecutionReceipt?: (receipt: PlanExecutionReceipt) => void;
  disabled: boolean;
}): FeedItem[] {
  const items: FeedItem[] = [twinFeedItem(args.snapshot, args.onOpenSettings)];
  for (const item of args.snapshot.planPendingReviewPeek.slice(0, 4)) {
    items.push(approvalToFeedItem({ ...args, item }));
  }
  for (const plan of args.snapshot.convertedAskPlans.slice(0, 6)) {
    items.push(savedPlanToFeedItem(plan, args.runCommand, args.disabled, args.onExecutePlan));
  }
  for (const plan of [
    ...args.convertedOperationalPlans,
    ...buildOperationalPlanCards(args.snapshot)
  ].slice(0, 6)) {
    items.push(
      operationalCardToFeedItem(plan, args.runCommand, args.disabled, args.onExportOperationalPlan)
    );
  }
  for (const item of args.snapshot.predictiveOpportunityLayer.suggestions.slice(0, 4)) {
    items.push(opportunityToFeedItem({ ...args, item }));
  }
  for (const item of args.snapshot.operationalIntelligenceCore.recommendedActions.slice(0, 3)) {
    items.push(recommendationToFeedItem(item, args.runCommand, args.disabled));
  }
  for (const row of args.snapshot.pulseTimelineRows.slice(0, 3)) {
    items.push(queueToFeedItem(row, args.runCommand, args.disabled));
  }
  for (const receipt of args.snapshot.planExecutionReceipts.slice(0, 4)) {
    items.push(
      receiptToFeedItem(receipt, args.runCommand, args.disabled, args.onExportExecutionReceipt)
    );
  }
  const reminder = integrationReminder(args.snapshot, args.onOpenIntegrations);
  if (reminder) items.push(reminder);
  return items.sort((a, b) => a.priority - b.priority).slice(0, 18);
}

function filterFeedItems(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  switch (filter) {
    case 'attention':
      return items.filter(
        (item) =>
          item.priority <= 35 ||
          item.kind === 'approval' ||
          item.kind === 'integration-reminder' ||
          item.status.includes('needed')
      );
    case 'approvals':
      return items.filter((item) => item.kind === 'approval' || item.status.includes('approval'));
    case 'opportunities':
      return items.filter((item) => item.kind === 'opportunity');
    case 'active':
      return items.filter((item) => item.kind === 'active-plan');
    case 'recent':
      return items.filter(
        (item) =>
          item.kind === 'completed-action' ||
          item.kind === 'saved-insight' ||
          item.kind === 'twin-update'
      );
    case 'all':
    default:
      return items;
  }
}

function FeedDetail({ title, items }: { title: string; items: string[] }) {
  const clean = items.filter(Boolean).slice(0, 5);
  return (
    <div className="rounded-lg border border-border/25 bg-bgSubtle/45 px-2.5 py-2">
      <p className="font-semibold uppercase tracking-wide text-textSoft">{title}</p>
      {clean.length ? (
        <ul className="mt-1 space-y-1">
          {clean.map((item) => (
            <li key={item} className="line-clamp-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">None recorded.</p>
      )}
    </div>
  );
}

function FeedItemRow({ item, btnFocus }: { item: FeedItem; btnFocus: string }) {
  const Icon = FEED_ICONS[item.kind];
  return (
    <details
      id={item.id}
      className="group scroll-mt-28 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2.5 open:border-primary/30 open:bg-surface/65"
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-2.5">
          <span
            className={clsx(
              'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
              toneClass(item.tone)
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="bo-system-label">{FEED_LABELS[item.kind]}</p>
              <span
                className={clsx(
                  'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                  toneClass(item.tone)
                )}
              >
                {item.status}
              </span>
            </div>
            <h3 className="mt-1 text-label font-semibold leading-tight text-text">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-meta leading-snug text-textMuted">
              {item.summary}
            </p>
          </div>
          <button
            type="button"
            disabled={item.primaryDisabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void item.onPrimary?.();
            }}
            className={clsx(
              'shrink-0 rounded-lg border border-primary/45 bg-primarySoft/20 px-2.5 py-1.5 text-fine font-semibold text-primary disabled:opacity-45',
              btnFocus
            )}
          >
            {item.primaryAction}
          </button>
        </div>
      </summary>
      <div className="mt-3 grid gap-2 border-t border-border/30 pt-3 text-fine leading-snug text-textMuted sm:grid-cols-2">
        <FeedDetail title="Details" items={item.details} />
        <FeedDetail title="Timeline" items={item.timeline} />
        <FeedDetail title="Approvals" items={item.approvals} />
        <FeedDetail title="Receipts" items={item.receipts} />
      </div>
      {item.secondaryActions?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.secondaryActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={(event) => {
                event.preventDefault();
                void action.onClick();
              }}
              className={clsx(
                'rounded-lg border px-2.5 py-1.5 text-fine font-semibold disabled:opacity-45',
                toneClass(action.tone ?? 'muted'),
                btnFocus
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </details>
  );
}

export const MobileWorkspaceHubView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  onOpenToday: _onOpenToday,
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
  onExecutePlan = () => {},
  onConvertPredictiveOpportunityToPlan = () => {},
  onConvertContentIdeationToPlan: _onConvertContentIdeationToPlan = () => {},
  onConvertWorkflowPredictionToPlan: _onConvertWorkflowPredictionToPlan = () => {},
  onDeleteMemoryContext: _onDeleteMemoryContext = () => {},
  onDisableMemoryContext: _onDisableMemoryContext = () => {},
  onExportOperationalPlan,
  onExportExecutionReceipt,
  convertedOperationalPlans = []
}: MobileWorkspaceHubViewProps) => {
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const profileIncomplete =
    snapshot.operatorName.trim() === defaultBrandProfile.operatorName.trim() ||
    !snapshot.primaryOffer.trim() ||
    !snapshot.voiceGuide.trim() ||
    !snapshot.focusMetric.trim();
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const lockHint = planAgentLockCopy(workspaceCommandLockReason);
  /** 'approved'/'executing' are live, in-progress work too — not just 'active' — since the approval fan-out (checkpointActions.ts) started making 'approved' a real, reachable status. Excludes 'executed' (done), 'draft'/'pending-approval' (not yet live), 'rejected' (dead), and 'opportunity' (its own counter below). */
  const activePlanCount =
    snapshot.convertedAskPlans.filter(
      (plan) =>
        plan.status === 'active' || plan.status === 'approved' || plan.status === 'executing'
    ).length +
    convertedOperationalPlans.length +
    buildOperationalPlanCards(snapshot).filter((plan) => plan.status !== 'needs-input').length;
  const opportunityCount =
    snapshot.predictiveOpportunityLayer.suggestions.length +
    snapshot.convertedAskPlans.filter((plan) => plan.status === 'opportunity').length;
  const feedItems = buildOperationalFeed({
    snapshot,
    convertedOperationalPlans,
    runCommand,
    onOpenSettings,
    onOpenIntegrations,
    onApproveOperatorTrace,
    onRejectOperatorTrace,
    onExecutePlan,
    onConvertPredictiveOpportunityToPlan,
    onExportOperationalPlan,
    onExportExecutionReceipt,
    disabled
  });
  const visibleFeedItems = useMemo(
    () => filterFeedItems(feedItems, feedFilter),
    [feedFilter, feedItems]
  );
  const attention = feedItems.find((item) => item.priority <= 20) ?? feedItems[0];
  const member =
    launchAccess.membership.status === 'active'
      ? 'Local membership flag active · unverified'
      : 'No verified membership';

  return (
    <section
      className="bo-plan-flat-root rounded-2xl border border-border/45 bg-bg/80 p-3 text-sm text-textMuted sm:p-4"
      aria-label="Plan"
    >
      <header className="rounded-2xl border border-border/35 bg-bgElevated/65 px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="bo-system-label text-primary">
              <Sparkles className="h-4 w-4" aria-hidden />
              AI Chief of Staff briefing stream
            </p>
            <h2 className="mt-1 text-h3 text-text">What needs attention now?</h2>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              One feed for what to do, what needs approval, what is active, what opportunities
              exist, and what happened recently.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={clsx(mobileChipClass(btnFocus), 'text-meta')}
          >
            Add work
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 text-fine sm:grid-cols-4">
          <SummaryPill
            label="Twin Status"
            value={
              snapshot.activeDigitalTwin
                ? `${snapshot.activeDigitalTwin.confidenceScore}%`
                : 'Setup'
            }
            tone={profileIncomplete ? 'warning' : 'success'}
            active={feedFilter === 'attention'}
            onClick={() => setFeedFilter('attention')}
            btnFocus={btnFocus}
          />
          <SummaryPill
            label="Active Plans"
            value={String(activePlanCount)}
            tone="info"
            active={feedFilter === 'active'}
            onClick={() => setFeedFilter('active')}
            btnFocus={btnFocus}
          />
          <SummaryPill
            label="Pending Approvals"
            value={String(snapshot.planPendingReviewCount)}
            tone={snapshot.planPendingReviewCount ? 'warning' : 'success'}
            active={feedFilter === 'approvals'}
            onClick={() => setFeedFilter('approvals')}
            btnFocus={btnFocus}
          />
          <SummaryPill
            label="Opportunities"
            value={String(opportunityCount)}
            tone="primary"
            active={feedFilter === 'opportunities'}
            onClick={() => setFeedFilter('opportunities')}
            btnFocus={btnFocus}
          />
        </div>

        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Plan feed focus">
          {FEED_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setFeedFilter(filter.id)}
              className={clsx(
                'shrink-0 rounded-full border px-3 py-1.5 text-fine font-semibold',
                feedFilter === filter.id
                  ? 'border-primary/55 bg-primarySoft/20 text-primary'
                  : 'border-border/45 bg-bgSubtle/55 text-textMuted',
                btnFocus
              )}
              aria-pressed={feedFilter === filter.id}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        {lockHint ? (
          <p className="mt-3 rounded-xl border border-warning/35 bg-warningSoft/15 px-3 py-2 text-meta leading-snug text-warning">
            {lockHint}
          </p>
        ) : null}
        {!firstRunJourneyVisible && profileIncomplete ? (
          <p className="mt-3 rounded-xl border border-warning/35 bg-warningSoft/15 px-3 py-2 text-meta leading-snug text-warning">
            Add your offer, voice, and focus metric so the stream can prioritize work with better
            context.
          </p>
        ) : null}
        <p className="mt-2 text-fine text-textSoft">
          {member}
          {launchAccess.auth.email ? ` · ${launchAccess.auth.email}` : ''}
        </p>
      </header>

      {attention ? (
        <div className="mt-3 rounded-2xl border border-primary/25 bg-primarySoft/10 px-3 py-3">
          <p className="bo-system-label text-primary">Start here</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-label font-semibold text-text">{attention.title}</p>
            <span
              className={clsx(
                'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                toneClass(attention.tone)
              )}
            >
              {attention.status}
            </span>
          </div>
          <p className="mt-1 text-meta leading-snug text-textMuted">{attention.summary}</p>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        <p className="text-fine text-textSoft" aria-live="polite">
          Showing {visibleFeedItems.length} of {feedItems.length} feed items.
        </p>
        {visibleFeedItems.length ? (
          visibleFeedItems.map((item) => (
            <FeedItemRow key={item.id} item={item} btnFocus={btnFocus} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border/50 bg-bgSubtle/30 px-3 py-4 text-center">
            <p className="text-sm font-medium text-text">Nothing in this focus yet</p>
            <p className="mt-1 text-meta leading-relaxed text-textSoft">
              Switch focus or add work to bring new items into the operational stream.
            </p>
          </div>
        )}
      </div>

      <footer className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2">
        <p className="flex items-start gap-2 text-meta leading-snug text-textMuted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          Safety rule: PLAN can draft actions and organize work. It cannot send, publish, sync,
          delete, or modify external systems without supported integrations and explicit approval.
        </p>
      </footer>
    </section>
  );
};

function SummaryPill({
  label,
  value,
  tone,
  active = false,
  onClick,
  btnFocus = ''
}: {
  label: string;
  value: string;
  tone: FeedTone;
  active?: boolean;
  onClick?: () => void;
  btnFocus?: string;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'rounded-xl border px-2.5 py-2 text-left',
          toneClass(tone),
          active && 'ring-2 ring-primary/35',
          btnFocus
        )}
        aria-pressed={active}
      >
        <p className="text-overline font-bold uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-base font-semibold leading-tight">{value}</p>
      </button>
    );
  }
  return (
    <div className={clsx('rounded-xl border px-2.5 py-2', toneClass(tone))}>
      <p className="text-overline font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-base font-semibold leading-tight">{value}</p>
    </div>
  );
}
