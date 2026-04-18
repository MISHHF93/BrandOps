import { ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../primitives/Button';
import { cn } from '../utils/cn';
import { useFocusTrap } from '../utils/focusTrap';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = 'Close dialog',
  className
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap({
    enabled: open,
    containerRef: modalRef,
    onEscape: onClose
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-bg/82 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative z-[1] w-full max-w-2xl rounded-xl border border-borderStrong/80 bg-bgElevated p-4 text-text shadow-hover',
          className
        )}
      >
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-h2">{title}</h2>
            {description ? <p className="text-body text-textMuted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label={closeLabel} onClick={onClose}>
            <X size={16} />
          </Button>
        </header>

        <div>{children}</div>

        {footer ? <footer className="mt-4 border-t border-border/80 pt-3">{footer}</footer> : null}
      </div>
    </div>
  );
}
