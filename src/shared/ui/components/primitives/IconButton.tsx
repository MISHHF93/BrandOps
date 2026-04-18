import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button, ButtonVariant } from './Button';
import { cn } from '../utils/cn';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  label: string;
  variant?: Exclude<ButtonVariant, 'primary'>;
  tooltip?: string;
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  tooltip,
  className,
  ...props
}: IconButtonProps) {
  const button = (
    <Button
      {...props}
      aria-label={label}
      title={tooltip ?? label}
      variant={variant}
      size="icon"
      className={cn('h-9 w-9 rounded-sm', className)}
    >
      <span aria-hidden="true" className="inline-flex items-center justify-center">
        {icon}
      </span>
    </Button>
  );

  if (!tooltip) return button;
  return <Tooltip content={tooltip}>{button}</Tooltip>;
}

