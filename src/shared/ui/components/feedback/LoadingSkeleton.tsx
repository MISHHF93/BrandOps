import { cn } from '../utils/cn';

export interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md border border-border/70 bg-surface/70',
        className
      )}
    />
  );
}

