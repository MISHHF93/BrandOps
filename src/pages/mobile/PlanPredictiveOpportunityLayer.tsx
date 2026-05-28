import clsx from 'clsx';
import {
  BarChart3,
  CalendarClock,
  FileText,
  Lightbulb,
  Mail,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import type {
  PredictiveOpportunityKind,
  PredictiveOpportunitySource,
  PredictiveOpportunitySuggestion
} from '../../services/plan/predictiveOpportunityLayer';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

const SOURCE_LABELS: Record<PredictiveOpportunitySource, string> = {
  profession: 'Profession',
  'twin-profile': 'Twin profile',
  'connected-platforms': 'Platforms',
  'recent-actions': 'Recent actions',
  'behavioral-history': 'Behavior',
  'memory-patterns': 'Memory'
};

function kindLabel(kind: PredictiveOpportunityKind): string {
  switch (kind) {
    case 'buyer-persona-generation':
      return 'Buyer persona';
    case 'positioning-analysis':
      return 'Positioning';
    case 'outreach-opportunity':
      return 'Outreach';
    case 'content-ideation':
      return 'Content ideation';
    case 'workflow-optimization':
      return 'Workflow';
    case 'operational-improvement':
      return 'Operations';
    case 'follow-up-suggestion':
      return 'Follow-up';
    case 'growth-opportunity':
      return 'Growth';
    case 'scheduling-improvement':
      return 'Scheduling';
    default:
      return 'Opportunity';
  }
}

function kindIcon(kind: PredictiveOpportunityKind) {
  switch (kind) {
    case 'buyer-persona-generation':
      return Users;
    case 'positioning-analysis':
      return Target;
    case 'outreach-opportunity':
      return Mail;
    case 'content-ideation':
      return FileText;
    case 'workflow-optimization':
      return Route;
    case 'operational-improvement':
      return BarChart3;
    case 'follow-up-suggestion':
      return Mail;
    case 'growth-opportunity':
      return TrendingUp;
    case 'scheduling-improvement':
      return CalendarClock;
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
        <p className="mt-1 text-fine text-textMuted">No supporting signal attached.</p>
      )}
    </div>
  );
}

function OpportunityCard({
  item,
  btnFocus,
  disabled,
  runCommand,
  onConvertToPlan
}: {
  item: PredictiveOpportunitySuggestion;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onConvertToPlan?: (suggestion: PredictiveOpportunitySuggestion) => void;
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
          <p className="mt-1 text-meta leading-snug text-textMuted">{item.suggestion}</p>
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
        <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Why this appeared
          </p>
          <p className="mt-1 text-fine leading-snug text-textMuted">{item.whyThisAppeared}</p>
        </div>
        <MiniList label="Supporting signals" items={item.supportingSignals} />
        <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            Expected impact
          </p>
          <p className="mt-1 text-fine leading-snug text-textMuted">{item.expectedImpact}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Generated from">
        {item.generatedFrom.map((source) => (
          <span
            key={source}
            className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
          >
            {SOURCE_LABELS[source]}
          </span>
        ))}
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
          Review in PLAN
        </button>
        {onConvertToPlan ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onConvertToPlan(item)}
            className={clsx(
              'rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 font-semibold text-primary disabled:opacity-45',
              btnFocus
            )}
          >
            Convert this into a reusable operational plan
          </button>
        ) : null}
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

export function PlanPredictiveOpportunityLayer({
  snapshot,
  btnFocus,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand,
  onConvertToPlan
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onConvertToPlan?: (suggestion: PredictiveOpportunitySuggestion) => void;
}) {
  const layer = snapshot.predictiveOpportunityLayer;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const activeSources = (Object.keys(layer.sourceCoverage) as PredictiveOpportunitySource[]).filter(
    (source) => layer.sourceCoverage[source] > 0
  );

  return (
    <section
      id="plan-predictive-opportunity-layer"
      className="scroll-mt-28 rounded-2xl border border-primary/30 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-predictive-opportunity-layer-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            Predictive Opportunity Layer
          </p>
          <h2 id="plan-predictive-opportunity-layer-heading" className="mt-1 text-h3 text-text">
            Proactive growth and operating suggestions
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps combines profession, twin profile, connected platforms, recent actions,
            behavioral history, and memory patterns to suggest buyer personas, positioning,
            outreach, content, workflow, operations, follow-up, growth, and scheduling moves.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {layer.totalCount} suggestion{layer.totalCount === 1 ? '' : 's'} ·{' '}
          {layer.averageConfidence}% avg
        </span>
      </div>

      <p className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        {layer.headline} {layer.approvalPolicy}
      </p>

      {activeSources.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Predictive opportunity sources">
          {activeSources.map((source) => (
            <span
              key={source}
              className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
            >
              {SOURCE_LABELS[source]} · {layer.sourceCoverage[source]}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {layer.suggestions.map((item) => (
          <OpportunityCard
            key={item.id}
            item={item}
            btnFocus={btnFocus}
            disabled={disabled}
            runCommand={runCommand}
            onConvertToPlan={onConvertToPlan}
          />
        ))}
      </div>
    </section>
  );
}

