import type { CadenceFlowMode, UiTheme } from '../../../types/domain';
import { openExtensionSurface } from '../../../shared/navigation/openExtensionSurface';

interface GettingStartedSectionProps {
  theme: UiTheme;
  cadenceMode: CadenceFlowMode;
  onThemeChange: (theme: UiTheme) => void;
  onCadenceModeChange: (mode: CadenceFlowMode) => void;
}

export function GettingStartedSection({
  theme,
  cadenceMode,
  onThemeChange,
  onCadenceModeChange
}: GettingStartedSectionProps) {
  const setupChecklist = [
    {
      id: 'theme',
      label: 'Choose theme mode',
      done: theme === 'dark' || theme === 'light'
    },
    {
      id: 'cadence',
      label: 'Set cadence mode',
      done: Boolean(cadenceMode)
    }
  ];
  const completedCount = setupChecklist.filter((item) => item.done).length;

  return (
    <section className="bo-card space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold">Getting started</h2>
        <p className="text-xs text-textMuted">
          Set up the essentials first: baseline theme and execution cadence. LinkedIn and integrations live in the
          sections below.
        </p>
      </header>

      <article className="rounded-xl border border-border bg-bg/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Launch readiness checklist</p>
          <span className="bo-pill">
            {completedCount}/{setupChecklist.length} complete
          </span>
        </div>
        <ul className="mt-2 grid gap-2 text-xs text-textMuted md:grid-cols-2">
          {setupChecklist.map((item) => (
            <li key={item.id} className="rounded-lg border border-border/70 bg-bg/55 px-3 py-2">
              <span className={item.done ? 'text-success' : 'text-warning'}>
                {item.done ? 'Done' : 'Pending'}
              </span>{' '}
              {item.label}
            </li>
          ))}
        </ul>
      </article>

      <div className="rounded-xl border border-border bg-bg/40 p-3">
        <p className="text-sm font-medium">Operator manual</p>
        <p className="mt-1 text-xs text-textMuted">
          Surfaces, first-run flow, Today execution, and keyboard shortcuts — opens in a new tab.
        </p>
        <button type="button" className="bo-link mt-2" onClick={() => openExtensionSurface('help')}>
          Open Knowledge Center
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Theme</span>
          <select
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as UiTheme)}
            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Cadence mode</span>
          <select
            value={cadenceMode}
            onChange={(event) => onCadenceModeChange(event.target.value as CadenceFlowMode)}
            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
          >
            <option value="balanced">Balanced</option>
            <option value="maker-heavy">Maker-heavy</option>
            <option value="client-heavy">Client-heavy</option>
            <option value="launch-day">Launch-day</option>
          </select>
        </label>
      </div>
    </section>
  );
}
