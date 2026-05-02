import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  History,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  User,
  CalendarRange
} from 'lucide-react';
import clsx from 'clsx';
import { AgentWorkingState } from '../../shared/ui/brandopsPolish';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import type { WorkspaceSignalsPick } from './WorkspaceSignalsBoard';
import { WorkspaceSignalsBoard } from './WorkspaceSignalsBoard';
import { getIntentByCommandLine } from './chatIntents';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sourceSurface?: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat';
  action?: string;
  ok?: boolean;
  resultKind?: 'plain' | 'command-result';
  strip?: {
    notes: number;
    queue: number;
    followUps: number;
    opportunities: number;
  };
}

/** Curated horizontal picks — diverse, tap-first (mobile / iOS friendly). */
const ASSISTANT_QUICK_PICKS = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of CHAT_QUICK_STARTER_GROUPS) {
    for (const c of g.commands) {
      if (seen.has(c)) continue;
      seen.add(c);
      out.push(c);
      if (out.length >= 10) return out;
    }
  }
  return out;
})();

function chipClass(btnFocus: string) {
  return clsx(
    'min-h-[44px]',
    'max-w-full rounded-xl border border-border/55 bg-surface/55 px-3 py-2.5 text-left text-label leading-snug text-textMuted transition active:scale-[0.99] hover:border-borderStrong hover:bg-surfaceActive/70 touch-manipulation',
    btnFocus
  );
}

function copyToClipboard(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  void navigator.clipboard.writeText(text).catch(() => {
    // ignore
  });
}

export interface MobileChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  commandHistory: string[];
  onQuickCommand: (command: string) => void;
  onClearCommandHistory: () => void;
  btnFocus: string;
  /** Cockpit lanes (Today tab). */
  onOpenToday: () => void;
  /** Workspace overview (Plan dock). */
  onOpenPlan?: () => void;
  /** Live workspace subset — full board inside expandable “Parameters”. */
  vitalityMetrics: WorkspaceSignalsPick;
}

/**
 * **Assistant (Ask)** — transcript-first layout with iOS-friendly scrolling, 44px tap targets,
 * Plan/Today shortcuts, and quick horizontal starters above the thread.
 */
