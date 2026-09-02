import { quoteContextValue } from '../../services/interop/validation';
import { describeApprovalConsequence } from '../../services/interop/capabilityRegistry';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
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
import { toneBorderClass, toneClass, toneInteractiveClass } from '../../shared/ui/tone';

type FeedKind =
  | 'approval'
  | 'opportunity'
  | 'recommendation'
  | 'active-plan'
  | 'ready-plan'
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
  /** Raw state from whichever system produced the item. Never rendered directly. */
  status: string;
  /**
   * A qualifier that is not a state: a confidence score, the queue an item came
   * from. Rendered quietly, and never in the chip.
   */
  note?: string;
  /**
   * What approving this does, for the rows that ask to be approved.
   *
   * The one piece of detail that is *not* behind the disclosure. Everything else
   * on a collapsed row describes the request; this describes the consequence,
   * and a reader deciding whether to approve needs it before they open anything.
   */
  consequence?: { effect: string; reversible: boolean | null; leavesWorkspace: boolean };
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
  onVerifyPlan?: (planId: string) => void;
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
  'ready-plan': 'Ready to start',
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
  'ready-plan': Compass,
  'completed-action': History,
  'saved-insight': FileText,
  'twin-update': UserRound,
  'integration-reminder': AlertTriangle
};

/**
 * The states a reader is asked to learn.
 *
 * The chip beside each row was labelled "status" and carried four unrelated
 * things: a real state (`in progress`), a confidence score (`100% confidence`),
 * the queue an item arrived from (`Scheduler`), and a receipt's execution status
 * (`recorded`). All four were styled identically, so the one visual element that
 * should answer "what state is this in?" answered a different question depending
 * on the row.
 *
 * Internal state is untouched — `status` still carries whatever the producing
 * system said, and the expanded detail still shows it verbatim. This is only
 * about what the collapsed row asks the reader to hold in their head.
 *
 * A raw value with no entry here renders no chip rather than a guess. Inventing
 * a state for something we cannot map would be worse than showing none.
 */
export const USER_FACING_STATE: Record<string, string> = {
  // Needs you
  'pending-approval': 'Needs you',
  'pending approval': 'Needs you',
  'approval pending': 'Needs you',
  pending: 'Needs you',
  waiting: 'Needs you',
  'needs-input': 'Needs you',
  'needs input': 'Needs you',
  'needs setup': 'Needs you',
  'setup needed': 'Needs you',
  // Ready
  ready: 'Ready',
  draft: 'Ready',
  approved: 'Ready',
  // Working
  active: 'Working',
  'in-progress': 'Working',
  'in progress': 'Working',
  executing: 'Working',
  // Blocked
  blocked: 'Blocked',
  // Verifying
  executed: 'Verifying',
  'awaiting verification': 'Verifying',
  // Done
  verified: 'Done',
  recorded: 'Done',
  completed: 'Done',
  complete: 'Done',
  done: 'Done',
  success: 'Done',
  // Failed
  failed: 'Failed',
  failure: 'Failed',
  rejected: 'Failed'
};

/**
 * Raw values that are deliberately not states.
 *
 * `suggested` and `opportunity` describe what a row *is*, and the group heading
 * already says that. A queue name like `Scheduler` is a source. Listing them
 * explicitly is what lets `planStatusVocabulary` assert that everything else the
 * product can produce is mapped — an unmapped state renders no chip at all, and
 * the first version of this map silently dropped the chip from a plan awaiting
 * approval, which is the one state that most needs to be visible.
 */
export const NON_STATE_STATUSES = new Set(['suggested', 'opportunity']);

export function userFacingState(raw: string): string | null {
  return USER_FACING_STATE[raw.trim().toLowerCase()] ?? null;
}

/**
 * What the group heading already told the reader.
 *
 * "Recently done" containing rows each chipped `Done` says the same thing twice,
 * and a chip that is always identical within its group carries no information
 * at all. Suppressed per group rather than per row, so a `Failed` receipt still
 * stands out among the done ones.
 */
