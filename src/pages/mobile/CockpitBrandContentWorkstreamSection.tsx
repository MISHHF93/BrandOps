import { signalList } from './cockpitDailyPrimitives';
import type { CockpitBrandContentSectionProps } from './cockpitSectionTypes';

const rowChip = (btnFocus: string) =>
  `rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

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
    className="scroll-mt-28 rounded-xl border border-violet-500/15 bg-violet-950/10 p-3 text-xs"
    aria-labelledby="cockpit-brand"
  >
    <h3 id="cockpit-brand" className="text-sm font-semibold text-zinc-100">
      {meta.label}
    </h3>
    <p className="mt-0.5 text-[11px] text-zinc-500">{meta.description}</p>
    <p className="mt-2 text-[10px] text-zinc-600">
      Brand and publishing rows are <strong className="text-zinc-500">read-only digest</strong>. Drafts and updates run
      in <strong className="text-zinc-400">Chat</strong> — not Settings.
    </p>
    <p className="mt-2 text-zinc-400">
      Publishing queue: <span className="text-zinc-100">{snapshot.publishingQueue}</span> items · Queued or due-soon:{' '}
      <span className="text-zinc-100">{snapshot.queuedPublishing}</span>
    </p>
    {snapshot.nextPublishingHint ? (
      <p className="mt-1 text-[11px] text-violet-200/80">Next: {snapshot.nextPublishingHint}</p>
    ) : null}
    {(() => {
      const bv = snapshot.cockpitBrandVaultReadout;
      const hasVaultPeek =
        bv.filledListFieldsCount > 0 ||
        Boolean(bv.positioningPreview) ||
        Boolean(bv.firstHeadlineOption) ||
        Boolean(bv.shortBioPreview);
      if (!hasVaultPeek) return null;
      return (
        <div className="mt-3 rounded-lg border border-violet-500/20 bg-violet-950/15 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Brand vault (read-only)
          </p>
          <p className="mt-1 text-[10px] text-zinc-500">
            {bv.filledListFieldsCount} list section{bv.filledListFieldsCount === 1 ? '' : 's'} with content
          </p>
          {bv.positioningPreview ? (
            <p className="mt-2 text-[11px] leading-snug text-zinc-300">{bv.positioningPreview}</p>
          ) : null}
          {bv.firstHeadlineOption ? (
            <p className="mt-1 text-[10px] text-zinc-500">
              <span className="text-zinc-500">Headline option:</span>{' '}
              <span className="text-zinc-200">{bv.firstHeadlineOption}</span>
            </p>
          ) : null}
          {bv.shortBioPreview ? (
            <p className="mt-1 text-[10px] leading-snug text-zinc-500">{bv.shortBioPreview}</p>
          ) : null}
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => primeChat('add note: refine brand vault positioning and headlines')}
            className={`mt-2 ${rowChip(btnFocus)}`}
          >
            Open in Chat (brand note)
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
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="text-[11px] font-medium text-zinc-400">Content library (top)</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitContentPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">{row.title}</p>
              <p className="text-[10px] text-zinc-500">{row.status}</p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() => primeChat(`add note: refine content "${row.title.replace(/"/g, "'")}"`)}
                className={`mt-2 ${rowChip(btnFocus)}`}
              >
                Open in Chat (content note)
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    {snapshot.cockpitPublishingPeek.length > 0 ? (
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="text-[11px] font-medium text-zinc-400">Publishing queue (top)</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitPublishingPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">{row.title}</p>
              <p className="text-[10px] text-zinc-500">{row.status}</p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() => primeChat(`update publishing: ${row.title.replace(/"/g, "'")} checklist ready`)}
                className={`mt-2 ${rowChip(btnFocus)}`}
              >
                Open in Chat (publishing command)
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    <div className="mt-2 flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={commandBusy}
        onClick={() => void runCommand('draft post: weekly insight from the workspace')}
        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Draft post
      </button>
      <button
        type="button"
        disabled={commandBusy}
        onClick={() => void runCommand('reschedule posts to friday 11am')}
        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Reschedule posts
      </button>
    </div>
  </section>
);
