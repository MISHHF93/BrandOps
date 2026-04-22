import {
  AlertCircle,
  CheckCircle2,
  Copy,
  History,
  MessageCircle
} from 'lucide-react';
import { CHAT_QUICK_STARTER_GROUPS } from './chatCommandStarters';
import { SHELL_FOUR_SECTIONS_LINE } from './shellSectionCopy';
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
  return `rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-left text-xs text-zinc-300 ${btnFocus}`;
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
  const jumpClass = `rounded-lg border border-zinc-600/50 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-200 hover:border-indigo-500/40 hover:bg-zinc-900/90 ${btnFocus}`;

  return (
    <div className="space-y-5" aria-label="Chat">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-950/30">
            <MessageCircle className="h-5 w-5 text-blue-300" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-50">Chat</h2>
            <p className="text-[11px] text-zinc-500">{SHELL_FOUR_SECTIONS_LINE}</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Commands run on-device. Starters and history run on tap; clear transcript in Settings.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-[11px] text-zinc-400">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Workspace snapshot</p>
        <p className="mt-1.5 tabular-nums text-zinc-200">
          {shellDigest.notes} notes · {shellDigest.publishingQueue} queue · {shellDigest.activeOpportunities} active
          opps ·{' '}
          <span className="text-emerald-200/90">
            ${shellDigest.weightedPipelineUsd.toLocaleString()} weighted
          </span>{' '}
          ({shellDigest.pipelineOpenDeals} open deals)
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Other sections</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
        className="space-y-3"
        role="log"
        aria-relevant="additions"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.role === 'user'
                ? 'ml-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 px-3 py-2.5 text-sm leading-relaxed text-white shadow-md shadow-blue-900/30'
                : 'mr-6'
            }
          >
            {message.role === 'user' ? (
              message.text
            ) : message.resultKind === 'command-result' && message.action ? (
              <div className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm shadow-inner shadow-black/20 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {message.ok ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      <CheckCircle2 size={12} aria-hidden />
                      Ok
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                      <AlertCircle size={12} aria-hidden />
                      Issue
                    </span>
                  )}
                  <code className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-[11px] text-indigo-200">
                    {message.action}
                  </code>
                  <button
                    type="button"
                    className={`ml-auto inline-flex items-center gap-1 rounded-md border border-zinc-600/60 px-2 py-0.5 text-[10px] text-zinc-400 ${btnFocus}`}
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
                <p className="text-zinc-200 leading-relaxed">{message.text}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/90 px-3 py-2.5 text-sm leading-relaxed text-zinc-100">
                {message.text}
              </div>
            )}
          </article>
        ))}
      </div>

      {loading ? (
        <div
          className="mx-6 space-y-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3 motion-reduce:animate-none animate-pulse"
          role="status"
          aria-live="polite"
        >
          <div className="h-2 w-1/3 rounded bg-zinc-700/80" />
          <div className="h-2 w-5/6 rounded bg-zinc-800/80" />
          <div className="h-2 w-2/3 rounded bg-zinc-800/60" />
          <p className="text-xs text-zinc-500">Running command…</p>
        </div>
      ) : null}

      <details className="group rounded-xl border border-white/10 bg-zinc-900/40 p-3 backdrop-blur-sm open:shadow-inner">
        <summary
          className={`cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-zinc-500 ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            Command starters
            <span className="text-[10px] font-normal normal-case text-zinc-600 group-open:hidden">
              (tap to expand — chips run immediately)
            </span>
          </span>
        </summary>
        <div className="mt-3 space-y-4">
          {CHAT_QUICK_STARTER_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{group.label}</p>
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
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <History size={14} aria-hidden />
              Recent commands
            </p>
            <button
              type="button"
              className={`text-[10px] text-zinc-500 hover:text-zinc-300 ${btnFocus}`}
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
                className={`max-w-full truncate rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-left text-[11px] text-zinc-300 ${btnFocus}`}
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
