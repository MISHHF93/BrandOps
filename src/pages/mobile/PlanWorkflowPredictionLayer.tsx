import clsx from 'clsx';
import { LayoutTemplate, Pencil, Repeat2, Save, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import type { WorkflowPrediction } from '../../services/plan/workflowPredictionLayer';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';

function confidenceTone(confidence: number): string {
  if (confidence >= 80) return 'border-success/45 bg-successSoft/20 text-success';
  if (confidence >= 65) return 'border-info/45 bg-infoSoft/20 text-info';
  if (confidence >= 45) return 'border-warning/45 bg-warningSoft/20 text-warning';
  return 'border-border/45 bg-bgSubtle/70 text-textMuted';
}

function kindLabel(kind: WorkflowPrediction['kind']): string {
  switch (kind) {
    case 'repeated-outreach':
      return 'Repeated outreach';
    case 'repeated-scheduling':
      return 'Repeated scheduling';
    case 'repeated-planning':
      return 'Repeated planning';
    case 'repeated-creator-workflow':
      return 'Repeated creator workflow';
    case 'repeated-content-pipeline':
      return 'Repeated content pipeline';
    default:
      return 'Repeated workflow';
  }
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
        <p className="mt-1 text-fine text-textMuted">No signals yet.</p>
      )}
    </div>
  );
}

function WorkflowCard({
  prediction,
  btnFocus,
  disabled,
  runCommand,
  onConvertToPlan
}: {
  prediction: WorkflowPrediction;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onConvertToPlan?: (prediction: WorkflowPrediction) => void;
}) {
  return (
    <article
      className="rounded-xl border border-border/45 bg-bgElevated/60 p-3"
      aria-labelledby={`${prediction.id}-heading`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-primary">
            <Workflow className="h-3.5 w-3.5" aria-hidden />
            {kindLabel(prediction.kind)}
          </p>
          <h3 id={`${prediction.id}-heading`} className="mt-1 text-label font-semibold text-text">
            {prediction.title}
          </h3>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            {prediction.repeatedPattern}
          </p>
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

      <p className="mt-3 rounded-lg border border-primary/25 bg-primarySoft/10 px-2.5 py-2 text-meta font-semibold text-primary">
        {prediction.suggestion}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniList label="Evidence" items={prediction.evidence} />
        <MiniList label="Triggers" items={prediction.triggerSignals} />
        <MiniList label="Workflow steps" items={prediction.recommendedSteps} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(prediction.controls.saveCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <Save className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Save
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(prediction.controls.editCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <Pencil className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Edit
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(prediction.controls.reuseCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <Repeat2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Reuse
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(prediction.controls.templateCommand)}
          className={clsx('rounded-lg border border-border/45 bg-surface/60 px-2.5 py-1.5 font-semibold text-text disabled:opacity-45', btnFocus)}
        >
          <LayoutTemplate className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Template
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void runCommand(prediction.controls.automateWithApprovalsCommand)}
          className={clsx('rounded-lg border border-success/40 bg-successSoft/15 px-2.5 py-1.5 font-semibold text-success disabled:opacity-45', btnFocus)}
        >
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Automate with approvals
        </button>
        {onConvertToPlan ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onConvertToPlan(prediction)}
            className={clsx('rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-1.5 font-semibold text-primary disabled:opacity-45', btnFocus)}
          >
            Convert to PLAN workflow
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function PlanWorkflowPredictionLayer({
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
  onConvertToPlan?: (prediction: WorkflowPrediction) => void;
}) {
  const readout = snapshot.workflowPredictionLayer;
  const disabled = commandBusy || !canRunWorkspaceCommands;
  const activeSources = Object.entries(readout.sourceCoverage).filter(([, count]) => count > 0);

  return (
    <section
      id="plan-workflow-prediction-layer"
      className="scroll-mt-28 rounded-2xl border border-info/30 bg-infoSoft/10 p-3.5"
      aria-labelledby="plan-workflow-prediction-layer-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-[0.14em] text-info">
            <Sparkles className="h-4 w-4" aria-hidden />
            Workflow Prediction Layer
          </p>
          <h2 id="plan-workflow-prediction-layer-heading" className="mt-1 text-h3 text-text">
            Repeated operations into reusable workflows
          </h2>
          <p className="mt-1 text-meta leading-snug text-textMuted">
            BrandOps detects repeated outreach, scheduling, planning, creator workflows, and content
            pipelines, then asks before saving, reusing, templating, or automating.
          </p>
        </div>
        <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
          {readout.predictions.length} predictions · {readout.averageConfidence}% avg
        </span>
      </div>

      <p className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
        {readout.headline} {readout.approvalPolicy}
      </p>

      {activeSources.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Workflow prediction source coverage">
          {activeSources.map(([source, count]) => (
            <span
              key={source}
              className="rounded-full border border-border/35 bg-bgSubtle/65 px-2 py-1 text-fine text-textMuted"
            >
              {source.replace('-', ' ')} · {count}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {readout.predictions.length ? (
          readout.predictions.map((prediction) => (
            <WorkflowCard
              key={prediction.id}
              prediction={prediction}
              btnFocus={btnFocus}
              disabled={disabled}
              runCommand={runCommand}
              onConvertToPlan={onConvertToPlan}
            />
          ))
        ) : (
          <p className="rounded-xl border border-border/35 bg-bgElevated/55 px-3 py-2 text-meta leading-snug text-textMuted">
            No repeated operational workflow is strong enough yet. BrandOps will watch for repeated
            outreach, scheduling, planning, creator, and content pipeline behavior.
          </p>
        )}
      </div>
    </section>
  );
}

