import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Briefcase,
  CalendarClock,
  Compass,
  Database,
  FileText,
  Inbox,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  PlugZap,
  Rocket,
  Send,
  Sparkle,
  Sparkles,
  Sun,
  TriangleAlert,
  TrendingUp,
  Workflow
} from 'lucide-react';
import clsx from 'clsx';
import type { DashboardSectionId } from '../../shared/config/dashboardNavigation';
import type { MobileShellTabId } from './mobileShellQuery';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { PulseTimelineRow } from './pulseTimeline';
import { MobileTabPageHeader } from './mobileTabPrimitives';
import { bucketForRow, startOfLocalDay } from './pulseBuckets';
import { buildPulseHomeBoard, type PulseHomeLine } from './pulseHomeModel';
import { EmptyState } from '../../shared/ui/brandopsPolish';

function primeLineForRow(row: PulseTimelineRow): string {
  switch (row.kind) {
    case 'follow-up':
      return `add note: follow-up — ${row.title.replace(/"/g, "'")}`;
    case 'publishing':
      return `update publishing: ${row.title.replace(/"/g, "'")} checklist ready`;
    case 'scheduler':
      return `add note: scheduler task — ${row.title.replace(/"/g, "'")}`;
    case 'outreach':
      return `draft outreach: follow up with ${row.title.split('·')[0]?.trim() ?? 'contact'}`;
    default:
      return `add note: ${row.title.replace(/"/g, "'")}`;
  }
}

type RowTone = 'info' | 'warning' | 'success' | 'primary' | 'muted';

function rowKindGlyph(kind: PulseTimelineRow['kind']): { Icon: LucideIcon; tone: RowTone } {
  switch (kind) {
    case 'follow-up':
      return { Icon: MessageSquare, tone: 'warning' };
    case 'publishing':
      return { Icon: CalendarClock, tone: 'info' };
    case 'scheduler':
      return { Icon: Bell, tone: 'info' };
    case 'outreach':
      return { Icon: Send, tone: 'primary' };
    default:
      return { Icon: Inbox, tone: 'muted' };
  }
}

function lineGlyph(id: string): { Icon: LucideIcon; tone: RowTone } {
  if (id === 'cadence') return { Icon: Compass, tone: 'info' };
  if (id === 'next-pub' || id === 'horizon' || id === 'queue')
    return { Icon: CalendarClock, tone: 'info' };
  if (id === 'closing' || id === 'pipe-sum' || id === 'weighted' || id.startsWith('deal'))
    return { Icon: Briefcase, tone: 'success' };
  if (id === 'missed') return { Icon: Bell, tone: 'warning' };
  if (id === 'due') return { Icon: CalendarClock, tone: 'warning' };
  if (id.startsWith('fu')) return { Icon: MessageSquare, tone: 'warning' };
  if (id.startsWith('content')) return { Icon: FileText, tone: 'primary' };
  if (id === 'sync') return { Icon: PlugZap, tone: 'warning' };
  if (id === 'sources') return { Icon: Database, tone: 'primary' };
  if (id === 'clear') return { Icon: Sparkles, tone: 'success' };
  if (id === 'seed') return { Icon: Rocket, tone: 'primary' };
  return { Icon: Sparkle, tone: 'muted' };
}

const sectionShell = (accent: 'now' | 'fix' | 'grow' | 'ai') => {
  const border =
    accent === 'now'
      ? 'border-l-accent'
      : accent === 'fix'
        ? 'border-l-warning'
        : accent === 'grow'
          ? 'border-l-success'
          : 'border-l-info';
  return clsx('rounded-xl border border-border/50 bg-bgSubtle/40 px-3 py-3 border-l-4', border);
};

