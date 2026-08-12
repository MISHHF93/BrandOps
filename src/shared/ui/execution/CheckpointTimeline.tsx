import { useMemo } from 'react';
import clsx from 'clsx';
import type { Checkpoint as CheckpointModel } from '../../../types/executionState';
import { Checkpoint, type CheckpointHandlers } from './Checkpoint';
import { ExecutionStatus } from './ExecutionStatus';

interface CheckpointTurn {
  root: CheckpointModel;
  /** Oldest → newest, includes the root. */
  chain: CheckpointModel[];
}

/** Groups a flat checkpoint list into per-turn chains via `parentCheckpointId`. Orphaned children (parent outside the loaded window) become their own root. */
function buildCheckpointTurns(checkpoints: CheckpointModel[]): CheckpointTurn[] {
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  const childrenOf = new Map<string, CheckpointModel[]>();
  for (const c of checkpoints) {
    if (!c.parentCheckpointId) continue;
    const list = childrenOf.get(c.parentCheckpointId) ?? [];
    list.push(c);
    childrenOf.set(c.parentCheckpointId, list);
  }
  const roots = checkpoints.filter((c) => !c.parentCheckpointId || !byId.has(c.parentCheckpointId));

  return roots
    .map((root) => {
      const chain: CheckpointModel[] = [root];
      let frontier = [root];
      while (frontier.length > 0) {
        const next: CheckpointModel[] = [];
        for (const node of frontier) {
          next.push(...(childrenOf.get(node.id) ?? []));
        }
        chain.push(...next);
        frontier = next;
      }
      chain.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      return { root, chain };
    })
    .sort((a, b) => new Date(b.root.at).getTime() - new Date(a.root.at).getTime());
}

/**
 * Ordered checkpoint chain, grouped per turn and rendered as collapsible
 * disclosures (same UX precedent as the existing `thoughtTree` `<details>`
 * block). Shared by Ask and Plan — pass `handlers` to make rows actionable
 * (approve/reject a NEEDS_APPROVAL row, retry a FAILED row).
 */
export function CheckpointTimeline({
  checkpoints,
  handlers,
  className,
  emptyLabel = 'No checkpoints yet for this conversation.'
}: {
  checkpoints: CheckpointModel[];
  handlers?: CheckpointHandlers;
  className?: string;
  emptyLabel?: string;
}) {
  const turns = useMemo(() => buildCheckpointTurns(checkpoints), [checkpoints]);

  if (turns.length === 0) {
    return <p className={clsx('text-fine text-textSoft', className)}>{emptyLabel}</p>;
  }

  return (
    <div className={clsx('space-y-2', className)}>
      {turns.map((turn, index) => {
        const latest = turn.chain[turn.chain.length - 1];
        /**
         * `Checkpoint.state` is immutable history, so a resolved
         * `plan.approval_requested` row still reads `NEEDS_APPROVAL` forever
         * — but once `checkpointActions.ts` has appended a
         * `plan.approval_granted`/`plan.approval_rejected` child recording
         * the real decision, that row is no longer the live one. Strip
         * `onApprove`/`onReject` from every non-leaf row so an already-decided
         * approval can't be re-triggered from stale history; `onRetry`/
         * `onInspect`/`resolveReceipt` are unaffected since they don't have
         * this superseded-by-a-child problem.
         */
        const nonLeafIds = new Set(
          turn.chain.map((c) => c.parentCheckpointId).filter((id): id is string => Boolean(id))
        );
        const handlersFor = (checkpoint: CheckpointModel): CheckpointHandlers | undefined => {
          if (!handlers || !nonLeafIds.has(checkpoint.id)) return handlers;
          const { onApprove: _onApprove, onReject: _onReject, ...rest } = handlers;
          return rest;
        };
        /** A single-node "chain" has nothing to disclose — the row below already shows this checkpoint's own summary and status, so a wrapping toggle would just repeat both. */
        if (turn.chain.length === 1) {
          return (
            <Checkpoint
              key={turn.root.id}
              checkpoint={turn.root}
              handlers={handlersFor(turn.root)}
            />
          );
        }
        /** Auto-open only the most recent turn, and only when it actually needs the user (failed or awaiting approval) — a fresh success stays collapsed to avoid noise. */
        const needsAttention = latest.state === 'FAILED' || latest.state === 'NEEDS_APPROVAL';
        return (
          <details
            key={turn.root.id}
            className="bo-disclosure rounded-lg"
            open={index === 0 && needsAttention}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-meta font-semibold text-text">
              <span className="min-w-0 flex-1 truncate">{turn.root.summary}</span>
              <ExecutionStatus state={latest.state} />
            </summary>
            <div className="space-y-1.5 px-3 pb-3 pt-1">
              {turn.chain.map((checkpoint) => (
                <Checkpoint
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  handlers={handlersFor(checkpoint)}
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
