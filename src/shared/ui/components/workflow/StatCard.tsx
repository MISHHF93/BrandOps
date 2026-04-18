import { ReactNode } from 'react';
import { Badge, BadgeTone } from '../primitives/Badge';
import { Card } from '../layout/Card';
import { cn } from '../utils/cn';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: BadgeTone;
  icon?: ReactNode;
  hint?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  icon,
  hint,
  className
}: StatCardProps) {
  return (
    <Card className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-meta uppercase tracking-[0.14em] text-textSoft">{label}</p>
        {icon ? <span className="text-textMuted">{icon}</span> : null}
      </div>
      <p className="text-display">{value}</p>
      <div className="flex items-center gap-2">
        {delta ? <Badge tone={deltaTone}>{delta}</Badge> : null}
        {hint ? <p className="text-meta text-textMuted">{hint}</p> : null}
      </div>
    </Card>
  );
}

