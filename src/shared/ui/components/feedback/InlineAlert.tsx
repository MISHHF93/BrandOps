import { AlertTriangle, CheckCircle2, Info, ShieldAlert, TriangleAlert } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { cn } from '../utils/cn';

export type InlineAlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  action?: ReactNode;
}

const toneStyles: Record<InlineAlertTone, string> = {
  info: 'border-info/45 bg-infoSoft/20 text-info',
  success: 'border-success/45 bg-successSoft/20 text-success',
  warning: 'border-warning/45 bg-warningSoft/20 text-warning',
  danger: 'border-danger/45 bg-dangerSoft/20 text-danger'
};

const toneIcon = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: ShieldAlert
} satisfies Record<InlineAlertTone, typeof AlertTriangle>;

export function InlineAlert({
  tone = 'info',
  title,
  message,
  actionLabel,
  onAction,
  action,
  className
}: InlineAlertProps) {
  const Icon = toneIcon[tone];

  return (
    <aside
      className={cn(
        'bo-glass-panel rounded-md border p-3 backdrop-blur-sm',
        toneStyles[tone],
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <Icon size={16} aria-hidden="true" className="mt-0.5" />
        <div className="flex-1">
          <p className="text-bodyStrong">{title}</p>
          <p className="text-body text-text/90">{message}</p>
          {action ? (
            <div className="mt-2">{action}</div>
          ) : actionLabel && onAction ? (
            <Button variant="outline" size="sm" className="mt-2" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
