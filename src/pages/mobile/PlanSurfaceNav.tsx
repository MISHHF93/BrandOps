import clsx from 'clsx';
import { CalendarRange, LayoutDashboard, PlugZap, Settings } from 'lucide-react';
import type { MobileShellTabId } from './mobileShellQuery';

const PLAN_PAGE_ITEMS: ReadonlyArray<{
  tab: Exclude<MobileShellTabId, 'chat'>;
  label: string;
  description: string;
  Icon: typeof LayoutDashboard;
}> = [
  {
    tab: 'workspace',
    label: 'Plan',
    description: 'Feed and approvals',
    Icon: LayoutDashboard
  },
  {
    tab: 'daily',
    label: 'Activity',
    description: 'Daily work and focus',
    Icon: CalendarRange
  },
  {
    tab: 'integrations',
    label: 'Sources',
    description: 'Connected data',
    Icon: PlugZap
  },
  {
    tab: 'settings',
    label: 'Setup',
    description: 'Twin and preferences',
    Icon: Settings
  }
];

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
      className="rounded-2xl border border-border/35 bg-bgElevated/55 px-2 py-2"
      aria-label="Plan pages"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {PLAN_PAGE_ITEMS.map(({ tab, label, description, Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelect(tab)}
              className={clsx(
                'min-w-[6.5rem] shrink-0 rounded-xl border px-2.5 py-2 text-left transition-colors',
                active
                  ? 'border-primary/55 bg-primarySoft/20 text-text'
                  : 'border-border/35 bg-bgSubtle/45 text-textMuted hover:border-borderStrong hover:text-text',
                btnFocus
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="flex items-center gap-1.5 text-fine font-semibold">
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {label}
              </span>
              <span className="mt-0.5 block text-overline uppercase tracking-wide text-textSoft">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
