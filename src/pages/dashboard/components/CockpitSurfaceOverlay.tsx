import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface CockpitSurfaceOverlayProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function CockpitSurfaceOverlay({ title, open, onClose, children }: CockpitSurfaceOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cockpit-surface-overlay-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-bg/55 backdrop-blur-[4px]"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="bo-overlay-drawer relative z-[1] flex h-full min-h-0 w-full max-w-2xl flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-bg/60 px-4 py-3">
          <h2 id="cockpit-surface-overlay-title" className="min-w-0 truncate text-base font-semibold text-text">
            {title}
          </h2>
          <button
            type="button"
            className="bo-link bo-link--sm inline-flex shrink-0 items-center gap-1 text-xs"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} aria-hidden />
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
}
