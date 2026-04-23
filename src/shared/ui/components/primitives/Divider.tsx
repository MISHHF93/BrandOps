import { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({ className, orientation = 'horizontal', ...props }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <span aria-hidden="true" className={cn('mx-1 h-full min-h-4 w-px bg-border/80', className)} />
    );
  }

  return <hr className={cn('my-3 border-0 border-t border-border/80', className)} {...props} />;
}
