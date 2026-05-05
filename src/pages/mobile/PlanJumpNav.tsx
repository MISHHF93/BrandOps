import clsx from 'clsx';

export interface PlanJumpNavProps {
  btnFocus: string;
}

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '#plan-pulse', label: 'Pulse' },
  { href: '#plan-today', label: 'Today snapshot' },
  { href: '#plan-queue', label: 'Queue' }
];

export function PlanJumpNav({ btnFocus }: PlanJumpNavProps) {
  return (
    <nav className="bo-plan-jump-nav" aria-label="Jump within Plan">
      <span className="bo-plan-jump-nav__kicker text-[10px] font-semibold uppercase tracking-wide text-textSoft">
        Jump to
      </span>
      <div className="bo-plan-jump-nav__links flex flex-wrap gap-x-2 gap-y-1">
        {LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className={clsx('bo-plan-jump-nav__link text-[11px] font-semibold text-textMuted', btnFocus)}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
