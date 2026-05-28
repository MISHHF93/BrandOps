import clsx from 'clsx';
import {
  CalendarClock,
  GitBranch,
  Handshake,
  Lightbulb,
  Mail,
  Megaphone,
  ShieldAlert
} from 'lucide-react';
import type {
  OpportunityEngineKind,
  OpportunityEngineSuggestion
} from '../../services/plan/opportunityEngine';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

function kindLabel(kind: OpportunityEngineKind): string {
  switch (kind) {
    case 'outreach':
      return 'Outreach opportunity';
    case 'content':
      return 'Content opportunity';
    case 'scheduling':
      return 'Scheduling improvement';
    case 'operational-bottleneck':
      return 'Operational bottleneck';
    case 'partnership':
      return 'Partnership opportunity';
    case 'workflow-optimization':
      return 'Workflow optimization';
    default:
      return 'Opportunity';
  }
}

function kindIcon(kind: OpportunityEngineKind) {
  switch (kind) {
    case 'outreach':
      return Mail;
    case 'content':
      return Megaphone;
    case 'scheduling':
      return CalendarClock;
    case 'operational-bottleneck':
      return ShieldAlert;
    case 'partnership':
      return Handshake;
    case 'workflow-optimization':
      return GitBranch;
    default:
      return Lightbulb;
  }
}

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
        <p className="mt-1 text-fine text-textMuted">None connected.</p>
      )}
    </div>
  );
}

function SuggestionCard({
  item,
  btnFocus,
  disabled,
  runCommand
}: {
  item: OpportunityEngineSuggestion;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  const Icon = kindIcon(item.kind);
  return (
    <article
      className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
      aria-labelledby={`${item.id}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {kindLabel(item.kind)}
          </p>
          <h3 id={`${item.id}-heading`} className="mt-1 text-label font-semibold text-text">
            {item.title}
          </h3>
          <p className="mt-1 text-meta leading-snug text-textMuted">{item.recommendation}</p>
        </div>
        <span
          className={clsx(
            'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
            confidenceTone(item.confidence)
          )}
        >
          {item.confidence}% confidence
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniList label="Source context" items={item.sourceContext} />
        <MiniList label="Platform context" items={item.platformContext} />
        <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Expected impact
          </p>
          <p className="mt-1 text-fine leading-snug text-textMuted">{item.expectedImpact}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textMuted">
        <span className="font-semibold text-text">Profession:</span> {item.professionContext}
        <br />
        <span className="font-semibold text-text">Twin:</span> {item.twinContext}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(item.previewCommand)}
          className={clsx(
            'rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45',
            btnFocus
          )}
        >
          Turn into PLAN
        </button>
        <a
          href="#plan-unified-inbox"
          className={clsx(
            'rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 font-semibold text-primary',
            btnFocus
          )}
        >
          Inbox
        </a>
        <a
          href="#plan-human-approval-queue"
          className={clsx(
            'rounded-lg border border-warning/40 bg-warningSoft/15 px-2.5 py-1.5 font-semibold text-warning',
            btnFocus
          )}
        >
          Approval gate
        </a>
      </div>
    </article>
  );
}

export function PlanOpportunityEngine({
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
  const engine = snapshot.opportunityEngine;
  const disabled = commandBusy || !canRunWorkspaceCommands;

  return (
    <section
      id="plan-opportunity-engine"
      className="scroll-mt-28 rounded-2xl border border-info/30 bg-infoSoft/10 p-3.5"
      aria-labelledby="plan-opportunity-engine-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-info">
            <Lightbulb className="h-4 w-4" aria-hidden />
            Opportunity Engine
          </p>
          <h2 id="plan-opportunity-engine-heading" className="mt-1 text-h3 text-text">
            Profession-aware opportunities
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps combines connected platform context, twin memory, profile positioning, and
            workflow state to suggest outreach, content, scheduling, partnership, and optimization
            opportunities.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {engine.totalCount} suggestion{engine.totalCount === 1 ? '' : 's'} ·{' '}
          {engine.averageConfidence}% avg
        </span>
      </div>

      <p className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        {engine.headline} Suggestions are previews only. External outreach, publishing, scheduling,
        syncing, and CRM updates still require approval.
      </p>

      {engine.suggestions.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          No opportunities detected yet. Create a twin, connect platforms, or add workspace activity
          to generate grounded suggestions.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {engine.suggestions.map((item) => (
            <SuggestionCard
              key={item.id}
              item={item}
              btnFocus={btnFocus}
              disabled={disabled}
              runCommand={runCommand}
            />
          ))}
        </div>
      )}
    </section>
  );
}
