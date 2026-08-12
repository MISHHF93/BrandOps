import clsx from 'clsx';
import type { PlanThoughtTree } from '../../../types/domain';

interface TreeBranch {
  label: string;
  items: string[];
}

/**
 * Renders `PlanThoughtTree` (already on `PlanDraft`/`Plan`) as a user-facing
 * execution tree — artifacts, decisions, and reasoning summaries, never raw
 * model chain-of-thought. Wired into Ask's Convert-to-Plan preview
 * (`ConvertAskToPlanDrawer.tsx`). Once a plan is saved, `MobileWorkspaceHubView.tsx`
 * only surfaces `thoughtTree.chosenPath` as a summary line (no dedicated
 * saved-plan detail view exists yet to host the full tree — that's future
 * work, not implied here).
 */
export function ExecutionTree({ tree, className }: { tree: PlanThoughtTree; className?: string }) {
  const branches: TreeBranch[] = [
    { label: 'Branches considered', items: tree.branchesOptions },
    { label: 'Steps', items: tree.steps },
    { label: 'Approvals required', items: tree.approvals },
    { label: 'Risks', items: tree.risks }
  ].filter((branch) => branch.items.length > 0);

  return (
    <div className={clsx('space-y-2 text-fine leading-snug text-textMuted', className)}>
      <p>
        <span className="font-semibold text-text">Goal:</span> {tree.planObjective}
      </p>
      <p>
        <span className="font-semibold text-text">Chosen path:</span> {tree.chosenPath}
      </p>
      <div className="space-y-2">
        {branches.map((branch, branchIndex) => (
          <div key={branch.label} className="pl-3">
            <p className="font-semibold text-text">
              {branchIndex === branches.length - 1 ? '└── ' : '├── '}
              {branch.label}
            </p>
            <ul className="ml-6 list-disc space-y-0.5 marker:text-textSoft">
              {branch.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
