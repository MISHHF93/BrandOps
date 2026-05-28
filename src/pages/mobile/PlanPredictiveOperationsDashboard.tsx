import clsx from 'clsx';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bot,
  BrainCircuit,
  Briefcase,
  Layers3,
  Lightbulb,
  Radio,
  Rocket,
  ShieldCheck,
  Workflow,
  Zap
} from 'lucide-react';
import type {
  PredictiveOperationsItem,
  PredictiveOperationsKind,
  PredictiveOperationsUrgency
} from '../../services/plan/predictiveOperationsDashboard';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

function urgencyTone(urgency: PredictiveOperationsUrgency): string {
  switch (urgency) {
    case 'critical':
      return 'border-danger/45 bg-dangerSoft/20 text-danger';
    case 'high':
      return 'border-warning/45 bg-warningSoft/20 text-warning';
    case 'medium':
      return 'border-info/45 bg-infoSoft/20 text-info';
    default:
      return 'border-border/45 bg-bgSubtle/70 text-textMuted';
  }
}

function kindIcon(kind: PredictiveOperationsKind) {
  switch (kind) {
    case 'opportunity':
      return Briefcase;
    case 'predicted-need':
      return BrainCircuit;
    case 'suggested-workflow':
      return Workflow;
    case 'pending-approval':
      return ShieldCheck;
    case 'operational-bottleneck':
      return AlertTriangle;
    case 'growth-recommendation':
      return Rocket;
    case 'platform-insight':
      return Layers3;
    default:
      return Bot;
  }
}

function kindLabel(kind: PredictiveOperationsKind): string {
  return kind.replace(/-/g, ' ');
}

function MiniSignalList({ signals }: { signals: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1" aria-label="Supporting signals">
      {signals.slice(0, 4).map((signal) => (
        <li
          key={signal}
          className="line-clamp-1 rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-0.5 text-fine text-textMuted"
        >
          {signal}
        </li>
      ))}
    </ul>
  );
}

function OperationCard({
  item,
  btnFocus,
  disabled,
  runCommand
}: {
  item: PredictiveOperationsItem;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  const Icon = kindIcon(item.kind);
  return (
    <article className="rounded-xl border border-border/45 bg-bgElevated/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {kindLabel(item.kind)}
          </p>
          <h3 className="mt-1 text-label font-semibold text-text">{item.title}</h3>
          <p className="mt-1 line-clamp-3 text-meta leading-snug text-textMuted">{item.detail}</p>
        </div>
        <span
          className={clsx(
            'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
            urgencyTone(item.urgency)
          )}
        >
          {item.urgency} · {item.confidence}%
        </span>
      </div>
      <MiniSignalList signals={item.signals} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-fine font-semibold uppercase tracking-wide text-textSoft">
          {item.sourceLabel}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(item.command)}
          className={clsx(
            'rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 text-meta font-semibold text-primary disabled:opacity-45',
            btnFocus
          )}
        >
          Review next action
        </button>
      </div>
    </article>
  );
}

function Lane({
  title,
  items,
  btnFocus,
  disabled,
  runCommand,
  empty
}: {
  title: string;
  items: PredictiveOperationsItem[];
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-border/35 bg-bgSubtle/35 p-3" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label font-semibold text-text">{title}</h3>
        <span className="rounded-full border border-border/35 bg-bgElevated px-2 py-0.5 text-fine font-semibold text-textMuted">
          {items.length}
        </span>
      </div>
      <div className="mt-2 grid gap-2">
        {items.length ? (
          items.slice(0, 3).map((item) => (
            <OperationCard
              key={item.id}
              item={item}
              btnFocus={btnFocus}
              disabled={disabled}
              runCommand={runCommand}
            />
          ))
        ) : (
          <p className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta text-textMuted">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}

export function PlanPredictiveOperationsDashboard({
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
  const dashboard = snapshot.predictiveOperationsDashboard;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const topActions = dashboard.nextBestActions.slice(0, 3);

  return (
    <section
      id="plan-pulse"
      className="scroll-mt-28 rounded-3xl border border-primary/30 bg-primarySoft/10 p-3.5"
      aria-labelledby="plan-pulse-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-primary">
            <Radio className="h-4 w-4" aria-hidden />
            Predictive Operations Dashboard
          </p>
          <h2 id="plan-pulse-heading" className="mt-1 text-h3 text-text">
            Pulse is watching the operating system
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            {dashboard.headline} {dashboard.stateLine}
          </p>
        </div>
        <div className="rounded-2xl border border-border/45 bg-bgElevated/75 px-3 py-2 text-center">
          <p className="flex items-center justify-center gap-1 text-fine font-semibold uppercase tracking-wide text-textSoft">
            <Activity className="h-3.5 w-3.5 text-success" aria-hidden />
            Live score
          </p>
          <p className="mt-1 text-h2 text-text">{dashboard.liveScore}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">Urgent</p>
          <p className="mt-1 text-h3 text-text">{dashboard.urgentCount}</p>
        </div>
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">Approvals</p>
          <p className="mt-1 text-h3 text-text">{dashboard.approvalCount}</p>
        </div>
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">Platforms</p>
          <p className="mt-1 text-h3 text-text">{dashboard.platformInsightCount}</p>
        </div>
        <div className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">Next actions</p>
          <p className="mt-1 text-h3 text-text">{dashboard.nextBestActions.length}</p>
        </div>
      </div>

      <section className="mt-3 rounded-2xl border border-success/30 bg-successSoft/10 p-3" aria-label="AI-generated next best actions">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-success" aria-hidden />
          <h3 className="text-label font-semibold text-text">AI-generated next best actions</h3>
        </div>
        <div className="mt-2 grid gap-2">
          {topActions.length ? (
            topActions.map((item) => (
              <OperationCard
                key={item.id}
                item={item}
                btnFocus={btnFocus}
                disabled={disabled}
                runCommand={runCommand}
              />
            ))
          ) : (
            <p className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta text-textMuted">
              No next best action is strong enough yet. Pulse will light up as signals accumulate.
            </p>
          )}
        </div>
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Lane
          title="Opportunities"
          items={dashboard.opportunities}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="No high-fit opportunity signal yet."
        />
        <Lane
          title="Predicted needs"
          items={dashboard.predictedNeeds}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="No predicted need is ready for review."
        />
        <Lane
          title="Suggested workflows"
          items={dashboard.suggestedWorkflows}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="No repeated workflow has crossed the prediction threshold."
        />
        <Lane
          title="Pending approvals"
          items={dashboard.pendingApprovals}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="No approvals are blocking operations."
        />
        <Lane
          title="Operational bottlenecks"
          items={dashboard.operationalBottlenecks}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="No bottleneck needs attention right now."
        />
        <Lane
          title="Growth recommendations"
          items={dashboard.growthRecommendations}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="No growth recommendation is ready yet."
        />
        <Lane
          title="Platform insights"
          items={dashboard.platformInsights}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="Connect or approve platform summaries to activate platform insight."
        />
        <Lane
          title="All live signals"
          items={dashboard.allItems}
          btnFocus={btnFocus}
          disabled={disabled}
          runCommand={runCommand}
          empty="Pulse is quiet."
        />
      </div>

      <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-fine leading-snug text-textMuted">
        <BadgeCheck className="h-3.5 w-3.5 text-success" aria-hidden />
        Pulse is predictive, not autonomous. Every next action remains reviewable and approval-gated.
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-fine text-textSoft">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden />
        Last generated {new Date(dashboard.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
      </p>
    </section>
  );
}

