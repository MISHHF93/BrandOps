import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';

export interface PlanProfileSummaryProps {
  btnFocus: string;
  primaryOffer: string;
  voiceGuide: string;
  focusMetric: string;
  onEditProfile: () => void;
}

function summarizeVoice(raw: string, maxLen: number): string {
  const t = raw.trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** Read-only labeled workspace profile fields — authoritative edits stay under Settings → Preferences. */
export function PlanProfileSummary({
  btnFocus,
  primaryOffer,
  voiceGuide,
  focusMetric,
  onEditProfile
}: PlanProfileSummaryProps) {
  const emptyHint = 'Not set — add under Settings → Preferences.';
  const offerDisplay = primaryOffer.trim() || emptyHint;
  const voiceRaw = voiceGuide.trim();
  const voiceDisplay = voiceRaw ? summarizeVoice(voiceRaw, 200) : emptyHint;
  const metricDisplay = focusMetric.trim() || emptyHint;
  const focusMetricClass =
    metricDisplay === emptyHint
      ? 'mt-0.5 text-[11px] leading-snug text-text'
      : 'mt-0.5 text-[11px] font-medium leading-snug text-info';

  return (
    <section
      id="plan-profile-summary"
      className="rounded-2xl border border-border/40 bg-bgSubtle/35 px-3 py-3 sm:px-3.5"
      aria-labelledby="plan-profile-summary-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2
          id="plan-profile-summary-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted"
        >
          Workspace profile
        </h2>
        <button
          type="button"
          onClick={onEditProfile}
          title="Edit profile fields in Settings"
          className={clsx(
            'inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/50 bg-bg px-2 py-1.5 text-[11px] font-semibold text-text',
            btnFocus
          )}
        >
          Edit profile
          <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
        </button>
      </div>

      <dl className="mt-2 space-y-2 border-t border-border/25 pt-2">
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-textMuted">
            Primary offer
          </dt>
          <dd className="mt-0.5 text-[11px] leading-snug text-text">{offerDisplay}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-textMuted">
            Voice guide
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-[11px] leading-snug text-text">
            {voiceDisplay}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-textMuted">
            Focus metric
          </dt>
          <dd className={focusMetricClass}>{metricDisplay}</dd>
        </div>
      </dl>
    </section>
  );
}
