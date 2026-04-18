import { ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../primitives/Button';
import { cn } from '../utils/cn';
import { useFocusTrap } from '../utils/focusTrap';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = 'w-[min(34rem,95vw)]',
  className
}: DrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  useFocusTrap({
    enabled: open,
    containerRef: drawerRef,
    onEscape: onClose
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85]">
      <button
        aria-label="Close drawer backdrop"
        className="absolute inset-0 bg-bg/72 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'absolute right-0 top-0 h-full border-l border-borderStrong/80 bg-bgElevated p-4 shadow-hover',
          widthClassName,
          className
        )}
      >
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-h2 text-text">{title}</h2>
            {description ? <p className="text-body text-textMuted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close drawer" onClick={onClose}>
            <X size={16} />
          </Button>
        </header>

        <div className="h-[calc(100%-3rem)] overflow-auto pr-1">{children}</div>
        {footer ? <footer className="mt-3 border-t border-border/80 pt-3">{footer}</footer> : null}
      </aside>
    </div>
  );
}
