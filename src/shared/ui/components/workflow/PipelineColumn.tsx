import { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import { IconButton } from '../primitives/IconButton';
import { cn } from '../utils/cn';

export interface PipelineColumnProps {
  stageTitle: string;
  count: number;
  children: ReactNode;
  onAdd?: () => void;
  className?: string;
}

export function PipelineColumn({
  stageTitle,
  count,
  children,
  onAdd,
  className
}: PipelineColumnProps) {
  return (
    <section
      className={cn('rounded-lg border border-border/80 bg-bgSubtle p-3 shadow-panel', className)}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-h3">{stageTitle}</h3>
          <Badge tone="neutral">{count}</Badge>
        </div>
        {onAdd ? (
          <IconButton
            icon={<Plus size={14} />}
            label={`Add ${stageTitle}`}
            tooltip="Add record"
            onClick={onAdd}
          />
        ) : null}
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
