import clsx from 'clsx';
import {
  AlertTriangle,
  Bell,
  Bot,
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
  const visibleKinds = (Object.keys(KIND_LABELS) as UnifiedInboxKind[]).filter(
    (kind) => inbox.countsByKind[kind] > 0
  );

  return (
    <section
      id="plan-unified-inbox"
      className="bo-ops-panel scroll-mt-28 p-3"
      aria-labelledby="plan-unified-inbox-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="bo-system-label text-primary">
            <Inbox className="h-4 w-4" aria-hidden />
            Inbox
          </p>
          <h2 id="plan-unified-inbox-heading" className="mt-1 text-h3 text-text">
            Triage first
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            Approvals, alerts, opportunities, drafts, and recommendations collapse into one queue.
          </p>
        </div>
        <span className="bo-terminal-meta">
          {inbox.totalCount} item{inbox.totalCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="bo-terminal-meta">
          {inbox.headline} · {inbox.highPriorityCount} high priority
        </span>
        {visibleKinds.map((kind) => {
          const Icon = kindIcon(kind);
          return (
            <span
              key={kind}
              className="inline-flex items-center gap-1 rounded-full border border-border/35 bg-bgSubtle/50 px-2 py-1 text-fine text-textMuted"
            >
              <Icon className="h-3 w-3 text-textSoft" aria-hidden />
              {KIND_LABELS[kind]} {inbox.countsByKind[kind]}
            </span>
          );
        })}
      </div>

      {topItems.length === 0 ? (
        <p className="bo-ops-row mt-3 text-meta text-textMuted">
          Inbox clear. New approvals, drafts, workflow alerts, AI opportunities, and integration
          notifications will land here first.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {topItems.map((item) => {
            const Icon = kindIcon(item.kind);
            return (
              <article
                key={item.id}
                className="bo-ops-row"
                aria-labelledby={`${item.id}-heading`}
              >
                <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--primary mt-0.5" aria-hidden>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="bo-system-label">
                        {KIND_LABELS[item.kind]} · {item.sourceLabel} · {compactTime(item.at)}
                      </p>
                      <h3
                        id={`${item.id}-heading`}
                        className="mt-1 text-label font-semibold text-text"
                      >
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-meta leading-snug text-textMuted">
                        {item.detail}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={clsx(
                          'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                          priorityTone(item.priority)
                        )}
                      >
                        {item.priority}
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void runCommand(item.command)}
                        className={clsx(
                          'rounded-lg border border-primary/45 bg-primarySoft/15 px-2.5 py-1.5 text-meta font-semibold text-primary disabled:opacity-45',
                          btnFocus
                        )}
                      >
                        Triage
                      </button>
                    </div>
                  </div>
                  <details className="bo-ops-disclosure mt-2 px-2.5 py-2">
                    <summary className="bo-system-label">Details · {item.status}</summary>
                    <p className="mt-1 text-fine leading-snug text-textMuted">{item.detail}</p>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
