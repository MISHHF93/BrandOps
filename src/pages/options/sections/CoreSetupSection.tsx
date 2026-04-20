import { SlidersHorizontal } from 'lucide-react';
import { cockpitCapabilities, surfaceLabel } from '../../../shared/config/capabilityMap';
import {
  CockpitLayoutDensityFields,
  CockpitThemeField,
  CockpitVisualMotionAmbientFields
} from '../../../shared/ui/components/CockpitAppearanceFields';
import type {
  BrandOpsData,
  CadenceFlowSettings,
  CockpitDensityMode,
  CockpitLayoutMode,
  NotificationCenterSettings,
  VisualMode,
  MotionMode
} from '../../../types/domain';

interface CoreSetupSectionProps {
  data: BrandOpsData;
  notificationCenter: NotificationCenterSettings;
  cadenceFlow: CadenceFlowSettings;
  onThemeChange: (theme: BrandOpsData['settings']['theme']) => void;
  onUpdateVisualSettings: (payload: {
    visualMode?: VisualMode;
    motionMode?: MotionMode;
    ambientFxEnabled?: boolean;
  }) => Promise<void>;
  onUpdateCockpitPreferences: (payload: {
    cockpitLayout?: CockpitLayoutMode;
    cockpitDensity?: CockpitDensityMode;
  }) => Promise<void>;
  onUpdateNotificationCenter: (payload: Partial<NotificationCenterSettings>) => Promise<void>;
  onUpdateCadenceFlow: (payload: Partial<CadenceFlowSettings>) => Promise<void>;
}

