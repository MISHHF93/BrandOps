import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export type CardVariant = 'default' | 'interactive' | 'selected' | 'muted';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  as?: 'article' | 'section' | 'div';
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bo-glass-panel bg-surface border-border/80 shadow-panel',
  interactive:
    'bo-glass-panel bg-surface border-border/80 shadow-panel hover:border-borderStrong hover:bg-surfaceHover hover:-translate-y-px hover:shadow-hover',
  selected: 'bo-glass-panel bg-surfaceActive border-primary/60 shadow-glow',
  muted: 'bo-glass-panel bo-glass-panel--muted bg-bgSubtle border-border/70 shadow-panel'
};

export function Card({
  as = 'article',
  variant = 'default',
  header,
  footer,
  title,
  subtitle,
  className,
  children,
  ...props
}: CardProps) {
  const Element = as;

  return (
    <Element
      className={cn(
        'rounded-lg border p-4 text-text',
        interactiveTransitionClass,
        variantClasses[variant],
        variant === 'interactive' && focusRingClass,
        className
      )}
      {...props}
    >
      {header}
      {title || subtitle ? (
        <header className="space-y-1">
          {title ? <h3 className="text-h3">{title}</h3> : null}
          {subtitle ? <p className="text-meta text-textMuted">{subtitle}</p> : null}
        </header>
      ) : null}
      {children ? (
        <div className={cn(title || subtitle ? 'mt-3' : undefined)}>{children}</div>
      ) : null}
      {footer ? <footer className="mt-3">{footer}</footer> : null}
    </Element>
  );
}
