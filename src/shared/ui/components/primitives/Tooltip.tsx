import { ReactElement, cloneElement, useId } from 'react';
import { cn } from '../utils/cn';

export interface TooltipProps {
  content: string;
  children: ReactElement;
  side?: 'top' | 'bottom';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const tooltipId = useId();

  const childProps = children.props as { className?: string; 'aria-describedby'?: string };
  const wrappedChild = cloneElement(children, {
    'aria-describedby': tooltipId,
    className: cn('relative z-[1]', childProps.className)
  });

  return (
    <span className="group relative inline-flex">
      {wrappedChild}
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-40 hidden min-w-max -translate-x-1/2 rounded-sm border border-borderStrong bg-bgElevated px-2 py-1 text-micro text-text shadow-panel',
          'group-hover:block group-focus-within:block',
          side === 'top' ? 'bottom-[calc(100%+0.45rem)]' : 'top-[calc(100%+0.45rem)]'
        )}
      >
        {content}
      </span>
    </span>
  );
}

