import { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface AppShellProps {
  nav?: ReactNode;
  children: ReactNode;
  className?: string;
  navClassName?: string;
  contentClassName?: string;
}

export function AppShell({ nav, children, className, navClassName, contentClassName }: AppShellProps) {
  return (
    <div
      className={cn(
        'min-h-full w-full rounded-xl border border-border/80 bg-bg text-text shadow-panel',
        className
      )}
    >
      <div
        className={cn(
          'grid min-h-full grid-cols-1 gap-3 p-3',
          nav ? 'lg:grid-cols-[15rem_1fr]' : 'lg:grid-cols-1'
        )}
      >
        {nav ? (
          <aside className={cn('rounded-lg border border-border/80 bg-bgElevated p-3', navClassName)}>
            {nav}
          </aside>
        ) : null}
        <main className={cn('rounded-lg border border-border/80 bg-bgElevated p-3', contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}

