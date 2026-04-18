import { InputHTMLAttributes, useId } from 'react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export function Checkbox({ id, label, description, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? `checkbox-${generatedId}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex cursor-pointer items-start gap-2 rounded-sm border border-border/80 bg-surface px-3 py-2 text-body text-text shadow-panel',
        interactiveTransitionClass,
        'hover:border-borderStrong focus-within:border-primary/70',
        props.disabled && 'cursor-not-allowed opacity-55',
        className
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          'mt-0.5 h-4 w-4 rounded-[4px] border-border bg-bgSubtle text-primary',
          'focus:ring-focusRing focus:ring-2 focus:ring-offset-0',
          focusRingClass
        )}
        {...props}
      />
      <span className="flex-1">
        <span className="block text-bodyStrong text-text">{label}</span>
        {description ? <span className="block text-meta text-textSoft">{description}</span> : null}
      </span>
    </label>
  );
}