function informativeStates(items: FeedItem[]): Set<string> {
  const states = items.map((item) => userFacingState(item.status)).filter(Boolean) as string[];
  const distinct = new Set(states);
  /**
   * Suppressed whenever the group is uniform, including at one item.
   *
   * A first version required two items before it would suppress, which made a
   * group show its chip at one item and hide it at two — the interface changing
   * shape as data arrived, for no reason the reader could see. "Waiting on you"
   * is the case that exposed it: approvals and twin prompts both map to
   * `Needs you`, so that chip is redundant with the heading at every size.
   */
  return distinct.size === 1 ? new Set() : distinct;
}

function compactTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Recent';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function planAgentLockCopy(reason: 'auth' | 'membership' | null): string | null {
  if (reason === 'auth')
    return 'Unlock local access in Settings to run workspace commands from Plan.';
  if (reason === 'membership')
    return 'Enable local membership in Settings to run workspace commands from Plan.';
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
  /** Recorded but not yet human-confirmed — same "needs your attention" register as draft/pending-approval. */
  if (plan.status === 'executed') return 'warning';
  return 'success';
}

/** 'rejected'/'verified' are terminal — the review or the (confirmed) work is done, so these belong under "Recent", not the "Active" filter. 'executed' is deliberately NOT terminal: BrandOps recorded execution but has not observed real outcomes, so the plan still needs a human "Confirm outcomes" pass before it's done. */
function savedPlanFeedKind(status: Plan['status']): FeedKind {
  if (status === 'opportunity') return 'opportunity';
  if (status === 'rejected' || status === 'verified') return 'completed-action';
  return 'active-plan';
}

function savedPlanStatusLabel(status: Plan['status']): string {
  if (status === 'pending-approval') return 'approval pending';
  if (status === 'executed') return 'awaiting verification';
  return status;
}

function savedPlanToFeedItem(
  plan: Plan,
  runCommand: MobileWorkspaceHubViewProps['runCommand'],
  disabled: boolean,
  onExecutePlan: NonNullable<MobileWorkspaceHubViewProps['onExecutePlan']>,
  onVerifyPlan: NonNullable<MobileWorkspaceHubViewProps['onVerifyPlan']>
): FeedItem {
  return {
    id: `saved-plan-${plan.id}`,
    kind: savedPlanFeedKind(plan.status),
    title: plan.title,
    summary: plan.objective,
    status: savedPlanStatusLabel(plan.status),
    tone: savedPlanTone(plan),
    priority:
      plan.status === 'pending-approval'
        ? 15
        : plan.status === 'executed'
          ? 25
          : plan.status === 'draft'
            ? 40
            : 60,
    primaryAction: plan.status === 'draft' ? 'Fill gaps' : 'Review',
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
    /** Only `approved` plans are executable (planExecutor.ts refuses anything else); only `executed` plans are verifiable (planVerifier.ts refuses anything else). */
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
      : {}),
    ...(plan.status === 'executed'
      ? {
          secondaryActions: [
            {
              label: 'Confirm outcomes',
              onClick: () => onVerifyPlan(plan.id),
              disabled,
              tone: 'warning' as FeedTone
            }
          ]
        }
      : {})
  };
}

/**
 * The real figures behind an operational card, as plain lines.
 *
 * `exportPayload` already carries them per card kind — outreach drafts, open
 * follow-ups, queued publishing. Rendering those beats a synthetic percentage
 * because each one is a fact the reader can act on.
 *
 * Zeros are dropped for the same reason cycle 47 stopped counting them as
 * evidence: "missed tasks: 0" is a statement that nothing is there, and it
 * crowds out the figures that are.
 */
/**
 * A count and its noun, pluralised correctly.
 *
 * Three places appended a bare `s`, which is right for "expert" and "content
 * idea" and wrong for "opportunity" — the twin readout said **"9 opportunitys
 * predicted"**. Rather than fix the one that showed, the shape is shared, so a
 * noun added later gets the same treatment.
 *
 * Deliberately small: English pluralisation has many rules and this needs the
 * two that these nouns use.
 */
export function pluralise(count: number, noun: string): string {
  if (count === 1) return `${count} ${noun}`;
  const plural = /(?:s|x|z|ch|sh)$/.test(noun)
    ? `${noun}es`
    : /[^aeiou]y$/.test(noun)
      ? `${noun.slice(0, -1)}ies`
      : `${noun}s`;
  return `${count} ${plural}`;
}

