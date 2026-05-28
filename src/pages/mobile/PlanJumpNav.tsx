import clsx from 'clsx';

export interface PlanJumpNavProps {
  btnFocus: string;
}

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#plan-unified-inbox', label: 'Inbox' },
  { href: '#plan-opportunity-engine', label: 'Opportunities' },
  { href: '#plan-platform-action-cards', label: 'Platform actions' },
  { href: '#plan-human-trust-layer', label: 'Trust layer' },
  { href: '#plan-cross-platform-planner', label: 'Cross-platform' },
  { href: '#plan-operational-studio', label: 'Plan studio' },
  { href: '#plan-operational-timeline', label: 'Ops timeline' },
  { href: '#plan-human-approval-queue', label: 'Approvals' },
  { href: '#plan-execution-receipts', label: 'Receipts' },
  { href: '#plan-pulse', label: 'Pulse' },
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
