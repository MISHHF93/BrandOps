import clsx from 'clsx';
import { BrainCircuit, Download, GitBranch, ListChecks, Play, Shield } from 'lucide-react';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import { governancePoliciesFromPackagedRules } from '../../services/plan/governancePoliciesReadout';
import type { PipelineRun } from '../../types/aiIntegrationSuite';

function runNeedsReviewAck(run: PipelineRun): boolean {
  if (run.status !== 'partial') return false;
  return run.steps.some(
    (s) => s.status === 'skipped' && (s.detail ?? '').includes('Awaiting operator acknowledgement')
  );
}

/**
 * Operational AI + governance snapshot for **Plan** — pipelines, trace memory, reviews, packaged policies.
 */
export function PlanExecutionInsights({
  snapshot,
  commandBusy,
  canRunWorkspaceCommands,
  runCommand,
  onDownloadPipelineRun,
  onApproveOperatorTrace
}: {
  snapshot: MobileWorkspaceSnapshot;
  commandBusy: boolean;
  canRunWorkspaceCommands: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onDownloadPipelineRun: (run: PipelineRun) => void;
  onApproveOperatorTrace: (traceId: string) => void | Promise<void>;
}) {
  const runs = snapshot.recentAiPipelineRuns;
  const mem = snapshot.memoryTraceSummary;
  const pending = snapshot.planPendingReviewCount;
  const pendingPeek = snapshot.planPendingReviewPeek;
  const policies = governancePoliciesFromPackagedRules();
  const actionsDisabled = commandBusy || !canRunWorkspaceCommands;

  return (
    <section
      id="plan-exec-insights"
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
          {pendingPeek.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {pendingPeek.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/25 bg-bgElevated/40 px-1.5 py-1"
                >
                  <span className="min-w-0 flex-1 truncate text-fine text-textSoft" title={row.id}>
                    <span className="font-mono text-text">{row.verb}</span> · {row.at}
                  </span>
                  <button
                    type="button"
                    disabled={actionsDisabled}
                    className={clsx(
                      'shrink-0 rounded-md border border-success/40 bg-successSoft/25 px-2 py-0.5 text-overline font-bold uppercase text-success',
                      actionsDisabled ? 'opacity-40' : 'hover:bg-successSoft/40'
                    )}
                    onClick={() => void onApproveOperatorTrace(row.id)}
                  >
                    Approve
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-0.5 text-fine text-textMuted">No pending items in the peek queue.</p>
          )}
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
            No recorded runs yet — use ⌘K → AI suite pipelines or a command like{' '}
            <span className="font-mono text-textSoft">run ai pipeline workspace_audit_report</span>.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {runs.map((r) => (
              <li
                key={r.run_id}
                className="flex flex-col gap-1.5 rounded-lg border border-border/30 bg-bgElevated/50 px-2 py-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-fine text-text">{r.pipeline_id}</span>
                  <span className="mx-1.5 text-fine text-textMuted">·</span>
                  <span className="text-fine text-textMuted">{r.started_at}</span>
                  {runNeedsReviewAck(r) ? (
                    <p className="mt-0.5 text-fine text-warning">Paused — human review gate</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
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
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-bgSubtle/60 px-2 py-0.5 text-fine text-text hover:bg-bgSubtle"
                    onClick={() => onDownloadPipelineRun(r)}
                  >
                    <Download className="h-3 w-3" aria-hidden />
                    JSON
                  </button>
                  {runNeedsReviewAck(r) ? (
                    <button
                      type="button"
                      disabled={actionsDisabled}
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primarySoft/25 px-2 py-0.5 text-fine font-medium text-primary',
                        actionsDisabled ? 'opacity-40' : 'hover:bg-primarySoft/40'
                      )}
                      onClick={() => void runCommand(`run ai pipeline ${r.pipeline_id} --ack`)}
                    >
                      <Play className="h-3 w-3" aria-hidden />
                      Continue
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
