import { CheckCircle2, Copy, ExternalLink, SkipForward } from 'lucide-react';
import { Button } from '../primitives/Button';
import { StatusPill, BadgeTone } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { cn } from '../utils/cn';

export interface ScheduledTaskRowProps {
  title: string;
  dueAt: string;
  linkedEntity?: string;
  status: string;
  statusTone?: BadgeTone;
  reminderState?: string;
  onReschedule?: () => void;
  onCopy?: () => void;
  onOpenLink?: () => void;
  onMarkDone?: () => void;
  onSkip?: () => void;
  className?: string;
}

export function ScheduledTaskRow({
  title,
  dueAt,
  linkedEntity,
  status,
  statusTone = 'neutral',
  reminderState,
  onReschedule,
  onCopy,
  onOpenLink,
  onMarkDone,
  onSkip,
  className
}: ScheduledTaskRowProps) {
  return (
    <article
      className={cn(
        'grid gap-3 rounded-md border border-border/80 bg-surface p-3 shadow-panel md:grid-cols-[1fr_auto]',
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-bodyStrong">{title}</p>
          <StatusPill tone={statusTone}>{status}</StatusPill>
        </div>
        <p className="text-meta text-textMuted">Due {dueAt}</p>
        <p className="text-meta text-textSoft">
          {linkedEntity ? `Linked to ${linkedEntity}` : 'No linked entity'}
          {reminderState ? ` · Reminder ${reminderState}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button variant="outline" size="sm" onClick={onReschedule}>
          Reschedule
        </Button>
        <IconButton icon={<Copy size={14} />} label="Copy task" tooltip="Copy" onClick={onCopy} />
        <IconButton
          icon={<ExternalLink size={14} />}
          label="Open linked entity"
          tooltip="Open link"
          onClick={onOpenLink}
        />
        <IconButton
          icon={<CheckCircle2 size={14} />}
          label="Mark task done"
          tooltip="Done"
          variant="success"
          onClick={onMarkDone}
        />
        <IconButton
          icon={<SkipForward size={14} />}
          label="Skip task"
          tooltip="Skip"
          variant="outline"
          onClick={onSkip}
        />
      </div>
    </article>
  );
}
