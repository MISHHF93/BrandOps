import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, invalid = false, disabled, ...props },
  ref
) {
  return (
    <div
      className={cn(
        'relative h-9 w-full rounded-md border bg-surface text-text shadow-panel',
        interactiveTransitionClass,
        invalid
          ? 'border-danger/75'
          : 'border-border/80 hover:border-borderStrong focus-within:border-primary/70',
        disabled && 'cursor-not-allowed opacity-55'
      )}
    >
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-full w-full appearance-none rounded-md bg-transparent pl-3 pr-9 text-body',
          'border-0 outline-none',
          focusRingClass,
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-textSoft">
        <ChevronDown size={14} />
      </span>
    </div>
  );
});
