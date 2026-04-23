import { Sparkles } from 'lucide-react';
import { CockpitWorkstreamCommandStrip } from './CockpitWorkstreamCommandStrip';
import { formatPeekDue } from './cockpitDailyPrimitives';
import type { CockpitTodaySectionProps } from './cockpitSectionTypes';

const TODAY_STRIP_ITEMS = [
  {
    kind: 'run' as const,
    label: 'Create follow-up',
    phrase: 'create follow up: check warm lead status'
  },
  {
    kind: 'run' as const,
    label: 'Balanced cadence',
    phrase: 'configure: cadence balanced, remind before 20 min'
  },
  {
    kind: 'run' as const,
    label: 'Complete follow-up',
    phrase: 'complete follow up: done with intro call follow-up'
  },
  {
    kind: 'prime' as const,
    label: 'Add contact',
    phrase: 'add contact: Alex Rivera, Northwind Labs, Founder'
  }
] as const;

const rowChip = (btnFocus: string) =>
  `rounded-full border border-borderStrong/50 bg-surface/70 px-2 py-0.5 text-[10px] text-text ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

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
    className="scroll-mt-28 rounded-xl border border-border/40 bg-bgSubtle/50 p-3 text-xs"
    aria-labelledby="cockpit-today"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 id="cockpit-today" className="text-sm font-semibold text-text">
          {meta.label}
        </h3>
        <p className="mt-0.5 text-[11px] text-textMuted">{meta.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenInAppSettings}
          className={`rounded-full border border-borderStrong/50 bg-surface/70 px-2 py-0.5 text-[10px] text-textMuted hover:text-text ${btnFocus}`}
          title="Open Settings for workday, task caps, and reminders"
        >
          Settings
        </button>
        <Sparkles size={16} className="shrink-0 text-warning/80" aria-hidden />
      </div>
    </div>
    <span className="sr-only">
      Lists below are read-only peeks. Buttons open Chat (composer or send) — not Settings.
    </span>
    <p className="mt-2 text-textSoft">{snapshot.cadenceHeadline}</p>
    <p className="mt-1 text-textMuted">
      <span className="text-textSoft">Cadence:</span> {snapshot.cadenceMode} ·{' '}
      <span className="text-textSoft">Operator:</span> {snapshot.operatorName || '—'} ·{' '}
      <span className="text-textSoft">Offer:</span> {snapshot.primaryOffer || '—'} ·{' '}
      <span className="text-textSoft">Focus:</span> {snapshot.focusMetric || '—'}
    </p>
    <CockpitWorkstreamCommandStrip
      ariaLabel="Today workstream Chat starters"
      btnFocus={btnFocus}
      commandBusy={commandBusy}
      runCommand={runCommand}
      primeChat={primeChat}
      items={TODAY_STRIP_ITEMS}
    />

    {snapshot.cockpitSchedulerTaskPeek.length > 0 ? (
      <div className="mt-4 border-t border-border/25 pt-4">
        <p className="text-[11px] font-medium text-textSoft">Upcoming scheduler tasks</p>
        <span className="sr-only">
          Read-only digest. Snooze and completion flow through Chat commands. "Complete follow-up"
          in the strip marks the first incomplete follow-up in workspace order.
        </span>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitSchedulerTaskPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">{row.title}</p>
              <p className="mt-0.5 text-[10px] text-textMuted">
                {row.status} · {row.sourceType} · due {formatPeekDue(row.dueAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(`add note: scheduler task — ${row.title}`)}
                  className={rowChip(btnFocus)}
                >
                  Open in Chat (draft note)
                </button>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    primeChat(
                      `complete follow up: done — related scheduler task "${row.title.replace(/"/g, "'")}"`
                    )
                  }
                  className={rowChip(btnFocus)}
                  title="Completes the first incomplete follow-up in the workspace; line ties context in Chat."
                >
                  Prime complete follow-up
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ) : null}

    {snapshot.cockpitRecentNotesPeek.length > 0 ? (
      <div className="mt-4 border-t border-border/25 pt-4">
        <p className="text-[11px] font-medium text-textSoft">Recent notes</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitRecentNotesPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">{row.title}</p>
              <p className="mt-0.5 text-[10px] text-textMuted">
                {row.entityType} · {formatPeekDue(row.createdAt)}
              </p>
              <button
                type="button"
                disabled={commandBusy}
                onClick={() =>
                  primeChat(`add note: follow up on "${row.title.replace(/"/g, "'")}"`)
                }
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
      <div className="mt-4 border-t border-border/25 pt-4">
        <p className="text-[11px] font-medium text-textSoft">Contacts (recent touch)</p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitContactsPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">
                {row.name}
                <span className="font-normal text-textSoft"> · {row.company}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-textMuted">{row.role}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(`update contact: ${row.name}, ${row.company}`)}
                  className={rowChip(btnFocus)}
                >
                  Open in Chat (contact update)
                </button>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    primeChat(`add contact: ${row.name}, ${row.company}, ${row.role || 'Role'}`)
                  }
                  className={rowChip(btnFocus)}
                >
                  Prime add contact
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </section>
);
