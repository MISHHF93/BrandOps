import { cn } from '../utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-7 w-7 border-[3px]'
} as const;

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      aria-label="Loading"
      role="status"
      className={cn(
        'inline-block animate-spin rounded-full border-primary/30 border-t-primary',
        sizeClass[size],
        className
      )}
    />
  );
}

