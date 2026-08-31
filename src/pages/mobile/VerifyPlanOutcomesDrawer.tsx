import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { CheckCircle2, HelpCircle, ShieldCheck, XCircle } from 'lucide-react';
import type { Plan } from '../../types/domain';
import type { VerifyStepOutcome } from '../../services/execution/planVerifier';

type StepDecision = 'achieved' | 'not-achieved';

export function VerifyPlanOutcomesDrawer({
  open,
  plan,
  busy,
  error,
  btnFocus,
  onCancel,
  onSubmit
}: {
  open: boolean;
  plan: Plan | null;
  busy: boolean;
  error: string | null;
  btnFocus: string;
  onCancel: () => void;
  onSubmit: (planId: string, outcomes: VerifyStepOutcome[]) => void;
}) {
  const [decisions, setDecisions] = useState<Record<string, StepDecision>>({});

  /** Clears stale per-step decisions when a different plan opens (or the drawer closes) so choices never leak across plans. */
  useEffect(() => {
    setDecisions({});
  }, [plan?.id, open]);

  if (!open || !plan) return null;

  const setDecision = (stepId: string, decision: StepDecision) => {
    setDecisions((current) => {
      const next = { ...current };
      if (next[stepId] === decision) {
        delete next[stepId];
      } else {
        next[stepId] = decision;
      }
      return next;
    });
  };

  const decidedCount = Object.keys(decisions).length;
  const canSubmit = decidedCount > 0 && !busy;

  const submit = () => {
    const outcomes: VerifyStepOutcome[] = Object.entries(decisions).map(([stepId, decision]) => ({
      stepId,
      achieved: decision === 'achieved'
    }));
    onSubmit(plan.id, outcomes);
  };

  return (
    <div
      className="bo-system-overlay fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-plan-outcomes-heading"
        className="bo-system-sheet max-h-[min(88vh,42rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-border/70 p-4 shadow-panel"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="bo-system-label text-primary">Verify outcomes</p>
            <h2 id="verify-plan-outcomes-heading" className="mt-1 text-h3 text-text">
              What actually happened for &ldquo;{plan.title}&rdquo;?
            </h2>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              BrandOps executed this plan internally — it performed no external side effects and
              cannot observe real-world results on its own. Confirm each step so the record reflects
              what actually happened. Verified outcomes feed back into your twin's memory, improving
              future predictions, recommendations, and planning.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={clsx(
              'rounded-lg border border-border/45 bg-bgSubtle/60 p-2 text-textMuted disabled:opacity-45',
              btnFocus
            )}
            aria-label="Cancel verification"
          >
            <XCircle className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {error ? (
          <p
            className="mt-3 rounded-xl border border-warning/40 bg-warningSoft/20 px-3 py-2 text-meta leading-snug text-warning"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-3 grid gap-2">
          {plan.steps.map((step) => {
            const decision = decisions[step.id];
            return (
              <div
                key={step.id}
                className="rounded-lg border border-border/30 bg-bgSubtle/45 px-2.5 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text">{step.title}</p>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                      decision === 'achieved'
                        ? 'border-success/45 bg-successSoft/15 text-success'
                        : decision === 'not-achieved'
                          ? 'border-danger/45 bg-dangerSoft/15 text-danger'
                          : 'border-border/40 text-textMuted'
                    )}
                  >
                    {decision === 'achieved' ? (
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                    ) : decision === 'not-achieved' ? (
                      <XCircle className="h-3 w-3" aria-hidden />
                    ) : (
                      <HelpCircle className="h-3 w-3" aria-hidden />
                    )}
                    {decision === 'achieved'
                      ? 'Achieved'
                      : decision === 'not-achieved'
                        ? 'Not achieved'
                        : 'Unconfirmed'}
                  </span>
                </div>
                <p className="mt-1 text-fine leading-snug text-textMuted">{step.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={decision === 'achieved'}
                    onClick={() => setDecision(step.id, 'achieved')}
                    className={clsx(
                      'rounded-lg border px-2.5 py-1 text-fine font-semibold disabled:opacity-45',
                      decision === 'achieved'
                        ? 'border-success/55 bg-successSoft/20 text-success'
                        : 'border-border/40 bg-bgElevated/60 text-textMuted',
                      btnFocus
                    )}
                  >
                    Achieved
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={decision === 'not-achieved'}
                    onClick={() => setDecision(step.id, 'not-achieved')}
                    className={clsx(
                      'rounded-lg border px-2.5 py-1 text-fine font-semibold disabled:opacity-45',
                      decision === 'not-achieved'
                        ? 'border-danger/55 bg-dangerSoft/20 text-danger'
                        : 'border-border/40 bg-bgElevated/60 text-textMuted',
                      btnFocus
                    )}
                  >
                    Not achieved
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-success/30 bg-successSoft/10 px-3 py-2">
          <p className="flex items-start gap-2 text-meta leading-snug text-textMuted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            Steps you leave unconfirmed stay unconfirmed — nothing is auto-marked achieved. When all
            steps are verified, the plan result is promoted to your twin's memory, strengthening
            future expert routing and predictions.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-fine text-textSoft">
            {decidedCount} of {plan.steps.length} step(s) confirmed
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={clsx(
              'rounded-lg border border-border px-3 py-2 text-sm text-textMuted disabled:opacity-45',
              btnFocus
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={clsx(
              'rounded-lg border border-success/50 bg-successSoft/20 px-3 py-2 text-sm font-semibold text-success disabled:opacity-45',
              btnFocus
            )}
          >
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {busy ? 'Recording…' : 'Record verification'}
          </button>
        </div>
      </div>
    </div>
  );
}
