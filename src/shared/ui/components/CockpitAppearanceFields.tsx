import type {
  BrandOpsData,
  CockpitDensityMode,
  CockpitLayoutMode,
  MotionMode,
  VisualMode
} from '../../../types/domain';

export interface CockpitAppearanceCallbacks {
  onThemeChange: (theme: BrandOpsData['settings']['theme']) => void | Promise<void>;
  onUpdateVisualSettings: (payload: {
    visualMode?: VisualMode;
    motionMode?: MotionMode;
    ambientFxEnabled?: boolean;
  }) => void | Promise<void>;
  onUpdateCockpitPreferences: (payload: {
    cockpitLayout?: CockpitLayoutMode;
    cockpitDensity?: CockpitDensityMode;
  }) => void | Promise<void>;
}

interface ThemeFieldProps {
  data: BrandOpsData;
  onThemeChange: (theme: BrandOpsData['settings']['theme']) => void | Promise<void>;
  /** `settings` uses the same classes as Options Core setup */
  fieldSize?: 'compact' | 'comfortable';
}

export function CockpitThemeField({
  data,
  onThemeChange,
  fieldSize = 'comfortable'
}: ThemeFieldProps) {
  const selectClass =
    fieldSize === 'compact'
      ? 'w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs'
      : 'w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs';

  return (
    <label className="rounded-xl border border-border bg-bg/40 p-3 text-sm space-y-1">
      <span>Theme</span>
      <select
        value={data.settings.theme}
        onChange={(event) =>
          void onThemeChange(event.target.value as BrandOpsData['settings']['theme'])
        }
        className={selectClass}
      >
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </label>
  );
}

interface VisualMotionAmbientFieldsProps {
  data: BrandOpsData;
  onUpdateVisualSettings: CockpitAppearanceCallbacks['onUpdateVisualSettings'];
  fieldSize?: 'compact' | 'comfortable';
  /** Ambient label: short (quick panel) vs long (settings) */
  ambientLabel?: 'short' | 'long';
}

export function CockpitVisualMotionAmbientFields({
  data,
  onUpdateVisualSettings,
  fieldSize = 'comfortable',
  ambientLabel = 'long'
}: VisualMotionAmbientFieldsProps) {
  const selectClass =
    fieldSize === 'compact'
      ? 'w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs'
      : 'w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs';

  const gridClass =
    fieldSize === 'compact' ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 md:grid-cols-3';

  return (
    <div className={gridClass}>
      <label className="space-y-1 text-sm">
        <span>Visual mode</span>
        <select
          value={data.settings.visualMode}
          onChange={(event) =>
            void onUpdateVisualSettings({
              visualMode: event.target.value as VisualMode
            })
          }
          className={selectClass}
        >
          <option value="classic">Classic</option>
          <option value="retroMagic">Retro magic</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>{fieldSize === 'compact' ? 'Motion' : 'Motion mode'}</span>
        <select
          value={data.settings.motionMode}
          onChange={(event) =>
            void onUpdateVisualSettings({
              motionMode: event.target.value as MotionMode
            })
          }
          className={selectClass}
        >
          <option value="off">Off</option>
          <option value="balanced">Balanced</option>
          <option value="wild">Wild</option>
        </select>
      </label>
      <label
        className={`flex items-center justify-between rounded-xl border border-border bg-bg/40 p-3 text-sm ${
          fieldSize === 'compact' ? 'sm:col-span-2' : ''
        }`}
      >
        <span>{ambientLabel === 'short' ? 'Ambient FX' : 'Ambient FX overlays'}</span>
        <input
          type="checkbox"
          checked={data.settings.ambientFxEnabled}
          onChange={(event) =>
            void onUpdateVisualSettings({
              ambientFxEnabled: event.target.checked
            })
          }
        />
      </label>
    </div>
  );
}

interface LayoutDensityFieldsProps {
  data: BrandOpsData;
  onUpdateCockpitPreferences: CockpitAppearanceCallbacks['onUpdateCockpitPreferences'];
  fieldSize?: 'compact' | 'comfortable';
  /** Extra copy under title (Options page) */
  layoutDescription?: string;
  /** Option labels: quick panel uses shorter text */
  shortOptionLabels?: boolean;
  /** Section heading */
  sectionTitle?: string;
}

export function CockpitLayoutDensityFields({
  data,
  onUpdateCockpitPreferences,
  fieldSize = 'comfortable',
  layoutDescription,
  shortOptionLabels,
  sectionTitle = 'Cockpit layout and density'
}: LayoutDensityFieldsProps) {
  const selectClass =
    fieldSize === 'compact'
      ? 'w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs'
      : 'w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs';

  return (
    <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
      <p className="text-sm font-medium">{sectionTitle}</p>
      {layoutDescription ? <p className="text-xs text-textMuted">{layoutDescription}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Dashboard layout</span>
          <select
            value={data.settings.cockpitLayout}
            onChange={(event) =>
              void onUpdateCockpitPreferences({
                cockpitLayout: event.target.value as CockpitLayoutMode
              })
            }
            className={selectClass}
          >
            {shortOptionLabels ? (
              <>
                <option value="sections">Section focus</option>
                <option value="unified-scroll">Unified scroll</option>
              </>
            ) : (
              <>
                <option value="sections">Section focus (default)</option>
                <option value="unified-scroll">Unified scroll (one page)</option>
              </>
            )}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Density</span>
          <select
            value={data.settings.cockpitDensity}
            onChange={(event) =>
              void onUpdateCockpitPreferences({
                cockpitDensity: event.target.value as CockpitDensityMode
              })
            }
            className={selectClass}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </div>
    </article>
  );
}

const compactSelect = 'w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs';

/** 2×2 grid for dashboard Quick settings overlay (theme, visual, motion, ambient). */
export function CockpitQuickAppearanceGrid({
  data,
  onThemeChange,
  onUpdateVisualSettings
}: {
  data: BrandOpsData;
  onThemeChange: ThemeFieldProps['onThemeChange'];
  onUpdateVisualSettings: CockpitAppearanceCallbacks['onUpdateVisualSettings'];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CockpitThemeField data={data} onThemeChange={onThemeChange} fieldSize="compact" />
      <label className="space-y-1 text-sm">
        <span className="text-text">Visual mode</span>
        <select
          value={data.settings.visualMode}
          onChange={(event) =>
            void onUpdateVisualSettings({
              visualMode: event.target.value as VisualMode
            })
          }
          className={compactSelect}
        >
          <option value="classic">Classic</option>
          <option value="retroMagic">Retro magic</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-text">Motion</span>
        <select
          value={data.settings.motionMode}
          onChange={(event) =>
            void onUpdateVisualSettings({
              motionMode: event.target.value as MotionMode
            })
          }
          className={compactSelect}
        >
          <option value="off">Off</option>
          <option value="balanced">Balanced</option>
          <option value="wild">Wild</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg/40 p-3 text-sm">
        <span>Ambient FX</span>
        <input
          type="checkbox"
          checked={data.settings.ambientFxEnabled}
          onChange={(event) =>
            void onUpdateVisualSettings({
              ambientFxEnabled: event.target.checked
            })
          }
        />
      </label>
    </div>
  );
}
