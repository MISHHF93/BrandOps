import {
  AlertCircle,
  CheckCircle2,
  Copy,
  History,
  MessageCircle
} from 'lucide-react';
import clsx from 'clsx';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import { SHELL_SECTIONS_LINE } from './shellSectionCopy';
import type { MobileShellTabId } from './mobileShellQuery';
import { ShellSectionCallout } from './ShellSectionCallout';

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
    'rounded-full border border-border/55 bg-surface/50 px-2 py-1 text-left text-xs text-textMuted',
    btnFocus
  );
}

function copyToClipboard(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  void navigator.clipboard.writeText(text).catch(() => {
    // ignore
  });
}

export interface MobileChatShellDigest {
  notes: number;
  publishingQueue: number;
  activeOpportunities: number;
  weightedPipelineUsd: number;
  pipelineOpenDeals: number;
}

export interface MobileChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  commandHistory: string[];
  onQuickCommand: (command: string) => void;
  onClearCommandHistory: () => void;
  btnFocus: string;
  shellDigest: MobileChatShellDigest;
  onNavigateTab: (tab: MobileShellTabId) => void;
}

/**
 * Chat tab only: thread, starters (collapsed by default), and recent commands. No duplicate workspace counts on results.
 */
export const MobileChatView = ({
  messages,
  loading,
  commandHistory,
  onQuickCommand,
  onClearCommandHistory,
  btnFocus,
  shellDigest,
  onNavigateTab
}: MobileChatViewProps) => {
  const jumpClass = clsx(
    'rounded-lg border border-border/60 bg-surface/60 px-2 py-1.5 text-[10px] font-medium text-text hover:border-borderStrong hover:bg-surfaceActive/80',
    btnFocus
  );

  return (
    <div className="space-y-5" aria-label="Chat">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-info/35 bg-infoSoft/15">
            <MessageCircle className="h-5 w-5 text-info" aria-hidden />
          </div>
          <div>
            <h2 className="text-h2 text-text">Chat</h2>
            <p className="text-[11px] text-textSoft">{SHELL_SECTIONS_LINE}</p>
            <p className="mt-1 text-[11px] text-textSoft">
              Commands run on-device. Starters and history run on tap; clear transcript in Settings.
            </p>
          </div>
        </div>
      </header>

      <div className="bo-glass-panel--muted rounded-xl border border-border/55 p-3 text-[11px] text-textMuted">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-textSoft">Workspace snapshot</p>
        <p className="mt-1.5 tabular-nums text-text">
          {shellDigest.notes} notes · {shellDigest.publishingQueue} queue · {shellDigest.activeOpportunities} active
          opps ·{' '}
          <span className="text-success">${shellDigest.weightedPipelineUsd.toLocaleString()} weighted</span>{' '}
          ({shellDigest.pipelineOpenDeals} open deals)
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-textSoft">Other sections</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button type="button" className={jumpClass} onClick={() => onNavigateTab('pulse')}>
            Pulse
          </button>
          <button type="button" className={jumpClass} onClick={() => onNavigateTab('daily')}>
            Today
          </button>
          <button type="button" className={jumpClass} onClick={() => onNavigateTab('integrations')}>
            Integrations
          </button>
          <button type="button" className={jumpClass} onClick={() => onNavigateTab('settings')}>
            Settings
          </button>
        </div>
      </div>

      <ShellSectionCallout tab="chat" />

      <div
        className="flex flex-col gap-3"
        role="log"
        aria-relevant="additions"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((message) => (
          <article
            key={message.id}
            className={clsx(
              message.role === 'user' &&
                'ml-auto mr-0 max-w-[min(100%,22rem)] rounded-2xl border border-borderStrong/50 bg-surfaceActive px-3 py-2.5 text-sm leading-relaxed text-text shadow-panel sm:mr-1',
              message.role === 'assistant' && 'mr-auto max-w-[min(100%,26rem)]'
            )}
          >
            {message.role === 'user' ? (
              message.text
            ) : message.resultKind === 'command-result' && message.action ? (
              <div className="space-y-2 rounded-2xl border border-border/60 bg-bgElevated/90 px-3 py-2.5 text-sm shadow-inner backdrop-blur-sm">
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
                  <code className="rounded border border-border/50 bg-bgSubtle/80 px-1.5 py-0.5 text-[11px] text-info">
                    {message.action}
                  </code>
                  <button
                    type="button"
                    className={`ml-auto inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[10px] text-textSoft ${btnFocus}`}
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
              <div className="rounded-2xl border border-border/55 bg-bgElevated/95 px-3 py-2.5 text-sm leading-relaxed text-text">
                {message.text}
              </div>
            )}
          </article>
        ))}
      </div>

      {loading ? (
        <div
          className="mx-5 space-y-2 rounded-2xl border border-border/55 bg-surface/50 p-3 motion-safe:animate-pulse sm:mx-8"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="h-2 w-1/3 rounded bg-border/90" />
          <div className="h-2 w-5/6 rounded bg-border/70" />
          <div className="h-2 w-2/3 rounded bg-border/60" />
          <p className="text-xs text-textSoft">Running command…</p>
        </div>
      ) : null}

      <details className="group rounded-xl border border-border/55 bg-bgSubtle/40 p-3 backdrop-blur-sm open:shadow-inner">
        <summary
          className={`cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-textSoft ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            Command starters
            <span className="text-[10px] font-normal normal-case text-textSoft group-open:hidden">
              (tap to expand — chips run immediately)
            </span>
          </span>
        </summary>
        <div className="mt-3 space-y-4">
          {CHAT_QUICK_STARTER_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-textSoft">{group.label}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {group.commands.map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => onQuickCommand(command)}
                    className={chipClass(btnFocus)}
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {commandHistory.length > 0 ? (
        <div className="rounded-xl border border-border/55 bg-bgSubtle/40 p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-textSoft">
              <History size={14} aria-hidden />
              Recent commands
            </p>
            <button
              type="button"
              className={`text-[10px] text-textSoft hover:text-textMuted ${btnFocus}`}
              onClick={onClearCommandHistory}
            >
              Clear list
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {commandHistory.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => onQuickCommand(cmd)}
                className={`max-w-full truncate rounded-full border border-border/55 bg-surface/50 px-2 py-1 text-left text-[11px] text-textMuted ${btnFocus}`}
                title={cmd}
              >
                {cmd.length > 42 ? `${cmd.slice(0, 40)}…` : cmd}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
