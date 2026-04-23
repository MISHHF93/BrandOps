import { Archive, Copy, Edit3 } from 'lucide-react';
import { Badge, StatusPill, BadgeTone } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { Card } from '../layout/Card';
import { cn } from '../utils/cn';

export interface ContactCardProps {
  name: string;
  role: string;
  company: string;
  source: string;
  followUpStatus: string;
  followUpTone?: BadgeTone;
  notesPreview?: string;
  onCopy?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  className?: string;
}

export function ContactCard({
  name,
  role,
  company,
  source,
  followUpStatus,
  followUpTone = 'warning',
  notesPreview,
  onCopy,
  onEdit,
  onArchive,
  className
}: ContactCardProps) {
  return (
    <Card variant="interactive" className={cn('space-y-3', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-h3">{name}</h3>
          <p className="text-body text-textMuted">
            {role} · {company}
          </p>
        </div>
        <StatusPill tone={followUpTone}>{followUpStatus}</StatusPill>
      </header>

      <div className="flex items-center gap-2">
        <Badge tone="info">{source}</Badge>
      </div>

      {notesPreview ? (
        <p className="line-clamp-3 text-body text-textMuted">{notesPreview}</p>
      ) : null}

      <footer className="flex items-center justify-end gap-1 border-t border-border/80 pt-2">
        <IconButton
          icon={<Copy size={14} />}
          label="Copy contact summary"
          tooltip="Copy"
          onClick={onCopy}
        />
        <IconButton
          icon={<Edit3 size={14} />}
          label="Edit contact"
          tooltip="Edit"
          onClick={onEdit}
        />
        <IconButton
          icon={<Archive size={14} />}
          label="Archive contact"
          tooltip="Archive"
          variant="outline"
          onClick={onArchive}
        />
      </footer>
    </Card>
  );
}
