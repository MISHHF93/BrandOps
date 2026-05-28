import clsx from 'clsx';
import { GitCompareArrows, Pencil, RefreshCw, ShieldCheck, Target, Users } from 'lucide-react';
import type { BuyerPersona } from '../../services/plan/buyerPersonaIntelligence';
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
          {items.slice(0, 4).map((item) => (
            <li key={item} className="line-clamp-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-fine text-textMuted">No signal yet.</p>
      )}
    </div>
  );
}

function PersonaCard({ persona }: { persona: BuyerPersona }) {
  return (
    <article
      className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
      aria-labelledby={`${persona.id}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-primary">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {persona.role}
          </p>
          <h3 id={`${persona.id}-heading`} className="mt-1 text-label font-semibold text-text">
            {persona.name}
          </h3>
          <p className="mt-1 text-meta leading-snug text-textMuted">{persona.segment}</p>
          <p className="mt-2 text-meta leading-snug text-textMuted">{persona.coreNeed}</p>
        </div>
        <span
          className={clsx(
            'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
            confidenceTone(persona.confidence)
          )}
        >
          {persona.confidence}% confidence
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniList label="Objections" items={persona.objections} />
        <MiniList label="Proof needed" items={persona.proofNeeded} />
        <MiniList label="Best channels" items={persona.bestChannels} />
      </div>
      <p className="mt-3 rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textMuted">
        <span className="font-semibold text-text">Recommended message:</span>{' '}
        {persona.recommendedMessage}
      </p>
    </article>
  );
}

export function PlanBuyerPersonaIntelligence({
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
  const readout = snapshot.buyerPersonaIntelligence;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const icp = readout.idealCustomerProfile;
  const coverage = Object.entries(readout.sourceCoverage).filter(([, count]) => count > 0);

  return (
    <section
      id="plan-buyer-persona-intelligence"
      className="scroll-mt-28 rounded-2xl border border-primary/30 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-buyer-persona-intelligence-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <Target className="h-4 w-4" aria-hidden />
            Buyer Persona Intelligence
          </p>
          <h2 id="plan-buyer-persona-intelligence-heading" className="mt-1 text-h3 text-text">
            ICP, personas, audience fit, and resonance
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps uses uploaded profile/resume context, connected platforms, generated content,
            outreach patterns, audience behavior, and profession context to draft buyer intelligence
            that can be edited, approved, regenerated, or compared.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {readout.buyerPersonas.length} personas · {readout.averageConfidence}% avg
        </span>
      </div>

      <p className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        {readout.headline} {readout.approvalPolicy}
      </p>

      {coverage.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Buyer persona source coverage">
          {coverage.map(([source, count]) => (
            <span
              key={source}
              className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
            >
              {source.replace('-', ' ')} · {count}
            </span>
          ))}
        </div>
      ) : null}

      <article className="mt-3 rounded-xl border border-border/45 bg-bgElevated/60 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-fine font-semibold uppercase tracking-wide text-primary">
              Ideal customer profile
            </p>
            <h3 className="mt-1 text-label font-semibold text-text">{icp.title}</h3>
            <p className="mt-1 text-meta leading-snug text-textMuted">{icp.summary}</p>
          </div>
          <span
            className={clsx(
              'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
              confidenceTone(icp.confidence)
            )}
          >
            {icp.confidence}% confidence
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <MiniList label="Firmographics" items={icp.firmographics} />
          <MiniList label="Pains" items={icp.pains} />
          <MiniList label="Buying triggers" items={icp.buyingTriggers} />
          <MiniList label="Disqualifiers" items={icp.disqualifiers} />
        </div>
      </article>

      <div className="mt-3 grid gap-2">
        {readout.buyerPersonas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <MiniList label="Audience segments" items={readout.audienceSegments} />
        <MiniList label="Communication recommendations" items={readout.communicationRecommendations} />
        <MiniList label="Outreach angles" items={readout.outreachAngles} />
        <MiniList label="Content resonance suggestions" items={readout.contentResonanceSuggestions} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {readout.versions.map((version) => (
          <article key={version.id} className="rounded-lg border border-border/35 bg-bgSubtle/45 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-label font-semibold text-text">{version.label}</p>
                <p className="mt-1 text-fine leading-snug text-textMuted">{version.summary}</p>
              </div>
              <span className="rounded-full border border-border/35 bg-bgElevated px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                {version.confidence}%
              </span>
            </div>
            <MiniList label="Changes" items={version.changes} />
          </article>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(readout.editCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Edit
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
          onClick={() => void runCommand(readout.compareVersionsCommand)}
          className={clsx('rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 font-semibold text-primary disabled:opacity-45', btnFocus)}
        >
          <GitCompareArrows className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Compare versions
        </button>
      </div>
    </section>
  );
}

