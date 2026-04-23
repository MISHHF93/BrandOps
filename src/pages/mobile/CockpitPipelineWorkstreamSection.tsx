import { pulseTile, signalList, formatPeekDue } from './cockpitDailyPrimitives';
import type { CockpitPipelineSectionProps } from './cockpitSectionTypes';

const rowChip = (btnFocus: string) =>
  `rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-0.5 text-[10px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * `id="cockpit-pipeline"` must stay stable for `?section=pipeline` and scroll targets.
 */
export const CockpitPipelineWorkstreamSection = ({
  snapshot,
  btnFocus,
  commandBusy,
  runCommand,
  primeChat,
  meta
}: CockpitPipelineSectionProps) => (
  <section
    className="scroll-mt-28 rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-3 text-xs"
    aria-labelledby="cockpit-pipeline"
  >
    <h3 id="cockpit-pipeline" className="text-sm font-semibold text-zinc-100">
      {meta.label}
    </h3>
    <p className="mt-0.5 text-[11px] text-zinc-500">{meta.description}</p>
    <p className="mt-2 text-[10px] text-zinc-600">
      Pipeline lists are <strong className="text-zinc-500">read-only digest</strong>. Stage changes and outreach run in{' '}
      <strong className="text-zinc-400">Chat</strong> — not the Settings tab.
    </p>

    <div className="mt-3 space-y-3">
      <div
        className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2.5"
        aria-labelledby="cockpit-pipeline-projection-heading"
      >
        <p
          id="cockpit-pipeline-projection-heading"
          className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/90"
        >
          Weighted projection
        </p>
        <p className="mt-1 text-[10px] leading-snug text-zinc-500">
          Open deals only (excludes won, lost, archived). <span className="text-zinc-400">Weighted</span> is Σ value ×
          confidence% — a sizing lens from the same rules as deal health, not a forecast.
        </p>
        <div
          role="group"
          aria-label="Pipeline projection figures, read-only — not buttons"
          className="-mx-0.5 mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]"
        >
          {pulseTile(
            'Weighted',
            snapshot.pipelineProjection.activeDealCount > 0
              ? `$${snapshot.pipelineProjection.weightedOpenValueUsd.toLocaleString()}`
              : '—',
            'value × conf%'
          )}
          {pulseTile(
            'Raw open',
            snapshot.pipelineProjection.activeDealCount > 0
              ? `$${snapshot.pipelineProjection.rawOpenValueUsd.toLocaleString()}`
              : '—',
            `${snapshot.pipelineProjection.activeDealCount} deals`
          )}
        </div>
      </div>

      {signalList(
        'Opportunities to close (proposal & negotiation)',
        snapshot.opportunitiesToClose,
        'No deals in proposal or negotiation yet.',
        'In Chat: update opportunity to proposal, or add opportunities with stage, value, and confidence.'
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-zinc-200">Deal health (heuristic)</p>
          <button
            type="button"
            disabled={commandBusy}
            onClick={() => void runCommand('pipeline health')}
            className={`shrink-0 rounded-full border border-emerald-600/40 bg-zinc-900/50 px-2 py-0.5 text-[10px] text-emerald-200 ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Run in Chat
          </button>
        </div>
        {snapshot.pipelineSignals.length === 0 ? (
          <div className="mt-1 space-y-1">
            <p className="text-[11px] text-zinc-500">No active opportunities in the workspace yet.</p>
            <p className="text-[11px] text-zinc-500">
              In <strong className="text-zinc-400">Chat</strong>, add opportunities or run{' '}
              <code className="rounded bg-zinc-900/80 px-1 text-[10px] text-zinc-300">pipeline health</code> after you
              have deals in motion.
            </p>
          </div>
        ) : (
          <ol className="mt-1 space-y-1.5">
            {snapshot.pipelineSignals.map((row, i) => (
              <li key={row.id} className="border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-zinc-200">
                    {i + 1}. {row.label}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-emerald-300/90">{row.score}</span>
                </div>
                <p className="text-[10px] leading-snug text-zinc-500">{row.reason}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      {signalList(
        'Outreach urgency (top 5)',
        snapshot.outreachUrgencyTop,
        'No active outreach drafts.',
        'In Chat, try: draft outreach: quick follow-up with warm lead from demo (or use Draft outreach below).'
      )}
      {signalList(
        'Overdue & due-soon (risk score)',
        snapshot.followUpRiskTop,
        'No follow-up risk in range.',
        'Create a follow-up in Chat so due-soon items can rank here.'
      )}

      {snapshot.cockpitOutreachTemplatePeek.length > 0 ? (
        <div className="border-t border-white/5 pt-3">
          <p className="text-[11px] font-medium text-zinc-400">Outreach templates</p>
          <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
          <ul className="mt-2 space-y-2">
            {snapshot.cockpitOutreachTemplatePeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
              >
                <p className="font-medium text-zinc-100">{row.name}</p>
                <p className="text-[10px] text-zinc-500">
                  {row.category} · updated {formatPeekDue(row.updatedAt)}
                </p>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(`add note: review outreach template "${row.name.replace(/"/g, "'")}"`)}
                  className={`mt-2 ${rowChip(btnFocus)}`}
                >
                  Open in Chat (draft note)
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {snapshot.cockpitOutreachHistoryPeek.length > 0 ? (
        <div className="border-t border-white/5 pt-3">
          <p className="text-[11px] font-medium text-zinc-400">Outreach history</p>
          <p className="mt-0.5 text-[10px] text-zinc-600">Read-only digest.</p>
          <ul className="mt-2 space-y-2">
            {snapshot.cockpitOutreachHistoryPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
              >
                <p className="font-medium text-zinc-100">
                  {row.targetName}
                  <span className="font-normal text-zinc-500"> · {row.company}</span>
                </p>
                <p className="text-[10px] text-zinc-500">
                  {row.status} · {formatPeekDue(row.loggedAt)}
                </p>
                {row.summaryPreview ? (
                  <p className="mt-1 text-[10px] leading-snug text-zinc-500">{row.summaryPreview}</p>
                ) : null}
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(`add note: outreach log — ${row.targetName} (${row.company})`)}
                  className={`mt-2 ${rowChip(btnFocus)}`}
                >
                  Open in Chat (draft note)
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
    {snapshot.cockpitOpportunityPeek.length > 0 ? (
      <div className="mt-3 border-t border-white/5 pt-3">
        <p className="text-[11px] font-medium text-zinc-400">Opportunities in workspace</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          Read-only peek. Agent stage updates still apply to the first active deal unless you name fields in Chat.
        </p>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitOpportunityPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-white/5 bg-zinc-950/35 px-2 py-2 text-[11px] text-zinc-300"
            >
              <p className="font-medium text-zinc-100">
                {row.name}
                <span className="font-normal text-zinc-500"> · {row.company}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {row.status}
                {row.nextAction ? ` · ${row.nextAction}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    primeChat(`add note: review deal ${row.company} — ${row.name} (${row.status})`)
                  }
                  className={rowChip(btnFocus)}
                >
                  Open in Chat (note)
                </button>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() => primeChat(`draft outreach: follow up on ${row.company} re: ${row.name}`)}
                  className={rowChip(btnFocus)}
                >
                  Open in Chat (outreach draft)
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ) : null}
    <div className="mt-2 flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={commandBusy}
        onClick={() => void runCommand('draft outreach: follow up on warm lead')}
        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Draft outreach
      </button>
      <button
        type="button"
        disabled={commandBusy}
        onClick={() => void runCommand('update opportunity to proposal')}
        className={`rounded-full border border-zinc-600/50 bg-zinc-900/50 px-2 py-1 text-[11px] ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Advance opportunity
      </button>
    </div>
  </section>
);
