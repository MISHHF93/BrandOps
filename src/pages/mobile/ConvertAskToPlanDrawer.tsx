import clsx from 'clsx';
import { useState } from 'react';
import { CheckCircle2, GitBranch, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import type { PlanDraft, PlanPreset } from '../../types/domain';
import { PLAN_PRESET_LABELS, PLAN_PRESETS } from '../../services/plan/askPlanConversion';
import { ExecutionTree } from '../../shared/ui/execution/ExecutionTree';

function presetDescription(preset: PlanPreset): string {
  switch (preset) {
    case 'outreach-plan':
      return 'Audience, angle, draft sequence, follow-up timing, approvals.';
    case 'content-plan':
      return 'Pillars, post ideas, timeline, platforms, review gates.';
    case 'positioning-plan':
      return 'Current position, differentiation, proof, missing evidence.';
    case 'buyer-persona-plan':
      return 'Segments, pains, triggers, objections, messaging angles.';
    case 'opportunity-analysis-plan':
      return 'Opportunity, why now, impact, experiments, risks.';
    case 'workflow-plan':
      return 'Repeatable steps, owners, platforms, automation checkpoints.';
    case 'resume-profile-improvement-plan':
      return 'Gaps, rewritten sections, verification needs.';
    case 'integration-setup-plan':
      return 'Platform setup, permissions, needs setup or unsupported state.';
    case 'weekly-execution-plan':
      return 'Priorities, schedule, approvals, deliverables.';
    case 'custom-plan':
    default:
      return 'Infer the best structured plan shape from the Ask response.';
  }
}

function DraftList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border/35 bg-bgSubtle/50 px-3 py-2">
      <p className="bo-system-label">{title}</p>
      {items.length ? (
        <ul className="mt-1 space-y-1 text-fine leading-snug text-textMuted">
          {items.slice(0, 5).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-fine text-textMuted">None detected.</p>
      )}
    </div>
  );
}

