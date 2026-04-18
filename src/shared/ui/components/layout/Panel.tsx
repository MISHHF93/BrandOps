import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  as?: 'section' | 'article' | 'div';
}

export function Panel({
  as = 'section',
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PanelProps) {
  const Element = as;

  return (
    <Element
      className={cn(
        'bo-glass-panel rounded-xl border border-borderStrong/80 bg-bgElevated p-4 text-text shadow-panel',
        className
      )}
      {...props}
    >
      {title || description || actions ? (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            {title ? <h2 className="text-h2">{title}</h2> : null}
            {description ? <p className="text-body text-textMuted">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </Element>
  );
}
