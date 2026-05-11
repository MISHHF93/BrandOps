import clsx from 'clsx';
import { BrainCircuit, GitBranch, ListChecks, Shield } from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { governancePoliciesFromPackagedRules } from '../../services/plan/governancePoliciesReadout';

/**
 * Operational AI + governance snapshot for **Plan** — pipelines, trace memory, reviews, packaged policies.
 */
export function PlanExecutionInsights({ snapshot }: { snapshot: MobileWorkspaceSnapshot }) {
  const runs = snapshot.recentAiPipelineRuns;
  const mem = snapshot.memoryTraceSummary;
  const pending = snapshot.planPendingReviewCount;
  const policies = governancePoliciesFromPackagedRules();

  return (
    <section
      className="space-y-3 rounded-2xl border border-border/40 bg-surface/35 px-3 py-3 sm:px-4"
      aria-labelledby="plan-exec-insights-heading"
    >
      <div className="flex flex-wrap items-center gap-2">
        <GitBranch className="h-4 w-4 text-accent" aria-hidden />
        <h2 id="plan-exec-insights-heading" className="text-label font-semibold text-text">
          Execution and governance
        </h2>
        <span className="text-meta text-textMuted">
          Pipelines, trace memory, human review backlog, packaged rules — all live on Plan.
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border/35 bg-bgSubtle/50 px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-textSoft">
            <BrainCircuit className="h-3 w-3" aria-hidden />
            Trace memory
          </p>
          <p className="mt-1 text-meta text-text">
            {mem.bundleCount} bundle{mem.bundleCount === 1 ? '' : 's'} persisted
          </p>
          {mem.lastBundleAt ? (
            <p className="mt-0.5 text-fine text-textMuted">Last activity · {mem.lastBundleAt}</p>
          ) : (
            <p className="mt-0.5 text-fine text-textMuted">
              No graph bundles yet — run Ask with traces on.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/35 bg-bgSubtle/50 px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-textSoft">
            <ListChecks className="h-3 w-3" aria-hidden />
            Human review
          </p>
          <p className="mt-1 text-meta text-text">
            {pending} pending operator trace{pending === 1 ? '' : 's'}
          </p>
          <p className="mt-0.5 text-fine text-textMuted">
            Approve from diagnostics exports / future queue UI.
          </p>
        </div>

        <div className="rounded-xl border border-border/35 bg-bgSubtle/50 px-2.5 py-2 sm:col-span-1">
          <p className="flex items-center gap-1.5 text-fine font-semibold uppercase tracking-wide text-textSoft">
            <Shield className="h-3 w-3" aria-hidden />
            Packaged governance
          </p>
          <p className="mt-1 text-meta text-text">{policies.length} active policy rows</p>
          <ul className="mt-1 space-y-0.5 text-fine text-textMuted">
            {policies.slice(0, 3).map((p) => (
              <li key={p.policy_id} className="truncate">
                · {p.label}
              </li>
            ))}
            {policies.length > 3 ? <li>· +{policies.length - 3} more…</li> : null}
          </ul>
        </div>
      </div>

      <div>
        <p className="text-fine font-semibold uppercase tracking-wide text-textSoft">
          Recent pipeline runs
        </p>
        {runs.length === 0 ? (
          <p className="mt-1 text-meta text-textMuted">
            No recorded runs yet — invoke catalog pipelines from the integration suite when enabled.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {runs.map((r) => (
              <li
                key={r.run_id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border/30 bg-bgElevated/50 px-2 py-1.5"
              >
                <span className="min-w-0 truncate font-mono text-fine text-text">
                  {r.pipeline_id}
                </span>
                <span
                  className={clsx(
                    'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-overline font-bold uppercase',
                    r.status === 'success' && 'border-success/45 bg-successSoft/20 text-success',
                    r.status === 'failure' && 'border-danger/45 bg-dangerSoft/15 text-danger',
                    r.status === 'partial' && 'border-warning/45 bg-warningSoft/20 text-warning',
                    r.status === 'running' && 'border-info/45 bg-infoSoft/15 text-info'
                  )}
                >
                  {r.status}
                </span>
                <span className="w-full text-fine text-textMuted sm:w-auto">{r.started_at}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
