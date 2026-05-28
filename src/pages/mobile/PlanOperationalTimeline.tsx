import clsx from 'clsx';
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  CirclePlay,
  FileText,
  Megaphone,
  Network,
  RefreshCw,
  Send,
  ShieldCheck
} from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { mobileChipClass } from './mobileTabPrimitives';
import type { CrossPlatformTimelineKind } from '../../services/plan/crossPlatformOperationalTimeline';

const KIND_LABELS: Record<CrossPlatformTimelineKind, string> = {
  'generated-draft': 'Generated drafts',
  approval: 'Approvals',
  'sent-action': 'Sent actions',
  'scheduled-workflow': 'Scheduled workflows',
  'connected-platform-action': 'Platform actions',
  'ai-recommendation': 'AI recommendations',
  'completed-operation': 'Completed operations',
  'failed-operation': 'Failed operations'
};

function kindTone(kind: CrossPlatformTimelineKind): string {
  switch (kind) {
    case 'approval':
      return 'border-warning/45 bg-warningSoft/18 text-warning';
    case 'sent-action':
      return 'border-primary/45 bg-primarySoft/18 text-primary';
    case 'connected-platform-action':
      return 'border-info/45 bg-infoSoft/18 text-info';
    case 'scheduled-workflow':
      return 'border-success/45 bg-successSoft/18 text-success';
    case 'completed-operation':
      return 'border-success/45 bg-successSoft/18 text-success';
    case 'failed-operation':
      return 'border-danger/45 bg-dangerSoft/18 text-danger';
    case 'ai-recommendation':
      return 'border-primary/45 bg-primarySoft/18 text-primary';
    default:
      return 'border-border/45 bg-bgSubtle/80 text-textMuted';
  }
}

function kindIcon(kind: CrossPlatformTimelineKind) {
  switch (kind) {
    case 'approval':
      return ShieldCheck;
    case 'sent-action':
      return Send;
    case 'connected-platform-action':
      return Network;
    case 'ai-recommendation':
      return Bot;
    case 'scheduled-workflow':
      return CalendarClock;
    case 'generated-draft':
      return Megaphone;
    case 'completed-operation':
      return CheckCircle2;
    case 'failed-operation':
      return AlertTriangle;
    default:
      return FileText;
  }
}

function compactTime(value: string): string {
  const text = value.trim();
  if (!text) return 'Now';
  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return text;
  const [, year, month, day] = dateMatch;
  const timeMatch = text.match(/T(\d{2}):(\d{2})/);
  return timeMatch
    ? `${month}/${day}/${year} ${timeMatch[1]}:${timeMatch[2]}`
    : `${month}/${day}/${year}`;
}

export function PlanOperationalTimeline({
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
  const timeline = snapshot.crossPlatformOperationalTimeline;
  const items = timeline.items;
  const counts = timeline.countsByKind;

  return (
    <section
      id="plan-operational-timeline"
      className="scroll-mt-28 rounded-2xl border border-border/45 bg-surface/55 p-3.5"
      aria-labelledby="plan-operational-timeline-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            Operational command center
          </p>
          <h2 id="plan-operational-timeline-heading" className="mt-1 text-h3 text-text">
            Cross-platform operational timeline
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            Generated drafts, approvals, sent actions, scheduled workflows, platform actions, AI
            recommendations, and completed operations in one receipt-style feed.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {timeline.totalCount} event{timeline.totalCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Timeline item types">
        {(Object.keys(KIND_LABELS) as CrossPlatformTimelineKind[]).map((kind) => (
          <span
            key={kind}
            className={clsx(
              'rounded-full border px-2 py-1 text-fine font-semibold',
              kindTone(kind)
            )}
          >
            {KIND_LABELS[kind]} {counts[kind]}
          </span>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          No live execution signals yet. Use ASK to shape an output, convert it to PLAN, then
          approve or run it from this cross-platform command feed.
        </p>
      ) : (
        <ol className="relative mt-4 space-y-2.5 ps-4 before:absolute before:bottom-2 before:left-[0.45rem] before:top-2 before:w-px before:bg-border/55">
          {items.map((item) => {
            const Icon = kindIcon(item.kind);
            return (
              <li key={item.id} className="relative ps-4">
                <span
                  className={clsx(
                    'absolute left-[-0.9rem] top-3 flex h-5 w-5 items-center justify-center rounded-full border bg-bg',
                    kindTone(item.kind)
                  )}
                  aria-hidden
                >
                  <Icon className="h-3 w-3" strokeWidth={2.4} />
                </span>
                <article className="rounded-xl border border-border/40 bg-bgElevated/65 p-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-label font-semibold text-text">{item.whatHappened}</p>
                      <p className="mt-0.5 text-fine leading-snug text-textMuted">
                        {item.whereItHappened}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                        kindTone(item.kind)
                      )}
                    >
                      {KIND_LABELS[item.kind]}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1.5 rounded-lg border border-border/30 bg-bgSubtle/45 p-2 text-fine leading-snug text-textMuted sm:grid-cols-3">
                    <p>
                      <span className="block font-semibold text-textSoft">What happened</span>
                      {item.whatHappened}
                    </p>
                    <p>
                      <span className="block font-semibold text-textSoft">Where</span>
                      {item.whereItHappened}
                    </p>
                    <p>
                      <span className="block font-semibold text-textSoft">What AI did</span>
                      {item.whatAiDid}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-fine text-textSoft">
                      <time dateTime={item.at}>{compactTime(item.at)}</time>
                      <span aria-hidden>·</span>
                      <span>Status: {item.status}</span>
                    </div>
                    {item.command ? (
                      <button
                        type="button"
                        disabled={commandBusy || !canRunWorkspaceCommands}
                        onClick={() => void runCommand(item.command!)}
                        className={clsx(mobileChipClass(btnFocus), 'text-fine disabled:opacity-50')}
                      >
                        {item.kind === 'failed-operation' ? (
                          <RefreshCw className="me-1 inline h-3 w-3 align-text-bottom" />
                        ) : (
                          <CirclePlay className="me-1 inline h-3 w-3 align-text-bottom" />
                        )}
                        {item.kind === 'failed-operation' ? 'Retry' : 'Inspect'}
                      </button>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
