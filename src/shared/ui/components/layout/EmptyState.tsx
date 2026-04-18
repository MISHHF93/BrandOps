import { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { cn } from '../utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/80 bg-bgSubtle p-5 text-center shadow-panel',
        className
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="mx-auto mb-3 inline-flex text-textSoft">
          {icon}
        </div>
      ) : null}
      <h3 className="text-h3 text-text">{title}</h3>
      <p className="mt-2 text-body text-textMuted">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

