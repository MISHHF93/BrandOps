import { Archive, CalendarClock, Copy, Layers2 } from 'lucide-react';
import { Badge, StatusPill, BadgeTone } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { Card } from '../layout/Card';
import { cn } from '../utils/cn';

export interface ContentItemCardProps {
  contentType: string;
  title: string;
  preview: string;
  tags: string[];
  status: string;
  statusTone?: BadgeTone;
  updatedAt: string;
  onCopy?: () => void;
  onDuplicate?: () => void;
  onSchedule?: () => void;
  onArchive?: () => void;
  className?: string;
}

export function ContentItemCard({
  contentType,
  title,
  preview,
  tags,
  status,
  statusTone = 'neutral',
  updatedAt,
  onCopy,
  onDuplicate,
  onSchedule,
  onArchive,
  className
}: ContentItemCardProps) {
  return (
    <Card variant="interactive" className={cn('space-y-3', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <Badge tone="primary">{contentType}</Badge>
          <h3 className="text-h3">{title}</h3>
        </div>
        <StatusPill tone={statusTone}>{status}</StatusPill>
      </header>

      <p className="line-clamp-3 text-body text-textMuted">{preview}</p>

      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => (
          <Badge key={`${title}-${tag}`} tone="info">
            {tag}
          </Badge>
        ))}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-2">
        <span className="text-meta text-textSoft">Updated {updatedAt}</span>
        <div className="flex items-center gap-1">
          <IconButton icon={<Copy size={14} />} label="Copy content" tooltip="Copy" onClick={onCopy} />
          <IconButton
            icon={<Layers2 size={14} />}
            label="Duplicate content"
            tooltip="Duplicate"
            onClick={onDuplicate}
          />
          <IconButton
            icon={<CalendarClock size={14} />}
            label="Schedule content"
            tooltip="Schedule"
            onClick={onSchedule}
          />
          <IconButton
            icon={<Archive size={14} />}
            label="Archive content"
            tooltip="Archive"
            onClick={onArchive}
            variant="outline"
          />
        </div>
      </footer>
    </Card>
  );
}

