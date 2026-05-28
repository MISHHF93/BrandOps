import clsx from 'clsx';
import { Activity, Lightbulb, ShieldCheck } from 'lucide-react';
import type {
  BehavioralPattern,
  BehavioralPrediction,
  BehavioralSignalSource
} from '../../services/intelligence/behavioralIntelligenceEngine';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

const SOURCE_LABELS: Record<BehavioralSignalSource, string> = {
  'user-actions': 'User actions',
  'ask-behavior': 'ASK',
  'plan-behavior': 'PLAN',
  'connected-platforms': 'Platforms',
  workflows: 'Workflows',
  'repeated-tasks': 'Repeated tasks',
  'operational-timing': 'Timing',
  'content-patterns': 'Content',
  'outreach-patterns': 'Outreach',
  'scheduling-behavior': 'Scheduling'
};

function confidenceTone(confidence: number): string {
  if (confidence >= 80) return 'border-success/45 bg-successSoft/20 text-success';
  if (confidence >= 65) return 'border-info/45 bg-infoSoft/20 text-info';
  if (confidence >= 45) return 'border-warning/45 bg-warningSoft/20 text-warning';
  return 'border-border/45 bg-bgSubtle/70 text-textMuted';
}

function PredictionCard({
  prediction,
  btnFocus,
  disabled,
  runCommand
}: {
  prediction: BehavioralPrediction;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
}) {
  return (
    <article
      className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
      aria-labelledby={`${prediction.id}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-info">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            {prediction.type.replace('-', ' ')}
          </p>
          <h3 id={`${prediction.id}-heading`} className="mt-1 text-label font-semibold text-text">
            {prediction.title}
          </h3>
          <p className="mt-1 text-meta leading-snug text-textMuted">{prediction.rationale}</p>
        </div>
        <span
          className={clsx(
            'rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
            confidenceTone(prediction.confidence)
          )}
        >
          {prediction.confidence}% confidence
        </span>
      </div>

      <p className="mt-3 rounded-lg border border-warning/35 bg-warningSoft/15 px-2.5 py-2 text-fine leading-snug text-warning">
        {prediction.approvalGate}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(prediction.suggestedCommand)}
          className={clsx(
            'rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45',
            btnFocus
          )}
        >
          Review prediction
        </button>
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

function PatternRow({ pattern }: { pattern: BehavioralPattern }) {
  return (
    <article className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
            {pattern.kind.replace('-', ' ')}
          </p>
          <h3 className="mt-0.5 text-meta font-semibold text-text">{pattern.label}</h3>
        </div>
        <span className="rounded-full border border-border/35 bg-bgElevated px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
          {pattern.confidence}%
        </span>
      </div>
      <ul className="mt-1.5 space-y-1 text-fine leading-snug text-textMuted">
        {pattern.evidence.slice(0, 3).map((item) => (
          <li key={item} className="line-clamp-2">
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PlanBehavioralIntelligenceEngine({
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
  const engine = snapshot.behavioralIntelligenceEngine;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const activeSources = (Object.keys(engine.signalCoverage) as BehavioralSignalSource[]).filter(
    (source) => engine.signalCoverage[source] > 0
  );

  return (
    <section
      id="plan-behavioral-intelligence-engine"
      className="scroll-mt-28 rounded-2xl border border-info/30 bg-infoSoft/10 p-3.5"
      aria-labelledby="plan-behavioral-intelligence-engine-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-info">
            <Activity className="h-4 w-4" aria-hidden />
            Behavioral Intelligence Engine
          </p>
          <h2 id="plan-behavioral-intelligence-engine-heading" className="mt-1 text-h3 text-text">
            Pattern-aware next actions
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps detects local operational patterns across actions, ASK, PLAN, connected
            platforms, workflows, repeated tasks, timing, content, outreach, and scheduling. Every
            prediction is review-only until you approve it.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {engine.predictions.length} prediction{engine.predictions.length === 1 ? '' : 's'} ·{' '}
          {engine.averageConfidence}% avg
        </span>
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        {engine.headline} {engine.approvalPolicy}
      </p>

      {activeSources.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Behavioral signal coverage">
          {activeSources.map((source) => (
            <span
              key={source}
              className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
            >
              {SOURCE_LABELS[source]} · {engine.signalCoverage[source]}
            </span>
          ))}
        </div>
      ) : null}

      {engine.predictions.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/45 px-3 py-2 text-meta text-textMuted">
          No predictions yet. Use ASK, create PLAN approvals, connect platform context, or add
          workflow activity to generate grounded suggestions.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {engine.predictions.slice(0, 4).map((prediction) => (
            <PredictionCard
              key={prediction.id}
              prediction={prediction}
              btnFocus={btnFocus}
              disabled={disabled}
              runCommand={runCommand}
            />
          ))}
        </div>
      )}

      {engine.patterns.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {engine.patterns.slice(0, 4).map((pattern) => (
            <PatternRow key={pattern.id} pattern={pattern} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

