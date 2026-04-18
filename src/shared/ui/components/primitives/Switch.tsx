import { KeyboardEvent, useId } from 'react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  id,
  className
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? `switch-${generatedId}`;
  const labelId = `${switchId}-label`;
  const descriptionId = description ? `${switchId}-description` : undefined;

  const toggle = () => {
    if (disabled) return;
    onCheckedChange(!checked);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-sm border border-border/80 bg-surface px-3 py-2 text-body text-text shadow-panel',
        interactiveTransitionClass,
        disabled ? 'opacity-55' : 'hover:border-borderStrong',
        className
      )}
    >
      <div>
        <p id={labelId} className="text-bodyStrong">
          {label}
        </p>
        {description ? (
          <p id={descriptionId} className="text-meta text-textSoft">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full border border-borderStrong bg-bgSubtle',
          interactiveTransitionClass,
          checked && 'border-primary/70 bg-primarySoft',
          !disabled && 'hover:border-primary/60',
          focusRingClass
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-textSoft',
            'translate-x-0.5',
            interactiveTransitionClass,
            checked && 'translate-x-[1.125rem] bg-primary'
          )}
        />
      </button>
    </div>
  );
}
