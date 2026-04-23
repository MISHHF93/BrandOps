import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MutableRefObject
} from 'react';
import clsx from 'clsx';
import { Lightbulb, Loader2, Paperclip, Sparkles, Wand2, X } from 'lucide-react';
import { getInputRouteHint, suggestIntents, type BrandOpsChatIntent } from './chatIntents';
import { MOBILE_BTN_FOCUS } from './mobileTabPrimitives';

const btn = MOBILE_BTN_FOCUS;

const LIST_ID = 'chat-command-suggest';
const TIP_ID = 'chat-command-route-hint';
const CHIPS_ID = 'chat-smart-chips';

type ChatAttachment = {
  name: string;
  size: number;
  kind: 'text' | 'binary';
  text?: string;
};

type ChatCommandBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRunAndClear: (line: string) => void;
  commandLoading: boolean;
  recentCommandLines: string[];
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  chatAttachment: ChatAttachment | null;
  onRemoveAttachment: () => void;
};

const CHIP_CAP = 6;
const SUGGEST_LIMIT = 5;

/**
 * Command composer: smart “one tap” chips, typed intent matches, and routing hints.
 */
export const ChatCommandBar = ({
  value,
  onChange,
  onSubmit,
  onRunAndClear,
  commandLoading,
  recentCommandLines,
  onFileChange,
  fileInputRef,
  chatAttachment,
  onRemoveAttachment
}: ChatCommandBarProps) => {
  const typingHintId = useId();
  const [highlight, setHighlight] = useState(0);
  const trimmed = value.trim();
  const empty = !trimmed;

  const { list: typeahead, chips: smartChips } = useMemo(
    () => suggestIntents(value, { recentLines: recentCommandLines, limit: SUGGEST_LIMIT, chipCap: CHIP_CAP }),
    [value, recentCommandLines]
  );

  const showTypeahead = !commandLoading && !empty && trimmed.length >= 2 && typeahead.length > 0;
  const routeHint = getInputRouteHint(value);
  const showTypingTip = !empty && trimmed.length < 2 && !routeHint;

  useEffect(() => {
    setHighlight((h) => (typeahead.length === 0 ? 0 : Math.min(h, typeahead.length - 1)));
  }, [typeahead.length]);

  const applyInsert = useCallback(
    (intent: BrandOpsChatIntent) => {
      onChange(intent.command);
      setHighlight(0);
    },
    [onChange]
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (commandLoading) return;
    if (showTypeahead) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, typeahead.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === 'Tab' && typeahead[highlight]) {
        e.preventDefault();
        applyInsert(typeahead[highlight]);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && typeahead[highlight]) {
        e.preventDefault();
        applyInsert(typeahead[highlight]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const describedBy = [showTypingTip ? typingHintId : null, routeHint ? TIP_ID : null]
    .filter((x): x is string => Boolean(x))
    .join(' ')
    .trim();
  const controls = showTypeahead ? LIST_ID : undefined;
  const expanded = showTypeahead;

  return (
    <div
      className="bo-mobile-main fixed inset-x-0 z-40 mx-auto w-full max-w-md px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
      aria-busy={commandLoading}
    >
      {commandLoading ? (
        <p
          className="mb-1.5 text-center text-[10px] font-medium text-primary"
          role="status"
          aria-live="polite"
        >
          Applying your command on-device…
        </p>
      ) : null}
      {empty && smartChips.length > 0 && !commandLoading ? (
        <div
          className="mb-1.5 rounded-xl border border-border/50 bg-bgElevated/95 px-2 py-2 shadow-sm backdrop-blur-sm"
          id={CHIPS_ID}
        >
          <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[10px] font-medium uppercase tracking-wide text-textSoft">
            <Wand2 className="h-3 w-3 text-primary" strokeWidth={2} aria-hidden />
            Try in one tap
          </p>
          <div className="-mx-0.5 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {smartChips.map((intent) => (
              <button
                key={intent.id}
                type="button"
                disabled={commandLoading}
                onClick={() => onRunAndClear(intent.command)}
                className={clsx(
                  'snap-start shrink-0 max-w-[min(100%,14rem)] rounded-lg border border-primary/35 bg-primarySoft/30 px-2.5 py-1.5 text-left text-xs leading-snug',
                  'text-text shadow-sm transition hover:border-primary/50 hover:bg-primarySoft/45',
                  commandLoading && 'pointer-events-none opacity-50',
                  btn
                )}
                title={`${intent.subtitle} — full command in transcript`}
              >
                <span className="block font-medium text-text">{intent.title}</span>
                <span className="line-clamp-2 text-[10px] text-textSoft">{intent.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {routeHint ? (
        <p
          className="mb-1.5 line-clamp-3 flex items-start gap-1.5 rounded-lg border border-border/40 bg-bgSubtle/60 px-2 py-1 text-[10px] leading-snug text-textMuted"
          id={TIP_ID}
        >
          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-info" strokeWidth={2} aria-hidden />
          {routeHint}
        </p>
      ) : null}

      {showTypingTip ? (
        <p className="mb-1.5 text-[10px] text-textSoft" id={typingHintId}>
          Keep typing — suggestions match plain language and common jobs.
        </p>
      ) : null}

      {showTypeahead ? (
        <ul
          className="mb-1.5 max-h-[min(40vh,11rem)] overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-bgElevated/98 py-0.5 shadow-lg backdrop-blur-sm"
          id={LIST_ID}
          role="listbox"
          aria-label="Matching intents"
        >
          {typeahead.map((intent, i) => (
            <li key={intent.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                className={clsx(
                  'flex w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left text-sm transition',
                  i === highlight ? 'bg-surfaceActive text-text' : 'text-textMuted hover:bg-surface/60',
                  btn
                )}
                onClick={() => applyInsert(intent)}
                onMouseEnter={() => setHighlight(i)}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 font-medium text-text">{intent.title}</span>
                  <span className="shrink-0 text-[9px] uppercase text-textSoft">{intent.groupId}</span>
                </span>
                <span className="line-clamp-1 text-xs text-textSoft">{intent.subtitle}</span>
                <code className="line-clamp-2 w-full text-left text-[10px] font-mono text-textSoft/90">
                  {intent.command}
                </code>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {chatAttachment ? (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-bgSubtle/80 px-2 py-1.5">
          <p className="min-w-0 flex-1 truncate text-[11px] text-textMuted">
            <span className="font-medium text-text">Attached</span> · {chatAttachment.name} (
            {chatAttachment.kind === 'text' ? 'text' : 'file'})
          </p>
          <button
            type="button"
            onClick={onRemoveAttachment}
            className={clsx('shrink-0 rounded-md p-1 text-textSoft hover:text-text', btn)}
            aria-label="Remove attachment"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}

      <div
        className={clsx(
          'flex items-center gap-1.5 rounded-2xl border p-1.5 shadow-panel backdrop-blur-md sm:gap-2 sm:p-2',
          commandLoading
            ? 'border-primary/30 bg-primarySoft/20'
            : 'border-border/70 bg-bgElevated/95'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={onFileChange}
          accept="text/*,.txt,.md,.json,.csv,.yml,.yaml,.xml,.log,image/*,application/pdf"
        />
        <button
          type="button"
          disabled={commandLoading}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'shrink-0 rounded-xl border border-border/60 p-2.5 text-textMuted hover:border-borderStrong hover:text-text',
            'disabled:opacity-50',
            btn
          )}
          aria-label="Attach file"
          title="Attach file (text files are inlined; other types add a short note to your command)"
        >
          <Paperclip size={18} strokeWidth={2} aria-hidden />
        </button>
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          disabled={commandLoading}
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-text outline-none placeholder:text-textSoft disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="What do you want to do? Suggestions update as you type."
          aria-label="Chat command input"
          aria-autocomplete="list"
          aria-controls={controls}
          aria-expanded={expanded}
          aria-describedby={describedBy || undefined}
          autoComplete="off"
        />
        <button
          type="button"
          disabled={commandLoading}
          onClick={() => onSubmit()}
          className={`shrink-0 inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-xl border border-borderStrong/60 bg-surfaceActive px-3 py-2 text-xs font-semibold text-text shadow-sm disabled:opacity-100 ${btn}`}
          title={commandLoading ? 'Working — your command is running' : 'Send (Enter) — with suggestions, Enter inserts; Send runs'}
        >
          {commandLoading ? (
            <>
              <Loader2
                className="h-3.5 w-3.5 motion-safe:animate-spin"
                strokeWidth={2}
                aria-hidden
              />
              <span>Working</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 opacity-80" strokeWidth={2} aria-hidden />
              Send
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export type { ChatAttachment };
