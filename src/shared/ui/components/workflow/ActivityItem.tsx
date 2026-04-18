import { ReactNode } from 'react';
import { Badge, BadgeTone } from '../primitives/Badge';
import { cn } from '../utils/cn';

export interface ActivityItemProps {
  title: string;
  detail: string;
  meta?: string;
  markerTone?: BadgeTone;
  icon?: ReactNode;
  linkedEntity?: ReactNode;
  className?: string;
}

export function ActivityItem({
  title,
  detail,
  meta,
  markerTone = 'info',
  icon,
  linkedEntity,
  className
}: ActivityItemProps) {
  return (
    <article
      className={cn(
        'flex items-start gap-3 rounded-md border border-border/80 bg-surface p-3 text-text shadow-panel',
        className
      )}
    >
      <Badge tone={markerTone} className="h-6 min-w-6 justify-center px-2">
        {icon ?? '•'}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-bodyStrong">{title}</p>
        <p className="mt-1 text-body text-textMuted">{detail}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {meta ? <span className="text-meta text-textSoft">{meta}</span> : null}
          {linkedEntity}
        </div>
      </div>
    </article>
  );
}

