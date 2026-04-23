import { Sparkles } from 'lucide-react';
import { formatPeekDue } from './cockpitDailyPrimitives';
import type { CockpitTodaySectionProps } from './cockpitSectionTypes';

const rowChip = (btnFocus: string) =>
  `rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * `id="cockpit-today"` must stay stable for `?section=today` / workstream scroll and {@link getCockpitMobileSectionHeadingId}.
 */
export const CockpitTodayWorkstreamSection = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  onOpenInAppSettings,
  meta
}: CockpitTodaySectionProps) => (
  <section
    className="scroll-mt-28 rounded-xl border border-white/10 bg-zinc-950/30 p-3 text-xs"
    aria-labelledby="cockpit-today"
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 id="cockpit-today" className="text-sm font-semibold text-zinc-100">
          {meta.label}
        </h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">{meta.description}</p>
      </div>
      <Sparkles size={16} className="shrink-0 text-amber-400/80" aria-hidden />
    </div>
    <p className="mt-2 text-[10px] text-zinc-600">
      Lists below are <strong className="text-zinc-500">read-only peeks</strong>. Buttons open{' '}
      <strong className="text-zinc-400">Chat</strong> (composer or send) — not Settings.
    </p>
    <p className="mt-2 text-zinc-400">{snapshot.cadenceHeadline}</p>
    <p className="mt-1 text-zinc-500">Cadence: {snapshot.cadenceMode}</p>
    <p className="mt-2 text-zinc-300">
      <span className="text-zinc-500">Operator:</span> {snapshot.operatorName || '—'} ·{' '}
      <span className="text-zinc-500">Offer:</span> {snapshot.primaryOffer || '—'}
    </p>
    <p className="mt-0.5 text-zinc-300">
      <span className="text-zinc-500">Focus:</span> {snapshot.focusMetric || '—'}
    </p>
    <p className="mt-3 text-[11px] text-zinc-500">
      Workday, task caps, and reminders live in{' '}
      <button
        type="button"
        onClick={onOpenInAppSettings}
        className={`font-medium text-indigo-300 underline-offset-2 hover:underline ${btnFocus}`}
      >
        Settings
      </button>{' '}
      (workspace preferences only — not pipeline or brand editing).
    </p>
    <div className="mt-2 flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={commandBusy}
        onClick={() => void runCommand('create follow up: check warm lead status')}
        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Create follow-up
      </button>
      <button
        type="button"
        disabled={commandBusy}
        onClick={() => void runCommand('configure: cadence balanced, remind before 20 min')}
        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Balanced cadence
      </button>
    </div>

    {snapshot.cockpitSchedulerTaskPeek.length > 0 ? (
      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="text-[11px] font-medium text-zinc-400">Upcoming scheduler tasks</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          Read-only digest. Snooze and completion flow through Chat commands.
        </p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitSchedulerTaskPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">{row.title}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {row.status} · {row.sourceType} · due {formatPeekDue(row.dueAt)}
              </p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() => primeChat(`add note: scheduler task — ${row.title}`)}
                className={`mt-2 ${rowChip(btnFocus)}`}
              >
                Open in Chat (draft note)
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {snapshot.cockpitRecentNotesPeek.length > 0 ? (
      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="text-[11px] font-medium text-zinc-400">Recent notes</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitRecentNotesPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">{row.title}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {row.entityType} · {formatPeekDue(row.createdAt)}
              </p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() => primeChat(`add note: follow up on "${row.title.replace(/"/g, "'")}"`)}
                className={`mt-2 ${rowChip(btnFocus)}`}
              >
                Open in Chat (extend note)
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {snapshot.cockpitContactsPeek.length > 0 ? (
      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="text-[11px] font-medium text-zinc-400">Contacts (recent touch)</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitContactsPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">
                {row.name}
                <span className="font-normal text-zinc-500"> · {row.company}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{row.role}</p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() => primeChat(`update contact: ${row.name}, ${row.company}`)}
                className={`mt-2 ${rowChip(btnFocus)}`}
              >
                Open in Chat (contact update)
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </section>
);
