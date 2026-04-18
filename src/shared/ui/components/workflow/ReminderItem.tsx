import { CheckCircle2, AlarmClock } from 'lucide-react';
import { Badge, BadgeTone } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { cn } from '../utils/cn';

export interface ReminderItemProps {
  title: string;
  dueTime: string;
  type: string;
  urgency: 'low' | 'medium' | 'high';
  onSnooze?: () => void;
  onComplete?: () => void;
  className?: string;
}

const urgencyTone: Record<ReminderItemProps['urgency'], BadgeTone> = {
  low: 'info',
  medium: 'warning',
  high: 'danger'
};

export function ReminderItem({
  title,
  dueTime,
  type,
  urgency,
  onSnooze,
  onComplete,
  className
}: ReminderItemProps) {
  return (
    <article
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/80 bg-surface p-3 shadow-panel',
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-bodyStrong">{title}</p>
        <p className="text-meta text-textMuted">
          {type} · Due {dueTime}
        </p>
        <Badge tone={urgencyTone[urgency]}>Urgency {urgency}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSnooze}>
          <AlarmClock size={14} /> Snooze
        </Button>
        <Button variant="success" size="sm" onClick={onComplete}>
          <CheckCircle2 size={14} /> Complete
        </Button>
      </div>
    </article>
  );
}

