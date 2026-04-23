import { AlertCircle, CheckCircle2, Copy, History, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { AgentWorkingState } from '../../shared/ui/brandopsPolish';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import { getIntentByCommandLine } from './chatIntents';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
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
}

/**
 * Chat tab: thread, guided examples (plain language), and recent runs.
 */
export const MobileChatView = ({
  messages,
  loading,
  commandHistory,
  onQuickCommand,
  onClearCommandHistory,
  btnFocus,
  onOpenToday
}: MobileChatViewProps) => {
  return (
    <div className="space-y-4" aria-label="Chat">
      <header className="bo-section-halo bo-section-halo--primary border-b border-border/30 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/40 bg-accentSoft/25">
            <MessageCircle className="h-5 w-5 text-accent" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-h1 text-text">Chat</h2>
            <p className="mt-0.5 text-label text-textMuted">
              Type or tap — commands execute here.{' '}
              <button
                type="button"
                onClick={onOpenToday}
                className={clsx(
                  'font-medium text-accent underline-offset-2 hover:underline',
                  btnFocus
                )}
              >
                Today
              </button>{' '}
              to plan.
            </p>
          </div>
        </div>
      </header>

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
                message.role === 'user' &&
                  'ml-auto mr-0 max-w-[min(100%,20rem)] rounded-2xl border border-borderStrong/50 bg-surfaceActive px-3 py-2 text-sm leading-relaxed text-text shadow-sm sm:mr-1',
                message.role === 'assistant' && 'mr-auto max-w-[min(100%,24rem)]'
              )}
            >
              {message.role === 'user' ? (
                message.text
              ) : message.resultKind === 'command-result' && message.action ? (
                <div className="space-y-2 rounded-2xl border border-border/50 bg-bgElevated/95 px-3 py-2.5 text-sm shadow-inner">
                  <div className="flex flex-wrap items-center gap-2">
                    {message.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-successSoft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success">
                        <CheckCircle2 size={12} aria-hidden />
                        Ok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warningSoft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
                        <AlertCircle size={12} aria-hidden />
                        Issue
                      </span>
                    )}
                    <code className="rounded border border-border/40 bg-bgSubtle/80 px-1.5 py-0.5 text-[11px] text-info">
                      {message.action}
                    </code>
                    <button
                      type="button"
                      className={clsx(
                        'ml-auto inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-0.5 text-[10px] text-textSoft',
                        btnFocus
                      )}
                      onClick={() =>
                        copyToClipboard(
                          `${message.action}\n${message.text}${message.strip ? `\n${JSON.stringify(message.strip)}` : ''}`
                        )
                      }
                    >
                      <Copy size={12} aria-hidden />
                      Copy
                    </button>
                  </div>
                  <p className="text-text leading-relaxed">{message.text}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-bgElevated/95 px-3 py-2.5 text-sm leading-relaxed text-text">
                  {message.text}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {loading ? <AgentWorkingState /> : null}

      <details className="group rounded-xl border border-border/50 bg-bgSubtle/35 open:bg-bgSubtle/50">
        <summary
          className={clsx(
            'cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-textMuted transition-colors hover:text-text',
            btnFocus,
            '[&::-webkit-details-marker]:hidden'
          )}
        >
          <span className="inline-flex w-full items-center justify-between gap-2">
            <span>Guided examples</span>
            <span className="text-[10px] font-normal text-textSoft group-open:hidden">Expand</span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-border/30 px-3 pb-3 pt-3">
          {CHAT_QUICK_STARTER_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="bo-section-label">
                <span className="bo-visual-orb" aria-hidden />
                {group.label}
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
        <details className="group rounded-xl border border-border/50 bg-bgSubtle/35 open:bg-bgSubtle/50">
          <summary
            className={clsx(
              'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs text-textMuted [&::-webkit-details-marker]:hidden',
              btnFocus
            )}
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-text">
              <History size={14} className="text-textSoft" aria-hidden />
              Recent commands
            </span>
            <span className="text-[10px] text-textSoft">{commandHistory.length}</span>
          </summary>
          <div className="border-t border-border/30 px-3 pb-3 pt-2">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className={clsx('text-[10px] text-textSoft hover:text-textMuted', btnFocus)}
                onClick={(e) => {
                  e.stopPropagation();
                  onClearCommandHistory();
                }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {commandHistory.map((cmd) => (
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
          </div>
        </details>
      ) : null}
    </div>
  );
};
