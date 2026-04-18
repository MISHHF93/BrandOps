import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
  invalid?: boolean;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, containerClassName, leadingIcon, invalid = false, disabled, ...props },
  ref
) {
  return (
    <div
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md border bg-surface px-3 text-body text-text shadow-panel',
        interactiveTransitionClass,
        invalid
          ? 'border-danger/75'
          : 'border-border/80 hover:border-borderStrong focus-within:border-primary/70',
        disabled && 'cursor-not-allowed opacity-55',
        containerClassName
      )}
    >
      {leadingIcon ? (
        <span aria-hidden="true" className="inline-flex text-textSoft">
          {leadingIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-full w-full bg-transparent text-body text-text placeholder:text-textSoft/95',
          'border-0 outline-none',
          focusRingClass,
          className
        )}
        {...props}
      />
    </div>
  );
});
