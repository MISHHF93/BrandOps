import clsx from 'clsx';
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  GitBranch,
  Mail,
  MessageSquareText,
  ShieldCheck,
  UsersRound
} from 'lucide-react';
import type { CrossPlatformOperationalPlan } from '../../services/plan/crossPlatformPlanner';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

function statusTone(status: CrossPlatformOperationalPlan['executionStatus']): string {
  switch (status) {
    case 'needs-approval':
      return 'border-warning/45 bg-warningSoft/20 text-warning';
    case 'needs-context':
      return 'border-border/45 bg-bgSubtle/70 text-textMuted';
    case 'in-progress':
      return 'border-info/45 bg-infoSoft/20 text-info';
    default:
      return 'border-success/45 bg-successSoft/20 text-success';
  }
}

function statusLabel(status: CrossPlatformOperationalPlan['executionStatus']): string {
  switch (status) {
    case 'needs-approval':
      return 'Needs approval';
    case 'needs-context':
      return 'Needs context';
    case 'in-progress':
      return 'In progress';
    default:
      return 'Ready';
  }
}

function kindIcon(kind: CrossPlatformOperationalPlan['kind']) {
  switch (kind) {
    case 'communication':
      return MessageSquareText;
    case 'content':
      return FileText;
    case 'workflow':
      return GitBranch;
    case 'outreach-sequence':
      return Mail;
    case 'scheduling-timeline':
      return CalendarClock;
    case 'follow-up-queue':
      return UsersRound;
    default:
      return CheckCircle2;
  }
}

function CompactList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">{label}</p>
      {items.length ? (
        <ul className="mt-1 space-y-1 text-fine leading-snug text-textMuted">
          {items.slice(0, 5).map((item) => (
            <li key={item} className="line-clamp-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-fine text-textMuted">None recorded.</p>
      )}
    </div>
  );
}

export function PlanCrossPlatformPlanner({
  snapshot,
  btnFocus,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  const plans = snapshot.crossPlatformPlans;
  const disabled = commandBusy || !canRunWorkspaceCommands;

  return (
    <section
      id="plan-cross-platform-planner"
      className="scroll-mt-28 rounded-2xl border border-primary/25 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-cross-platform-planner-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <GitBranch className="h-4 w-4" aria-hidden />
            Cross-platform planner
          </p>
          <h2 id="plan-cross-platform-planner-heading" className="mt-1 text-h3 text-text">
            Operate across connected platforms
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            PLAN now models communication plans, content plans, workflow plans, outreach sequences,
            scheduling timelines, and follow-up queues across connected apps. Missing integrations
            stay explicit.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {plans.length} plan types
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-warning/35 bg-warningSoft/10 px-3 py-2">
        <p className="flex items-start gap-2 text-meta leading-snug text-warning">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Nothing external executes without approval. PLAN can preview, draft, queue, and explain;
          sending, posting, scheduling, syncing, or CRM writes require a human approval gate and a
          receipt.
        </p>
      </div>

      <div className="mt-3 grid gap-2">
        {plans.map((plan) => {
          const Icon = kindIcon(plan.kind);
          return (
            <article
              key={plan.id}
              className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
              aria-labelledby={`${plan.id}-heading`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3
                    id={`${plan.id}-heading`}
                    className="flex items-center gap-2 text-label font-semibold text-text"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {plan.title}
                  </h3>
                  <p className="mt-1 text-meta leading-snug text-textMuted">{plan.purpose}</p>
                </div>
                <span
                  className={clsx(
                    'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                    statusTone(plan.executionStatus)
                  )}
                >
                  {statusLabel(plan.executionStatus)}
                </span>
              </div>

              <div
                className="mt-3 flex flex-wrap gap-1.5"
                aria-label="Connected platforms involved"
              >
                {plan.connectedPlatforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
                  >
                    {platform}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <CompactList label="Execution steps" items={plan.executionSteps} />
                <CompactList label="Approval requirements" items={plan.approvalRequirements} />
                <CompactList label="Timeline" items={plan.timeline} />
                <CompactList label="Receipts" items={plan.receiptRefs} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void runCommand(plan.previewCommand)}
                  className={clsx(
                    'rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45',
                    btnFocus
                  )}
                >
                  Preview plan
                </button>
                <a
                  href="#plan-human-approval-queue"
                  className={clsx(
                    'rounded-lg border border-warning/40 bg-warningSoft/15 px-2.5 py-1.5 font-semibold text-warning',
                    btnFocus
                  )}
                >
                  Approval queue
                </a>
                <a
                  href="#plan-execution-receipts"
                  className={clsx(
                    'rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 font-semibold text-primary',
                    btnFocus
                  )}
                >
                  Receipts
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
