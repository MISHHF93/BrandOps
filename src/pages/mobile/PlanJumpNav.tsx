import clsx from 'clsx';

export interface PlanJumpNavProps {
  btnFocus: string;
}

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#plan-unified-inbox', label: 'Inbox' },
  { href: '#plan-behavioral-intelligence-engine', label: 'Behavioral engine' },
  { href: '#plan-memory-context-engine', label: 'Memory' },
  { href: '#plan-predictive-opportunity-layer', label: 'Predictive layer' },
  { href: '#plan-buyer-persona-intelligence', label: 'Buyer personas' },
  { href: '#plan-positioning-intelligence', label: 'Positioning' },
  { href: '#plan-predictive-content-ideation', label: 'Content ideation' },
  { href: '#plan-workflow-prediction-layer', label: 'Workflow prediction' },
  { href: '#plan-opportunity-engine', label: 'Opportunities' },
  { href: '#plan-platform-action-cards', label: 'Platform actions' },
  { href: '#plan-human-trust-layer', label: 'Trust layer' },
  { href: '#plan-cross-platform-planner', label: 'Cross-platform' },
  { href: '#plan-operational-studio', label: 'Plan studio' },
  { href: '#plan-operational-timeline', label: 'Ops timeline' },
  { href: '#plan-human-approval-queue', label: 'Approvals' },
  { href: '#plan-execution-receipts', label: 'Receipts' },
  { href: '#plan-pulse', label: 'Predictive ops' },
  { href: '#plan-actions', label: 'Execution picks' },
  { href: '#plan-today', label: 'Today snapshot' },
  { href: '#plan-queue', label: 'Queue' }
];

export function PlanJumpNav({ btnFocus }: PlanJumpNavProps) {
  return (
    <nav className="bo-plan-jump-nav" aria-label="Jump within Plan">
      <span className="bo-plan-jump-nav__kicker text-fine font-semibold uppercase tracking-wide text-textSoft">
        Jump to
      </span>
      <div className="bo-plan-jump-nav__links flex flex-wrap gap-x-2 gap-y-1">
        {LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className={clsx(
              'bo-plan-jump-nav__link text-meta font-semibold text-textMuted',
              btnFocus
            )}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
