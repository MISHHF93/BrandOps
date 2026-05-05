import { Briefcase } from 'lucide-react';
import { CockpitWorkstreamCommandStrip } from './CockpitWorkstreamCommandStrip';
import { pulseTile, signalList, formatPeekDue } from './cockpitDailyPrimitives';
import type { CockpitPipelineSectionProps } from './cockpitSectionTypes';

const PIPELINE_STRIP_ITEMS = [
  { kind: 'run' as const, label: 'Archive opportunity', phrase: 'archive opportunity' },
  { kind: 'run' as const, label: 'Restore opportunity', phrase: 'restore opportunity' },
  {
    kind: 'prime' as const,
    label: 'Add contact',
    phrase: 'add contact: Alex Rivera, Northwind Labs, Founder'
  },
  {
    kind: 'run' as const,
    label: 'Draft outreach',
    phrase: 'draft outreach: follow up on warm lead'
  },
  { kind: 'run' as const, label: 'Advance deal', phrase: 'update opportunity to proposal' }
] as const;

const rowChip = (btnFocus: string) =>
  `rounded-full border border-borderStrong/50 bg-surface/70 px-2 py-0.5 text-[10px] text-text ${btnFocus} disabled:cursor-not-allowed disabled:opacity-50`;

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
    className="scroll-mt-28 rounded-xl border border-success/25 bg-success/5 p-3 text-xs"
    aria-labelledby="cockpit-pipeline"
  >
    <div className="flex items-center justify-between gap-2">
      <h3
        id="cockpit-pipeline"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text"
      >
        <Briefcase className="h-4 w-4 shrink-0 text-success" strokeWidth={2.25} aria-hidden />
        {meta.label}
      </h3>
    </div>
    <span className="sr-only">
      {meta.description} Pipeline lists are read-only digest. Stage changes and outreach run in Chat
      — not the Settings tab. Chronological mix on Plan queue.
    </span>

    <CockpitWorkstreamCommandStrip
      ariaLabel="Pipeline workstream Chat starters"
      btnFocus={btnFocus}
      commandBusy={commandBusy}
      runCommand={runCommand}
      primeChat={primeChat}
      items={PIPELINE_STRIP_ITEMS}
    />
    <span className="sr-only">
      Archive and restore apply to the first active or first archived opportunity in workspace order
      — refine in Chat if you need a specific deal.
    </span>

    <div className="mt-3 space-y-3">
      <div
        className="rounded-lg border border-success/30 bg-success/10 p-2.5"
        aria-labelledby="cockpit-pipeline-projection-heading"
      >
        <p
          id="cockpit-pipeline-projection-heading"
          className="text-[10px] font-semibold uppercase tracking-wide text-success"
        >
          Weighted projection
        </p>
        <p className="mt-1 text-[10px] leading-snug text-textMuted">
          Open deals only (excludes won, lost, archived).{' '}
          <span className="text-textSoft">Weighted</span> is Σ value × confidence% — a sizing lens
          from the same rules as deal health, not a forecast.
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
          <p className="font-medium text-text">Deal health (heuristic)</p>
        </div>
        {snapshot.pipelineSignals.length === 0 ? (
          <div className="mt-1 space-y-1">
            <p className="text-[11px] text-textMuted">
              No active opportunities in the workspace yet.
            </p>
            <p className="text-[11px] text-textMuted">
              In <strong className="text-text">Chat</strong>, add opportunities or run{' '}
              <code className="rounded bg-surface/90 px-1 text-[10px] text-textMuted">
                pipeline health
              </code>{' '}
              after you have deals in motion.
            </p>
          </div>
        ) : (
          <ol className="mt-1 space-y-1.5">
            {snapshot.pipelineSignals.map((row, i) => (
              <li key={row.id} className="border-b border-border/25 pb-1.5 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text">
                    {i + 1}. {row.label}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-success">{row.score}</span>
                </div>
                <p className="text-[10px] leading-snug text-textMuted">{row.reason}</p>
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
        <div className="border-t border-border/25 pt-3">
          <p className="text-[11px] font-medium text-textSoft">Outreach templates</p>
          <ul className="mt-2 space-y-2">
            {snapshot.cockpitOutreachTemplatePeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
              >
                <p className="font-medium text-text">{row.name}</p>
                <p className="text-[10px] text-textMuted">
                  {row.category} · updated {formatPeekDue(row.updatedAt)}
                </p>
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    primeChat(`add note: review outreach template "${row.name.replace(/"/g, "'")}"`)
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

      {snapshot.cockpitOutreachHistoryPeek.length > 0 ? (
        <div className="border-t border-border/25 pt-3">
          <p className="text-[11px] font-medium text-textSoft">Outreach history</p>
          <ul className="mt-2 space-y-2">
            {snapshot.cockpitOutreachHistoryPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
              >
                <p className="font-medium text-text">
                  {row.targetName}
                  <span className="font-normal text-textSoft"> · {row.company}</span>
                </p>
                <p className="text-[10px] text-textMuted">
                  {row.status} · {formatPeekDue(row.loggedAt)}
                </p>
                {row.summaryPreview ? (
                  <p className="mt-1 text-[10px] leading-snug text-textMuted">
                    {row.summaryPreview}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    primeChat(`add note: outreach log — ${row.targetName} (${row.company})`)
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
    </div>
    {snapshot.cockpitOpportunityPeek.length > 0 ? (
      <div className="mt-3 border-t border-border/25 pt-3">
        <p className="text-[11px] font-medium text-textSoft">Opportunities in workspace</p>
        <span className="sr-only">
          Read-only peek. Agent stage updates still apply to the first active deal unless you name
          fields in Chat.
        </span>
        <ul className="mt-2 space-y-2">
          {snapshot.cockpitOpportunityPeek.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border/30 bg-surface/50 px-2 py-2 text-[11px] text-textMuted"
            >
              <p className="font-medium text-text">
                {row.name}
                <span className="font-normal text-textSoft"> · {row.company}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-textMuted">
                {row.status}
                {row.nextAction ? ` · ${row.nextAction}` : ''}
              </p>
              <div className="mt-2">
                <button
                  type="button"
                  disabled={commandBusy}
                  onClick={() =>
                    primeChat(`add note: review deal ${row.company} — ${row.name} (${row.status})`)
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
  </section>
);
