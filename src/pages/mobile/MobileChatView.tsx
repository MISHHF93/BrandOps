import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  History,
  MessageCircle,
  User
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
  sourceSurface?: 'Pulse' | 'Today' | 'Integrations' | 'Settings' | 'Chat';
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

function chipClass(btnFocus: string) {
  return clsx(
    'max-w-full rounded-lg border border-border/55 bg-surface/55 px-3 py-2 text-left text-label leading-snug text-textMuted transition hover:border-borderStrong hover:bg-surfaceActive/70',
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
  /** Jump to Today for cockpit digests, pipeline rows, and integrations shortcuts. */
  onOpenToday: () => void;
  /** Live workspace subset — vitality lane above starters and transcript. */
  vitalityMetrics: WorkspaceSignalsPick;
}

/**
 * Chat tab: thread, guided examples (icon + short label), and recent runs. Slim header so the
 * thread dominates; icons on bubbles identify you vs. the agent without a "You:" / "Agent:" label.
 */
export const MobileChatView = ({
  messages,
  loading,
  commandHistory,
  onQuickCommand,
  onClearCommandHistory,
  btnFocus,
  onOpenToday,
  vitalityMetrics
}: MobileChatViewProps) => {
  return (
    <div aria-label="Chat">
      <article className="bo-flagship-surface overflow-hidden">
        <WorkspaceSignalsBoard
          metrics={vitalityMetrics}
          variant="chat"
          includeKeys={['queue', 'fu', 'missed']}
        />
        <div className="bo-vitality-frame-body space-y-3 px-3 pb-3 pt-2 sm:px-3.5">
      <h2 className="sr-only">Chat workspace commands</h2>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-textSoft">
        <span>Type or tap a starter.</span>
        <button
          type="button"
          onClick={onOpenToday}
          title="Open Today to plan"
          className={clsx(
            'font-semibold text-accent underline-offset-2 transition-colors hover:underline',
            btnFocus
          )}
        >
          Go to Today →
        </button>
      </p>

      <div
        className="flex min-h-[8rem] flex-col gap-2.5"
        role="log"
        aria-relevant="additions"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-textSoft">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={clsx(
                'flex items-start gap-2',
                message.role === 'user' ? 'ml-auto mr-0 flex-row-reverse' : 'mr-auto'
              )}
            >
              <span
                className={clsx(
                  'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  message.role === 'user'
                    ? 'border-borderStrong/50 bg-surfaceActive text-text'
                    : 'border-accent/40 bg-accentSoft/25 text-accent'
                )}
                aria-hidden
              >
                {message.role === 'user' ? (
                  <User className="h-3.5 w-3.5" strokeWidth={2.25} />
                ) : (
                  <Bot className="h-3.5 w-3.5" strokeWidth={2.25} />
                )}
              </span>
              <div
                className={clsx(
                  message.role === 'user' &&
                    'max-w-[min(100%,20rem)] rounded-2xl border border-borderStrong/50 bg-surfaceActive px-3 py-2 text-sm leading-relaxed text-text shadow-sm'
                )}
              >
                {message.role === 'user' ? (
                  <div className="space-y-1">
                    {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                      <p className="text-[10px] uppercase tracking-wide text-textSoft">
                        From {message.sourceSurface}
                      </p>
                    ) : null}
                    <p>{message.text}</p>
                  </div>
                ) : message.resultKind === 'command-result' && message.action ? (
                  <div className="space-y-2 rounded-2xl border border-border/50 bg-bgElevated/95 px-3 py-2.5 text-sm shadow-inner">
                    <div className="flex flex-wrap items-center gap-2">
                      {message.ok ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-successSoft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success"
                          title="Command succeeded"
                        >
                          <CheckCircle2 size={12} aria-hidden />
                          Ok
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-warningSoft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning"
                          title="Command had an issue"
                        >
                          <AlertCircle size={12} aria-hidden />
                          Issue
                        </span>
                      )}
                      <code className="rounded border border-border/40 bg-bgSubtle/80 px-1.5 py-0.5 text-[11px] text-info">
                        {message.action}
                      </code>
                      {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                        <span className="rounded border border-border/40 bg-bgSubtle/80 px-1.5 py-0.5 text-[10px] text-textSoft">
                          from {message.sourceSurface}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={clsx(
                          'ml-auto inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-0.5 text-[10px] text-textSoft hover:text-text',
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
                        <Copy size={12} aria-hidden />
                      </button>
                    </div>
                    <p className="text-text leading-relaxed">{message.text}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/50 bg-bgElevated/95 px-3 py-2.5 text-sm leading-relaxed text-text">
                    {message.text}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {loading ? <AgentWorkingState /> : null}

      <details className="bo-disclosure group">
        <summary
          className={clsx(
            'cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-textMuted transition-colors hover:text-text',
            btnFocus,
            '[&::-webkit-details-marker]:hidden'
          )}
        >
          <span className="inline-flex w-full items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={14} className="text-textSoft" aria-hidden />
              <span>Guided examples</span>
            </span>
            <ChevronDown
              size={14}
              className="text-textSoft transition-transform group-open:rotate-180"
              aria-hidden
            />
          </span>
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
              <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
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
                        <span className="block">
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
              'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs text-textMuted [&::-webkit-details-marker]:hidden',
              btnFocus
            )}
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-text">
              <History size={14} className="text-textSoft" aria-hidden />
              <span>Recent commands</span>
              <span className="bo-count-pill" aria-hidden>
                {commandHistory.length}
              </span>
            </span>
            <ChevronDown
              size={14}
              className="text-textSoft transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-border/30 px-3 pb-3 pt-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-textSoft">Tap to re-run. Showing latest first.</p>
              <button
                type="button"
                className={clsx('text-[10px] text-textSoft hover:text-textMuted', btnFocus)}
                title="Clear recent commands"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearCommandHistory();
                }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {commandHistory.slice(0, 8).map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => onQuickCommand(cmd)}
                  className={clsx(
                    'max-w-full truncate rounded-lg border border-border/50 bg-surface/50 px-2.5 py-1.5 text-left text-[11px] text-textMuted',
                    btnFocus
                  )}
                  title={cmd}
                >
                  {cmd.length > 48 ? `${cmd.slice(0, 46)}…` : cmd}
                </button>
              ))}
            </div>
            {commandHistory.length > 8 ? (
              <p className="mt-2 text-[10px] text-textSoft">
                {commandHistory.length - 8} more command
                {commandHistory.length - 8 === 1 ? '' : 's'} available after you clear or run newer
                ones.
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
        </div>
      </article>
    </div>
  );
};
