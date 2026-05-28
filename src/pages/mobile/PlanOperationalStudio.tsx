import clsx from 'clsx';
import { CheckCircle2, Download, ListChecks, Pencil, RefreshCw, Search } from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { TwinSupportedActionType } from '../../types/domain';
import { twinActionPrompt } from '../../services/digitalTwin/digitalTwin';

export type OperationalPlanStatus = 'needs-input' | 'ready' | 'in-progress' | 'blocked';

export interface OperationalPlanCard {
  id: string;
  title: string;
  kind:
    | 'workflow'
    | 'outreach'
    | 'content-calendar'
    | 'execution-sequence'
    | 'action-queue'
    | 'approval-flow';
  promise: string;
  previewCommand: string;
  approveCommand: string;
  editTarget: 'settings' | 'palette' | 'today';
  status: OperationalPlanStatus;
  progress: number;
  timeline: string[];
  exportPayload: Record<string, unknown>;
  sourceLabel?: string;
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

function planTone(status: OperationalPlanStatus): string {
  if (status === 'blocked') return 'border-warning/40 bg-warningSoft/15 text-warning';
  if (status === 'in-progress') return 'border-info/40 bg-infoSoft/15 text-info';
  if (status === 'ready') return 'border-success/40 bg-successSoft/15 text-success';
  return 'border-border/50 bg-bgSubtle/60 text-textMuted';
}

function twinPrompt(
  snapshot: MobileWorkspaceSnapshot,
  actionType: TwinSupportedActionType,
  fallback: string
): string {
  return snapshot.activeDigitalTwin
    ? twinActionPrompt(actionType, snapshot.activeDigitalTwin)
    : fallback;
}

function twinPlanPrefix(snapshot: MobileWorkspaceSnapshot): string {
  const twin = snapshot.activeDigitalTwin;
  const memory = snapshot.memoryContextEngine;
  const memoryContext = memory.entries.length
    ? `Memory context: ${[
        ...memory.improvements['plan-generation'].slice(0, 3),
        ...memory.improvements['workflow-recommendations'].slice(0, 3)
      ]
        .filter(Boolean)
        .join('; ')}.`
    : '';
  if (!twin) return memoryContext;
  const verified = [
    twin.identity.headline,
    twin.identity.professionalPositioning,
    ...twin.resumeProfile.skills.slice(0, 8),
    ...twin.memory.approvedClaims.slice(0, 5)
  ]
    .filter(Boolean)
    .join('; ');
  const missing = twin.memory.missingInfo.length
    ? `Missing info: ${twin.memory.missingInfo.join('; ')}. Ask for clarification before using missing facts.`
    : 'If any required fact is missing, ask for clarification instead of inventing it.';
  return `In active twin context for ${twin.displayName}, use this voice: ${twin.identity.toneOfVoice}. Positioning: ${twin.identity.professionalPositioning || twin.identity.summary}. Verified facts: ${verified || 'use only reviewed profile data'}. ${memoryContext} ${missing}`;
}

function twinAwareAsk(snapshot: MobileWorkspaceSnapshot, task: string): string {
  const prefix = twinPlanPrefix(snapshot);
  return `ask: ${prefix ? `${prefix}\n\n` : ''}${task}`;
}

export function buildOperationalPlanCards(
  snapshot: MobileWorkspaceSnapshot
): OperationalPlanCard[] {
  const queueCount = snapshot.pulseTimelineRows.length;
  const profileReady =
    Boolean(snapshot.operatorName.trim()) &&
    Boolean(snapshot.primaryOffer.trim()) &&
    Boolean(snapshot.voiceGuide.trim());
  const approvalBlocked = snapshot.planPendingReviewCount > 0;

  return [
    {
      id: 'workflow-reasoning',
      title: 'Workflow Plan',
      kind: 'workflow',
      promise: 'Turn a strategic idea into executable steps, dependencies, risks, and artifacts.',
      previewCommand: twinAwareAsk(
        snapshot,
        'Turn my next best idea into an execution workflow with risks, dependencies, artifacts, decision gates, and follow-up questions for any missing facts.'
      ),
      approveCommand: 'today plan',
      editTarget: 'palette',
      status: profileReady ? 'ready' : 'needs-input',
      progress: Math.min(100, Math.round((snapshot.notes + snapshot.integrationArtifactCount) * 8)),
      timeline: ['Idea intake', 'Preview workflow', 'Approve next actions', 'Track in Today'],
      exportPayload: {
        type: 'workflow',
        profileReady,
        notes: snapshot.notes,
        artifacts: snapshot.integrationArtifactCount
      }
    },
    {
      id: 'outreach-plan',
      title: 'Outreach Plan',
      kind: 'outreach',
      promise: 'Convert positioning and proof into draft outreach, follow-ups, and approvals.',
      previewCommand: twinPrompt(
        snapshot,
        'draft_outreach',
        'ask: Draft an outreach plan using my workspace profile, proof points, and follow-up priorities.'
      ),
      approveCommand: 'draft outreach',
      editTarget: 'settings',
      status:
        snapshot.outreachDrafts > 0 || snapshot.incompleteFollowUps > 0 ? 'in-progress' : 'ready',
      progress: Math.min(100, snapshot.outreachDrafts * 20 + snapshot.incompleteFollowUps * 10),
      timeline: ['Preview targets', 'Approve draft', 'Queue follow-up', 'Review replies'],
      exportPayload: {
        type: 'outreach',
        outreachDrafts: snapshot.outreachDrafts,
        followUps: snapshot.incompleteFollowUps,
        activeOpportunities: snapshot.activeOpportunities
      }
    },
    {
      id: 'content-calendar',
      title: 'Content Calendar',
      kind: 'content-calendar',
      promise: 'Transform twin ideas into a repeatable content calendar and publish queue.',
      previewCommand: twinPrompt(
        snapshot,
        'create_30_day_content_plan',
        'ask: Create a 30-day content calendar from my expertise, voice, proof points, and current workspace context.'
      ),
      approveCommand: 'create linkedin post',
      editTarget: 'palette',
      status:
        snapshot.queuedPublishing > 0 || snapshot.publishingQueue > 0 ? 'in-progress' : 'ready',
      progress: Math.min(
        100,
        snapshot.queuedPublishing * 20 + snapshot.contentTopSignals.length * 10
      ),
      timeline: ['Ideate themes', 'Approve calendar', 'Create drafts', 'Schedule queue'],
      exportPayload: {
        type: 'content-calendar',
        publishingQueue: snapshot.publishingQueue,
        queuedPublishing: snapshot.queuedPublishing,
        contentSignals: snapshot.contentTopSignals.length
      }
    },
    {
      id: 'execution-sequence',
      title: 'Execution Sequence',
      kind: 'execution-sequence',
      promise: 'Sequence tasks, pipeline moves, scheduler items, and daily operating priorities.',
      previewCommand: twinAwareAsk(
        snapshot,
        'Build an execution sequence for today using my queue, follow-ups, opportunities, constraints, twin voice, and positioning.'
      ),
      approveCommand: 'pipeline health',
      editTarget: 'today',
      status: queueCount > 0 ? 'in-progress' : 'needs-input',
      progress: Math.min(100, queueCount * 12 + snapshot.dueTodayTasks * 10),
      timeline: ['Read queue', 'Prioritize sequence', 'Run command', 'Measure progress'],
      exportPayload: {
        type: 'execution-sequence',
        queueRows: queueCount,
        dueTodayTasks: snapshot.dueTodayTasks,
        missedTasks: snapshot.missedTasks
      }
    },
    {
      id: 'approval-flow',
      title: 'Approval Flow',
      kind: 'approval-flow',
      promise: 'Keep AI-generated work gated by review, approval, retry, and export.',
      previewCommand: twinAwareAsk(
        snapshot,
        'Review my pending approvals and explain what needs human confirmation before execution. Flag unsupported claims and ask for missing facts.'
      ),
      approveCommand: approvalBlocked
        ? 'run ai pipeline workspace_audit_report --ack'
        : 'pipeline health',
      editTarget: 'palette',
      status: approvalBlocked ? 'blocked' : 'ready',
      progress: approvalBlocked ? 35 : 100,
      timeline: ['Preview generated work', 'Human approval', 'Retry if blocked', 'Export audit'],
      exportPayload: {
        type: 'approval-flow',
        pendingReviews: snapshot.planPendingReviewCount,
        traceBundles: snapshot.memoryTraceSummary.bundleCount,
        recentPipelineRuns: snapshot.recentAiPipelineRuns.length
      }
    }
  ];
}

export function PlanOperationalStudio({
  snapshot,
  btnFocus,
  commandBusy,
  agentEnabled,
  agentLockHint,
  runCommand,
  onOpenSettings,
  onOpenToday,
  onOpenCommandPalette,
  onExportOperationalPlan,
  convertedPlans = []
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  agentEnabled: boolean;
  agentLockHint: string | null;
  runCommand: (command: string) => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenToday: () => void;
  onOpenCommandPalette: () => void;
  onExportOperationalPlan: (plan: OperationalPlanCard) => void;
  convertedPlans?: OperationalPlanCard[];
}) {
  const cards = [...convertedPlans, ...buildOperationalPlanCards(snapshot)];
  const disabled = commandBusy || !agentEnabled;
  const twin = snapshot.activeDigitalTwin;
  const verifiedDataCount = twin
    ? new Set(
        [
          twin.identity.headline,
          twin.identity.professionalPositioning,
          ...twin.resumeProfile.skills,
          ...twin.resumeProfile.achievements,
          ...twin.memory.approvedClaims
        ]
          .map((item) => item?.trim())
          .filter(Boolean)
      ).size
    : 0;
  const memoryUsageCount = twin
    ? twin.memory.facts.length +
      twin.memory.preferences.length +
      twin.memory.voiceExamples.length +
      twin.memory.approvedClaims.length
    : 0;

  return (
    <section
      id="plan-operational-studio"
      className="scroll-mt-28 rounded-2xl border border-primary/25 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-operational-studio-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-[0.14em] text-textMuted">
            Operational execution layer
          </p>
          <h2 id="plan-operational-studio-heading" className="mt-1 text-h3 text-text">
            Turn ideas into executable plans
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            PLAN turns ASK outputs into workflows, outreach plans, content calendars, execution
            sequences, action queues, approval flows, and operational timelines.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
            btnFocus
          )}
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          Command palette
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {twin ? (
          <section
            className="rounded-xl border border-primary/35 bg-primarySoft/15 p-3 sm:col-span-2"
            aria-label="PLAN active twin context"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-label font-semibold text-text">
                  Active twin for PLAN: {twin.displayName}
                </p>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  PLAN uses this twin for voice, positioning, suggestions, workflows, opportunities,
                  content direction, and outreach style.
                </p>
              </div>
              <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
                {twin.confidenceScore}% confidence
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-1.5 text-fine sm:grid-cols-4">
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Verified data usage</dt>
                <dd className="font-semibold text-text">{verifiedDataCount} facts</dd>
              </div>
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Memory usage</dt>
                <dd className="font-semibold text-text">{memoryUsageCount} memories</dd>
              </div>
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Positioning</dt>
                <dd className="line-clamp-1 font-semibold text-text">
                  {twin.identity.professionalPositioning || twin.identity.headline}
                </dd>
              </div>
              <div className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5">
                <dt className="text-textSoft">Missing facts</dt>
                <dd className="font-semibold text-text">
                  {twin.memory.missingInfo.length ? 'Ask first' : 'Grounded'}
                </dd>
              </div>
            </dl>
          </section>
        ) : (
          <section
            className="rounded-xl border border-border/40 bg-bgSubtle/45 p-3 sm:col-span-2"
            aria-label="PLAN missing twin context"
          >
            <p className="text-label font-semibold text-text">No active twin yet</p>
            <p className="mt-1 text-meta text-textMuted">
              PLAN can still execute workspace commands, but voice, positioning, outreach style, and
              content direction improve after creating a digital twin.
            </p>
          </section>
        )}
        {cards.map((plan) => (
          <article
            key={plan.id}
            className="rounded-xl border border-border/45 bg-bgElevated/55 p-3"
            aria-labelledby={`${plan.id}-heading`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 id={`${plan.id}-heading`} className="text-label font-semibold text-text">
                  {plan.title}
                </h3>
                {plan.sourceLabel ? (
                  <p className="mt-0.5 text-overline font-bold uppercase tracking-wide text-primary">
                    {plan.sourceLabel}
                  </p>
                ) : twin ? (
                  <p className="mt-0.5 text-overline font-bold uppercase tracking-wide text-primary">
                    Twin-aware plan
                  </p>
                ) : null}
                <p className="mt-1 text-meta leading-snug text-textMuted">{plan.promise}</p>
              </div>
              <span
                className={clsx(
                  'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                  planTone(plan.status)
                )}
              >
                {statusLabel(plan.status)}
              </span>
            </div>

            <div className="mt-3" aria-label={`${plan.title} progress`}>
              <div className="flex items-center justify-between gap-2 text-fine text-textSoft">
                <span>Progress</span>
                <span>{plan.progress}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bgSubtle">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(5, Math.min(100, plan.progress))}%` }}
                />
              </div>
            </div>

            <ol
              className="mt-3 grid grid-cols-2 gap-1.5 text-fine text-textMuted"
              aria-label="Timeline"
            >
              {plan.timeline.map((step, index) => (
                <li
                  key={step}
                  className="rounded-lg border border-border/30 bg-bgSubtle/45 px-2 py-1"
                >
                  <span className="font-mono text-textSoft">{index + 1}.</span> {step}
                </li>
              ))}
            </ol>

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
                <ListChecks className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Preview
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void runCommand(plan.approveCommand)}
                className={clsx(
                  'rounded-lg border border-success/40 bg-successSoft/20 px-2 py-1.5 text-success disabled:opacity-45',
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
                disabled={disabled}
                onClick={() => void runCommand(plan.previewCommand)}
                className={clsx(
                  'rounded-lg border border-warning/40 bg-warningSoft/15 px-2 py-1.5 text-warning disabled:opacity-45',
                  btnFocus
                )}
              >
                <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Retry
              </button>
              <button
                type="button"
                onClick={() => onExportOperationalPlan(plan)}
                className={clsx(
                  'col-span-2 rounded-lg border border-border/45 bg-bgSubtle/60 px-2 py-1.5 text-text',
                  btnFocus
                )}
              >
                <Download className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Export plan JSON
              </button>
            </div>
          </article>
        ))}
      </div>

      {!agentEnabled && agentLockHint ? (
        <p className="mt-3 rounded-lg border border-warning/30 bg-warningSoft/15 px-2.5 py-2 text-meta text-text">
          {agentLockHint}
        </p>
      ) : null}
    </section>
  );
}
