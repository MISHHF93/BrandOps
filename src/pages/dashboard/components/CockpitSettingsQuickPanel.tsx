import {
  CockpitLayoutDensityFields,
  CockpitQuickAppearanceGrid
} from '../../../shared/ui/components/CockpitAppearanceFields';
import type {
  BrandOpsData,
  CockpitDensityMode,
  CockpitLayoutMode,
  MotionMode,
  VisualMode
} from '../../../types/domain';

export interface CockpitSettingsQuickPanelProps {
  data: BrandOpsData;
  onThemeChange: (theme: BrandOpsData['settings']['theme']) => void;
  onUpdateVisualSettings: (payload: {
    visualMode?: VisualMode;
    motionMode?: MotionMode;
    ambientFxEnabled?: boolean;
  }) => void | Promise<void>;
  onUpdateCockpitPreferences: (payload: {
    cockpitLayout?: CockpitLayoutMode;
    cockpitDensity?: CockpitDensityMode;
  }) => void | Promise<void>;
  onOpenFullSettings: () => void;
  onJumpToConnections: () => void;
}

export function CockpitSettingsQuickPanel({
  data,
  onThemeChange,
  onUpdateVisualSettings,
  onUpdateCockpitPreferences,
  onOpenFullSettings,
  onJumpToConnections
}: CockpitSettingsQuickPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-textMuted">
        Adjust cockpit appearance and layout. Sync, OAuth, backups, and diagnostics stay in the full Settings
        window.
      </p>

      <CockpitQuickAppearanceGrid
        data={data}
        onThemeChange={onThemeChange}
        onUpdateVisualSettings={onUpdateVisualSettings}
      />

      <CockpitLayoutDensityFields
        data={data}
        onUpdateCockpitPreferences={onUpdateCockpitPreferences}
        fieldSize="compact"
        shortOptionLabels
        sectionTitle="Cockpit layout"
      />

      <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
        <button type="button" className="bo-link w-full justify-center text-sm" onClick={onJumpToConnections}>
          Open Connections area
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-primary/35 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-primary/16"
          onClick={onOpenFullSettings}
        >
          Open full Settings
        </button>
      </div>
    </div>
  );
}
