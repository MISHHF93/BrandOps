import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Settings2 } from 'lucide-react';
import type { AgentWorkspaceResult } from '../../services/agent/agentWorkspaceEngine';
import type { CadenceFlowMode, VisualMode, MotionMode } from '../../types/domain';
import { hrefHelpPage } from '../../shared/navigation/navigationIntents';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import type { IntelligenceRulesLoadMode } from '../../rules/intelligenceRulesRuntime';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { MobileSettingsFullReadout } from './mobileSettingsReadout';
import { CONFIG_PRESETS, OPERATIONAL_PRESETS } from './mobileSettingsPresets';
import { MobileTabPageHeader, MobileTabSection, mobileChipClass } from './mobileTabPrimitives';
import { ShellSectionCallout } from './ShellSectionCallout';
import { SettingsCockpitCapabilityDisclosure } from './SettingsCockpitCapabilityDisclosure';

export type { MobileWorkspaceSnapshot as MobileSettingsSnapshot } from './buildWorkspaceSnapshot';

function forConfigureQuoting(value: string) {
  return value.replace(/"/g, "'").replace(/\n/g, ' ').trim();
}

function intelligenceRulesSourceLabel(mode: IntelligenceRulesLoadMode): string {
  switch (mode) {
    case 'env-url':
      return 'Remote (VITE_INTELLIGENCE_RULES_URL)';
    case 'bundled-json':
      return 'Packaged brandops-intelligence-rules.json';
    default:
      return 'Embedded defaults';
  }
}

const settingsRunChipClass = (btnFocus: string) =>
  `${mobileChipClass(btnFocus)} disabled:cursor-not-allowed disabled:opacity-50`;

const fieldClass = (btnFocus: string) =>
  `w-full rounded-lg border border-zinc-600/60 bg-zinc-900/80 px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${btnFocus}`;

const primaryBtn = (btnFocus: string) =>
  `mt-2 inline-flex w-full sm:w-auto justify-center rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-2 text-xs font-medium text-indigo-100 hover:bg-indigo-900/30 disabled:cursor-not-allowed disabled:opacity-50 ${btnFocus}`;

function workspaceModelRows(r: MobileSettingsFullReadout): Array<[string, string]> {
  return [
    ['Timezone', r.timezone],
    ['Week starts on', r.weekStartsOn],
    ['Default reminder lead (h)', String(r.defaultReminderLeadHours)],
    ['Theme', r.theme],
    ['Cockpit layout', r.cockpitLayout],
    ['Cockpit density', r.cockpitDensity],
    ['Local model enabled', r.localModelEnabled ? 'yes' : 'no'],
    ['AI adapter mode', r.aiAdapterMode],
    ['Primary identity provider', r.primaryIdentityProvider],
    ['Notifications enabled', r.notificationsEnabled ? 'yes' : 'no'],
    ['AI guidance mode', r.aiGuidanceMode],
    ['Preferred model', r.preferredModel],
    ['Role context', r.roleContextPreview],
    ['Prompt template', r.promptTemplatePreview],
    ['Dataset review', r.datasetReviewEnabled ? 'yes' : 'no'],
    ['Integration review', r.integrationReviewEnabled ? 'yes' : 'no'],
    ['Deep work blocks', String(r.deepWorkBlockCount)],
    ['Deep work hours', String(r.deepWorkBlockHours)],
    ['Include startup block', r.includeStartupBlock ? 'yes' : 'no'],
    ['Include shutdown block', r.includeShutdownBlock ? 'yes' : 'no'],
    ['Include artifact review block', r.includeArtifactReviewBlock ? 'yes' : 'no'],
    ['Calendar sync', r.calendarSyncEnabled ? 'yes' : 'no'],
    ['Artifact sync', r.artifactSyncEnabled ? 'yes' : 'no'],
    ['Overlay enabled', r.overlayEnabled ? 'yes' : 'no'],
    ['Overlay compact', r.overlayCompact ? 'yes' : 'no'],
    ['Overlay contact insights', r.overlayContactInsights ? 'yes' : 'no'],
    ['Automation rules', String(r.automationRuleCount)],
    ['Automation summary', r.automationRulesSummary],
    ['Brand voice (preview)', r.brandVoiceGuidePreview]
  ];
}

function WorkspaceModelReadout({
  readout,
  btnFocus
}: {
  readout: MobileSettingsFullReadout;
  btnFocus: string;
}) {
  const rows = workspaceModelRows(readout);
  return (
    <MobileTabSection
      id="settings-model-readout"
      title="Workspace model (read-only)"
      description="Values from persisted BrandOpsData (domain types in src/types/domain.ts). Collapsed by default to keep the tab scannable."
    >
      <details className="group mt-2 rounded-lg border border-white/5 bg-zinc-950/30 p-2 open:border-indigo-500/20">
        <summary
          className={`cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wide text-zinc-500 ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            Expand full settings readout
            <span className="text-[10px] font-normal normal-case text-zinc-600 group-open:hidden">({rows.length} fields)</span>
          </span>
        </summary>
        <dl className="mt-3 max-h-[min(24rem,50vh)] space-y-0 overflow-y-auto text-[11px] [scrollbar-width:thin]">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-2 border-b border-white/5 py-1.5 last:border-b-0"
            >
              <dt className="shrink-0 text-zinc-500">{label}</dt>
              <dd className="min-w-0 break-words text-right text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </MobileTabSection>
  );
}

function SettingsEditablePanel({
  snapshot,
  applySettingsConfigure,
  applyBusy,
  btnFocus
}: {
  snapshot: MobileWorkspaceSnapshot;
  applySettingsConfigure: (s: string) => Promise<AgentWorkspaceResult | null>;
  applyBusy: boolean;
  btnFocus: string;
}) {
  const [applyError, setApplyError] = useState<string | null>(null);
  const [wdStart, setWdStart] = useState('');
  const [wdEnd, setWdEnd] = useState('');
  const [maxTasks, setMaxTasks] = useState('');
  const [remindMin, setRemindMin] = useState('');
  const [mWeight, setMWeight] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [primaryOffer, setPrimaryOffer] = useState('');
  const [focusMetric, setFocusMetric] = useState('');
  const [cadenceMode, setCadenceMode] = useState<CadenceFlowMode>('balanced');
  const [visualMode, setVisualMode] = useState<VisualMode>('classic');
  const [motionMode, setMotionMode] = useState<MotionMode>('balanced');
  const [applyHint, setApplyHint] = useState<string | null>(null);

  useEffect(() => {
    setWdStart(String(snapshot.workdayStartHour));
    setWdEnd(String(snapshot.workdayEndHour));
    setMaxTasks(String(snapshot.maxDailyTasks));
    setRemindMin(String(snapshot.remindBeforeMinutes));
    setMWeight(String(snapshot.managerialWeight));
    setOperatorName(snapshot.operatorName);
    setPrimaryOffer(snapshot.primaryOffer);
    setFocusMetric(snapshot.focusMetric);
    setCadenceMode(snapshot.cadenceMode as CadenceFlowMode);
    setVisualMode(snapshot.visualMode as VisualMode);
    setMotionMode(snapshot.motionMode as MotionMode);
  }, [
    snapshot.workdayStartHour,
    snapshot.workdayEndHour,
    snapshot.maxDailyTasks,
    snapshot.remindBeforeMinutes,
    snapshot.managerialWeight,
    snapshot.operatorName,
    snapshot.primaryOffer,
    snapshot.focusMetric,
    snapshot.cadenceMode,
    snapshot.visualMode,
    snapshot.motionMode
  ]);

  useEffect(() => {
    if (!applyHint) return;
    const t = window.setTimeout(() => setApplyHint(null), 3000);
    return () => window.clearTimeout(t);
  }, [applyHint]);

  useEffect(() => {
    if (!applyError) return;
    const t = window.setTimeout(() => setApplyError(null), 5000);
    return () => window.clearTimeout(t);
  }, [applyError]);

  const runApply = useCallback(
    async (line: string, validationHint?: string) => {
      if (validationHint) {
        setApplyError(null);
        setApplyHint(validationHint);
        return;
      }
      setApplyError(null);
      const r = await applySettingsConfigure(line);
      if (r === null) return;
      if (!r.ok) {
        setApplyHint(null);
        setApplyError(r.summary);
        return;
      }
      setApplyHint(r.summary.trim() || 'Applied.');
    },
    [applySettingsConfigure]
  );

  const onApplySchedule = useCallback(async () => {
    const wds = Math.max(0, Math.min(23, Math.round(Number(wdStart) || 0)));
    const wde = Math.max(1, Math.min(24, Math.round(Number(wdEnd) || 18)));
    const maxT = Math.max(1, Math.min(8, Math.round(Number(maxTasks) || 4)));
    const rM = Math.max(5, Math.min(90, Math.round(Number(remindMin) || 20)));
    const mw = Math.max(10, Math.min(90, Math.round(Number(mWeight) || 50)));
    const line = `workday ${wds} to ${wde}, max tasks per lane ${maxT}, remind before ${rM} min, ${mw}% business`;
    await runApply(line);
  }, [runApply, wdStart, wdEnd, maxTasks, remindMin, mWeight]);

  const onApplyProfile = useCallback(async () => {
    const op = forConfigureQuoting(operatorName);
    const po = forConfigureQuoting(primaryOffer);
    const fm = forConfigureQuoting(focusMetric);
    if (!op && !po && !fm) {
      void runApply('', 'Enter at least one profile field.');
      return;
    }
    const parts: string[] = [];
    if (op) parts.push(`operator name is "${op}"`);
    if (po) parts.push(`primary offer is "${po}"`);
    if (fm) parts.push(`focus metric is "${fm}"`);
    await runApply(parts.join(', '));
  }, [runApply, operatorName, primaryOffer, focusMetric]);

  const onApplyCadence = useCallback(async () => {
    const line =
      cadenceMode === 'launch-day'
        ? 'cadence launch-day'
        : cadenceMode === 'maker-heavy'
          ? 'cadence maker-heavy'
          : cadenceMode === 'client-heavy'
            ? 'cadence client-heavy'
            : 'cadence balanced';
    await runApply(line);
  }, [runApply, cadenceMode]);

  const onApplyVisual = useCallback(async () => {
    const line = visualMode === 'retroMagic' ? 'retro' : 'classic';
    await runApply(line);
  }, [runApply, visualMode]);

  const onApplyMotion = useCallback(async () => {
    const map: Record<MotionMode, string> = {
      off: 'motion off',
      balanced: 'motion balanced',
      wild: 'motion wild'
    };
    await runApply(map[motionMode]);
  }, [runApply, motionMode]);

  const onToggleAmbient = useCallback(async () => {
    const line = snapshot.ambientFxEnabled ? 'disable ambient' : 'enable ambient';
    await runApply(line);
  }, [runApply, snapshot.ambientFxEnabled]);

  const onToggleDebug = useCallback(async () => {
    const line = snapshot.debugMode ? 'disable debug' : 'enable debug';
    await runApply(line);
  }, [runApply, snapshot.debugMode]);

  const f = fieldClass(btnFocus);
  const pBtn = primaryBtn(btnFocus);
  return (
    <MobileTabSection
      id="settings-editable"
      title="Preferences"
      description="Adjust workspace fields stored on this device. Apply uses the same configure engine as Chat, without posting to the chat feed."
    >
      {applyError ? (
        <p className="mb-2 rounded border border-rose-500/30 bg-rose-950/20 px-2 py-1.5 text-[11px] text-rose-200/95" role="alert">
          {applyError}
        </p>
      ) : null}
      {applyHint ? (
        <p className="mb-2 rounded border border-indigo-500/30 bg-indigo-950/20 px-2 py-1.5 text-[11px] text-indigo-200/95">
          {applyHint}
        </p>
      ) : null}

      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Workday, tasks, weights</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-wd-start">
            Start (hour, 0–23)
          </label>
          <input
            id="bo-wd-start"
            type="number"
            min={0}
            max={23}
            value={wdStart}
            onChange={(e) => setWdStart(e.target.value)}
            className={f}
            disabled={applyBusy}
          />
        </div>
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-wd-end">
            End (hour, 1–24)
          </label>
          <input
            id="bo-wd-end"
            type="number"
            min={1}
            max={24}
            value={wdEnd}
            onChange={(e) => setWdEnd(e.target.value)}
            className={f}
            disabled={applyBusy}
          />
        </div>
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-max-t">
            Max tasks / lane
          </label>
          <input
            id="bo-max-t"
            type="number"
            min={1}
            max={8}
            value={maxTasks}
            onChange={(e) => setMaxTasks(e.target.value)}
            className={f}
            disabled={applyBusy}
          />
        </div>
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-remind">
            Remind before (min)
          </label>
          <input
            id="bo-remind"
            type="number"
            min={5}
            max={90}
            value={remindMin}
            onChange={(e) => setRemindMin(e.target.value)}
            className={f}
            disabled={applyBusy}
          />
        </div>
      </div>
      <div className="mt-2">
        <label className="text-[11px] text-zinc-500" htmlFor="bo-mw">
          Business / managerial weight (%)
        </label>
        <input
          id="bo-mw"
          type="number"
          min={10}
          max={90}
          value={mWeight}
          onChange={(e) => setMWeight(e.target.value)}
          className={f}
          disabled={applyBusy}
        />
      </div>
      <button type="button" onClick={() => void onApplySchedule()} disabled={applyBusy} className={pBtn}>
        Apply workday, tasks, remind &amp; weight
      </button>

      <p className="mb-1 mt-4 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Cadence mode</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="text-[11px] text-zinc-500" htmlFor="bo-cadence">
            Mode
          </label>
          <select
            id="bo-cadence"
            value={cadenceMode}
            onChange={(e) => setCadenceMode(e.target.value as CadenceFlowMode)}
            className={f}
            disabled={applyBusy}
          >
            <option value="balanced">Balanced</option>
            <option value="maker-heavy">Maker-heavy</option>
            <option value="client-heavy">Client-heavy</option>
            <option value="launch-day">Launch day</option>
          </select>
        </div>
        <button type="button" onClick={() => void onApplyCadence()} disabled={applyBusy} className={pBtn}>
          Apply cadence
        </button>
      </div>

      <p className="mb-1 mt-4 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Profile</p>
      <div className="space-y-2">
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-op">
            Operator name
          </label>
          <input
            id="bo-op"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            className={f}
            disabled={applyBusy}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-offer">
            Primary offer
          </label>
          <input
            id="bo-offer"
            value={primaryOffer}
            onChange={(e) => setPrimaryOffer(e.target.value)}
            className={f}
            disabled={applyBusy}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-fm">
            Focus metric
          </label>
          <input
            id="bo-fm"
            value={focusMetric}
            onChange={(e) => setFocusMetric(e.target.value)}
            className={f}
            disabled={applyBusy}
            autoComplete="off"
          />
        </div>
        <button type="button" onClick={() => void onApplyProfile()} disabled={applyBusy} className={pBtn}>
          Apply profile
        </button>
      </div>

      <p className="mb-1 mt-4 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Visual &amp; motion</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-vis">
            Visual
          </label>
          <select
            id="bo-vis"
            value={visualMode}
            onChange={(e) => setVisualMode(e.target.value as VisualMode)}
            className={f}
            disabled={applyBusy}
          >
            <option value="classic">Classic</option>
            <option value="retroMagic">Retro</option>
          </select>
          <button type="button" onClick={() => void onApplyVisual()} disabled={applyBusy} className={pBtn}>
            Apply visual
          </button>
        </div>
        <div>
          <label className="text-[11px] text-zinc-500" htmlFor="bo-mot">
            Motion
          </label>
          <select
            id="bo-mot"
            value={motionMode}
            onChange={(e) => setMotionMode(e.target.value as MotionMode)}
            className={f}
            disabled={applyBusy}
          >
            <option value="off">Off</option>
            <option value="balanced">Balanced</option>
            <option value="wild">Wild</option>
          </select>
          <button type="button" onClick={() => void onApplyMotion()} disabled={applyBusy} className={pBtn}>
            Apply motion
          </button>
        </div>
      </div>

      <p className="mb-1 mt-4 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Toggles</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onToggleAmbient()}
          disabled={applyBusy}
          className={mobileChipClass(btnFocus)}
        >
          {snapshot.ambientFxEnabled ? 'Turn ambient off' : 'Turn ambient on'}
        </button>
        <button
          type="button"
          onClick={() => void onToggleDebug()}
          disabled={applyBusy}
          className={mobileChipClass(btnFocus)}
        >
          {snapshot.debugMode ? 'Turn debug off' : 'Turn debug on'}
        </button>
      </div>
    </MobileTabSection>
  );
}

export interface MobileSettingsViewProps {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  runCommand: (command: string) => void | Promise<void>;
  /** `configure:` via agent engine without posting to the chat feed. */
  applySettingsConfigure: (configurePayloadOrLine: string) => Promise<AgentWorkspaceResult | null>;
  /** Preferences panel `configure:` apply only. */
  applyBusy: boolean;
  /** Chat / quick-command in flight (presets, audit re-run, vault chips). */
  commandBusy: boolean;
  onRequestClearChat: () => void;
  onExportWorkspace: () => Promise<void>;
  onImportWorkspace: (raw: string) => Promise<void>;
  onRequestResetWorkspace: () => void;
  /** Host document; avoids offering a duplicate `integrations.html` tab when already there. */
  documentSurface: AppDocumentSurfaceId | 'chatbot';
}

/**
 * Workspace configuration: editable preferences, optional configure presets, session, and packaged page link.
 */
export const MobileSettingsView = ({
  snapshot,
  btnFocus,
  onRequestClearChat,
  onExportWorkspace,
  onImportWorkspace,
  onRequestResetWorkspace,
  documentSurface,
  runCommand,
  applySettingsConfigure,
  applyBusy,
  commandBusy
}: MobileSettingsViewProps) => {
  const importRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  /** Any agent route (settings apply or chat quick command) — avoid parallel `executeAgentWorkspaceCommand`. */
  const agentRouteBusy = commandBusy || applyBusy;

  useEffect(() => {
    if (!importMessage) return;
    const t = window.setTimeout(() => setImportMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [importMessage]);

  const onImportPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await onImportWorkspace(await file.text());
      setImportMessage('Imported successfully.');
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  const dataBtn = `w-full rounded-lg border border-zinc-600/50 bg-zinc-900/50 px-2.5 py-2 text-left text-[12px] text-zinc-200 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50 ${btnFocus}`;

  return (
    <div className="mt-2 space-y-5" aria-label="Settings">
      <MobileTabPageHeader
        title="Settings"
        subtitle="Configure this workspace: preferences, presets, and session"
        icon={Settings2}
        iconWrapperClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-950/30"
        iconClassName="text-indigo-300"
      />

      <ShellSectionCallout tab="settings" className="mt-3" />

      <MobileTabSection
        id="settings-dataset-lineage"
        title="Dataset lineage"
        description="Seed metadata for this device (demo vs production-empty, version)."
      >
        <dl className="mt-2 space-y-1.5 text-[11px] text-zinc-300">
          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
            <dt className="shrink-0 text-zinc-500">Source</dt>
            <dd className="min-w-0 break-words text-right text-zinc-200">{snapshot.seedReadout.source}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
            <dt className="shrink-0 text-zinc-500">Version</dt>
            <dd className="min-w-0 break-words text-right text-zinc-200">{snapshot.seedReadout.version}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
            <dt className="shrink-0 text-zinc-500">Seeded at</dt>
            <dd className="min-w-0 break-words text-right text-zinc-200">{snapshot.seedReadout.seededAt}</dd>
          </div>
          {snapshot.seedReadout.welcomeCompletedAt ? (
            <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
              <dt className="shrink-0 text-zinc-500">Welcome completed</dt>
              <dd className="min-w-0 break-words text-right text-zinc-200">
                {snapshot.seedReadout.welcomeCompletedAt}
              </dd>
            </div>
          ) : null}
          {snapshot.seedReadout.onboardingVersion ? (
            <div className="flex justify-between gap-2 py-1.5">
              <dt className="shrink-0 text-zinc-500">Onboarding copy</dt>
              <dd className="min-w-0 break-words text-right text-zinc-200">
                v{snapshot.seedReadout.onboardingVersion}
              </dd>
            </div>
          ) : null}
        </dl>
      </MobileTabSection>

      <MobileTabSection
        id="settings-intelligence-rules"
        title="Intelligence rules (effective)"
        description="Coefficients for cockpit ranking and digest slices. Resolved at extension startup and when this page loads."
      >
        {!snapshot.intelligenceRulesReadout.initRan ? (
          <p className="mt-2 text-[10px] text-zinc-500">
            Load status will refresh after the first rules init (extension background on install/startup, or this
            document load).
          </p>
        ) : null}
        <dl className="mt-2 space-y-1.5 text-[11px] text-zinc-300">
          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
            <dt className="shrink-0 text-zinc-500">Source</dt>
            <dd className="min-w-0 break-words text-right text-zinc-200">
              {intelligenceRulesSourceLabel(snapshot.intelligenceRulesReadout.mode)}
            </dd>
          </div>
          {snapshot.intelligenceRulesReadout.detail ? (
            <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
              <dt className="shrink-0 text-zinc-500">Resolved from</dt>
              <dd className="min-w-0 break-words text-right text-zinc-200">
                {snapshot.intelligenceRulesReadout.detail}
              </dd>
            </div>
          ) : null}
          {snapshot.intelligenceRulesReadout.error ? (
            <div className="rounded border border-amber-500/25 bg-amber-950/20 px-2 py-1.5 text-[10px] text-amber-200/95">
              {snapshot.intelligenceRulesReadout.error}
            </div>
          ) : null}
        </dl>
        <details className="group mt-3 rounded-lg border border-white/5 bg-zinc-950/30 p-2 open:border-indigo-500/20">
          <summary
            className={`cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wide text-zinc-500 ${btnFocus} [&::-webkit-details-marker]:hidden`}
          >
            <span className="inline-flex items-center gap-2">
              Sample coefficients
              <span className="text-[10px] font-normal normal-case text-zinc-600 group-open:hidden">(expand)</span>
            </span>
          </summary>
          <dl className="mt-3 space-y-1.5 text-[11px] text-zinc-300">
            <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
              <dt className="shrink-0 text-zinc-500">Schema version</dt>
              <dd className="text-right text-zinc-200">{snapshot.intelligenceRulesReadout.schemaVersion}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
              <dt className="shrink-0 text-zinc-500">Content priority base</dt>
              <dd className="text-right text-zinc-200">{snapshot.intelligenceRulesReadout.contentPriorityBaseScore}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
              <dt className="shrink-0 text-zinc-500">Outreach stale after (h)</dt>
              <dd className="text-right text-zinc-200">{snapshot.intelligenceRulesReadout.outreachStaleAfterHours}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
              <dt className="shrink-0 text-zinc-500">Publishing urgent within (h)</dt>
              <dd className="text-right text-zinc-200">
                {snapshot.intelligenceRulesReadout.publishingUrgentWithinHours}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
              <dt className="shrink-0 text-zinc-500">Digest content-priority top N</dt>
              <dd className="text-right text-zinc-200">
                {snapshot.intelligenceRulesReadout.digestTechnicalContentPriorityTop}
              </dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5">
              <dt className="shrink-0 text-zinc-500">Publishing preview slice</dt>
              <dd className="text-right text-zinc-200">{snapshot.intelligenceRulesReadout.previewQueueSlice}</dd>
            </div>
          </dl>
        </details>
        <p className="mt-2 text-[10px] text-zinc-600">
          Template:{' '}
          <code className="rounded bg-zinc-900/80 px-1 text-[10px] text-zinc-400">
            public/brandops-intelligence-rules.example.json
          </code>
        </p>
      </MobileTabSection>

      <MobileTabSection
        id="settings-messaging-vault"
        title="Messaging vault"
        description="Reusable snippets by category (titles only; full text stays in workspace data)."
      >
        {snapshot.settingsMessagingVaultPeek.length === 0 ? (
          <p className="mt-2 text-[11px] text-zinc-500">No messaging vault entries in this workspace.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.settingsMessagingVaultPeek.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/5 bg-zinc-950/30 px-2 py-2 text-[11px] text-zinc-300"
              >
                <p className="font-medium text-zinc-100">{row.title}</p>
                <p className="text-[10px] text-zinc-500">{row.category}</p>
                <button
                  type="button"
                  disabled={agentRouteBusy}
                  onClick={() =>
                    void runCommand(`add note: review messaging vault entry "${row.title.replace(/"/g, "'")}"`)
                  }
                  className={`mt-2 ${settingsRunChipClass(btnFocus)}`}
                >
                  Log note in Chat
                </button>
              </li>
            ))}
          </ul>
        )}
      </MobileTabSection>

      <SettingsCockpitCapabilityDisclosure btnFocus={btnFocus} />

      <SettingsEditablePanel
        snapshot={snapshot}
        applySettingsConfigure={applySettingsConfigure}
        applyBusy={applyBusy}
        btnFocus={btnFocus}
      />

      <WorkspaceModelReadout readout={snapshot.settingsFullReadout} btnFocus={btnFocus} />

      <MobileTabSection
        id="settings-help"
        title="Help"
        description="Command reference, onboarding, and troubleshooting — opens the packaged Help page (same extension)."
      >
        <a
          href={hrefHelpPage()}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-2 flex w-full items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-2.5 py-2 text-center text-[12px] font-medium text-indigo-100 hover:bg-indigo-900/30 ${btnFocus}`}
        >
          Open Help (new tab)
        </a>
      </MobileTabSection>

      <MobileTabSection
        id="settings-presets"
        title="One-tap configure presets"
        description='Sends a configure: line like Chat. Chips below adjust UI and cadence. Workspace modes package settings for pipeline work, publishing, deep focus, and launch pushes (Pulse / Today–aligned, still on-device agent routes).'
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">UI &amp; cadence</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CONFIG_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={agentRouteBusy}
              onClick={() => void runCommand(preset.command)}
              className={settingsRunChipClass(btnFocus)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="mb-1 mt-4 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Workspace modes</p>
        <div className="mt-1.5 flex flex-col gap-3">
          {OPERATIONAL_PRESETS.map((preset) => (
            <div key={preset.label} className="rounded-lg border border-white/5 bg-zinc-950/20 px-2 py-2">
              <button
                type="button"
                disabled={agentRouteBusy}
                title={preset.description}
                onClick={() => void runCommand(preset.command)}
                className={`w-full text-left ${settingsRunChipClass(btnFocus)}`}
              >
                {preset.label}
              </button>
              <p className="mt-1.5 pl-0.5 text-[10px] leading-snug text-zinc-500">{preset.description}</p>
            </div>
          ))}
        </div>
      </MobileTabSection>

      <MobileTabSection
        id="settings-audit"
        title="Recent agent activity"
        description="Commands that touched workspace data, newest first. Re-run repeats the same line in Chat."
      >
        {snapshot.recentAudit.length === 0 ? (
          <p className="mt-2 text-[11px] text-zinc-500">
            No commands recorded yet. Run a command in Chat to populate this list.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {snapshot.recentAudit.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-white/5 bg-zinc-950/30 px-2.5 py-2 text-[11px] text-zinc-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <code className="break-all text-left text-[10px] text-indigo-200/95">{entry.commandPreview}</code>
                  <span
                    className={`shrink-0 text-[10px] font-medium uppercase ${
                      entry.ok ? 'text-emerald-400/90' : 'text-amber-300/90'
                    }`}
                  >
                    {entry.ok ? 'ok' : 'issue'}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-zinc-500">{entry.summary}</p>
                <button
                  type="button"
                  disabled={agentRouteBusy}
                  onClick={() => void runCommand(entry.commandPreview)}
                  className={`mt-2 ${settingsRunChipClass(btnFocus)}`}
                >
                  Run again
                </button>
              </li>
            ))}
          </ul>
        )}
      </MobileTabSection>

      <MobileTabSection
        id="settings-data"
        title="Workspace data"
        description="Export a JSON backup, import a prior export, or reset to the built-in seed (destructive)."
      >
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onImportPick(e)}
        />
        {importMessage ? (
          <p className="mb-2 rounded border border-zinc-600/40 bg-zinc-950/50 px-2 py-1.5 text-[11px] text-zinc-300">
            {importMessage}
          </p>
        ) : null}
        <div className="mt-2 flex flex-col gap-2">
          <button type="button" onClick={() => void onExportWorkspace()} className={dataBtn}>
            Export workspace JSON
          </button>
          <button type="button" onClick={() => importRef.current?.click()} className={dataBtn}>
            Import workspace JSON…
          </button>
          <button
            type="button"
            onClick={onRequestResetWorkspace}
            className={`${dataBtn} border-amber-600/40 text-amber-100/95`}
          >
            Reset workspace to seed…
          </button>
        </div>
      </MobileTabSection>

      <MobileTabSection
        id="settings-session"
        title="Session"
        description="Local chat history for this page only. Clearing does not change workspace data."
      >
        <div className="mt-2">
          <button type="button" onClick={onRequestClearChat} className={mobileChipClass(btnFocus)}>
            Clear chat transcript
          </button>
        </div>
      </MobileTabSection>

      <section
        className="rounded-xl border border-zinc-600/25 bg-zinc-950/50 p-3 text-xs"
        aria-labelledby="settings-extension-escape"
      >
        <h3 id="settings-extension-escape" className="text-sm font-semibold text-zinc-100">
          Extension shell
        </h3>
        {documentSurface === 'integrations' ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            This is the MV3 <strong className="text-zinc-400">extension</strong> page (manifest <code>options_ui</code>
            ): same <strong className="text-zinc-400">BrandOps Mobile</strong> shell as <code>mobile.html</code>. Use the
            bottom bar for Integrations vs Settings; preferences above match the main app tab.
          </p>
        ) : (
          <>
            <p className="mt-1 text-[11px] text-zinc-500">
              Opens <code className="rounded bg-zinc-900/80 px-1 text-[10px] text-zinc-300">integrations.html</code> in
              a new tab—the same UI as Chrome extension options, aligned with the Integrations tab link there.
            </p>
            <button
              type="button"
              onClick={() => openExtensionSurface('integrations')}
              className={`mt-2 w-full rounded-lg border border-zinc-600/50 bg-zinc-900/40 px-2.5 py-2 text-left text-[12px] text-zinc-300 ${btnFocus}`}
            >
              Open integrations page in a new tab
            </button>
          </>
        )}
      </section>
    </div>
  );
};
