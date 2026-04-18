import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';
import { disabledClass, focusRingClass, interactiveTransitionClass } from '../utils/styles';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'success'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text border border-primary/35 shadow-panel hover:bg-primaryHover hover:-translate-y-px hover:shadow-hover active:translate-y-0 active:bg-primary/90',
  secondary:
    'bg-secondary text-text border border-secondary/35 shadow-panel hover:bg-secondaryHover hover:-translate-y-px hover:shadow-hover active:translate-y-0 active:bg-secondary/90',
  ghost:
    'bg-transparent text-textMuted border border-transparent hover:bg-surfaceHover hover:text-text active:bg-surfaceActive',
  outline:
    'bg-bgSubtle text-text border border-borderStrong hover:bg-surfaceHover hover:border-primary/40 active:bg-surfaceActive',
  success:
    'bg-success text-bg border border-success/40 shadow-panel hover:bg-success/90 hover:-translate-y-px hover:shadow-hover active:translate-y-0',
  danger:
    'bg-danger text-text border border-danger/40 shadow-panel hover:bg-danger/90 hover:-translate-y-px hover:shadow-hover active:translate-y-0'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-meta',
  md: 'h-9 px-3.5 text-bodyStrong',
  lg: 'h-11 px-4 text-bodyStrong',
  icon: 'h-9 w-9 p-0 text-bodyStrong'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md select-none',
        focusRingClass,
        interactiveTransitionClass,
        disabledClass,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});

