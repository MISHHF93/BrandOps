import { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export interface QuickActionTileProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuickActionTile({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  className
}: QuickActionTileProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group w-full rounded-lg border border-border/80 bg-surface p-3 text-left text-text shadow-panel',
        'hover:border-primary/45 hover:bg-surfaceHover hover:shadow-hover',
        'active:translate-y-0 active:bg-surfaceActive',
        focusRingClass,
        interactiveTransitionClass,
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      <div className="mb-2 inline-flex rounded-sm bg-primarySoft p-2 text-primary">{icon}</div>
      <p className="text-bodyStrong">{title}</p>
      <p className="mt-1 text-body text-textMuted">{description}</p>
    </button>
  );
}

