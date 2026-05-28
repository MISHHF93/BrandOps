import clsx from 'clsx';
import { RefreshCw, ShieldCheck, Sparkles, Target } from 'lucide-react';
import type { PositioningStatement } from '../../services/plan/positioningIntelligence';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

function confidenceTone(confidence: number): string {
  if (confidence >= 80) return 'border-success/45 bg-successSoft/20 text-success';
  if (confidence >= 65) return 'border-info/45 bg-infoSoft/20 text-info';
  if (confidence >= 45) return 'border-warning/45 bg-warningSoft/20 text-warning';
  return 'border-border/45 bg-bgSubtle/70 text-textMuted';
}

function MiniList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
      <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">{label}</p>
      {items.length ? (
        <ul className="mt-1 space-y-1 text-fine leading-snug text-textMuted">
          {items.slice(0, 5).map((item) => (
            <li key={item} className="line-clamp-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-fine text-textMuted">No evidence yet.</p>
      )}
    </div>
  );
}

function StatementCard({ statement }: { statement: PositioningStatement }) {
  return (
    <article
      className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
      aria-labelledby={`${statement.id}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-primary">
            <Target className="h-3.5 w-3.5" aria-hidden />
            {statement.label}
          </p>
          <h3 id={`${statement.id}-heading`} className="mt-1 text-label font-semibold text-text">
            {statement.statement}
          </h3>
        </div>
        <span
          className={clsx(
            'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
            confidenceTone(statement.confidence)
          )}
        >
          {statement.confidence}% confidence
        </span>
      </div>
      <MiniList label="Evidence used" items={statement.evidenceUsed} />
    </article>
  );
}

export function PlanPositioningIntelligence({
  snapshot,
  btnFocus,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  const readout = snapshot.positioningIntelligence;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const evidenceRows = Object.entries(readout.evidenceUsed).filter(([, items]) => items.length > 0);

  return (
    <section
      id="plan-positioning-intelligence"
      className="scroll-mt-28 rounded-2xl border border-info/30 bg-infoSoft/10 p-3.5"
      aria-labelledby="plan-positioning-intelligence-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-info">
            <Sparkles className="h-4 w-4" aria-hidden />
            Positioning Intelligence
          </p>
          <h2 id="plan-positioning-intelligence-heading" className="mt-1 text-h3 text-text">
            Positioning, value props, niches, and differentiation
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps analyzes user background, skills, industry, audience, content, goals, and
            competitor/category signals when available. Outputs remain review-only until approved.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {readout.positioningStatements.length} paths · {readout.averageConfidence}% avg
        </span>
      </div>

      <p className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        {readout.headline} {readout.approvalPolicy}
      </p>

      <div className="mt-3 grid gap-2">
        {readout.positioningStatements.map((statement) => (
          <StatementCard key={statement.id} statement={statement} />
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <MiniList label="Value propositions" items={readout.valuePropositions} />
        <MiniList label="Niche opportunities" items={readout.nicheOpportunities} />
        <MiniList label="Differentiation angles" items={readout.differentiationAngles} />
        <MiniList label="Competitor/category signals" items={readout.competitorSignals} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Creator positioning
          </p>
          <p className="mt-1 text-fine leading-snug text-textMuted">
            {readout.creatorPositioning}
          </p>
        </div>
        <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Founder positioning
          </p>
          <p className="mt-1 text-fine leading-snug text-textMuted">
            {readout.founderPositioning}
          </p>
        </div>
        <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Professional positioning
          </p>
          <p className="mt-1 text-fine leading-snug text-textMuted">
            {readout.professionalPositioning}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <MiniList label="Strengths" items={readout.strengths} />
        <MiniList label="Gaps" items={readout.gaps} />
      </div>

      {evidenceRows.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {evidenceRows.map(([source, items]) => (
            <MiniList key={source} label={`${source} evidence`} items={items} />
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(readout.reviewCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          Review positioning
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(readout.regenerateCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Regenerate
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(readout.approveCommand)}
          className={clsx('rounded-lg border border-success/40 bg-successSoft/15 px-2.5 py-1.5 font-semibold text-success disabled:opacity-45', btnFocus)}
        >
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Approve
        </button>
      </div>
    </section>
  );
}

