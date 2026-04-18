import { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/80 bg-surface p-4 shadow-panel',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-h1 text-text">{title}</h1>
        {description ? <p className="max-w-3xl text-body text-textMuted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

