import { ArrowUpRight, CalendarClock, Link2 } from 'lucide-react';
import { Badge, StatusPill, BadgeTone } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { Card } from '../layout/Card';
import { cn } from '../utils/cn';

export interface OpportunityCardProps {
  title: string;
  companyOrContact: string;
  type: string;
  stage: string;
  stageTone?: BadgeTone;
  nextAction: string;
  dueDate: string;
  linkedOutreachCount: number;
  onOpen?: () => void;
  onOpenLinked?: () => void;
  className?: string;
}

export function OpportunityCard({
  title,
  companyOrContact,
  type,
  stage,
  stageTone = 'primary',
  nextAction,
  dueDate,
  linkedOutreachCount,
  onOpen,
  onOpenLinked,
  className
}: OpportunityCardProps) {
  return (
    <Card variant="interactive" className={cn('space-y-3', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-h3">{title}</h3>
          <p className="text-body text-textMuted">{companyOrContact}</p>
        </div>
        <StatusPill tone={stageTone}>{stage}</StatusPill>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{type}</Badge>
        <Badge tone="neutral">{linkedOutreachCount} outreach links</Badge>
      </div>

      <p className="text-body text-textMuted">Next action: {nextAction}</p>
      <p className="inline-flex items-center gap-1 text-meta text-textSoft">
        <CalendarClock size={13} /> Due {dueDate}
      </p>

      <footer className="flex items-center justify-end gap-1 border-t border-border/80 pt-2">
        <IconButton
          icon={<Link2 size={14} />}
          label="Open linked outreach"
          tooltip="Linked"
          onClick={onOpenLinked}
        />
        <IconButton
          icon={<ArrowUpRight size={14} />}
          label="Open opportunity"
          tooltip="Open"
          onClick={onOpen}
        />
      </footer>
    </Card>
  );
}