export const MobileChatView = ({
  messages,
  loading,
  commandHistory,
  onQuickCommand,
  onClearCommandHistory,
  btnFocus,
  onOpenToday,
  onOpenPlan,
  vitalityMetrics
}: MobileChatViewProps) => {
  const metricSummary = `Follow-ups ${vitalityMetrics.incompleteFollowUps} · Publish queue ${vitalityMetrics.publishingQueue} · Missed ${vitalityMetrics.missedTasks}`;

  return (
    <div aria-label="Assistant" className="space-y-3">
      <header className="rounded-2xl border border-border/45 bg-surface/35 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-textSoft">
              Ask
            </p>
            <h2 className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-text">
              BrandOps Assistant
            </h2>
            <p className="mt-1 text-[12px] leading-snug text-textMuted">
              Commands execute on-device. <span className="whitespace-nowrap">⌘K</span> /{' '}
              <span className="whitespace-nowrap">Ctrl+K</span> opens the command palette.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            {onOpenPlan ? (
              <button
                type="button"
                onClick={onOpenPlan}
                title="Open Workspace overview"
                className={clsx(
                  'inline-flex min-h-[44px] min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-border/55 bg-bgSubtle/60 px-3 text-[13px] font-semibold text-text touch-manipulation transition hover:border-borderStrong hover:bg-surfaceActive/80',
                  btnFocus
                )}
              >
                <LayoutDashboard className="h-4 w-4 text-textSoft" strokeWidth={2.25} aria-hidden />
                Plan
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenToday}
              title="Open Today lanes"
              className={clsx(
                'inline-flex min-h-[44px] min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl border border-accent/35 bg-accentSoft/20 px-3 text-[13px] font-semibold text-text touch-manipulation transition hover:border-accent/55 hover:bg-accentSoft/35',
                btnFocus
              )}
            >
              <CalendarRange className="h-4 w-4 text-accent" strokeWidth={2.25} aria-hidden />
              Today
            </button>
          </div>
        </div>
      </header>

      <details className="bo-disclosure group overflow-hidden rounded-2xl border border-border/40 bg-bgSubtle/25">
        <summary
          className={clsx(
            'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-left [&::-webkit-details-marker]:hidden',
            btnFocus,
            'touch-manipulation'
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-textSoft">
              Parameters
            </p>
            <p className="mt-0.5 truncate text-[12px] font-medium text-text">{metricSummary}</p>
          </div>
          <ChevronDown
            size={18}
            className="shrink-0 text-textSoft transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-border/30 px-0 pb-3 pt-1">
          <WorkspaceSignalsBoard
            metrics={vitalityMetrics}
            variant="chat"
            includeKeys={['queue', 'fu', 'missed']}
          />
        </div>
      </details>

      <section aria-labelledby="assistant-quick-picks-label">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p id="assistant-quick-picks-label" className="text-[11px] font-semibold text-textMuted">
            Quick picks
          </p>
          <span className="text-[10px] text-textSoft">Swipe · tap to run</span>
        </div>
        <div
          className="bo-assistant-quick-strip mt-2 flex gap-2 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {ASSISTANT_QUICK_PICKS.map((command) => {
            const meta = getIntentByCommandLine(command);
            return (
              <button
                key={command}
                type="button"
                onClick={() => onQuickCommand(command)}
                title={command}
                className={clsx(
                  chipClass(btnFocus),
                  'max-w-[min(100%,14rem)] shrink-0 snap-start rounded-full border-border/50 px-4 shadow-sm'
                )}
              >
                {meta ? (
                  <span className="block">
                    <span className="block font-semibold text-text">{meta.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] text-textSoft">
                      {meta.subtitle}
                    </span>
                  </span>
                ) : (
                  <span className="line-clamp-2 font-medium text-text">{command}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="bo-assistant-thread-scroll flex max-h-[min(52vh,28rem)] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-border/40 bg-bgElevated/40 px-2 py-3 shadow-inner sm:max-h-[min(58vh,34rem)]"
        aria-label="Conversation"
      >
        <h3 className="sr-only">Conversation transcript</h3>
        <div
          className="flex min-h-0 flex-col gap-3"
          role="log"
          aria-relevant="additions"
          aria-live="polite"
          aria-atomic="false"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accentSoft/25 text-accent">
                <Sparkles className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
              <p className="text-sm font-semibold text-text">Nothing here yet</p>
              <p className="max-w-[18rem] text-[13px] leading-relaxed text-textMuted">
                Use Quick picks above, type in the bar below, or press{' '}
                <kbd className="rounded border border-border/50 bg-bgSubtle px-1 py-0.5 font-mono text-[11px] text-textSoft">
                  ⌘K
                </kbd>{' '}
                for every shortcut.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={clsx(
                  'flex items-end gap-2.5',
                  message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto max-w-[min(100%,22rem)]'
                )}
              >
                <span
                  className={clsx(
                    'mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm',
                    message.role === 'user'
                      ? 'border-borderStrong/50 bg-surfaceActive text-text'
                      : 'border-accent/35 bg-accentSoft/30 text-accent'
                  )}
                  aria-hidden
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" strokeWidth={2.25} />
                  ) : (
                    <Bot className="h-4 w-4" strokeWidth={2.25} />
                  )}
                </span>
                <div
                  className={clsx(
                    'min-w-0',
                    message.role === 'user' && 'max-w-[min(100%,18rem)] text-end'
                  )}
                >
                  {message.role === 'user' ? (
                    <div className="rounded-[1.15rem] rounded-br-md border border-borderStrong/55 bg-surfaceActive px-3.5 py-2.5 text-left text-[15px] leading-relaxed text-text shadow-md">
                      {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                        <p className="mb-1 text-start text-[10px] font-semibold uppercase tracking-wide text-textSoft">
                          From {message.sourceSurface}
                        </p>
                      ) : null}
                      <p className="text-start">{message.text}</p>
                    </div>
                  ) : message.resultKind === 'command-result' && message.action ? (
                    <div className="space-y-2 rounded-[1.15rem] rounded-bl-md border border-border/50 bg-bgElevated/98 px-3.5 py-3 text-[15px] shadow-md">
                      <div className="flex flex-wrap items-center gap-2">
                        {message.ok ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-successSoft px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-success"
                            title="Command succeeded"
                          >
                            <CheckCircle2 size={13} aria-hidden />
                            Ok
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-warningSoft px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning"
                            title="Command had an issue"
                          >
                            <AlertCircle size={13} aria-hidden />
                            Issue
                          </span>
                        )}
                        <code className="rounded-md border border-border/40 bg-bgSubtle/90 px-2 py-0.5 text-[11px] text-info">
                          {message.action}
                        </code>
                        {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                          <span className="rounded-md border border-border/40 bg-bgSubtle/80 px-2 py-0.5 text-[10px] text-textSoft">
                            from {message.sourceSurface}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={clsx(
                            'ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border/45 text-textSoft hover:bg-surfaceActive/80 hover:text-text',
                            btnFocus
                          )}
                          title="Copy command output"
                          aria-label="Copy command output"
                          onClick={() =>
                            copyToClipboard(
                              `${message.action}\n${message.text}${message.strip ? `\n${JSON.stringify(message.strip)}` : ''}`
                            )
                          }
                        >
                          <Copy size={16} aria-hidden />
                        </button>
                      </div>
                      <p className="leading-relaxed text-text">{message.text}</p>
                    </div>
                  ) : (
                    <div className="rounded-[1.15rem] rounded-bl-md border border-border/50 bg-bgElevated/98 px-3.5 py-3 text-[15px] leading-relaxed text-text shadow-md">
                      {message.text}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {loading ? (
        <div className="px-1">
          <AgentWorkingState />
        </div>
      ) : null}

      <details className="bo-disclosure group">
        <summary
          className={clsx(
            'flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-textMuted transition-colors hover:text-text touch-manipulation [&::-webkit-details-marker]:hidden',
            btnFocus
          )}
        >
          <span className="inline-flex items-center gap-2">
            <MessageCircle size={16} className="text-textSoft" aria-hidden />
            <span>Guided examples</span>
          </span>
          <ChevronDown
            size={16}
            className="text-textSoft transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="space-y-4 border-t border-border/30 px-3 pb-3 pt-3">
          {CHAT_QUICK_STARTER_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="bo-section-label">
                <span className="bo-icon-chip bo-icon-chip--xs bo-icon-chip--muted" aria-hidden>
                  <MessageCircle className="h-3 w-3" strokeWidth={2.25} />
                </span>
                <span>{group.label}</span>
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {group.commands.map((command) => {
                  const meta = getIntentByCommandLine(command);
                  return (
                    <button
                      key={command}
                      type="button"
                      onClick={() => onQuickCommand(command)}
                      title={command}
                      className={chipClass(btnFocus)}
                    >
                      {meta ? (
                        <span className="block text-start">
                          <span className="block font-semibold text-text">{meta.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-meta text-textSoft">
                            {meta.subtitle}
                          </span>
                        </span>
                      ) : (
                        command
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </details>

      {commandHistory.length > 0 ? (
        <details className="bo-disclosure group">
          <summary
            className={clsx(
              'flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13px] text-textMuted [&::-webkit-details-marker]:hidden touch-manipulation',
              btnFocus
            )}
          >
            <span className="inline-flex items-center gap-2 font-semibold text-text">
              <History size={16} className="text-textSoft" aria-hidden />
              <span>Recent commands</span>
              <span className="bo-count-pill" aria-hidden>
                {commandHistory.length}
              </span>
            </span>
            <ChevronDown
              size={16}
              className="text-textSoft transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-border/30 px-3 pb-3 pt-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-textSoft">Tap to re-run · newest first.</p>
              <button
                type="button"
                className={clsx(
                  'min-h-[44px] px-2 text-[11px] font-semibold text-textSoft hover:text-textMuted touch-manipulation',
                  btnFocus
                )}
                title="Clear recent commands"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearCommandHistory();
                }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {commandHistory.slice(0, 8).map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => onQuickCommand(cmd)}
                  className={clsx(
                    'min-h-[44px] max-w-full rounded-xl border border-border/50 bg-surface/45 px-3 py-2.5 text-start text-[13px] text-textMuted touch-manipulation transition hover:border-borderStrong hover:bg-surfaceActive/60',
                    btnFocus
                  )}
                  title={cmd}
                >
                  {cmd.length > 56 ? `${cmd.slice(0, 54)}…` : cmd}
                </button>
              ))}
            </div>
            {commandHistory.length > 8 ? (
              <p className="mt-2 text-[11px] text-textSoft">
                {commandHistory.length - 8} more after you clear or run newer commands.
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
};
