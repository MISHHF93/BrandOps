import type { RefObject } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Copy,
  History,
  User,
  Sparkles,
  MessageCircle,
  Search
} from 'lucide-react';
import clsx from 'clsx';
import { AgentWorkingState } from '../../shared/ui/brandopsPolish';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import { getIntentByCommandLine } from './chatIntents';
import type { CopilotWorkerRegistrySettings } from '../../types/domain';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sourceSurface?: 'Workspace' | 'Today' | 'Integrations' | 'Settings' | 'Chat';
  action?: string;
  ok?: boolean;
  resultKind?: 'plain' | 'command-result' | 'ask-result';
  strip?: {
    notes: number;
    queue: number;
    followUps: number;
    opportunities: number;
  };
}

const STARTER_CAP = 6;

const ASSISTANT_QUICK_PICKS = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  const maxRound = Math.max(...CHAT_QUICK_STARTER_GROUPS.map((g) => g.commands.length), 0);
  for (let i = 0; i < maxRound && out.length < STARTER_CAP; i += 1) {
    for (const g of CHAT_QUICK_STARTER_GROUPS) {
      const c = g.commands[i];
      if (!c || seen.has(c)) continue;
      seen.add(c);
      out.push(c);
      if (out.length >= STARTER_CAP) return out;
    }
  }
  return out;
})();

function copyToClipboard(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  void navigator.clipboard.writeText(text).catch(() => {});
}

export interface MobileChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  commandHistory: string[];
  onQuickCommand: (command: string) => void;
  copilotWorkerRegistry: CopilotWorkerRegistrySettings;
  onSelectCopilotWorker: (workerId: string) => void;
  onClearCommandHistory: () => void;
  btnFocus: string;
  /** Anchor for scroll-into-view while the shell main scrolls as one surface */
  transcriptEndRef?: RefObject<HTMLDivElement>;
  /** Open global command palette — same catalogue as Plan and ⌘K */
  onOpenCommandPalette?: () => void;
  /** Jump to Settings → Résumé grounding (hosted Ask Phase R). */
  onOpenResumeGrounding?: () => void;
}

/**
 * Assistant tab — full-height conversational layout: one scroll container (shell `main`),
 * fixed composer below. Avoids nested transcript panes that trap touch / keyboard scroll.
 */
