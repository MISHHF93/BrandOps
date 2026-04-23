import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface CurrentSectionBarProps {
  /** Current area label (matches Crown destinations) */
  label: string;
  /** Short line of context; omit to keep the bar minimal */
  description?: string;
  /** Decorative icon matching the active cockpit area (paired with label). */
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Lightweight breadcrumb-style strip: BrandOps / section — avoids duplicating a full second header.
 */
export function CurrentSectionBar({
  label,
  description,
  leading,
  actions,
  className
}: CurrentSectionBarProps) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-surface/60 px-3 py-2.5 text-xs sm:px-4',
        className
      )}
      role="navigation"
      aria-label="Current section"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {leading ? (
          <div className="mt-0.5 shrink-0 text-primary/90 [&_svg]:block" aria-hidden>
            {leading}
          </div>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-textSoft">
            <span className="text-textMuted">BrandOps</span>
            <span className="mx-1.5 text-borderStrong">/</span>
            <span className="font-medium text-text">{label}</span>
          </p>
          {description ? <p className="text-[11px] text-textMuted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
