import { useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { AlertCircle, BookmarkPlus, Bot, Copy, Pin, Sparkles, User } from 'lucide-react';
import clsx from 'clsx';
import { AssistantEvidenceChips } from './AssistantEvidenceChips';
import { AssistantInlineCitationBody } from './AssistantInlineCitationBody';
import { AssistantTraceSummary } from './AssistantTraceSummary';
import { AgentWorkingState } from '../../shared/ui/brandopsPolish';
import type { AiCitationChunk, DigitalTwin } from '../../types/domain';
import type { AssistantAskTraceSummaryUI } from '../../types/aiTraceGraph';

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
  /** Normalized citation envelope from hosted `ask:` responses (optional). */
  citations?: AiCitationChunk[];
  /** `[cite: …]` markers that did not match any citation row (optional). */
  orphanInlineMarkers?: string[];
  /** Compact provenance summary for this assistant turn (optional). */
  traceSummary?: AssistantAskTraceSummaryUI;
}

export type AskPlanConversionKind =
  | 'execution-plan'
  | 'workflow'
  | 'action-queue'
  | 'content-schedule'
  | 'outreach-draft'
  | 'follow-up-sequence';

export interface AskMemorySaveRequest {
  id: string;
  title: string;
  summary: string;
  details: string;
  sourceFacts: string[];
}

const ASK_MY_TWIN_STARTERS = [
  'ask: What is my strongest positioning angle right now?',
  'ask: Brainstorm three opportunities from my current workspace context.',
  'ask: Draft a buyer persona using only approved workspace facts.',
  'ask: Generate content ideas from my Workspace DNA.',
  'ask: Draft outreach angles without sending anything.',
  'ask: Analyze what I should think through before creating a plan.'
] as const;

function copyToClipboard(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  void navigator.clipboard.writeText(text).catch(() => {});
}

function compactText(text: string, max = 160): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function sourceFactsFromMessage(message: ChatMessage, activeDigitalTwin?: DigitalTwin | null): string[] {
  const citationFacts =
    message.citations?.slice(0, 4).map((citation) => {
      const source = citation.source?.trim() || 'Source fact';
      return citation.excerpt?.trim() ? `${source}: ${compactText(citation.excerpt, 110)}` : source;
    }) ?? [];
  const twinFacts = activeDigitalTwin
    ? [
        activeDigitalTwin.displayName,
        activeDigitalTwin.identity.professionalPositioning,
        ...activeDigitalTwin.memory.approvedClaims.slice(0, 2)
      ]
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
        .slice(0, 3)
    : [];
  return Array.from(new Set([...citationFacts, ...twinFacts])).slice(0, 5);
}

function messageTitle(message: ChatMessage): string {
  if (message.role === 'user') return 'Ask My Twin question';
  if (message.resultKind === 'ask-result') return 'Ask My Twin response';
  return 'Conversation item';
}

export interface MobileChatViewProps {
  messages: ChatMessage[];
  loading: boolean;
  onQuickCommand: (command: string) => void;
  btnFocus: string;
  /** Anchor for scroll-into-view while the shell main scrolls as one surface */
  transcriptEndRef?: RefObject<HTMLDivElement>;
  /** One-line hosted routing stance — surfaced below Assistant headline (optional). */
  assistantRoutingCaption?: string;
  /** Active digital twin, if created from reviewed resume/profile data. */
  activeDigitalTwin?: DigitalTwin | null;
  onConvertAskToPlan?: (kind: AskPlanConversionKind, askOutput: string, messageId: string) => void;
  onRequestSaveToMemory?: (request: AskMemorySaveRequest) => void;
}

/**
 * Ask My Twin is deliberately conversation-only. Operational state, approvals, workflows,
 * recommendations, and workspace management belong in PLAN.
 */
