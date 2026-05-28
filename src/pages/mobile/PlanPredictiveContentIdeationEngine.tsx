import clsx from 'clsx';
import {
  FileText,
  Hash,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import type {
  ContentIdeationItem,
  ContentIdeationKind,
  ContentIdeationSource
} from '../../services/plan/predictiveContentIdeationEngine';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

const SOURCE_LABELS: Record<ContentIdeationSource, string> = {
  profession: 'Profession',
  behavior: 'Behavior',
  'connected-platforms': 'Platforms',
  'recent-outputs': 'Recent outputs',
  'audience-patterns': 'Audience',
  'engagement-data': 'Engagement'
};

function kindIcon(kind: ContentIdeationKind) {
  switch (kind) {
    case 'campaign':
      return Target;
    case 'thread-structure':
      return MessageSquareText;
    case 'creator-series':
      return Sparkles;
    case 'audience-hook':
      return Hash;
    case 'trend-opportunity':
      return TrendingUp;
    case 'post-idea':
      return FileText;
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
        <p className="mt-1 text-fine text-textMuted">No evidence yet.</p>
      )}
    </div>
  );
}

function IdeaCard({
  item,
  btnFocus,
  disabled,
  runCommand,
  onConvertToPlan
}: {
  item: ContentIdeationItem;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onConvertToPlan?: (item: ContentIdeationItem) => void;
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
            {item.kind.replace('-', ' ')}
          </p>
          <h3 id={`${item.id}-heading`} className="mt-1 text-label font-semibold text-text">
            {item.title}
          </h3>
          <p className="mt-1 text-meta leading-snug text-textMuted">{item.idea}</p>
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
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">Why now</p>
          <p className="mt-1 text-fine leading-snug text-textMuted">{item.whyNow}</p>
        </div>
        <MiniList label="Evidence used" items={item.evidenceUsed} />
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
        <span className="rounded-full border border-border/35 bg-bgElevated px-2 py-1 text-fine text-textMuted">
          {item.suggestedFormat}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(item.askToPlanCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          Ask for PLAN preview
        </button>
        {onConvertToPlan ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onConvertToPlan(item)}
            className={clsx('rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 font-semibold text-primary disabled:opacity-45', btnFocus)}
          >
            Convert ideation to PLAN
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function PlanPredictiveContentIdeationEngine({
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
  onConvertToPlan?: (item: ContentIdeationItem) => void;
}) {
  const readout = snapshot.predictiveContentIdeationEngine;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const activeSources = (Object.keys(readout.sourceCoverage) as ContentIdeationSource[]).filter(
    (source) => readout.sourceCoverage[source] > 0
  );

  return (
    <section
      id="plan-predictive-content-ideation"
      className="scroll-mt-28 rounded-2xl border border-info/30 bg-infoSoft/10 p-3.5"
      aria-labelledby="plan-predictive-content-ideation-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-info">
            <Sparkles className="h-4 w-4" aria-hidden />
            Predictive Content Ideation Engine
          </p>
          <h2 id="plan-predictive-content-ideation-heading" className="mt-1 text-h3 text-text">
            Themes, posts, campaigns, threads, series, hooks, and trends
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps uses profession, behavior, connected platforms, recent outputs, audience
            patterns, and engagement data where available to generate PLAN-ready content ideas.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {readout.allIdeas.length} ideas · {readout.averageConfidence}% avg
        </span>
      </div>
      <p className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        {readout.headline} {readout.approvalPolicy}
      </p>
      {activeSources.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Content ideation source coverage">
          {activeSources.map((source) => (
            <span
              key={source}
              className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
            >
              {SOURCE_LABELS[source]} · {readout.sourceCoverage[source]}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid gap-2">
        {readout.allIdeas.map((item) => (
          <IdeaCard
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

