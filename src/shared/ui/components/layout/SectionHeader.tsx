import { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/Badge';

export interface SectionHeaderProps {
  title: string;
  helperText?: string;
  count?: number;
  /** Decorative icon beside the title. */
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  helperText,
  count,
  icon,
  action,
  className
}: SectionHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {icon ? (
            <span className="shrink-0 text-primary/90 [&_svg]:block" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h2 className="text-h2">{title}</h2>
          {typeof count === 'number' ? <Badge tone="neutral">{count}</Badge> : null}
        </div>
        {helperText ? <p className="text-body text-textMuted">{helperText}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </header>
  );
}

