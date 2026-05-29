import clsx from 'clsx';
import { LayoutDashboard, CalendarRange, PlugZap, Settings } from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';

const PLAN_NAV_ITEMS: ReadonlyArray<{
  tab: MobileShellTabId;
  label: string;
  Icon: typeof LayoutDashboard;
}> = [
  { tab: 'workspace', label: 'Plan', Icon: LayoutDashboard },
  { tab: 'daily', label: 'Activity', Icon: CalendarRange },
  { tab: 'integrations', label: 'Sources', Icon: PlugZap },
  { tab: 'settings', label: 'Setup', Icon: Settings }
];

/**
 * Plan-only strip — keeps integrations/settings/cockpit inside the **Plan** mental model (dock stays Ask | Plan).
 */
export function PlanSurfaceNav({
  activeTab,
  onSelect,
  btnFocus
}: {
  activeTab: MobileShellTabId;
  onSelect: (tab: MobileShellTabId) => void;
  btnFocus: string;
}) {
  if (activeTab === 'chat') return null;

  return (
    <nav
      className="bo-plan-surface-nav flex flex-wrap gap-2 rounded-2xl border border-border/40 bg-bgElevated/60 px-2 py-2"
      aria-label="Plan sections"
    >
      {PLAN_NAV_ITEMS.map(({ tab, label, Icon }) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect(tab)}
            className={clsx(
              'inline-flex min-h-[40px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-meta font-semibold transition-colors sm:flex-none sm:px-3',
              active
                ? 'border-accent/55 bg-accentSoft/25 text-text'
                : 'border-transparent bg-transparent text-textMuted hover:border-borderStrong hover:bg-surfaceActive hover:text-text',
              btnFocus
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