export function ConvertAskToPlanDrawer({
  open,
  draft,
  selectedPreset,
  busy,
  error,
  btnFocus,
  onSelectPreset,
  onGenerate,
  onQuickConvert,
  onUpdateDraft,
  onSave,
  onRegenerate,
  onCancel
}: {
  open: boolean;
  draft: PlanDraft | null;
  selectedPreset: PlanPreset;
  busy: boolean;
  error: string | null;
  btnFocus: string;
  onSelectPreset: (preset: PlanPreset) => void;
  onGenerate: (preset: PlanPreset) => void;
  onQuickConvert: () => void;
  onUpdateDraft: (draft: PlanDraft) => void;
  onSave: (draft: PlanDraft) => void;
  onRegenerate: () => void;
  onCancel: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  if (!open) return null;
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
        aria-labelledby="convert-ask-plan-heading"
        className="bo-system-sheet max-h-[min(88vh,46rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-border/70 p-4 shadow-panel"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="bo-system-label text-primary">Convert to Plan</p>
            <h2 id="convert-ask-plan-heading" className="mt-1 text-h3 text-text">
              What kind of plan should this become?
            </h2>
            <p className="mt-1 text-meta leading-snug text-textMuted">
              Ask My Twin stays for thinking. PLAN turns the selected response into execution,
              approvals, timelines, and receipts. Nothing external runs from this preview.
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
            aria-label="Cancel Convert to Plan"
          >
            <XCircle className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-warning/40 bg-warningSoft/20 px-3 py-2 text-meta leading-snug text-warning">
            {error}
          </p>
        ) : null}

        {!draft ? (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PLAN_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={busy}
                  onClick={() => onSelectPreset(preset)}
                  className={clsx(
                    'rounded-xl border px-3 py-2 text-left disabled:opacity-45',
                    selectedPreset === preset
                      ? 'border-primary/55 bg-primarySoft/15 text-text'
                      : 'border-border/40 bg-bgSubtle/45 text-textMuted',
                    btnFocus
                  )}
                >
                  <span className="block text-sm font-semibold text-text">
                    {PLAN_PRESET_LABELS[preset]}
                  </span>
                  <span className="mt-1 block text-fine leading-snug">
                    {presetDescription(preset)}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
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
                disabled={busy}
                onClick={onQuickConvert}
                className={clsx(
                  'rounded-lg border border-border/45 bg-bgSubtle/70 px-3 py-2 text-sm font-semibold text-text disabled:opacity-45',
                  btnFocus
                )}
              >
                Quick conversion
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onGenerate(selectedPreset)}
                className={clsx(
                  'rounded-lg border border-primary/50 bg-primarySoft/20 px-3 py-2 text-sm font-semibold text-primary disabled:opacity-45',
                  btnFocus
                )}
              >
                {busy ? 'Generating...' : 'Generate preview'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 rounded-xl border border-primary/30 bg-primarySoft/10 p-3">
              <p className="bo-system-label">Preview before saving</p>
              <input
                value={draft.title}
                onChange={(event) => onUpdateDraft({ ...draft, title: event.target.value })}
                disabled={!editMode}
                className="mt-2 w-full rounded-lg border border-border/45 bg-bgElevated px-3 py-2 text-sm font-semibold text-text outline-none"
                aria-label="Plan title"
              />
              <textarea
                value={draft.objective}
                onChange={(event) => onUpdateDraft({ ...draft, objective: event.target.value })}
                disabled={!editMode}
                className="mt-2 min-h-20 w-full rounded-lg border border-border/45 bg-bgElevated px-3 py-2 text-sm text-text outline-none"
                aria-label="Plan objective"
              />
              <p className="mt-2 text-meta leading-snug text-textMuted">{draft.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-fine">
                <span className="rounded-full border border-border/40 bg-bgElevated px-2 py-1">
                  {PLAN_PRESET_LABELS[draft.planType]}
                </span>
                <span className="rounded-full border border-border/40 bg-bgElevated px-2 py-1">
                  {draft.confidenceScore}% confidence
                </span>
                <span className="rounded-full border border-border/40 bg-bgElevated px-2 py-1">
                  {draft.estimatedEffort}
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DraftList title="Approvals required" items={draft.requiredApprovals} />
              <DraftList title="Missing info" items={draft.missingInputs} />
              <DraftList
                title="Expected output"
                items={[draft.expectedOutput, ...draft.outputsAssets.map((asset) => asset.title)]}
              />
              <DraftList title="Risks" items={draft.risks.map((risk) => risk.title)} />
            </div>

            <div className="mt-3 rounded-xl border border-border/35 bg-bgElevated/55 p-3">
              <p className="bo-system-label">Steps</p>
              <div className="mt-2 grid gap-2">
                {draft.steps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-border/30 bg-bgSubtle/45 px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-text">{step.title}</p>
                      <span className="rounded-full border border-border/40 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-1 text-fine leading-snug text-textMuted">{step.description}</p>
                    <p className="mt-1 text-fine leading-snug text-textSoft">
                      Owner: {step.owner}
                      {step.platform ? ` · Platform: ${step.platform}` : ''} · Approval:{' '}
                      {step.approvalRequired ? 'required' : 'not required'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {draft.thoughtTree ? (
              <details className="bo-ops-disclosure mt-3 px-3 py-2">
                <summary className="flex items-center gap-1.5 text-sm font-semibold text-text">
                  <GitBranch className="h-4 w-4 text-primary" aria-hidden />
                  Execution tree
                </summary>
                <div className="mt-2">
                  <p className="text-fine leading-snug text-textMuted">
                    <span className="font-semibold text-text">Original question:</span>{' '}
                    {draft.thoughtTree.originalQuestion}
                  </p>
                  <p className="mt-1 text-fine leading-snug text-textMuted">
                    <span className="font-semibold text-text">Insight:</span>{' '}
                    {draft.thoughtTree.insight}
                  </p>
                  <ExecutionTree tree={draft.thoughtTree} className="mt-2" />
                </div>
              </details>
            ) : null}

            <div className="mt-3 rounded-xl border border-success/30 bg-successSoft/10 px-3 py-2">
              <p className="flex items-start gap-2 text-meta leading-snug text-textMuted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                Save creates a PLAN record and receipt only. External sends, publishes, deletes,
                syncs, or record modifications still require explicit approval and supported
                integration state.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
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
                disabled={busy}
                onClick={() => setEditMode((current) => !current)}
                className={clsx(
                  'rounded-lg border border-border/45 bg-bgSubtle/70 px-3 py-2 text-sm font-semibold text-text disabled:opacity-45',
                  btnFocus
                )}
              >
                Edit Plan
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onRegenerate}
                className={clsx(
                  'rounded-lg border border-border/45 bg-bgSubtle/70 px-3 py-2 text-sm font-semibold text-text disabled:opacity-45',
                  btnFocus
                )}
              >
                <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Regenerate
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSave(draft)}
                className={clsx(
                  'rounded-lg border border-success/50 bg-successSoft/20 px-3 py-2 text-sm font-semibold text-success disabled:opacity-45',
                  btnFocus
                )}
              >
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                {busy ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
