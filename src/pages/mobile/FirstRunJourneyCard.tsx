import clsx from 'clsx';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import { BrandOpsMarkBadge } from '../../shared/ui/brandopsPolish';

/** Current dismissal flag — bump suffix when checklist content/placement changes materially. */
export const GETTING_STARTED_STORAGE_KEY = 'brandops:gettingStartedDismissed:v8';

/**
 * Persisted on workspace `seed.onboardingVersion` when the user dismisses Getting started.
 * Keep in sync with the suffix on {@link GETTING_STARTED_STORAGE_KEY}.
 */
export const GETTING_STARTED_CONTENT_VERSION = '8';

/** Legacy key (Today-tab only card). No longer read. */
export const LEGACY_FIRST_RUN_STORAGE_KEY = 'brandops:firstRunJourneyDismissed';

/** Reads dismissal under current storage key; migrates prior checklist versions once per browser. */
export function readFirstRunJourneyDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem(GETTING_STARTED_STORAGE_KEY) === '1') return true;
  const legacyKeys = [
    'brandops:gettingStartedDismissed:v7',
    'brandops:gettingStartedDismissed:v5',
    'brandops:gettingStartedDismissed:v4'
  ];
  for (const legacy of legacyKeys) {
    if (localStorage.getItem(legacy) !== '1') continue;
    try {
      localStorage.setItem(GETTING_STARTED_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

function writeGettingStartedDismissed() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(GETTING_STARTED_STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

const stepClass = 'mt-2 rounded-lg border border-border/35 bg-bgSubtle/30 px-2.5 py-2';
const stepTitleClass = 'text-meta font-semibold text-text';
const stepBodyClass = 'mt-0.5 text-fine leading-snug text-textSoft';

/**
 * First-session checklist on **Plan** — the ASK + PLAN + OPERATE loop.
 */
export function FirstRunJourneyCard({
  btnFocus,
  onDismiss,
  onTryCommand,
  onOpenAsk,
  onOpenSettings,
  onOpenHelp
}: {
  btnFocus: string;
  onDismiss: () => void;
  onTryCommand: (line: string) => void;
  onOpenAsk: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <section
      className="bo-brand-command-surface mb-3 rounded-xl px-3 py-3 text-label text-textMuted shadow-sm"
      aria-label="Start here — first session"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <BrandOpsMarkBadge className="bo-brand-mark--sm mt-0.5" />
          <div className="min-w-0">
            <p className="text-h3 text-text">ASK. PLAN. OPERATE.</p>
            <p className="mt-1 text-meta text-textSoft">
              Your AI digital twin understands your profession, connects to your tools, and helps
              operate your workflows.
            </p>
            <p className="mt-2 rounded-lg border border-border/30 bg-bgSubtle/25 px-2.5 py-2 text-fine leading-snug text-textSoft">
              BrandOps is not another chatbot. It starts with profession identity, builds a digital
              twin, connects platform context, plans work, and keeps execution under human control.
            </p>

            <div className="mt-2 grid gap-1.5 sm:grid-cols-3" aria-label="BrandOps product loop">
              <div className={stepClass}>
                <p className={stepTitleClass}>ASK</p>
                <p className={stepBodyClass}>
                  Ask your twin for strategy, positioning, ideas, and workflow reasoning.
                </p>
              </div>
              <div className={stepClass}>
                <p className={stepTitleClass}>PLAN</p>
                <p className={stepBodyClass}>
                  Convert intelligence into cross-platform plans, queues, drafts, and schedules.
                </p>
              </div>
              <div className={stepClass}>
                <p className={stepTitleClass}>OPERATE</p>
                <p className={stepBodyClass}>
                  Approve, track, retry, and audit execution across connected tools.
                </p>
              </div>
            </div>

            <ol className="mt-2 list-none space-y-2 p-0 text-left" role="list">
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">1.</span> Create digital twin
                </p>
                <p className={stepBodyClass}>
                  Upload or paste a resume/profile so BrandOps can build a verified twin with
                  profession identity, skills, voice, gaps, and safe action context.
                </p>
                <button
                  type="button"
                  className={clsx('bo-btn-primary mt-2', btnFocus)}
                  onClick={onOpenSettings}
                  title="Create digital twin in Settings"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  Create digital twin
                </button>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">2.</span> ASK your twin
                </p>
                <p className={stepBodyClass}>
                  Use ASK for brainstorming, positioning, bio generation, opportunity analysis, and
                  workflow reasoning grounded in your digital twin.
                </p>
                <button
                  type="button"
                  className={clsx('bo-btn-primary mt-2', btnFocus)}
                  onClick={() => {
                    onOpenAsk();
                    onTryCommand(
                      'ask: Help me identify my strongest positioning and next best move.'
                    );
                  }}
                  title="Open ASK with a twin-aware prompt"
                >
                  <Bot className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  ASK my twin
                </button>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">3.</span> Convert ideas into PLANs
                </p>
                <p className={stepBodyClass}>
                  Turn useful ASK outputs into AI planning artifacts: workflows, outreach plans,
                  content schedules, action queues, and follow-up sequences.
                </p>
                <a
                  href="#plan-operational-studio"
                  className={clsx(
                    'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                    btnFocus
                  )}
                >
                  <LayoutDashboard
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  Open PLAN studio
                </a>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">4.</span> OPERATE with control
                </p>
                <p className={stepBodyClass}>
                  Nothing external executes automatically. Preview, edit, approve, reject, retry,
                  and audit before anything leaves BrandOps.
                </p>
                <a
                  href="#plan-human-approval-queue"
                  className={clsx(
                    'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                    btnFocus
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  Review approval queue
                </a>
              </li>
              <li className={stepClass}>
                <p className={stepTitleClass}>
                  <span className="text-textSoft">5.</span> Track operational execution
                </p>
                <p className={stepBodyClass}>
                  OPERATE gives you an ops timeline, receipts, Today snapshot, and queue so you
                  always know what happened, where it happened, and what the AI did.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <a
                    href="#plan-operational-timeline"
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                      btnFocus
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    Track timeline
                  </a>
                  <a
                    href="#plan-execution-receipts"
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                      btnFocus
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    View receipts
                  </a>
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                      btnFocus
                    )}
                    onClick={onOpenSettings}
                    title="Open Settings"
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    Settings
                  </button>
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-lg border border-border/45 bg-bg px-2.5 py-1.5 text-meta font-semibold text-text',
                      btnFocus
                    )}
                    onClick={onOpenHelp}
                    title="Open Help — Knowledge Center"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    Help
                  </button>
                </div>
              </li>
            </ol>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            writeGettingStartedDismissed();
            onDismiss();
          }}
          className={`-m-1 shrink-0 rounded-lg p-1.5 text-textSoft hover:text-text ${btnFocus}`}
          aria-label="Dismiss getting started"
          title="Dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </section>
  );
}
