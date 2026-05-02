import { useState } from 'react';
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
  TrendingUp
} from 'lucide-react';
import clsx from 'clsx';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { PulseTimelineRow } from './pulseTimeline';
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
  return clsx('bo-focus-panel', `bo-focus-panel--${accent}`);
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

type PulseFocusId = 'now' | 'fix' | 'grow' | 'ai';

type PulseFocusTab = {
  id: PulseFocusId;
  label: string;
  count: number;
  icon: LucideIcon;
  tone: 'primary' | 'warning' | 'success' | 'info';
  srLabel: string;
};

export interface PulseTimelineViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  runCommand: (command: string) => void | Promise<void>;
  primeChat: (line: string) => void;
}

export const PulseTimelineView = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat
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
  const [activeFocus, setActiveFocus] = useState<PulseFocusId>('now');

  const focusTabs: PulseFocusTab[] = [
    {
      id: 'now',
      label: 'Now',
      count: home.mattersNow.length,
      icon: Lightbulb,
      tone: 'primary',
      srLabel: 'What matters now'
    },
    {
      id: 'fix',
      label: 'Attention',
      count: home.needsAttention.length,
      icon: TriangleAlert,
      tone: 'warning',
      srLabel: 'What needs attention'
    },
    {
      id: 'grow',
      label: 'Growing',
      count: home.momentum.length,
      icon: TrendingUp,
      tone: 'success',
      srLabel: 'What is growing'
    },
    {
      id: 'ai',
      label: 'AI suggestions',
      count: recommendedCount,
      icon: Sparkles,
      tone: 'info',
      srLabel: 'AI-recommended next actions'
    }
  ];

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

  const renderAiSuggestions = () => (
    <ul className="mt-2 space-y-2" role="list">
      {home.recommendedActions.map((a) => (
        <li
          key={a.id}
          className="rounded-lg border border-border/40 bg-bgSubtle/45 px-3 py-2.5 text-label text-textMuted"
        >
          <div className="flex items-start gap-2">
            <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--info mt-0.5" aria-hidden>
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
  );

  return (
    <div className="space-y-5" aria-label="Pulse">
      <span className="sr-only">
        Pulse timeline and focus queues — what is due soonest across your workspace.
      </span>

      <div role="tablist" aria-label="Pulse focus areas" className="bo-focus-tabs">
        {focusTabs.map((tab) => {
          const isActive = activeFocus === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`pulse-focus-${tab.id}`}
              id={`pulse-focus-tab-${tab.id}`}
              onClick={() => setActiveFocus(tab.id)}
              title={tab.srLabel}
              className={clsx('bo-focus-tab', btnFocus)}
            >
              <span
                className={clsx('bo-icon-chip bo-icon-chip--xs', `bo-icon-chip--${tab.tone}`)}
                aria-hidden
              >
                <Icon className="h-3 w-3" strokeWidth={2.25} />
              </span>
              <span>{tab.label}</span>
              <span className="bo-count-pill" aria-hidden>
                {tab.count}
              </span>
              <span className="sr-only">{tab.srLabel}</span>
            </button>
          );
        })}
      </div>

      <div
        id="pulse-focus-now"
        role="tabpanel"
        aria-labelledby="pulse-focus-tab-now"
        hidden={activeFocus !== 'now'}
        className={sectionShell('now')}
      >
        <LineList items={home.mattersNow} />
      </div>

      <div
        id="pulse-focus-fix"
        role="tabpanel"
        aria-labelledby="pulse-focus-tab-fix"
        hidden={activeFocus !== 'fix'}
        className={sectionShell('fix')}
      >
        <LineList items={home.needsAttention} />
      </div>

      <div
        id="pulse-focus-grow"
        role="tabpanel"
        aria-labelledby="pulse-focus-tab-grow"
        hidden={activeFocus !== 'grow'}
        className={sectionShell('grow')}
      >
        <LineList items={home.momentum} />
      </div>

      <div
        id="pulse-focus-ai"
        role="tabpanel"
        aria-labelledby="pulse-focus-tab-ai"
        hidden={activeFocus !== 'ai'}
        className={sectionShell('ai')}
      >
        {renderAiSuggestions()}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

      {rows.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          body="Add a follow-up, a publish slot, or outreach when you are ready."
        />
      ) : (
        <details className="bo-disclosure group">
          <summary
            className={clsx(
              'cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-text [&::-webkit-details-marker]:hidden',
              btnFocus
            )}
          >
            <span className="inline-flex w-full items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="bo-icon-chip bo-icon-chip--sm bo-icon-chip--muted" aria-hidden>
                  <Inbox className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <span>Timeline queue</span>
                <span className="bo-count-pill" aria-hidden>
                  {rows.length}
                </span>
              </span>
              <span className="text-meta text-textSoft group-open:hidden">Expand</span>
            </span>
          </summary>
          <div className="border-t border-border/30 px-3 pb-3 pt-2">
            {renderBucket('today', 'Today', Sun)}
            {renderBucket('thisWeek', 'This week', CalendarClock)}
            {renderBucket('later', 'Later', Rocket)}
          </div>
        </details>
      )}

      <p className="text-meta text-textSoft/80" title={startOfLocalDay(now).toISOString()}>
        Snapshot: {home.meta.generatedAt} · {rows.length} queue row{rows.length === 1 ? '' : 's'}
      </p>
    </div>
  );
};
