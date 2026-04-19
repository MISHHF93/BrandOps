import { useState, type ReactNode } from 'react';
import { cn } from '../../../shared/ui/components/utils/cn';

export interface CollapsibleSectionProps {
  id?: string;
  summary: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** Collapsible dashboard region (controlled `<details>` for reliable open state in React). */
export function CollapsibleSection({
  id,
  summary,
  defaultOpen = false,
  className,
  bodyClassName,
  children
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      id={id}
      className={cn('bo-card bo-cockpit-collapsible group', className)}
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">{summary}</div>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-textSoft group-open:hidden">
            Show
          </span>
          <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.12em] text-textSoft group-open:inline">
            Hide
          </span>
        </div>
      </summary>
      <div className={cn('border-t border-border/45 px-4 pb-4 pt-3', bodyClassName)}>{children}</div>
    </details>
  );
}
