import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Copy,
  History,
  LayoutDashboard,
  User,
  Sparkles,
  CalendarRange
} from 'lucide-react';
import clsx from 'clsx';
import { AgentWorkingState } from '../../shared/ui/brandopsPolish';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import type { WorkspaceSignalsPick } from './WorkspaceSignalsBoard';
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
  onClearCommandHistory: () => void;
  btnFocus: string;
  onOpenToday: () => void;
  onOpenPlan?: () => void;
  vitalityMetrics: WorkspaceSignalsPick;
}

/**
 * **Assistant (Ask)** — compact AI-style chat: stat chips, starters, transcript.
 * Appearance (light/dark) is controlled from the shell header.
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
  return (
    <div aria-label="Assistant" className="bo-assistant-surface flex flex-col gap-2.5">
      <header className="bo-assistant-hero rounded-2xl border border-border/45 px-3 py-2.5 sm:px-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-textSoft">
              Ask
            </p>
            <h2 className="mt-0.5 text-[1.05rem] font-bold leading-tight tracking-tight text-text">
              Assistant
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-textMuted">
              On-device · <span className="whitespace-nowrap">⌘K</span> palette
              {onOpenPlan ? (
                <>
                  {' '}
                  ·{' '}
                  <button
                    type="button"
                    className="font-semibold text-accent underline decoration-accent/35 underline-offset-2 hover:decoration-accent"
                    onClick={onOpenPlan}
                  >
                    Plan
                  </button>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 self-start">
            {onOpenPlan ? (
              <button
                type="button"
                onClick={onOpenPlan}
                title="Workspace overview"
                className={clsx('bo-icon-btn-ai', btnFocus)}
              >
                <LayoutDashboard className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenToday}
              title="Today lanes"
              className={clsx('bo-icon-btn-ai bo-icon-btn-ai--accent', btnFocus)}
            >
              <CalendarRange className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <div
          className="mt-2.5 flex flex-wrap gap-1.5"
          role="status"
          aria-label="Live workspace counts"
        >
          <span className="bo-assistant-stat-pill">FU {vitalityMetrics.incompleteFollowUps}</span>
          <span className="bo-assistant-stat-pill">Q {vitalityMetrics.publishingQueue}</span>
          <span className="bo-assistant-stat-pill">Missed {vitalityMetrics.missedTasks}</span>
          {onOpenPlan ? (
            <button
              type="button"
              onClick={onOpenPlan}
              className={clsx(
                'bo-assistant-stat-pill bo-assistant-stat-pill--action !px-2 !py-1 text-[10px] font-semibold',
                btnFocus
              )}
            >
              Queue →
            </button>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="assistant-starters-label" className="min-w-0">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p id="assistant-starters-label" className="text-[10px] font-bold uppercase text-textSoft">
            Starters
          </p>
        </div>
        <div
          className="bo-assistant-quick-strip mt-1.5 flex gap-2 overflow-x-auto pb-0.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
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

      {commandHistory.length > 0 ? (
        <div className="min-w-0 rounded-xl border border-border/35 bg-bgElevated/35 px-2 py-2 backdrop-blur-[2px]">
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-textSoft">
              <History className="h-3 w-3" strokeWidth={2} aria-hidden />
              Recent
            </span>
            <button
              type="button"
              className={clsx(
                'rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-textSoft hover:bg-surfaceActive/60 hover:text-text',
                btnFocus
              )}
              onClick={onClearCommandHistory}
            >
              Clear
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {commandHistory.slice(0, 10).map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => onQuickCommand(cmd)}
                className={clsx(
                  'max-w-[10rem] shrink-0 truncate rounded-full border border-border/45 bg-surface/60 px-3 py-1.5 text-left text-[11px] font-medium text-textMuted transition hover:border-accent/35 hover:bg-accentSoft/15',
                  btnFocus
                )}
                title={cmd}
              >
                {cmd.length > 40 ? `${cmd.slice(0, 38)}…` : cmd}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section
        className="bo-assistant-thread-scroll bo-assistant-thread-shell flex min-h-[12rem] max-h-[min(56vh,32rem)] flex-col overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:max-h-[min(60vh,36rem)]"
        aria-label="Conversation"
      >
        <h3 className="sr-only">Conversation transcript</h3>
        <div
          className="flex min-h-0 flex-col gap-2.5"
          role="log"
          aria-relevant="additions"
          aria-live="polite"
          aria-atomic="false"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/35 text-accent shadow-md"
                style={{
                  background:
                    'linear-gradient(145deg, rgb(var(--color-accent) / 0.2), rgb(var(--bo-chat-canvas) / 0.5))'
                }}
              >
                <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <p className="text-sm font-semibold text-text">New chat</p>
              <p className="max-w-[16rem] text-[12px] leading-snug text-textMuted">
                Choose a starter or type below — same engine as the rest of BrandOps.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={clsx(
                  'flex gap-2',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                    message.role === 'user'
                      ? 'border-borderStrong/50 bg-surfaceActive text-text'
                      : 'border-accent/35 bg-accentSoft/28 text-accent'
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
                      <p>{message.text}</p>
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
                        <code className="rounded-md border border-border/35 bg-bgSubtle/80 px-1.5 py-0.5 text-[10px] text-info">
                          {message.action}
                        </code>
                        {message.sourceSurface && message.sourceSurface !== 'Chat' ? (
                          <span className="text-[9px] text-textSoft">{message.sourceSurface}</span>
                        ) : null}
                        <button
                          type="button"
                          className={clsx(
                            'ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-textSoft hover:bg-surfaceActive hover:text-text',
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
                      <p className="leading-snug text-text">{message.text}</p>
                    </div>
                  ) : (
                    <div className="bo-chat-bubble-assistant">
                      <p className="leading-snug">{message.text}</p>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {loading ? (
        <div className="px-0.5">
          <AgentWorkingState />
        </div>
      ) : null}
    </div>
  );
};
