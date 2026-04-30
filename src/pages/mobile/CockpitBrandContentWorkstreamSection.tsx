import { FileText } from 'lucide-react';
import { CockpitWorkstreamCommandStrip } from './CockpitWorkstreamCommandStrip';
import { signalList } from './cockpitDailyPrimitives';
import type { CockpitBrandContentSectionProps } from './cockpitSectionTypes';

const BRAND_STRIP_ITEMS = [
  { kind: 'run' as const, label: 'Audit positioning', phrase: 'audit_positioning' },
  { kind: 'run' as const, label: 'Offer stack', phrase: 'define_offer_stack' },
  { kind: 'run' as const, label: 'Content angles', phrase: 'generate_content_angles' },
  {
    kind: 'run' as const,
    label: 'LinkedIn post',
    phrase: 'write_linkedIn_post'
  },
  { kind: 'run' as const, label: 'Case study', phrase: 'build_case_study' }
] as const;

const rowChip = (btnFocus: string) =>
  `rounded-full border border-borderStrong/50 bg-surface/70 px-2 py-0.5 text-[10px] text-text ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * `id="cockpit-brand"` must stay stable for `?section=brand-content` and scroll targets.
 */
export const CockpitBrandContentWorkstreamSection = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  meta
}: CockpitBrandContentSectionProps) => (
  <section
    className="scroll-mt-28 rounded-xl border border-secondary/25 bg-secondary/5 p-3 text-xs"
    aria-labelledby="cockpit-brand"
  >
    <div className="flex items-center justify-between gap-2">
      <h3
        id="cockpit-brand"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text"
      >
        <FileText className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2.25} aria-hidden />
        {meta.label}
      </h3>
    </div>
    <span className="sr-only">
      {meta.description} Brand and publishing rows are read-only digest. Strategic BrandOps
      functions run in Chat — not Settings. Full mixed queue in Pulse.
    </span>
    <p className="mt-2 text-textSoft">
      Queue: <span className="text-text">{snapshot.publishingQueue}</span> ·{' '}
      <span className="text-textSoft">Due-soon:</span>{' '}
      <span className="text-text">{snapshot.queuedPublishing}</span>
    </p>
    {snapshot.nextPublishingHint ? (
      <p className="mt-1 text-[11px] text-textMuted">Next: {snapshot.nextPublishingHint}</p>
    ) : null}
    <CockpitWorkstreamCommandStrip
      ariaLabel="Brand and content Chat starters"
      btnFocus={btnFocus}
      commandBusy={commandBusy}
      runCommand={runCommand}
      primeChat={primeChat}
      items={BRAND_STRIP_ITEMS}
    />
    <span className="sr-only">
      Function buttons return structured objective, diagnosis, gaps, recommendations, and next-step
      guidance. Use row buttons to prime lines that name a specific title.
    </span>
    {(() => {
      const bv = snapshot.cockpitBrandVaultReadout;
      const hasVaultPeek =
        bv.filledListFieldsCount > 0 ||
        Boolean(bv.positioningPreview) ||
        Boolean(bv.firstHeadlineOption) ||
        Boolean(bv.shortBioPreview);
      if (!hasVaultPeek) return null;
      return (
        <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            Brand vault (read-only)
          </p>
          <p className="mt-1 text-[10px] text-textMuted">
            {bv.filledListFieldsCount} list section{bv.filledListFieldsCount === 1 ? '' : 's'} with
            content
          </p>
          {bv.positioningPreview ? (
            <p className="mt-2 text-[11px] leading-snug text-textMuted">{bv.positioningPreview}</p>
          ) : null}
          {bv.firstHeadlineOption ? (
            <p className="mt-1 text-[10px] text-textMuted">
              <span className="text-textSoft">Headline option:</span>{' '}
              <span className="text-text">{bv.firstHeadlineOption}</span>
            </p>
          ) : null}
          {bv.shortBioPreview ? (
            <p className="mt-1 text-[10px] leading-snug text-textSoft">{bv.shortBioPreview}</p>
          ) : null}
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => primeChat('add note: refine brand vault positioning and headlines')}
            className={`mt-2 ${rowChip(btnFocus)}`}
          >
            Review in Chat
          </button>
        </div>
      );
    })()}
    {signalList(
      'Content priority (top 5)',
      snapshot.contentTopSignals,
      'No content in the library yet.',
      'In Chat: add content: … and optional status so priority can rank (e.g. add content: AI growth memo draft, status draft).'
    )}
    {snapshot.cockpitContentPeek.length > 0 ? (
      <div className="mt-3 border-t border-border/25 pt-3">
        <p className="text-[11px] font-medium text-textSoft">Content library (top)</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitContentPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">{row.title}</p>
              <p className="text-[10px] text-textMuted">{row.status}</p>
              <div className="mt-2">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    primeChat(`add note: refine content "${row.title.replace(/"/g, "'")}"`)
                  }
                  className={rowChip(btnFocus)}
                >
                  Review in Chat
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.cockpitPublishingPeek.length > 0 ? (
      <div className="mt-3 border-t border-border/25 pt-3">
        <p className="text-[11px] font-medium text-textSoft">Publishing queue (top)</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitPublishingPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">{row.title}</p>
              <p className="text-[10px] text-textMuted">{row.status}</p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() =>
                  primeChat(`update publishing: ${row.title.replace(/"/g, "'")} checklist ready`)
                }
                className={`mt-2 ${rowChip(btnFocus)}`}
              >
                Review in Chat
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </section>
);