export function CoreSetupSection({
  data,
  notificationCenter,
  cadenceFlow,
  onThemeChange,
  onUpdateVisualSettings,
  onUpdateCockpitPreferences,
  onUpdateNotificationCenter,
  onUpdateCadenceFlow
}: CoreSetupSectionProps) {
  return (
    <section id="options-core-setup" className="bo-card scroll-mt-4 space-y-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <SlidersHorizontal size={18} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
          Core setup
        </h2>
        <p className="text-xs text-textMuted">
          Runtime appearance, execution center, and daily cadence in one place.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-1">
          <p className="text-sm font-medium">Runtime</p>
          <p className="text-xs text-textMuted">AI mode: {data.settings.aiAdapterMode}</p>
          <p className="text-xs text-textMuted">Timezone: {data.settings.timezone}</p>
          <p className="text-xs text-textMuted">
            Overlay: {data.settings.overlay.enabled ? 'Enabled' : 'Disabled'} / Compact:{' '}
            {data.settings.overlay.compactMode ? 'On' : 'Off'}
          </p>
        </article>
        <CockpitThemeField data={data} onThemeChange={onThemeChange} fieldSize="comfortable" />
      </div>

      <CockpitVisualMotionAmbientFields
        data={data}
        onUpdateVisualSettings={onUpdateVisualSettings}
        fieldSize="comfortable"
        ambientLabel="long"
      />

      <CockpitLayoutDensityFields
        data={data}
        onUpdateCockpitPreferences={onUpdateCockpitPreferences}
        fieldSize="comfortable"
        layoutDescription="Unified scroll: one long dashboard with anchors for all areas. Section mode: mount one area at a time (lighter
          first paint). Compact density tucks metrics and mission-map detail behind disclosures by default."
      />

      <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
        <p className="text-sm font-medium">Execution center</p>
        <label className="flex items-center justify-between rounded-xl border border-border/70 bg-bg/55 p-3 text-sm">
          <span>Enable execution center</span>
          <input
            type="checkbox"
            checked={notificationCenter.enabled}
            onChange={(event) => void onUpdateNotificationCenter({ enabled: event.target.checked })}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Business focus</span>
            <input
              type="range"
              min={10}
              max={90}
              value={notificationCenter.managerialWeight}
              onChange={(event) =>
                void onUpdateNotificationCenter({ managerialWeight: Number(event.target.value) })
              }
              className="w-full"
            />
            <p className="text-xs text-textMuted">
              {notificationCenter.managerialWeight}% business / {100 - notificationCenter.managerialWeight}% build
            </p>
          </label>
          <label className="space-y-1 text-sm">
            <span>Max tasks per lane</span>
            <input
              type="number"
              min={1}
              max={8}
              value={notificationCenter.maxDailyTasks}
              onChange={(event) =>
                void onUpdateNotificationCenter({ maxDailyTasks: Number(event.target.value) })
              }
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>Workday start hour</span>
            <input
              type="number"
              min={0}
              max={23}
              value={notificationCenter.workdayStartHour}
              onChange={(event) =>
                void onUpdateNotificationCenter({ workdayStartHour: Number(event.target.value) })
              }
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Workday end hour</span>
            <input
              type="number"
              min={1}
              max={24}
              value={notificationCenter.workdayEndHour}
              onChange={(event) =>
                void onUpdateNotificationCenter({ workdayEndHour: Number(event.target.value) })
              }
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Guidance mode</span>
            <select
              value={notificationCenter.aiGuidanceMode}
              onChange={(event) =>
                void onUpdateNotificationCenter({
                  aiGuidanceMode: event.target.value as typeof notificationCenter.aiGuidanceMode
                })
              }
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            >
              <option value="rule-based">Rule-based</option>
              <option value="prompt-ready">Prompt-ready</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Preferred AI model</span>
            <input
              value={notificationCenter.preferredModel}
              onChange={(event) => void onUpdateNotificationCenter({ preferredModel: event.target.value })}
              placeholder="gpt-5.4-mini"
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
            <span>Include dataset hygiene reminders</span>
            <input
              type="checkbox"
              checked={notificationCenter.datasetReviewEnabled}
              onChange={(event) =>
                void onUpdateNotificationCenter({ datasetReviewEnabled: event.target.checked })
              }
            />
          </label>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
          <span>Include integration review reminders</span>
          <input
            type="checkbox"
            checked={notificationCenter.integrationReviewEnabled}
            onChange={(event) =>
              void onUpdateNotificationCenter({ integrationReviewEnabled: event.target.checked })
            }
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Role context</span>
          <textarea
            value={notificationCenter.roleContext}
            onChange={(event) => void onUpdateNotificationCenter({ roleContext: event.target.value })}
            rows={3}
            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>AI prompt template</span>
          <textarea
            value={notificationCenter.promptTemplate}
            onChange={(event) => void onUpdateNotificationCenter({ promptTemplate: event.target.value })}
            rows={6}
            className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
          />
          <p className="text-xs text-textSoft">
            Available placeholders: <code>{'{{role_context}}'}</code>, <code>{'{{preferred_model}}'}</code>,{' '}
            <code>{'{{managerial_focus_percent}}'}</code>, <code>{'{{technical_focus_percent}}'}</code>,{' '}
            <code>{'{{managerial_tasks}}'}</code>, <code>{'{{technical_tasks}}'}</code>, <code>{'{{dataset_tasks}}'}</code>.
          </p>
        </label>
      </article>

      <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
        <p className="text-sm font-medium">Cadence + data flow</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Cadence mode</span>
            <select
              value={cadenceFlow.mode}
              onChange={(event) =>
                void onUpdateCadenceFlow({
                  mode: event.target.value as typeof cadenceFlow.mode
                })
              }
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            >
              <option value="balanced">Balanced</option>
              <option value="maker-heavy">Maker-heavy</option>
              <option value="client-heavy">Client-heavy</option>
              <option value="launch-day">Launch-day</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Reminder lead minutes</span>
            <input
              type="number"
              min={5}
              max={90}
              value={cadenceFlow.remindBeforeMinutes}
              onChange={(event) =>
                void onUpdateCadenceFlow({ remindBeforeMinutes: Number(event.target.value) })
              }
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Deep work blocks</span>
            <input
              type="number"
              min={1}
              max={3}
              value={cadenceFlow.deepWorkBlockCount}
              onChange={(event) => void onUpdateCadenceFlow({ deepWorkBlockCount: Number(event.target.value) })}
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Hours per deep work block</span>
            <input
              type="number"
              min={1}
              max={4}
              step={0.5}
              value={cadenceFlow.deepWorkBlockHours}
              onChange={(event) => void onUpdateCadenceFlow({ deepWorkBlockHours: Number(event.target.value) })}
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
            <span>Include startup scan block</span>
            <input
              type="checkbox"
              checked={cadenceFlow.includeStartupBlock}
              onChange={(event) => void onUpdateCadenceFlow({ includeStartupBlock: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
            <span>Include artifact review block</span>
            <input
              type="checkbox"
              checked={cadenceFlow.includeArtifactReviewBlock}
              onChange={(event) => void onUpdateCadenceFlow({ includeArtifactReviewBlock: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
            <span>Include shutdown review block</span>
            <input
              type="checkbox"
              checked={cadenceFlow.includeShutdownBlock}
              onChange={(event) => void onUpdateCadenceFlow({ includeShutdownBlock: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
            <span>Log daily sync snapshots to integration hub</span>
            <input
              type="checkbox"
              checked={cadenceFlow.artifactSyncEnabled}
              onChange={(event) => void onUpdateCadenceFlow({ artifactSyncEnabled: event.target.checked })}
            />
          </label>
        </div>
        <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
          <span>Show cadence lead reminders (timed prompts before each block)</span>
          <input
            type="checkbox"
            checked={cadenceFlow.calendarSyncEnabled}
            onChange={(event) => void onUpdateCadenceFlow({ calendarSyncEnabled: event.target.checked })}
          />
        </label>
      </article>

      <article className="rounded-xl border border-border bg-bg/40 p-3">
        <h3 className="text-sm font-semibold">Workspace map</h3>
        <p className="mt-1 text-xs text-textMuted">
          Each capability has one primary home; other surfaces are quick-entry or read-only context.
        </p>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {cockpitCapabilities.map((cap) => (
            <li key={cap.id} className="rounded-xl border border-border/80 bg-bg/55 px-3 py-2">
              <p className="font-medium text-text">{cap.label}</p>
              <p className="text-xs text-textMuted">{cap.summary}</p>
              <p className="mt-1 text-[11px] text-textSoft">
                Primary: {surfaceLabel(cap.primarySurface)}
                {cap.secondarySurfaces.length > 0
                  ? ` · Also: ${cap.secondarySurfaces.map(surfaceLabel).join(', ')}`
                  : ''}
              </p>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