export const MobileChatView = ({
  messages,
  loading,
  commandHistory,
  onQuickCommand,
  copilotWorkerRegistry,
  onSelectCopilotWorker,
  onClearCommandHistory,
  btnFocus,
  transcriptEndRef,
  onOpenCommandPalette,
  onOpenResumeGrounding
}: MobileChatViewProps) => {
  /** Matches hero inset — keeps Copilot / starters / transcript edges aligned. */
  const assistantGutter = 'px-3 sm:px-3.5';

  return (
    <div aria-label="Assistant" className="bo-assistant-surface flex flex-col gap-3">
      <header className={clsx('bo-assistant-hero bo-dos-hero py-3 sm:py-3.5', assistantGutter)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-text">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bgElevated text-accent">
                <MessageCircle className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight tracking-tight text-text">
                  Assistant
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-textMuted">
                  <span className="whitespace-nowrap font-mono text-[10px] text-textSoft">
                    ask: …
                  </span>{' '}
                  for hosted answers; everything else runs on-device. Quick picks and pulse live on{' '}
                  <span className="font-medium text-textSoft">Plan</span> — ⌘K lists all commands.
                </p>
              </div>
            </div>
          </div>
          {onOpenCommandPalette ? (
            <nav aria-label="Assistant shortcuts" className="flex shrink-0 items-start">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Open command palette (⌘K / Ctrl+K)"
                aria-label="Open command palette"
                className={clsx('bo-icon-btn-ai inline-flex items-center gap-1.5', btnFocus)}
              >
                <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                <span className="hidden min-[380px]:inline text-[11px] font-semibold">⌘K</span>
              </button>
            </nav>
          ) : null}
        </div>
        {onOpenResumeGrounding ? (
          <p className="mt-2 text-[10px] leading-snug text-textSoft">
            <button
              type="button"
              onClick={onOpenResumeGrounding}
              className={clsx('bo-link bo-link--sm font-semibold !normal-case', btnFocus)}
            >
              Résumé grounding for Ask (Phase R)
            </button>
            <span className="text-textMuted"> — compress CV in Settings; improves hosted </span>
            <span className="whitespace-nowrap font-mono text-[10px] text-textSoft">ask:</span>
            <span className="text-textMuted"> answers.</span>
          </p>
        ) : null}
      </header>

      <div className={clsx('flex min-w-0 flex-col gap-3', assistantGutter)}>
        <section
          id="assistant-copilot"
          className="scroll-mt-28 min-w-0"
          aria-label="Hosted Ask copilot"
        >
          <p className="bo-assistant-section-label">Copilot</p>
          <p className="mb-1.5 text-[11px] leading-snug text-textSoft">
            Pick a worker, then send{' '}
            <code className="rounded bg-bgSubtle px-1 py-px text-[10px]">ask: …</code> in the
            composer. Allow-listed workers may attach automation JSON after the reply.
          </p>
          <div className="bo-copilot-rail">
            {copilotWorkerRegistry.workers.map((w) => {
              const active = copilotWorkerRegistry.activeWorkerId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  title={w.description ?? w.name}
                  onClick={() => onSelectCopilotWorker(w.id)}
                  className={clsx('bo-copilot-chip', active && 'bo-copilot-chip--active', btnFocus)}
                >
                  {w.name}
                </button>
              );
            })}
          </div>
        </section>

        <div id="assistant-commands" className="scroll-mt-28 space-y-3">
          <section aria-labelledby="assistant-starters-label" className="min-w-0">
            <p id="assistant-starters-label" className="bo-assistant-section-label">
              Starters
            </p>
            <div className="bo-assistant-quick-strip mt-1.5">
              {ASSISTANT_QUICK_PICKS.map((command) => {
                const meta = getIntentByCommandLine(command);
                const label = meta?.title ?? command;
                return (
                  <button
                    key={command}
                    type="button"
                    onClick={() => onQuickCommand(command)}
                    title={meta ? `${meta.title} — ${meta.subtitle}` : command}
                    className={clsx('bo-chat-starter-chip touch-manipulation', btnFocus)}
                  >
                    <span className="line-clamp-1">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

        </div>

        <section
          id="assistant-thread"
          className="bo-assistant-thread-shell scroll-mt-28 min-w-0 py-3 sm:py-3.5"
          aria-label="Transcript and recent commands"
        >
          <h3 className="sr-only">Conversation transcript</h3>
          <div
            className="flex flex-col gap-3"
            role="log"
            aria-relevant="additions"
            aria-live="polite"
            aria-atomic="false"
          >
            {commandHistory.length > 0 ? (
              <div className="pb-3" aria-label="Recent commands">
                <div className="flex items-center justify-between gap-2">
                  <span className="bo-assistant-recents-label">
                    <History className="h-3 w-3" strokeWidth={2} aria-hidden />
                    Recent
                  </span>
                  <button
                    type="button"
                    className={clsx('bo-assistant-recents-clear', btnFocus)}
                    onClick={onClearCommandHistory}
                  >
                    Clear
                  </button>
                </div>
                <div className="bo-copilot-rail mt-1.5">
                  {commandHistory.slice(0, 12).map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => onQuickCommand(cmd)}
                      className={clsx('bo-chat-history-chip', btnFocus)}
                      title={cmd}
                    >
                      {cmd.length > 48 ? `${cmd.slice(0, 46)}…` : cmd}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center sm:py-14">
                <span className="bo-assistant-empty-state-icon">
                  <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <p className="text-sm font-semibold text-text">Start the thread</p>
                <p className="max-w-[18rem] text-[12px] leading-relaxed text-textMuted">
                  Starters send workspace commands; lines beginning with{' '}
                  <span className="font-mono text-[11px] text-textSoft">ask:</span> use the hosted
                  model. Planning shortcuts stay on Plan — ⌘K finds anything else.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={clsx(
                    'flex gap-2.5',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      message.role === 'user'
                        ? 'bg-surfaceActive text-text'
                        : 'bg-accentSoft/35 text-accent'
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
                      'min-w-0 flex-1',
                      message.role === 'user' ? 'flex justify-end' : ''
                    )}
                  >
                    {message.role === 'user' ? (
                      <div className="bo-chat-bubble-user">
                        {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                          <p className="mb-1 text-[9px] font-bold uppercase opacity-80">
                            {message.sourceSurface}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      </div>
                    ) : message.resultKind === 'ask-result' ? (
                      <div className="bo-chat-bubble-assistant space-y-1">
                        <p className="bo-chat-meta-label">Hosted model</p>
                        {typeof message.ok === 'boolean' && !message.ok ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-warningSoft px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning">
                            <AlertCircle size={11} aria-hidden />
                            Unavailable
                          </span>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.text}
                        </p>
                      </div>
                    ) : message.resultKind === 'command-result' && message.action ? (
                      <div className="bo-chat-bubble-meta space-y-1.5 text-[13px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {message.ok ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-successSoft px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">
                              <CheckCircle2 size={11} aria-hidden />
                              Ok
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-warningSoft px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning">
                              <AlertCircle size={11} aria-hidden />
                              Issue
                            </span>
                          )}
                          <code className="rounded-md bg-bgSubtle px-1.5 py-0.5 text-[10px] text-info">
                            {message.action}
                          </code>
                          {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                            <span className="text-[9px] text-textSoft">
                              {message.sourceSurface}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className={clsx(
                              'ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-bgElevated text-textSoft hover:bg-surfaceActive hover:text-text',
                              btnFocus
                            )}
                            title="Copy"
                            aria-label="Copy command output"
                            onClick={() =>
                              copyToClipboard(
                                `${message.action}\n${message.text}${message.strip ? `\n${JSON.stringify(message.strip)}` : ''}`
                              )
                            }
                          >
                            <Copy size={14} aria-hidden />
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-text">
                          {message.text}
                        </p>
                      </div>
                    ) : (
                      <div className="bo-chat-bubble-assistant">
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.text}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
            {loading ? (
              <div className="pt-1">
                <AgentWorkingState />
              </div>
            ) : null}
            <div ref={transcriptEndRef} className="h-1 w-full shrink-0 scroll-mt-24" aria-hidden />
          </div>
        </section>
      </div>
    </div>
  );
};
