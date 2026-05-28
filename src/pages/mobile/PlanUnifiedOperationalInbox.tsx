import clsx from 'clsx';
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  FileText,
  Inbox,
  Lightbulb,
  ShieldCheck
} from 'lucide-react';
import type {
  UnifiedInboxKind,
  UnifiedOperationalInboxItem
} from '../../services/plan/unifiedOperationalInbox';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

const KIND_LABELS: Record<UnifiedInboxKind, string> = {
  notification: 'Notifications',
  approval: 'Approvals',
  'suggested-action': 'Suggested actions',
  'workflow-alert': 'Workflow alerts',
  'ai-opportunity': 'AI opportunities',
  'pending-draft': 'Pending drafts'
};

function kindIcon(kind: UnifiedInboxKind) {
  switch (kind) {
    case 'approval':
      return ShieldCheck;
    case 'workflow-alert':
      return AlertTriangle;
    case 'ai-opportunity':
      return Bot;
    case 'pending-draft':
      return FileText;
    case 'suggested-action':
      return Lightbulb;
    default:
      return Bell;
  }
}

function priorityTone(priority: UnifiedOperationalInboxItem['priority']): string {
  switch (priority) {
    case 'critical':
      return 'border-danger/45 bg-dangerSoft/15 text-danger';
    case 'high':
      return 'border-warning/45 bg-warningSoft/20 text-warning';
    case 'medium':
      return 'border-info/45 bg-infoSoft/15 text-info';
    default:
      return 'border-border/45 bg-bgSubtle/70 text-textMuted';
  }
}

function compactTime(value: string): string {
  const time = value.trim();
  if (!time) return 'Now';
  const date = time.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const clock = time.match(/T(\d{2}):(\d{2})/);
  if (!date) return time;
  return clock ? `${date[2]}/${date[3]} ${clock[1]}:${clock[2]}` : `${date[2]}/${date[3]}`;
}

export function PlanUnifiedOperationalInbox({
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
  const inbox = snapshot.unifiedOperationalInbox;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const topItems = inbox.items.slice(0, 12);

  return (
    <section
      id="plan-unified-inbox"
      className="scroll-mt-28 rounded-2xl border border-primary/30 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-unified-inbox-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <Inbox className="h-4 w-4" aria-hidden />
            Unified Operational Inbox
          </p>
          <h2 id="plan-unified-inbox-heading" className="mt-1 text-h3 text-text">
            One operational surface for everything
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            Notifications, approvals, suggested actions, workflow alerts, AI opportunities, and
            pending drafts collapse into one queue so PLAN does not feel like disconnected
            dashboards.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {inbox.totalCount} item{inbox.totalCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2">
        <p className="flex items-start gap-2 text-meta leading-snug text-textMuted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          {inbox.headline} {inbox.highPriorityCount} high-priority item
          {inbox.highPriorityCount === 1 ? '' : 's'} need attention first.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 text-fine sm:grid-cols-3">
        {(Object.keys(KIND_LABELS) as UnifiedInboxKind[]).map((kind) => {
          const Icon = kindIcon(kind);
          return (
            <div
              key={kind}
              className="rounded-lg border border-border/35 bg-bgSubtle/50 px-2 py-1.5"
            >
              <p className="flex items-center gap-1 text-textSoft">
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {KIND_LABELS[kind]}
              </p>
              <p className="mt-0.5 text-label font-semibold text-text">
                {inbox.countsByKind[kind]}
              </p>
            </div>
          );
        })}
      </div>

      {topItems.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          Inbox clear. New approvals, drafts, workflow alerts, AI opportunities, and integration
          notifications will land here first.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {topItems.map((item) => {
            const Icon = kindIcon(item.kind);
            return (
              <article
                key={item.id}
                className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
                aria-labelledby={`${item.id}-heading`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3
                      id={`${item.id}-heading`}
                      className="flex items-center gap-2 text-label font-semibold text-text"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-fine text-textSoft">
                      {KIND_LABELS[item.kind]} · {item.sourceLabel} · {compactTime(item.at)}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                      priorityTone(item.priority)
                    )}
                  >
                    {item.priority}
                  </span>
                </div>
                <p className="mt-2 text-meta leading-snug text-textMuted">{item.detail}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-meta">
                  <span className="rounded-full border border-border/35 bg-bgSubtle/60 px-2 py-1 text-fine text-textMuted">
                    {item.status}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void runCommand(item.command)}
                    className={clsx(
                      'rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45',
                      btnFocus
                    )}
                  >
                    Triage
                  </button>
                  {item.kind === 'approval' ? (
                    <a
                      href="#plan-human-approval-queue"
                      className={clsx(
                        'rounded-lg border border-warning/40 bg-warningSoft/15 px-2.5 py-1.5 font-semibold text-warning',
                        btnFocus
                      )}
                    >
                      Review approval
                    </a>
                  ) : null}
                  {item.kind === 'pending-draft' ? (
                    <a
                      href="#plan-cross-platform-planner"
                      className={clsx(
                        'rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 font-semibold text-primary',
                        btnFocus
                      )}
                    >
                      Convert to plan
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
