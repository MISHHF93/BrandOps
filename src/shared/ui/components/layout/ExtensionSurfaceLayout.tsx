import type { ReactNode } from 'react';
import { LayoutDashboard, Settings2 } from 'lucide-react';
import { openExtensionSurface } from '../../../navigation/openExtensionSurface';
import { cn } from '../utils/cn';

export type ExtensionSurfaceName = 'options';

interface ExtensionSurfaceLayoutProps {
  /** Which surface this page is (highlights the current pill). */
  current: ExtensionSurfaceName;
  /** Short label for the context bar, e.g. "Quick actions". */
  currentLabel: string;
  children: ReactNode;
  className?: string;
  /** Popup should open the dashboard in a new tab via the background script; options use in-place navigation by default. */
  onOpenDashboard?: () => void;
}

/**
 * Shared top bar for popup/options: shows where you are and links to other extension surfaces.
 */
export function ExtensionSurfaceLayout({
  current,
  currentLabel,
  children,
  className,
  onOpenDashboard
}: ExtensionSurfaceLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <nav
        className="bo-card bo-glass-panel flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        aria-label="BrandOps extension surfaces"
      >
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-textSoft">
            {currentLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              'bo-link inline-flex items-center gap-1 !px-2 !py-1 text-[11px]',
              current === 'options' && 'border-borderStrong bg-surface/80'
            )}
            onClick={() => openExtensionSurface('options')}
          >
            <Settings2 size={12} aria-hidden />
            Settings
          </button>
          <button
            type="button"
            className="bo-link inline-flex items-center gap-1 !px-2 !py-1 text-[11px]"
            onClick={() =>
              onOpenDashboard ? onOpenDashboard() : openExtensionSurface('dashboard')
            }
          >
            <LayoutDashboard size={12} aria-hidden />
            Full dashboard
          </button>
        </div>
      </nav>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
