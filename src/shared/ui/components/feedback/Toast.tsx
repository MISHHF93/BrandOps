import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { IconButton } from '../primitives/IconButton';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastProps {
  id?: string;
  title: string;
  message?: string;
  tone?: ToastTone;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const toneStyles: Record<ToastTone, string> = {
  info: 'border-info/45 bg-bgElevated',
  success: 'border-success/45 bg-bgElevated',
  warning: 'border-warning/45 bg-bgElevated',
  danger: 'border-danger/45 bg-bgElevated'
};

const toneIcons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: TriangleAlert
} satisfies Record<ToastTone, typeof Info>;

export function Toast({
  title,
  message,
  tone = 'info',
  action,
  onClose,
  className
}: ToastProps) {
  const Icon = toneIcons[tone];

  return (
    <article
      role="status"
      className={cn(
        'w-full rounded-md border p-3 text-text shadow-hover',
        toneStyles[tone],
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon size={15} aria-hidden="true" className="mt-0.5 text-textMuted" />
        <div className="min-w-0 flex-1">
          <p className="text-bodyStrong">{title}</p>
          {message ? <p className="mt-1 text-body text-textMuted">{message}</p> : null}
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
        {onClose ? (
          <IconButton icon={<X size={14} />} label="Dismiss notification" tooltip="Dismiss" onClick={onClose} />
        ) : null}
      </div>
    </article>
  );
}

export interface ToastViewportProps {
  children: ReactNode;
  className?: string;
}

export function ToastViewport({ children, className }: ToastViewportProps) {
  return (
    <section
      aria-live="polite"
      aria-atomic="false"
      className={cn('fixed bottom-4 right-4 z-[100] grid w-[min(22rem,94vw)] gap-2', className)}
    >
      {children}
    </section>
  );
}

