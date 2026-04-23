import { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-bgSubtle text-textMuted border-border/80',
  primary: 'bg-primarySoft text-primary border-primary/40',
  success: 'bg-successSoft text-success border-success/40',
  warning: 'bg-warningSoft text-warning border-warning/40',
  danger: 'bg-dangerSoft text-danger border-danger/40',
  info: 'bg-infoSoft text-info border-info/40'
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-meta font-medium uppercase tracking-wide',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function StatusPill({ tone = 'neutral', className, ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-1 text-meta font-medium',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