function planEvidenceLines(plan: OperationalPlanCard): string[] {
  return Object.entries(plan.exportPayload ?? {})
    .filter(([key, value]) => key !== 'type' && typeof value === 'number' && value > 0)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${String(value)}`)
    .slice(0, 4);
}

function operationalCardToFeedItem(
  plan: OperationalPlanCard,
  runCommand: MobileWorkspaceHubViewProps['runCommand'],
  disabled: boolean,
  onExportOperationalPlan?: (plan: OperationalPlanCard) => void
): FeedItem {
  const underway = plan.status === 'in-progress' || plan.status === 'blocked';
  const nextStep =
    plan.status === 'blocked'
      ? 'Resolve the blocker, then approve or reject.'
      : plan.status === 'needs-input'
        ? 'Fill missing context before activation.'
        : plan.status === 'in-progress'
          ? 'Check progress, then run the next approved step.'
          : 'Review it, edit if needed, then approve execution.';
  return {
    id: `plan-${plan.id}`,
    /**
     * Underway, or merely on offer.
     *
     * These five cards are templates the product always shows — "Workflow Plan",
     * "Outreach Plan", "Content Calendar" and so on. They exist whether or not
     * the reader has ever touched them, and they were all filed as
     * `active-plan`, which puts them under a heading reading "In progress" with
     * the hint "Already underway."
     *
     * On a brand-new workspace that meant **five things listed as underway and a
     * tile reading "Active Plans: 4"**, for someone who had done nothing. A card
     * only reports progress once its own status says so.
     */
    kind: underway ? 'active-plan' : 'ready-plan',
    title: plan.title,
    /**
     * What to do next, once the reader already knows what this is.
     *
     * Every row led with `promise` — a paragraph describing what the feature
     * does: *"Convert positioning and proof into draft outreach, follow-ups,
     * and approvals — with execution receipts that strengthen the twin."* That
     * is the right thing to say about an offer and the wrong thing to say about
     * work already moving, where the reader wants to know where it stands.
     *
     * So the split follows the group it lands in. "Ready to start" keeps the
     * explanation, because a reader deciding whether to begin needs it.
     * "In progress" leads with where the work actually stands.
     *
     * The first attempt used `nextStep` here, and that was worse: it is keyed
     * only on status, so all three underway rows read *"Check progress, then run
     * the next approved step."* — the same sentence three times, which is the
     * redundant-kind-label defect in a different place. The figures differ per
     * card and are the thing a reader is actually looking for.
     */
    summary: (underway && planEvidenceLines(plan).join(' · ')) || plan.promise,
    status: plan.status.replace(/-/g, ' '),
    tone: planTone(plan),
    priority: plan.status === 'blocked' ? 18 : plan.status === 'needs-input' ? 45 : 65,
    primaryAction: plan.status === 'needs-input' ? 'Add input' : 'Review',
    primaryDisabled: disabled,
    onPrimary: () => runCommand(plan.previewCommand),
    details: [
      // The promise moves here for underway rows, so nothing is lost by leading
      // with the next move above.
      ...(underway ? [plan.promise] : [nextStep]),
      `Source: ${plan.sourceLabel ?? 'Workspace'}`,
      /**
       * The counts, not a percentage of nothing.
       *
       * This read `Progress: ${plan.progress}%`, and that number is an activity
       * tally scaled by an arbitrary multiplier and capped at 100 — there is no
       * defined endpoint for it to be a percentage of. The Outreach Plan's
       * formula is `outreachDrafts * 20 + incompleteFollowUps * 10`, so **ten
       * unfinished follow-ups reported 100% progress**. Debt read as completion.
       *
       * The underlying figures are real and already carried in `exportPayload`,
       * so the row states them and lets the reader judge.
       */
      ...planEvidenceLines(plan)
    ],
    timeline: plan.timeline,
    approvals: ['Review and approve before execution.'],
    /**
     * A template has produced no receipts, and says so.
     *
     * This was `Object.keys(plan.exportPayload)`, so the section headed
     * "Receipts" listed **`type`, `outreachDrafts`, `followUps`,
     * `activeOpportunities`** — the property names of an internal object,
     * rendered to a reader as though they were records of something that
     * happened. Thirteen such identifiers reached the page across the five
     * cards.
     *
     * The empty case already reads "None recorded.", which is the truth for a
     * plan nobody has run yet, and the figures those keys named are on the row
     * itself in words.
     */
    receipts: [],
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
  return `ask: ${quoteContextValue(action)}. Explain the output, what changes if approved, missing facts, risks, and receipt expectations. Do not execute externally.\n\n${JSON.stringify(item, null, 2)}`;
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
    consequence: item.capabilityId
      ? (describeApprovalConsequence(item.capabilityId) ?? undefined)
      : undefined,
    tone: 'warning',
    priority: 5,
    primaryAction: 'Review',
    primaryDisabled: disabled,
    onPrimary: () => runCommand(approvalPrompt('Review this approval item', item)),
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
    status: 'suggested',
    note: `${item.confidence}% confidence`,
    tone: 'primary',
    priority: 30,
    primaryAction: 'Convert',
    /**
     * Gated like every other action item.
     *
     * This was the one feed item of seven that set no `primaryDisabled`, so a
     * locked workspace disabled its `Review` action and left `Convert` live —
     * and converting an opportunity into a plan writes to the workspace. Found
     * by driving the rendered interface and then reading why one control behaved
     * differently from its neighbours.
     *
     * The two items that legitimately omit this are `Set up` and `Open setup`:
     * they navigate to the settings that lift the lock, and disabling them would
     * strand the user inside it.
     */
    primaryDisabled: disabled,
    onPrimary: () => onConvertPredictiveOpportunityToPlan(item),
    details: [item.whyThisAppeared, `Expected impact: ${item.expectedImpact}`],
    timeline: ['Evaluate', 'Run small experiment', 'Capture receipt'],
    approvals: ['Approve experiments before outreach, publishing, or record changes.'],
    receipts: item.supportingSignals.slice(0, 4),
    secondaryActions: [
      { label: 'Review', onClick: () => runCommand(item.previewCommand), disabled }
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
    status: 'suggested',
    note: item.confidence ? `${item.confidence}% confidence` : undefined,
    tone: 'info',
    priority: 35,
    primaryAction: 'Review',
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
    // The badge names the queue this came from — a source, not a state.
    status: row.badge ?? row.kind,
    note: row.badge ?? row.kind,
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
    status: twin ? 'ready' : 'setup needed',
    note: twin ? `${twin.confidenceScore}% confidence` : undefined,
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
  onVerifyPlan: NonNullable<MobileWorkspaceHubViewProps['onVerifyPlan']>;
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
    items.push(
      savedPlanToFeedItem(
        plan,
        args.runCommand,
        args.disabled,
        args.onExecutePlan,
        args.onVerifyPlan
      )
    );
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

/**
 * The feed, grouped by what the reader has to *do* about it.
 *
 * The page rendered eighteen items as sibling `h3`s drawn from seven different
 * sources — a setup prompt, a Twin proposal, eight suggestions, a contact, five
 * plan templates and two execution records — every one of them styled
 * identically. It asked "What needs your attention?" and then answered it
 * eighteen times with equal weight. 936 words and 46 controls, none of which
 * looked more important than any other, which is the same as none of them
 * looking important.
 *
 * Grouping is by intent rather than by the system each item came from. A person
 * opening this wants to know what is waiting on *them* before they want to know
 * what a recommendation engine thought of overnight, and the two are not
 * comparable — one is a decision they owe someone, the other is an idea they can
 * ignore.
 *
 * Order is the reading order: decisions, then work already moving, then
 * suggestions, then things already finished, then setup. Anything unmapped falls
 * to the end rather than vanishing.
 */
const FEED_GROUPS: ReadonlyArray<{
  id: string;
  title: string;
  hint: string;
  kinds: ReadonlyArray<FeedKind>;
}> = [
  {
    id: 'decisions',
    title: 'Waiting on you',
    hint: 'Nothing here moves until you decide.',
    kinds: ['approval', 'twin-update']
  },
  {
    id: 'moving',
    title: 'In progress',
    hint: 'Already underway.',
    kinds: ['active-plan']
  },
  {
    id: 'ready',
    title: 'Ready to start',
    hint: 'Set up and waiting for you to begin.',
    kinds: ['ready-plan']
  },
  {
    id: 'suggested',
    title: 'Suggested',
    hint: 'Ideas from your workspace. Safe to ignore.',
    kinds: ['opportunity', 'recommendation']
  },
  {
    id: 'done',
    title: 'Recently done',
    hint: 'Finished, with receipts.',
    kinds: ['completed-action']
  },
  {
    id: 'setup',
    title: 'Set up',
    hint: 'One-time steps that unlock the rest.',
    kinds: ['integration-reminder']
  }
];

/** How many of a group are shown before the reader asks for the rest. */
const COLLAPSED_GROUP_SIZE = 3;

function FeedGroup({
  title,
  hint,
  items,
  btnFocus,
  notListed = 0
}: {
  title: string;
  hint: string;
  items: FeedItem[];
  btnFocus: string;
  /**
   * How many exist that were never handed to this group.
   *
   * The approval feed is built from a peek capped at eight, while the tile above
   * it reports the true count. With 25 approvals pending, the tile read
   * **"Pending Approvals 25"** and the group directly beneath it read **"Waiting
   * on you (5)"** with a button offering "Show 2 more" — which tells a reader
   * that five is all there is.
   *
   * "Show N more" is honest about the rows this group is holding back. It cannot
   * speak for rows the group never received, so the count has to.
   */
  notListed?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, COLLAPSED_GROUP_SIZE);
  const hidden = items.length - shown.length;
  // Computed over the whole group, not the visible slice, so expanding a group
  // does not change what its rows are labelled.
  const distinctKinds = new Set(items.map((item) => item.kind)).size;
  const informative = informativeStates(items);

  return (
    <section
      className="mt-3"
      aria-label={
        notListed > 0
          ? `${title} (${items.length} of ${items.length + notListed})`
          : `${title} (${items.length})`
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-label font-semibold text-text">
          {title}{' '}
          <span className="text-textSoft" aria-hidden>
            {notListed > 0 ? `${items.length} of ${items.length + notListed}` : items.length}
          </span>
        </h3>
      </div>
      <p className="mt-0.5 text-meta text-textSoft">
        {hint}
        {notListed > 0 ? ` ${notListed} more not listed here.` : ''}
      </p>

      <div className="mt-2 grid gap-2">
        {shown.map((item) => (
          <FeedItemRow
            key={item.id}
            item={item}
            btnFocus={btnFocus}
            showKind={distinctKinds > 1}
            informative={informative}
          />
        ))}
      </div>

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={clsx(
            'mt-2 rounded-lg border border-border/45 px-2.5 py-1 text-fine text-textMuted hover:text-text',
            btnFocus
          )}
        >
          Show {hidden} more
        </button>
      ) : null}
    </section>
  );
}

function FeedItemRow({
  item,
  btnFocus,
  showKind = true,
  informative
}: {
  item: FeedItem;
  btnFocus: string;
  showKind?: boolean;
  /** States worth chipping in this group; omitted means chip whatever maps. */
  informative?: Set<string>;
}) {
  const Icon = FEED_ICONS[item.kind];
  const mapped = userFacingState(item.status);
  const state = mapped && (!informative || informative.has(mapped)) ? mapped : null;
  return (
    <details
      id={item.id}
      className={clsx(
        'group scroll-mt-28 rounded-xl border bg-bgElevated/55 px-3 py-2.5 open:border-primary/35 open:bg-surface/70',
        toneBorderClass(item.tone)
      )}
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
              {/*
                The kind label renders only where it distinguishes something.

                Grouping the feed by kind made this label redundant by
                construction: "Recent receipt" under "Recently done", "Active
                plan" under "In progress". Measured on the demo workspace, 6 of
                the 9 rendered labels sat in a group containing exactly one kind,
                so they restated the heading directly above them. It still earns
                its place in "Waiting on you" and "Suggested", which mix two.
              */}
              {showKind ? <p className="bo-system-label">{FEED_LABELS[item.kind]}</p> : null}
              {state ? (
                <span
                  className={clsx(
                    'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                    toneClass(item.tone)
                  )}
                >
                  {state}
                </span>
              ) : null}
              {item.note ? <span className="text-fine text-textSoft">{item.note}</span> : null}
            </div>
            <h4 className="mt-1 text-label font-semibold leading-tight text-text">{item.title}</h4>
            <p className="mt-1 line-clamp-2 text-meta leading-snug text-textMuted">
              {item.summary}
            </p>
            {/*
              Consequence before the button, not behind the disclosure.

              Everything else on a collapsed row describes the request. This
              describes what happens if the reader says yes — and they are being
              asked to say yes right here, so hiding it one level down asks for a
              decision while withholding what the decision does.
            */}
            {item.consequence ? (
              <p
                className={clsx(
                  'mt-1 text-fine leading-snug',
                  item.consequence.leavesWorkspace || item.consequence.reversible === false
                    ? 'text-warning'
                    : 'text-textSoft'
                )}
              >
                {item.consequence.effect}
                {item.consequence.reversible === false ? ' Rejecting runs nothing.' : ''}
              </p>
            ) : null}
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
                // A button, so it gains the hover state the static chips do not.
                // It previously used the chip mapping and had no hover at all.
                toneInteractiveClass(action.tone),
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
  onVerifyPlan = () => {},
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
  /** 'approved'/'executing' are live, in-progress work too — not just 'active' — since the approval fan-out (checkpointActions.ts) started making 'approved' a real, reachable status. 'executed' also still counts: BrandOps recorded execution but the plan needs a human "Confirm outcomes" pass before it's done. Excludes 'draft'/'pending-approval' (not yet live), 'rejected' (dead), 'verified' (done), and 'opportunity' (its own counter below). */
  const activePlanCount =
    snapshot.convertedAskPlans.filter(
      (plan) =>
        plan.status === 'active' ||
        plan.status === 'approved' ||
        plan.status === 'executing' ||
        plan.status === 'executed'
    ).length +
    convertedOperationalPlans.length +
    // Counted the same way the feed groups them: a template nobody has started
    // is not an active plan. This read `!== 'needs-input'`, so four untouched
    // templates made an empty workspace report four active plans.
    buildOperationalPlanCards(snapshot).filter(
      (plan) => plan.status === 'in-progress' || plan.status === 'blocked'
    ).length;
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
    onVerifyPlan,
    onConvertPredictiveOpportunityToPlan,
    onExportOperationalPlan,
    onExportExecutionReceipt,
    disabled
  });
  const visibleFeedItems = useMemo(
    () => filterFeedItems(feedItems, feedFilter),
    [feedFilter, feedItems]
  );
  const member =
    launchAccess.membership.status === 'active'
      ? 'Local membership active · unverified'
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
              Operational workspace
            </p>
            <h2 className="mt-1 text-h3 text-text">What needs your attention?</h2>
            {/*
              The sentence here listed "actions, approvals, active plans,
              opportunities, and recent receipts", which is the group headings
              read aloud before the reader reaches them. It described a flat feed
              that no longer exists.
            */}
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
            onClick={() => setFeedFilter(feedFilter === 'attention' ? 'all' : 'attention')}
            btnFocus={btnFocus}
          />
          <SummaryPill
            label="Active Plans"
            value={String(activePlanCount)}
            tone="info"
            active={feedFilter === 'active'}
            onClick={() => setFeedFilter(feedFilter === 'active' ? 'all' : 'active')}
            btnFocus={btnFocus}
          />
          <SummaryPill
            label="Pending Approvals"
            value={String(snapshot.planPendingReviewCount)}
            tone={snapshot.planPendingReviewCount ? 'warning' : 'success'}
            active={feedFilter === 'approvals'}
            onClick={() => setFeedFilter(feedFilter === 'approvals' ? 'all' : 'approvals')}
            btnFocus={btnFocus}
          />
          <SummaryPill
            label="Opportunities"
            value={String(opportunityCount)}
            tone="primary"
            active={feedFilter === 'opportunities'}
            onClick={() => setFeedFilter(feedFilter === 'opportunities' ? 'all' : 'opportunities')}
            btnFocus={btnFocus}
          />
        </div>

        {/*
          The filter row is gone, and the tiles above absorbed it.
          
          Four of its six chips set exactly the same state as a tile —
          "Pending Approvals" the tile and "Approvals" the chip were the same
          button drawn twice — so the header offered eleven controls of which
          eight were four duplicated pairs. The tiles are the better half of each
          pair because they carry the count as well as the filter.
          
          "All" is gone too: a tile that is already active now clears back to it,
          which is one control doing what two did. And with the feed grouped by
          the same categories, most of this filtering is answered by simply
          reading down the page.
        */}

        {lockHint ? (
          <div className="mt-3 rounded-xl border border-warning/35 bg-warningSoft/15 px-3 py-2">
            <p className="text-meta leading-snug text-warning">{lockHint}</p>
            {/*
              The way out of the lock, on the message that describes it.

              Removing the "Start here" card removed the only enabled control on
              a locked Plan page that reached Settings — every other control is
              disabled by the lock, which is the point of it. A lock that hides
              the route to the thing that lifts it strands the person inside it,
              and `interactionSafety` caught this within a minute of the card
              coming out.

              This is the better home for it either way: the sentence already
              says to open Settings, and now saying so and going there are one
              control instead of an instruction and a hunt.
            */}
            <button
              type="button"
              onClick={onOpenSettings}
              className={clsx(
                'mt-2 rounded-lg border border-warning/45 px-2.5 py-1 text-fine font-semibold text-warning',
                btnFocus
              )}
            >
              Open Settings
            </button>
          </div>
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

      {snapshot.activeDigitalTwin ? (
        <div className="mt-3 rounded-2xl border border-border/35 bg-bgElevated/55 px-3 py-2.5">
          <p className="bo-system-label text-primary">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            What your twin knows
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-fine text-textSoft">
            <span>
              <strong className="font-medium text-text">
                {snapshot.activeDigitalTwin.displayName}
              </strong>{' '}
              &middot; {snapshot.activeDigitalTwin.confidenceScore}% confidence
            </span>
            {snapshot.positioning ? (
              <span className="line-clamp-1">{snapshot.positioning}</span>
            ) : null}
          </div>
          {snapshot.activeDigitalTwin.resumeProfile.skills.length > 0 ? (
            <p className="mt-1 text-fine leading-snug text-textMuted">
              {snapshot.activeDigitalTwin.resumeProfile.skills.length} skills
              {snapshot.activeDigitalTwin.resumeProfile.experience.length > 0
                ? ` · ${snapshot.activeDigitalTwin.resumeProfile.experience.length} roles`
                : ''}
              {snapshot.activeDigitalTwin.memory.approvedClaims.length > 0
                ? ` · ${snapshot.activeDigitalTwin.memory.approvedClaims.length} verified claims`
                : ''}
              {snapshot.memoryContextEngine.entries.length > 0
                ? ` · ${snapshot.memoryContextEngine.entries.length} memory entries`
                : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {snapshot.expertOperator.ask.expertNames.length > 0 ||
      snapshot.predictiveOpportunityLayer.suggestions.length > 0 ||
      snapshot.predictiveContentIdeationEngine.allIdeas.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-border/35 bg-bgElevated/55 px-3 py-2.5">
          <p className="bo-system-label text-primary">
            <Brain className="h-3.5 w-3.5" aria-hidden />
            Twin intelligence
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-fine text-textSoft">
            {snapshot.expertOperator.ask.expertNames.length > 0 ? (
              <span>
                <strong className="font-medium text-text">
                  {pluralise(snapshot.expertOperator.ask.expertNames.length, 'expert')}
                </strong>{' '}
                active: {snapshot.expertOperator.ask.expertNames.slice(0, 3).join(', ')}
                {snapshot.expertOperator.ask.expertNames.length > 3 ? '…' : ''}
              </span>
            ) : null}
            {snapshot.predictiveOpportunityLayer.suggestions.length > 0 ? (
              <span>
                <strong className="font-medium text-text">
                  {pluralise(snapshot.predictiveOpportunityLayer.suggestions.length, 'opportunity')}
                </strong>{' '}
                predicted
              </span>
            ) : null}
            {snapshot.predictiveContentIdeationEngine.allIdeas.length > 0 ? (
              <span>
                <strong className="font-medium text-text">
                  {pluralise(
                    snapshot.predictiveContentIdeationEngine.allIdeas.length,
                    'content idea'
                  )}
                </strong>{' '}
                ready
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/*
        The "Start here" card used to sit here, and it rendered `attention` —
        which is `feedItems.find(...) ?? feedItems[0]`, the same object the first
        group renders as its first row.

        So the top of the page showed one item twice: same title, same status
        chip, same summary, same button, one directly above the other. It made
        sense when the feed below was a flat list of eighteen equal-weight items
        and something had to be lifted out of it. Once the feed was grouped and
        "Waiting on you" became the first thing under the header, the card was
        promoting an item to the position it already held.
      */}

      <div className="mt-3 grid gap-2">
        <p className="text-fine text-textSoft" aria-live="polite">
          {/*
            "Showing 18 of 18 feed items" is a line that only ever tells the
            reader something when the two numbers differ.
          */}
          {/*
            Only shown while a filter is on.
            
            Unfiltered, this said "16 items." — a total the five group headings
            already give, each broken down usefully. Filtered, it is the only
            thing on the page explaining why the feed is short.
          */}
          {visibleFeedItems.length === feedItems.length
            ? null
            : `Showing ${visibleFeedItems.length} of ${feedItems.length}. Tap the active tile to clear the filter.`}
        </p>
        {visibleFeedItems.length ? (
          <>
            {FEED_GROUPS.map((group) => {
              const items = visibleFeedItems.filter((item) => group.kinds.includes(item.kind));
              if (!items.length) return null;
              /**
               * Only the decisions group knows its own true total, because only
               * approvals carry one: `planPendingReviewCount` counts them all
               * while the peek that feeds the rows is capped at eight. The other
               * groups render everything they are given, so nothing is missing
               * from them to declare.
               */
              const listedApprovals = items.filter((item) => item.kind === 'approval').length;
              const notListed =
                group.id === 'decisions'
                  ? Math.max(0, snapshot.planPendingReviewCount - listedApprovals)
                  : 0;
              return (
                <FeedGroup
                  key={group.id}
                  title={group.title}
                  hint={group.hint}
                  items={items}
                  btnFocus={btnFocus}
                  notListed={notListed}
                />
              );
            })}
            {/*
              Anything a group does not claim still appears, rather than being
              silently dropped — a new feed kind should look unsorted, not
              missing.
            */}
            {(() => {
              const claimed = new Set(FEED_GROUPS.flatMap((group) => group.kinds));
              const rest = visibleFeedItems.filter((item) => !claimed.has(item.kind));
              return rest.length ? (
                <FeedGroup title="Other" hint="Not yet grouped." items={rest} btnFocus={btnFocus} />
              ) : null;
            })()}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border/50 bg-bgSubtle/30 px-3 py-5 text-center">
            <p className="text-sm font-medium text-text">No items in this focus</p>
            <p className="mt-1.5 text-meta leading-relaxed text-textSoft">
              {feedFilter === 'approvals'
                ? 'No approvals pending. When your twin generates actions or external agents propose changes, they appear here for your review before anything executes.'
                : feedFilter === 'active'
                  ? 'No active plans yet. Ask your twin a strategic question, then convert the response to a structured plan with execution steps and approval gates.'
                  : feedFilter === 'opportunities'
                    ? 'No opportunities detected yet. Your twin learns from workspace activity, connected platforms, and behavioral patterns — opportunities surface as context accumulates.'
                    : 'Your operational feed is empty. Start by creating your digital twin in Setup, then ask strategic questions in Ask My Twin.'}
            </p>
            {feedFilter === 'all' || feedFilter === 'active' ? (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className={clsx(
                  'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/45 bg-primarySoft/20 px-3 py-1.5 text-fine font-semibold text-primary',
                  btnFocus
                )}
              >
                Add work
              </button>
            ) : null}
          </div>
        )}
      </div>

      <footer className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2.5">
        <p className="flex items-start gap-2 text-meta leading-snug text-textMuted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <span>
            <strong className="font-medium text-text">Your workspace is local-first.</strong> Plan
            drafts actions and organizes work. Nothing is sent, published, or deleted without your
            explicit approval. Integrations show their real status.
          </span>
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