function LineList({ items }: { items: PulseHomeLine[] }) {
  return (
    <ul className="mt-2 space-y-1.5" role="list">
      {items.map((item) => {
        const { Icon, tone } = lineGlyph(item.id);
        return (
          <li key={item.id} className="bo-line-row">
            <span
              className={clsx('bo-icon-chip bo-icon-chip--xs mt-0.5', `bo-icon-chip--${tone}`)}
              aria-hidden
            >
              <Icon className="h-3 w-3" strokeWidth={2.25} />
            </span>
            <div className="bo-line-row__body">
              <p className="bo-line-row__title">{item.line}</p>
              {item.detail ? <p className="bo-line-row__detail">{item.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type StatTone = 'now' | 'fix' | 'grow' | 'ai';
function StatCard({
  label,
  value,
  sub,
  tone,
  icon: Icon
}: {
  label: string;
  value: number;
  sub?: string;
  tone: StatTone;
  icon: LucideIcon;
}) {
  return (
    <div className={clsx('bo-stat-card', `bo-stat-card--${tone}`)}>
      <span className="bo-stat-card__icon" aria-hidden>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <p className="bo-stat-card__label">{label}</p>
      <p className="bo-stat-card__value">{value}</p>
      {sub ? <p className="bo-stat-card__sub">{sub}</p> : null}
    </div>
  );
}

export interface PulseTimelineViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
  onNavigateTab: (tab: MobileShellTabId) => void;
  onOpenCockpitWorkstream: (workstream: DashboardSectionId) => void;
}

export const PulseTimelineView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  onNavigateTab,
  onOpenCockpitWorkstream
}: PulseTimelineViewProps) => {
  const now = new Date();
  const home = buildPulseHomeBoard(snapshot, now);
  const rows = snapshot.pulseTimelineRows;
  const grouped: Record<'today' | 'thisWeek' | 'later', PulseTimelineRow[]> = {
    today: [],
    thisWeek: [],
    later: []
  };
  for (const row of rows) {
    grouped[bucketForRow(row.sortKey, now)].push(row);
  }

  const recommendedCount = home.recommendedActions.length;
  const dueToday = grouped.today.length;

  const renderBucket = (key: 'today' | 'thisWeek' | 'later', title: string, Icon: LucideIcon) => {
    const list = grouped[key];
    if (list.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="bo-section-label">
          <span className="bo-icon-chip bo-icon-chip--xs bo-icon-chip--muted" aria-hidden>
            <Icon className="h-3 w-3" strokeWidth={2.25} />
          </span>
          <span>{title}</span>
          <span className="bo-count-pill" aria-hidden>
            {list.length}
          </span>
        </p>
        <ol className="mt-2 space-y-2" role="list">
          {list.map((row) => {
            const { Icon: RowIcon, tone } = rowKindGlyph(row.kind);
            return (
              <li
                key={row.id}
                className="rounded-lg border border-border/40 bg-bgSubtle/40 px-3 py-2.5 text-label text-textMuted"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={clsx(
                      'bo-icon-chip bo-icon-chip--sm mt-0.5',
                      `bo-icon-chip--${tone}`
                    )}
                    aria-hidden
                  >
                    <RowIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-text">{row.title}</p>
                    <p className="mt-0.5 text-meta text-textSoft">{row.subtitle}</p>
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={commandBusy}
                        onClick={() => primeChat(primeLineForRow(row))}
                        title="Open in Chat"
                        className={clsx(
                          'bo-btn-ghost',
                          btnFocus,
                          'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                      >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                        Open in Chat
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  const jumpBtnClass = `inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5 text-label font-medium text-text hover:border-borderStrong hover:bg-surfaceActive/80 ${btnFocus}`;

  return (
    <div className="mt-1 space-y-5" aria-label="Pulse">
      <MobileTabPageHeader
        title="Pulse"
        subtitle="What is due soonest — at a glance."
        icon={Activity}
        iconWrapperClassName="flex items-center justify-center rounded-xl border border-accent/40 bg-accentSoft/25"
        iconClassName="text-accent"
        haloTone="primary"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Due today" value={dueToday} sub="in queue" tone="now" icon={Bell} />
        <StatCard
          label="Attention"
          value={home.needsAttention.length}
          sub="needs a look"
          tone="fix"
          icon={TriangleAlert}
        />
        <StatCard
          label="Momentum"
          value={home.momentum.length}
          sub="signals up"
          tone="grow"
          icon={TrendingUp}
        />
        <StatCard label="AI" value={recommendedCount} sub="suggested" tone="ai" icon={Sparkles} />
      </div>

      <div className={sectionShell('now')}>
        <div className="bo-section-label">
          <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--primary" aria-hidden>
            <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <span>Now</span>
          <span className="bo-count-pill" aria-hidden>
            {home.mattersNow.length}
          </span>
          <span className="sr-only">What matters now</span>
        </div>
        <LineList items={home.mattersNow} />
      </div>

      <div className={sectionShell('fix')}>
        <div className="bo-section-label">
          <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--warning" aria-hidden>
            <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <span>Attention</span>
          <span className="bo-count-pill" aria-hidden>
            {home.needsAttention.length}
          </span>
          <span className="sr-only">What needs attention</span>
        </div>
        <LineList items={home.needsAttention} />
      </div>

      <div className={sectionShell('grow')}>
        <div className="bo-section-label">
          <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--success" aria-hidden>
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <span>Growing</span>
          <span className="bo-count-pill" aria-hidden>
            {home.momentum.length}
          </span>
          <span className="sr-only">What is growing</span>
        </div>
        <LineList items={home.momentum} />
      </div>

      <div className={sectionShell('ai')}>
        <div className="bo-section-label">
          <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--info" aria-hidden>
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <span>AI suggestions</span>
          <span className="bo-count-pill" aria-hidden>
            {recommendedCount}
          </span>
          <span className="sr-only">AI-recommended next actions</span>
        </div>
        <ul className="mt-2 space-y-2" role="list">
          {home.recommendedActions.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border/40 bg-bgSubtle/45 px-3 py-2.5 text-label text-textMuted"
            >
              <div className="flex items-start gap-2">
                <span
                  className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--info mt-0.5"
                  aria-hidden
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-text">{a.title}</p>
                  <p className="mt-0.5 text-meta text-textSoft">{a.rationale}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={commandBusy}
                      onClick={() => void runCommand(a.command)}
                      className={clsx('bo-btn-primary bo-btn-primary--sm', btnFocus)}
                      title={`Run: ${a.command}`}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                      Run
                    </button>
                    <button
                      type="button"
                      disabled={commandBusy}
                      onClick={() => primeChat(a.command)}
                      className={clsx('bo-btn-ghost', btnFocus)}
                      title="Put in Chat composer without sending"
                    >
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                      Review
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bo-glass-panel--muted rounded-xl border border-border/55 p-3">
        <p className="bo-section-label">
          <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--muted" aria-hidden>
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <span>Jump</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('chat')}
            className={jumpBtnClass}
            title="Open Chat"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Chat
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('daily')}
            className={jumpBtnClass}
            title="Open Today"
          >
            <Sun className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Today
          </button>
          <button
            type="button"
            onClick={() => onOpenCockpitWorkstream('pipeline')}
            className={jumpBtnClass}
            title="Open Pipeline workstream"
          >
            <Workflow className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Pipeline
          </button>
          <button
            type="button"
            onClick={() => onOpenCockpitWorkstream('brand-content')}
            className={jumpBtnClass}
            title="Open Brand & posts workstream"
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Brand &amp; posts
          </button>
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('pipeline health')}
            className={clsx('bo-btn-primary', btnFocus)}
            title="Run: pipeline health"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            Pipeline health
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          body="Add a follow-up, a publish slot, or outreach — or open Chat to run a command."
        >
          <button
            type="button"
            onClick={() => onNavigateTab('chat')}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1.5 text-[11px] font-medium text-text ${btnFocus}`}
          >
            <MessageCircle className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            Open Chat
          </button>
        </EmptyState>
      ) : (
        <>
          <p className="bo-section-label">
            <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--muted" aria-hidden>
              <Inbox className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span>Up next</span>
            <span className="sr-only">Up next in order</span>
          </p>
          {renderBucket('today', 'Today', Sun)}
          {renderBucket('thisWeek', 'This week', CalendarClock)}
          {renderBucket('later', 'Later', Rocket)}
        </>
      )}

      <p className="text-meta text-textSoft/80" title={startOfLocalDay(now).toISOString()}>
        Snapshot: {home.meta.generatedAt} · {rows.length} queue row{rows.length === 1 ? '' : 's'}
      </p>
    </div>
  );
};