export const MobileChatView = (props: MobileChatViewProps) => {
  const {
    messages,
    loading,
    onQuickCommand,
    btnFocus,
    transcriptEndRef,
    assistantRoutingCaption,
    activeDigitalTwin,
    onConvertAskToPlan,
    onRequestSaveToMemory
  } = props;
  const [pinnedItems, setPinnedItems] = useState<Set<string>>(() => new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(() => new Set());
  const suggestedPrompts = useMemo(() => ASK_MY_TWIN_STARTERS, []);
  const conversationMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.resultKind !== 'command-result' && (message.sourceSurface ?? 'Chat') === 'Chat'
      ),
    [messages]
  );

  const togglePin = (id: string) => {
    setPinnedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveMessage = (message: ChatMessage) => {
    setSavedItems((current) => new Set(current).add(message.id));
    onRequestSaveToMemory?.({
      id: message.id,
      title: messageTitle(message),
      summary: compactText(message.text, 180),
      details: message.text,
      sourceFacts: sourceFactsFromMessage(message, activeDigitalTwin)
    });
  };

  return (
    <div aria-label="Ask My Twin conversation" className="bo-assistant-surface flex flex-col gap-3">
      <header className="bo-assistant-hero bo-dos-hero px-3 py-3 sm:px-3.5 sm:py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-text">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bgElevated text-accent">
                <Bot className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight tracking-tight text-text">
                  Ask My Twin
                </h2>
                <p className="mt-0.5 text-meta leading-snug text-textMuted">
                  Conversation only. Ask questions, brainstorm, analyze, draft, and explore ideas with
                  your digital twin.
                </p>
              </div>
            </div>
            {assistantRoutingCaption?.trim() ? (
              <p className="mt-2 text-fine leading-snug text-textSoft">{assistantRoutingCaption}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-border/45 bg-bgSubtle/70 px-2 py-1 text-fine font-semibold text-textMuted">
              {activeDigitalTwin ? activeDigitalTwin.displayName : 'No twin selected'}
            </span>
            {activeDigitalTwin ? (
              <span className="rounded-full border border-primary/35 bg-primarySoft/15 px-2 py-1 text-fine font-semibold text-primary">
                {activeDigitalTwin.confidenceScore}% confidence
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Try asking
          </p>
          <div className="bo-assistant-quick-strip mt-1.5">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onQuickCommand(prompt)}
                className={clsx('bo-chat-starter-chip touch-manipulation', btnFocus)}
              >
                <span className="line-clamp-1">{prompt.replace(/^ask:\s*/i, '')}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <section
        id="assistant-thread"
        className="bo-assistant-thread-shell mx-3 min-w-0 scroll-mt-28 px-0 py-3 sm:mx-3.5 sm:py-3.5"
        aria-label="Ask My Twin conversation timeline"
      >
        <div className="flex flex-wrap items-start justify-between gap-2 px-3 sm:px-3.5">
          <div className="min-w-0">
            <p className="bo-assistant-section-label">Conversation</p>
            <h3 className="text-h3 text-text">Think with your twin</h3>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Keep exploration here. Save or pin useful answers, then convert strong outputs into PLAN
              when they are ready to operate.
            </p>
          </div>
        </div>

        <div
          className="mt-3 flex flex-col gap-3 px-3 sm:px-3.5"
          role="log"
          aria-relevant="additions"
          aria-live="polite"
          aria-atomic="false"
        >
          {conversationMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-bgSubtle/55 px-3 py-12 text-center sm:px-4 sm:py-14">
              <span className="bo-assistant-empty-state-icon">
                <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <p className="text-sm font-semibold text-text">Start a conversation with your twin</p>
              <p className="max-w-[min(100%,22rem)] text-meta leading-relaxed text-textMuted">
                Ask for positioning, buyer personas, content ideas, outreach drafts, opportunity
                analysis, or strategic thinking. PLAN owns the operating workspace.
              </p>
            </div>
          ) : (
            conversationMessages.map((message) => {
              const isPinned = pinnedItems.has(message.id);
              const isSaved = savedItems.has(message.id);
              const canConvert = message.role === 'assistant' && onConvertAskToPlan;
              return (
                <article
                  key={message.id}
                  className={clsx('flex gap-2.5 rounded-xl border border-transparent p-1.5', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  <span
                    className={clsx(
                      'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fine font-bold',
                      message.role === 'user' ? 'bg-surfaceActive text-text' : 'bg-accentSoft/35 text-accent'
                    )}
                    aria-hidden
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" strokeWidth={2.25} />
                    ) : (
                      <Bot className="h-4 w-4" strokeWidth={2.25} />
                    )}
                  </span>

                  <div className={clsx('min-w-0 flex-1 space-y-2', message.role === 'user' && 'flex flex-col items-end')}>
                    {message.role === 'user' ? (
                      <div className="bo-chat-bubble-user">
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      </div>
                    ) : message.resultKind === 'ask-result' ? (
                      <div className="bo-chat-bubble-assistant space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="bo-chat-meta-label">Twin response</p>
                          {typeof message.ok === 'boolean' && !message.ok ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-warningSoft px-1.5 py-0.5 text-overline font-bold uppercase text-warning">
                              <AlertCircle size={11} aria-hidden />
                              Unavailable
                            </span>
                          ) : null}
                        </div>
                        {message.ok !== false ? (
                          <>
                            <AssistantInlineCitationBody
                              text={message.text}
                              citations={message.citations ?? []}
                              messageAnchorPrefix={message.id}
                              btnFocus={btnFocus}
                            />
                            {message.orphanInlineMarkers?.length ? (
                              <p className="text-fine leading-snug text-warning" role="status">
                                Unresolved citation markers:{' '}
                                <span className="font-mono font-semibold">
                                  {message.orphanInlineMarkers.join(', ')}
                                </span>
                              </p>
                            ) : null}
                            {message.citations?.length ? (
                              <AssistantEvidenceChips
                                citations={message.citations}
                                anchorPrefix={message.id}
                                btnFocus={btnFocus}
                              />
                            ) : null}
                            {message.traceSummary ? (
                              <AssistantTraceSummary
                                summary={message.traceSummary}
                                orphanMarkerCount={message.orphanInlineMarkers?.length ?? 0}
                                btnFocus={btnFocus}
                              />
                            ) : null}
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                        )}
                      </div>
                    ) : (
                      <div className="bo-chat-bubble-assistant">
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                      </div>
                    )}

                    <div className={clsx('flex flex-wrap items-center gap-1.5', message.role === 'user' && 'justify-end')}>
                      <button
                        type="button"
                        onClick={() => saveMessage(message)}
                        className={clsx('bo-ask-card-action', isSaved && 'border-success/45 text-success', btnFocus)}
                      >
                        <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePin(message.id)}
                        className={clsx('bo-ask-card-action', isPinned && 'border-primary/45 text-primary', btnFocus)}
                      >
                        <Pin className="h-3.5 w-3.5" aria-hidden />
                        {isPinned ? 'Pinned' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(message.text)}
                        className={clsx('bo-ask-card-action', btnFocus)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        Copy
                      </button>
                      {canConvert ? (
                        <button
                          type="button"
                          onClick={() => onConvertAskToPlan('execution-plan', message.text, message.id)}
                          className={clsx('bo-ask-card-action border-primary/45 text-primary', btnFocus)}
                        >
                          Convert to Plan
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
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
  );
};
