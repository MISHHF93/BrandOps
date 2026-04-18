import { ReactNode, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  footer?: ReactNode;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, containerClassName, invalid = false, footer, disabled, rows = 4, ...props },
  ref
) {
  return (
    <div
      className={cn(
        'w-full rounded-md border bg-surface text-text shadow-panel',
        interactiveTransitionClass,
        invalid
          ? 'border-danger/75'
          : 'border-border/80 hover:border-borderStrong focus-within:border-primary/70',
        disabled && 'cursor-not-allowed opacity-55',
        containerClassName
      )}
    >
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'block w-full resize-y rounded-md bg-transparent px-3 py-2 text-body leading-relaxed',
          'border-0 outline-none placeholder:text-textSoft/95',
          focusRingClass,
          className
        )}
        {...props}
      />
      {footer ? (
        <footer className="border-t border-border/75 px-3 py-2 text-meta text-textSoft">{footer}</footer>
      ) : null}
    </div>
  );
});
