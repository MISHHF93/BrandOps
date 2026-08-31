import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { AgentWorkspaceResult } from '../../services/agent/agentWorkspaceEngine';
import type { DigitalTwinSourceType, OperatingPresetId, TwinFactStatus } from '../../types/domain';
import type { AiOperatorMode } from '../../types/aiIntegrationSuite';
import type { AuthProviderId, LaunchMembershipState } from '../../shared/account/launchAccess';
import { authProviderLabel } from '../../shared/account/launchAccess';
import { GoogleSignInButton } from '../../shared/ui/oauth/GoogleSignInButton';
import { AppleSignInButton } from '../../shared/ui/oauth/AppleSignInButton';
import { EmailMagicLinkButton } from '../../shared/ui/oauth/EmailMagicLinkButton';
import { LinkedInSignInButton } from '../../shared/ui/oauth/LinkedInSignInButton';
import { GitHubSignInButton } from '../../shared/ui/oauth/GitHubSignInButton';
import { openExtensionSurface } from '../../shared/navigation/openExtensionSurface';
import { OnDeviceTrustLine } from '../../shared/ui/brandopsPolish';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';
import type { IntelligenceRulesLoadMode } from '../../rules/intelligenceRulesRuntime';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { MobileSettingsFullReadout } from './mobileSettingsReadout';
import { SETTINGS_RESUME_PHASE_SECTION_ID } from './mobileShellQuery';
import { buildComposerBlankStarters } from './configurationStarters';
import {
  OPERATING_PRESETS,
  buildOperatingPresetConfigureLine,
  inferOperatingPresetId
} from './operatingProfilePresets';
import {
  buildUnifiedOperationalModeSummary,
  type UnifiedOperationalModeSummary
} from './unifiedOperationalMode';
import {
  SettingsAssistantComposer,
  SettingsDataSafetyBlock,
  SettingsResumeNeuralPhasePanel,
  SettingsTierAOverview,
  SettingsTwinDashboard
} from './MobileSettingsAISurface';
import { SettingsAiRoutingPanel } from './SettingsAiRoutingPanel';
import { SettingsAiBridgePanel, type AiBridgeConfigurationInput } from './SettingsAiBridgePanel';
import { SettingsAgentBridgeReceiverPanel } from './SettingsAgentBridgeReceiverPanel';
import { MobileTabSection, mobileChipClass } from './mobileTabPrimitives';
import { SettingsCockpitCapabilityDisclosure } from './SettingsCockpitCapabilityDisclosure';
import { LocalProductUsageReadout } from './LocalProductUsageReadout';
import { WorkspaceSignalsBoard } from './WorkspaceSignalsBoard';

export type { MobileWorkspaceSnapshot as MobileSettingsSnapshot } from './buildWorkspaceSnapshot';

function forConfigureQuoting(value: string) {
  return value.replace(/"/g, "'").replace(/\n/g, ' ').trim();
}

function intelligenceRulesSourceLabel(mode: IntelligenceRulesLoadMode): string {
  switch (mode) {
    case 'env-url':
      return 'Remote (custom URL)';
    case 'bundled-json':
      return 'Bundled defaults';
    default:
      return 'Embedded defaults';
  }
}

const settingsRunChipClass = (btnFocus: string) =>
  `${mobileChipClass(btnFocus)} disabled:cursor-not-allowed disabled:opacity-50`;

const fieldClass = (btnFocus: string) =>
  `w-full rounded-lg border border-border/70 bg-bgElevated/90 px-2.5 py-2 text-base text-text placeholder:text-textMuted focus:border-borderStrong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm touch-manipulation ${btnFocus}`;

const primaryBtn = (btnFocus: string) =>
  `mt-2 inline-flex w-full sm:w-auto justify-center rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-xs font-medium text-text hover:bg-surfaceHover disabled:cursor-not-allowed disabled:opacity-50 ${btnFocus}`;

function membershipLabel(status: LaunchMembershipState['status']): string {
  if (status === 'active') return 'Local demo: active (unverified)';
  if (status === 'trialing') return 'Local demo: trialing (unverified)';
  if (status === 'past_due') return 'Local demo: past due (unverified)';
  if (status === 'canceled') return 'Local demo: canceled (unverified)';
  return 'No verified membership';
}

function AccountMembershipSection({
  isAuthenticated,
  provider,
  email,
  membership,
  btnFocus,
  onSignInProvider,
  onSignOut,
  onStartCheckout,
  onOpenBillingPortal
}: {
  isAuthenticated: boolean;
  provider: AuthProviderId | null;
  email: string;
  membership: LaunchMembershipState;
  btnFocus: string;
  onSignInProvider: (provider: AuthProviderId) => void;
  onSignOut: () => void;
  onStartCheckout: () => void;
  onOpenBillingPortal: () => void;
}) {
  return (
    <details className="bo-disclosure group">
      <summary
        className={`cursor-pointer list-none rounded-xl px-3 py-3 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
      >
        Account
        <span className="ml-2 text-meta font-normal text-textSoft">
          {isAuthenticated
            ? `Local ${authProviderLabel(provider)} account · ${membershipLabel(membership.status)}`
            : 'Local access locked'}
        </span>
      </summary>
      <div className="border-t border-border/40 px-3 pb-4 pt-4">
        <MobileTabSection
          id="settings-account-membership"
          title="Local access & membership"
          description="Local account and membership status for this workspace."
          descriptionVisibility="sr-only"
        >
          <p className="mt-2 text-fine leading-snug text-textSoft">
            These buttons choose an on-device sign-in provider and unlock gated operator actions.
            They do not contact a provider, verify the placeholder email, or create a server sign-in
            session.
          </p>
          <dl className="mt-2 space-y-1.5 text-meta text-textMuted">
            <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
              <dt className="shrink-0">Local access</dt>
              <dd className="min-w-0 break-words text-right text-text">
                {isAuthenticated ? 'Unlocked' : 'Locked'}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
              <dt className="shrink-0">Provider</dt>
              <dd className="min-w-0 break-words text-right text-text">
                {authProviderLabel(provider)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
              <dt className="shrink-0">Placeholder email</dt>
              <dd className="min-w-0 break-words text-right text-text">{email || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5">
              <dt className="shrink-0">Local membership flag</dt>
              <dd className="min-w-0 break-words text-right text-text">
                {membershipLabel(membership.status)}
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-wrap gap-2">
            {!isAuthenticated ? (
              <div className="grid w-full gap-2">
                <GoogleSignInButton
                  onClick={() => onSignInProvider('google')}
                  variant="preview"
                  className={btnFocus}
                />
                <AppleSignInButton
                  onClick={() => onSignInProvider('apple')}
                  variant="preview"
                  className={btnFocus}
                />
                <EmailMagicLinkButton
                  onClick={() => onSignInProvider('email')}
                  variant="preview"
                  className={btnFocus}
                />
                <LinkedInSignInButton
                  onClick={() => onSignInProvider('linkedin')}
                  variant="preview"
                  className={btnFocus}
                />
                <GitHubSignInButton
                  onClick={() => onSignInProvider('github')}
                  variant="preview"
                  className={btnFocus}
                />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStartCheckout}
                  className={mobileChipClass(btnFocus)}
                >
                  Open checkout link
                </button>
                <button
                  type="button"
                  onClick={onOpenBillingPortal}
                  className={mobileChipClass(btnFocus)}
                >
                  Open billing portal link
                </button>
                <button type="button" onClick={onSignOut} className={mobileChipClass(btnFocus)}>
                  Clear local access
                </button>
              </>
            )}
          </div>
          <p className="mt-2 text-fine leading-snug text-textSoft">
            Billing links are for navigation only. Membership verification is handled locally in this
            version of BrandOps.
          </p>
          {membership.renewalDate ? (
            <p className="mt-2 text-fine text-textSoft">Renews: {membership.renewalDate}</p>
          ) : null}
        </MobileTabSection>
      </div>
    </details>
  );
}

function workspaceModelRows(r: MobileSettingsFullReadout): Array<[string, string]> {
  return [
    ['Timezone', r.timezone],
    ['Week starts on', r.weekStartsOn],
    ['Default reminder lead (h)', String(r.defaultReminderLeadHours)],
    ['Theme', r.theme],
    ['Cockpit layout', r.cockpitLayout],
    ['Cockpit density', r.cockpitDensity],
    ['Operating profile last applied', r.operatingProfileLastApplied],
    ['Local model enabled', r.localModelEnabled ? 'yes' : 'no'],
    ['AI adapter mode', r.aiAdapterMode],
    ['Hosted AI · chat endpoint', r.aiInferenceEndpointPreview],
    ['Hosted AI · embeddings endpoint', r.aiEmbeddingEndpointPreview],
    ['Hosted AI · chat model id', r.aiBridgeChatModelId],
    ['Hosted AI · embedding model id', r.aiBridgeEmbeddingModelId],
    ['AI routing · operator mode', r.aiOperatorMode],
    ['AI routing · diagnostics prompts', r.aiRoutingDiagnosticsEnabled ? 'on' : 'off'],
    ['Copilot · active worker', r.copilotActiveWorkerPreview],
    ['Copilot · registry', r.copilotWorkersListPreview],
    ['Primary provider preference', r.primaryIdentityProvider],
    ['Notifications enabled', r.notificationsEnabled ? 'yes' : 'no'],
    ['AI guidance mode', r.aiGuidanceMode],
    ['Preferred model', r.preferredModel],
    ['Role context', r.roleContextPreview],
    ['Prompt template', r.promptTemplatePreview],
    ['Operator twin — résumé (current)', r.resumeNeuralPhasePreview],
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
    ['Brand voice (current)', r.brandVoiceGuidePreview]
  ];
}

function OperationalModeSummaryCard({
  summary,
  btnFocus
}: {
  summary: UnifiedOperationalModeSummary;
  btnFocus: string;
}) {
  return (
    <div
      id="settings-operational-mode"
      className="rounded-xl border border-primary/20 bg-surface/40 px-2.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
    >
      <p className="text-fine font-medium uppercase tracking-wide text-textMuted">
        Operational mode
      </p>
      <p className="mt-1 text-base font-semibold text-text">{summary.headline}</p>
      <p className="mt-1 text-meta leading-snug text-textSoft">{summary.subhead}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-meta leading-snug text-text marker:text-textMuted">
        {summary.facets.map((line, idx) => (
          <li key={`${idx}-${line.slice(0, 48)}`}>{line}</li>
        ))}
      </ul>
      {summary.driftNote ? (
        <p
          className={`mt-2 rounded border border-amber-500/25 bg-amber-950/15 px-2 py-1.5 text-meta text-amber-100/90 ${btnFocus}`}
          role="status"
        >
          {summary.driftNote}
        </p>
      ) : null}
    </div>
  );
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
      description="Stored workspace values. Kept collapsed to keep Settings readable."
      descriptionVisibility="sr-only"
    >
      <details className="group mt-2 rounded-lg border border-border/30 bg-surface/45 p-2 open:border-primary/25">
        <summary
          className={`cursor-pointer list-none text-fine font-semibold uppercase tracking-wide text-textMuted ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          <span className="inline-flex items-center gap-2">
            Expand full settings readout
            <span className="text-fine font-normal normal-case text-textSoft group-open:hidden">
              ({rows.length} fields)
            </span>
          </span>
        </summary>
        <dl className="mt-3 space-y-0 text-meta">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-2 border-b border-border/30 py-1.5 last:border-b-0"
            >
              <dt className="min-w-0 break-words text-textMuted">{label}</dt>
              <dd className="min-w-0 break-words text-right text-text">{value}</dd>
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
  btnFocus,
  onOperatingProfileApplied
}: {
  snapshot: MobileWorkspaceSnapshot;
  applySettingsConfigure: (s: string) => Promise<AgentWorkspaceResult | null>;
  applyBusy: boolean;
  btnFocus: string;
  onOperatingProfileApplied?: (presetId: OperatingPresetId | 'custom') => void | Promise<void>;
}) {
  const [applyError, setApplyError] = useState<string | null>(null);
  const [wdStart, setWdStart] = useState('');
  const [wdEnd, setWdEnd] = useState('');
  const [maxTasks, setMaxTasks] = useState('');
  const [remindMin, setRemindMin] = useState('');
  const [mWeight, setMWeight] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [positioning, setPositioning] = useState('');
  const [primaryOffer, setPrimaryOffer] = useState('');
  const [voiceGuide, setVoiceGuide] = useState('');
  const [focusMetric, setFocusMetric] = useState('');
  const [applyHint, setApplyHint] = useState<string | null>(null);
  const inferredOperatingPreset = inferOperatingPresetId(snapshot);
  const operationalModeSummary = useMemo(
    () =>
      buildUnifiedOperationalModeSummary({
        readout: snapshot.settingsFullReadout,
        inferredPresetId: inferredOperatingPreset
      }),
    [snapshot.settingsFullReadout, inferredOperatingPreset]
  );
  const [presetToApply, setPresetToApply] = useState<OperatingPresetId>('balanced-ops');

  useEffect(() => {
    if (inferredOperatingPreset !== 'custom') {
      setPresetToApply(inferredOperatingPreset);
    }
  }, [inferredOperatingPreset]);

  useEffect(() => {
    setWdStart(String(snapshot.workdayStartHour));
    setWdEnd(String(snapshot.workdayEndHour));
    setMaxTasks(String(snapshot.maxDailyTasks));
    setRemindMin(String(snapshot.remindBeforeMinutes));
    setMWeight(String(snapshot.managerialWeight));
    setOperatorName(snapshot.operatorName);
    setPositioning(snapshot.positioning);
    setPrimaryOffer(snapshot.primaryOffer);
    setVoiceGuide(snapshot.voiceGuide);
    setFocusMetric(snapshot.focusMetric);
  }, [
    snapshot.workdayStartHour,
    snapshot.workdayEndHour,
    snapshot.maxDailyTasks,
    snapshot.remindBeforeMinutes,
    snapshot.managerialWeight,
    snapshot.operatorName,
    snapshot.positioning,
    snapshot.primaryOffer,
    snapshot.voiceGuide,
    snapshot.focusMetric
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
    async (
      line: string,
      validationHint?: string,
      onOk?: () => void | Promise<void>
    ): Promise<void> => {
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
      await onOk?.();
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
    await runApply(line, undefined, () => onOperatingProfileApplied?.('custom'));
  }, [runApply, wdStart, wdEnd, maxTasks, remindMin, mWeight, onOperatingProfileApplied]);

  const onApplyProfile = useCallback(async () => {
    const op = forConfigureQuoting(operatorName);
    const pos = forConfigureQuoting(positioning);
    const po = forConfigureQuoting(primaryOffer);
    const vg = forConfigureQuoting(voiceGuide);
    const fm = forConfigureQuoting(focusMetric);
    if (!op && !pos && !po && !vg && !fm) {
      void runApply('', 'Enter at least one profile field.');
      return;
    }
    const parts: string[] = [];
    if (op) parts.push(`operator name is "${op}"`);
    if (pos) parts.push(`positioning is "${pos}"`);
    if (po) parts.push(`primary offer is "${po}"`);
    if (vg) parts.push(`brand voice is "${vg}"`);
    if (fm) parts.push(`focus metric is "${fm}"`);
    await runApply(parts.join(', '), undefined, () => onOperatingProfileApplied?.('custom'));
  }, [
    runApply,
    operatorName,
    positioning,
    primaryOffer,
    voiceGuide,
    focusMetric,
    onOperatingProfileApplied
  ]);

  const onApplyOperatingProfile = useCallback(async () => {
    await runApply(buildOperatingPresetConfigureLine(presetToApply), undefined, () =>
      onOperatingProfileApplied?.(presetToApply)
    );
  }, [runApply, presetToApply, onOperatingProfileApplied]);

  const f = fieldClass(btnFocus);
  const pBtn = primaryBtn(btnFocus);
  return (
    <MobileTabSection
      id="settings-editable"
      title="Preferences (edit workspace)"
      description="These fields update the unified workspace after Apply. Same configure engine as Chat, without posting to the chat feed."
      descriptionVisibility="sr-only"
    >
      {applyError ? (
        <p
          className="mb-2 rounded border border-rose-500/30 bg-rose-950/20 px-2 py-1.5 text-meta text-rose-200/95"
          role="alert"
        >
          {applyError}
        </p>
      ) : null}
      {applyHint ? (
        <p className="mb-2 rounded border border-info/30 bg-info/10 px-2 py-1.5 text-meta text-text">
          {applyHint}
        </p>
      ) : null}

      <OperationalModeSummaryCard summary={operationalModeSummary} btnFocus={btnFocus} />

      <div className="rounded-xl border border-border/40 bg-surface/35 px-2.5 py-3">
        <p className="text-fine font-medium uppercase tracking-wide text-textMuted">
          Operating profile
        </p>
        <p className="mt-1 text-meta leading-snug text-textSoft">
          One apply updates Today cockpit layout/density and (when the preset lists them) AI adapter
          / guidance. Daily cadence is fixed to BrandOps daily cadence. Advanced controls stay in
          the disclosure below.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-meta text-textMuted" htmlFor="bo-operating-profile">
              Apply preset
            </label>
            <select
              id="bo-operating-profile"
              value={presetToApply}
              onChange={(e) => setPresetToApply(e.target.value as OperatingPresetId)}
              className={f}
            >
              {OPERATING_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void onApplyOperatingProfile()}
            disabled={applyBusy}
            className={pBtn}
          >
            Apply operating profile
          </button>
        </div>
        <p className="mt-2 text-fine leading-snug text-textMuted">
          {OPERATING_PRESETS.find((p) => p.id === presetToApply)?.shortDescription}
        </p>
      </div>

      <details className="mt-3 rounded-xl border border-border/35 bg-bgSubtle/20 px-2.5 py-2">
        <summary
          className={`cursor-pointer list-none text-meta font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
        >
          Advanced operating controls
          <span className="ml-2 text-fine font-normal text-textSoft">
            Workday, reminders, profile &amp; appearance notes
          </span>
        </summary>
        <div className="mt-3 space-y-4 border-t border-border/25 pt-3">
          <p className="text-fine font-medium uppercase tracking-wide text-textMuted">
            Workday, tasks, weights
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-wd-start">
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
              />
            </div>
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-wd-end">
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
              />
            </div>
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-max-t">
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
              />
            </div>
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-remind">
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
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="text-meta text-textMuted" htmlFor="bo-mw">
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
            />
          </div>
          <button
            type="button"
            onClick={() => void onApplySchedule()}
            disabled={applyBusy}
            className={pBtn}
          >
            Apply workday, tasks, remind &amp; weight
          </button>

          <p className="mb-1 text-fine font-medium uppercase tracking-wide text-textMuted">
            Profile
          </p>
          <details className="mb-2 rounded-lg border border-border/30 bg-surface/40 p-2 text-fine text-textMuted">
            <summary className={`cursor-pointer font-medium text-textMuted ${btnFocus}`}>
              Profile field details
            </summary>
            <p className="mt-1.5 leading-snug">
              Each value is sent to the operating plan / external models with clear labels to
              prevent ambiguity. In Notification Center prompt template, use{' '}
              <code className="text-overline text-textSoft">{'{{brand_context}}'}</code> for the
              full block, or{' '}
              <code className="text-overline text-textSoft">{'{{brand_operator_name}}'}</code>,{' '}
              <code className="text-overline text-textSoft">{'{{brand_positioning}}'}</code>, etc.
            </p>
          </details>
          <div className="space-y-2">
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-op">
                Operator name
              </label>
              <input
                id="bo-op"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className={f}
                autoComplete="name"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-positioning">
                Positioning
              </label>
              <textarea
                id="bo-positioning"
                value={positioning}
                onChange={(e) => setPositioning(e.target.value)}
                rows={2}
                placeholder="Who you help, in one sentence."
                className={`${f} min-h-[3.25rem] resize-y`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={true}
              />
            </div>
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-offer">
                Primary offer
              </label>
              <input
                id="bo-offer"
                value={primaryOffer}
                onChange={(e) => setPrimaryOffer(e.target.value)}
                className={f}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={true}
              />
            </div>
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-voice">
                Brand voice
              </label>
              <textarea
                id="bo-voice"
                value={voiceGuide}
                onChange={(e) => setVoiceGuide(e.target.value)}
                rows={4}
                placeholder="Tone, vocabulary, and things to avoid."
                className={`${f} min-h-[5.5rem] resize-y`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={true}
              />
            </div>
            <div>
              <label className="text-meta text-textMuted" htmlFor="bo-fm">
                Focus metric
              </label>
              <input
                id="bo-fm"
                value={focusMetric}
                onChange={(e) => setFocusMetric(e.target.value)}
                className={f}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="One number or phrase you check weekly."
              />
            </div>
            <button
              type="button"
              onClick={() => void onApplyProfile()}
              disabled={applyBusy}
              className={pBtn}
            >
              Apply profile
            </button>
          </div>

          <div className="rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2 text-meta leading-relaxed text-textSoft">
            Appearance follows a DOS-inspired terminal skin: plain black or plain white canvas with
            green phosphor accents in dark mode and forest-green ink in light mode. Monospace is
            used for the shell. Motion follows the operating system reduced-motion preference, so
            Settings only exposes workspace behavior and brand configuration.
          </div>
        </div>
      </details>
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
  /** Chat / quick-command in flight (audit re-run, vault chips). */
  commandBusy: boolean;
  onRequestClearChat: () => void;
  onExportWorkspace: () => Promise<void>;
  onExportOperatorTraces: () => Promise<void>;
  onImportWorkspace: (raw: string) => Promise<void>;
  onRequestResetWorkspace: () => void;
  onOperatorTraceCollectionChange: (enabled: boolean) => void | Promise<void>;
  onConnectedIdentityLearningChange: (enabled: boolean) => void | Promise<void>;
  /** Host document; avoids offering a duplicate `integrations.html` tab when already there. */
  documentSurface: AppDocumentSurfaceId | 'chatbot';
  isAuthenticated?: boolean;
  authProvider?: AuthProviderId | null;
  authEmail?: string;
  membership?: LaunchMembershipState;
  onSignInProvider?: (provider: AuthProviderId) => void;
  onSignOut?: () => void;
  onStartCheckout?: () => void;
  onOpenBillingPortal?: () => void;
  /** Persist unified Operating profile choice after successful `configure:` apply. */
  onOperatingProfileApplied?: (presetId: OperatingPresetId | 'custom') => void | Promise<void>;
  /** Persist compressed résumé artifact on operator twin (empty clears). */
  onPersistResumeNeuralPhaseContext?: (compressed: string) => void | Promise<void>;
  /** Create a visible digital twin from reviewed resume/profile text. */
  onCreateDigitalTwinFromText?: (input: {
    rawText: string;
    sourceType: DigitalTwinSourceType;
    sourceSummary?: string;
    reviewOverrides?: {
      displayName?: string;
      headline?: string;
      summary?: string;
      professionalPositioning?: string;
    };
  }) => void | Promise<void>;
  onDeleteActiveDigitalTwin?: () => void | Promise<void>;
  /** Improve-Twin fact review: approve/reject a single extracted experience/education/project row. */
  onUpdateTwinFactStatus?: (input: {
    twinId: string;
    itemKind: 'experience' | 'education' | 'project';
    itemId: string;
    status: Exclude<TwinFactStatus, 'unverified'>;
  }) => void | Promise<void>;
  /** Surface and maintain the active twin's `identity.goals`. */
  onUpdateTwinGoals?: (input: { twinId: string; goals: string[] }) => void | Promise<void>;
  /** Hosted Ask routing stance (`ask:` model scoring). */
  onAiOperatorModeChange: (mode: AiOperatorMode) => void | Promise<void>;
  onAiRoutingDiagnosticsChange: (enabled: boolean) => void | Promise<void>;
  onSaveAiBridgeConfiguration?: (input: AiBridgeConfigurationInput) => Promise<void>;
  onClearAiBridgeApiKey?: () => Promise<void>;
  onTestAiBridgeConnection?: () => Promise<string>;
  /** Bump to open Unified workspace + scroll to operator twin résumé ingest (Assistant shortcut / deep link). */
  resumePhaseRevealKey?: number;
}

/**
 * Workspace configuration: one assistant path, editable preferences, session, and packaged page link.
 */
export const MobileSettingsView = ({
  snapshot,
  btnFocus,
  onRequestClearChat,
  onExportWorkspace,
  onExportOperatorTraces,
  onImportWorkspace,
  onRequestResetWorkspace,
  onOperatorTraceCollectionChange,
  onConnectedIdentityLearningChange,
  documentSurface,
  runCommand,
  applySettingsConfigure,
  applyBusy,
  commandBusy,
  isAuthenticated = false,
  authProvider = null,
  authEmail = '',
  membership = { status: 'none' },
  onSignInProvider = () => {},
  onSignOut = () => {},
  onStartCheckout = () => {},
  onOpenBillingPortal = () => {},
  onOperatingProfileApplied,
  onPersistResumeNeuralPhaseContext = async () => {},
  onCreateDigitalTwinFromText = async () => {},
  onDeleteActiveDigitalTwin = async () => {},
  onUpdateTwinFactStatus = async () => {},
  onUpdateTwinGoals = async () => {},
  onAiOperatorModeChange,
  onAiRoutingDiagnosticsChange,
  onSaveAiBridgeConfiguration = async () => {
    throw new Error('Hosted AI settings are unavailable on this surface.');
  },
  onClearAiBridgeApiKey = async () => {
    throw new Error('Hosted AI key storage is unavailable on this surface.');
  },
  onTestAiBridgeConnection = async () => {
    throw new Error('Hosted AI connection testing is unavailable on this surface.');
  },
  resumePhaseRevealKey = 0
}: MobileSettingsViewProps) => {
  const unifiedWorkspaceDetailsRef = useRef<HTMLDetailsElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!resumePhaseRevealKey) return;
    const details = unifiedWorkspaceDetailsRef.current;
    if (details) details.open = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(SETTINGS_RESUME_PHASE_SECTION_ID)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  }, [resumePhaseRevealKey]);
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

  return (
    <div className="relative z-[1] space-y-4 pb-10 pointer-events-auto" aria-label="Settings">
      <span className="sr-only">
        You and this workspace: account, behavior, and data safety. For provider wiring and sources,
        use Integrations.
      </span>

      <article className="bo-flagship-surface">
        <WorkspaceSignalsBoard
          metrics={snapshot}
          variant="settings"
          includeKeys={['oauth', 'src', 'queue', 'fu']}
        />
        <div className="bo-vitality-frame-body space-y-5 px-4 pb-6 pt-4 sm:px-5">
          <OnDeviceTrustLine className="text-fine normal-case tracking-normal" />

          <SettingsTierAOverview
            snapshot={snapshot}
            rulesSourceLabel={intelligenceRulesSourceLabel(snapshot.intelligenceRulesReadout.mode)}
            btnFocus={btnFocus}
          />

          <AccountMembershipSection
            isAuthenticated={isAuthenticated}
            provider={authProvider}
            email={authEmail}
            membership={membership}
            btnFocus={btnFocus}
            onSignInProvider={onSignInProvider}
            onSignOut={onSignOut}
            onStartCheckout={onStartCheckout}
            onOpenBillingPortal={onOpenBillingPortal}
          />

          <details ref={unifiedWorkspaceDetailsRef} className="bo-disclosure group">
            <summary
              className={`cursor-pointer list-none rounded-xl px-3 py-3 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
            >
              Unified workspace
              <span className="ml-2 text-meta font-normal text-textSoft">
                Assistant and preferences
              </span>
            </summary>
            <div className="space-y-5 border-t border-border/40 px-3 pb-4 pt-4">
              <SettingsAssistantComposer
                applySettingsConfigure={applySettingsConfigure}
                applyBusy={applyBusy}
                btnFocus={btnFocus}
                blankStarters={buildComposerBlankStarters(snapshot)}
              />

              <SettingsAiRoutingPanel
                btnFocus={btnFocus}
                mode={snapshot.settingsFullReadout.aiOperatorMode}
                diagnosticsEnabled={snapshot.settingsFullReadout.aiRoutingDiagnosticsEnabled}
                onModeChange={(m) => void onAiOperatorModeChange(m)}
                onDiagnosticsChange={(enabled) => void onAiRoutingDiagnosticsChange(enabled)}
              />

              <SettingsAiBridgePanel
                bridge={snapshot.aiBridgeSettings}
                adapterMode={snapshot.aiAdapterMode}
                btnFocus={btnFocus}
                disabled={agentRouteBusy}
                onSave={onSaveAiBridgeConfiguration}
                onClearApiKey={onClearAiBridgeApiKey}
                onTestConnection={onTestAiBridgeConnection}
              />

              <SettingsAgentBridgeReceiverPanel btnFocus={btnFocus} disabled={agentRouteBusy} />

              <SettingsEditablePanel
                snapshot={snapshot}
                applySettingsConfigure={applySettingsConfigure}
                applyBusy={applyBusy}
                btnFocus={btnFocus}
                onOperatingProfileApplied={onOperatingProfileApplied}
              />

              <SettingsResumeNeuralPhasePanel
                snapshot={snapshot}
                btnFocus={btnFocus}
                applyBusy={agentRouteBusy}
                onPersistResumeNeuralPhaseContext={onPersistResumeNeuralPhaseContext}
                onCreateDigitalTwinFromText={onCreateDigitalTwinFromText}
              />

              <SettingsTwinDashboard
                snapshot={snapshot}
                btnFocus={btnFocus}
                disabled={agentRouteBusy}
                runCommand={runCommand}
                onDeleteActiveDigitalTwin={onDeleteActiveDigitalTwin}
                onUpdateTwinFactStatus={onUpdateTwinFactStatus}
                onUpdateTwinGoals={onUpdateTwinGoals}
              />
            </div>
          </details>

          <SettingsDataSafetyBlock
            btnFocus={btnFocus}
            onExportWorkspace={onExportWorkspace}
            onExportOperatorTraces={onExportOperatorTraces}
            onImportPick={onImportPick}
            onRequestResetWorkspace={onRequestResetWorkspace}
            onRequestClearChat={onRequestClearChat}
            importMessage={importMessage}
            operatorTraceCollectionEnabled={
              snapshot.settingsFullReadout.operatorTraceCollectionEnabled
            }
            connectedIdentityLearningEnabled={
              snapshot.settingsFullReadout.connectedIdentityLearningEnabled
            }
            onOperatorTraceCollectionChange={onOperatorTraceCollectionChange}
            onConnectedIdentityLearningChange={onConnectedIdentityLearningChange}
          />

          <details className="bo-disclosure group">
            <summary
              className={`cursor-pointer list-none rounded-xl px-3 py-3 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
            >
              <span className="inline-flex items-center gap-2">
                Diagnostics
                <span className="text-meta font-normal text-textSoft">Advanced readouts</span>
              </span>
            </summary>
            <div className="space-y-5 border-t border-border/40 px-3 pb-4 pt-4">
              <MobileTabSection
                id="settings-local-product-metrics"
                title="Local product metrics"
                description="On-device habit, command outcomes, and shell timing."
                descriptionVisibility="sr-only"
              >
                <LocalProductUsageReadout />
              </MobileTabSection>

              <MobileTabSection
                id="settings-dataset-lineage"
                title="Dataset lineage"
                description="Seed metadata for this device."
                descriptionVisibility="sr-only"
              >
                <dl className="mt-2 space-y-1.5 text-meta text-textMuted">
                  <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                    <dt className="shrink-0 text-textMuted">Source</dt>
                    <dd className="min-w-0 break-words text-right text-text">
                      {snapshot.seedReadout.source}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                    <dt className="shrink-0 text-textMuted">Version</dt>
                    <dd className="min-w-0 break-words text-right text-text">
                      {snapshot.seedReadout.version}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                    <dt className="shrink-0 text-textMuted">Seeded at</dt>
                    <dd className="min-w-0 break-words text-right text-text">
                      {snapshot.seedReadout.seededAt}
                    </dd>
                  </div>
                  {snapshot.seedReadout.welcomeCompletedAt ? (
                    <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                      <dt className="shrink-0 text-textMuted">Welcome completed</dt>
                      <dd className="min-w-0 break-words text-right text-text">
                        {snapshot.seedReadout.welcomeCompletedAt}
                      </dd>
                    </div>
                  ) : null}
                  {snapshot.seedReadout.onboardingVersion ? (
                    <div className="flex justify-between gap-2 py-1.5">
                      <dt className="shrink-0 text-textMuted">Onboarding copy</dt>
                      <dd className="min-w-0 break-words text-right text-text">
                        v{snapshot.seedReadout.onboardingVersion}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </MobileTabSection>

              <MobileTabSection
                id="settings-intelligence-rules"
                title="Intelligence rules (effective)"
                description="Scoring profile used for Today digests."
              >
                {!snapshot.intelligenceRulesReadout.initRan ? (
                  <p className="mt-2 text-fine text-textMuted">
                    Status appears after first rules init.
                  </p>
                ) : null}
                <dl className="mt-2 space-y-1.5 text-meta text-textMuted">
                  <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                    <dt className="shrink-0 text-textMuted">Source</dt>
                    <dd className="min-w-0 break-words text-right text-text">
                      {intelligenceRulesSourceLabel(snapshot.intelligenceRulesReadout.mode)}
                    </dd>
                  </div>
                  {snapshot.intelligenceRulesReadout.detail ? (
                    <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                      <dt className="shrink-0 text-textMuted">Resolved from</dt>
                      <dd className="min-w-0 break-words text-right text-text">
                        {snapshot.intelligenceRulesReadout.detail}
                      </dd>
                    </div>
                  ) : null}
                  {snapshot.intelligenceRulesReadout.error ? (
                    <div className="rounded border border-warning/30 bg-warning/10 px-2 py-1.5 text-fine text-text">
                      {snapshot.intelligenceRulesReadout.error}
                    </div>
                  ) : null}
                </dl>
                <details className="group mt-3 rounded-lg border border-border/30 bg-surface/45 p-2 open:border-primary/25">
                  <summary
                    className={`cursor-pointer list-none text-fine font-semibold uppercase tracking-wide text-textMuted ${btnFocus} [&::-webkit-details-marker]:hidden`}
                  >
                    <span className="inline-flex items-center gap-2">
                      Sample coefficients
                      <span className="text-fine font-normal normal-case text-textSoft group-open:hidden">
                        (expand)
                      </span>
                    </span>
                  </summary>
                  <dl className="mt-3 space-y-1.5 text-meta text-textMuted">
                    <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                      <dt className="shrink-0 text-textMuted">Schema version</dt>
                      <dd className="text-right text-text">
                        {snapshot.intelligenceRulesReadout.schemaVersion}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                      <dt className="shrink-0 text-textMuted">Content priority base</dt>
                      <dd className="text-right text-text">
                        {snapshot.intelligenceRulesReadout.contentPriorityBaseScore}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                      <dt className="shrink-0 text-textMuted">Outreach stale after (h)</dt>
                      <dd className="text-right text-text">
                        {snapshot.intelligenceRulesReadout.outreachStaleAfterHours}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                      <dt className="shrink-0 text-textMuted">Publishing urgent within (h)</dt>
                      <dd className="text-right text-text">
                        {snapshot.intelligenceRulesReadout.publishingUrgentWithinHours}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-border/30 py-1.5">
                      <dt className="shrink-0 text-textMuted">Digest content-priority top N</dt>
                      <dd className="text-right text-text">
                        {snapshot.intelligenceRulesReadout.digestTechnicalContentPriorityTop}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 py-1.5">
                      <dt className="shrink-0 text-textMuted">Publishing queue slice</dt>
                      <dd className="text-right text-text">
                        {snapshot.intelligenceRulesReadout.previewQueueSlice}
                      </dd>
                    </div>
                  </dl>
                </details>
                <p className="mt-2 text-fine text-textSoft">
                  Template:{' '}
                  <code className="rounded bg-surface/90 px-1 text-fine text-textSoft">
                    brandops-intelligence-rules.example.json
                  </code>
                </p>
              </MobileTabSection>

              <MobileTabSection
                id="settings-messaging-vault"
                title="Messaging vault"
                description="Saved snippets (titles only here)."
                descriptionVisibility="sr-only"
              >
                {snapshot.settingsMessagingVaultPeek.length === 0 ? (
                  <p className="mt-2 text-meta text-textMuted">
                    No messaging vault entries in this workspace.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {snapshot.settingsMessagingVaultPeek.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg border border-border/30 bg-surface/45 px-2 py-2 text-meta text-textMuted"
                      >
                        <p className="font-medium text-text">{row.title}</p>
                        <p className="text-fine text-textMuted">{row.category}</p>
                        <button
                          type="button"
                          disabled={agentRouteBusy}
                          onClick={() =>
                            void runCommand(
                              `add note: review messaging vault entry "${row.title.replace(/"/g, "'")}"`
                            )
                          }
                          className={`mt-2 ${settingsRunChipClass(btnFocus)}`}
                        >
                          Review snippet
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </MobileTabSection>

              <SettingsCockpitCapabilityDisclosure btnFocus={btnFocus} />

              <WorkspaceModelReadout readout={snapshot.settingsFullReadout} btnFocus={btnFocus} />

              <MobileTabSection
                id="settings-audit"
                title="Recent agent activity"
                description="Commands that changed workspace data."
                descriptionVisibility="sr-only"
              >
                {snapshot.recentAudit.length === 0 ? (
                  <p className="mt-2 text-meta text-textMuted">
                    No commands recorded yet. Run a command in ASK or PLAN to populate this list.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {snapshot.recentAudit.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-border/30 bg-surface/45 px-2.5 py-2 text-meta text-textMuted"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <code className="break-all text-left text-fine text-info">
                            {entry.commandPreview}
                          </code>
                          <span
                            className={`shrink-0 text-fine font-medium uppercase ${
                              entry.ok ? 'text-success' : 'text-warning'
                            }`}
                          >
                            {entry.ok ? 'ok' : 'issue'}
                          </span>
                        </div>
                        <p className="mt-1 text-fine leading-snug text-textMuted">
                          {entry.summary}
                        </p>
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

              <section
                className="rounded-xl border border-borderStrong/30 bg-surface/55 p-3 text-xs"
                aria-labelledby="settings-extension-escape"
              >
                <h3 id="settings-extension-escape" className="text-sm font-semibold text-text">
                  Integrations hub
                </h3>
                {documentSurface === 'integrations' ? (
                  <p className="mt-1 text-meta text-textMuted">
                    You are viewing the Integrations hub — it shares the same interface as
                    the mobile app.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-meta text-textMuted">
                      Opens the Integrations hub in a new tab — same interface as
                      this workspace.
                    </p>
                    <button
                      type="button"
                      onClick={() => openExtensionSurface('integrations')}
                      className={`mt-2 w-full rounded-lg border border-borderStrong/50 bg-surface/55 px-2.5 py-2 text-left text-meta text-textMuted ${btnFocus}`}
                    >
                      Open Integrations hub in a new tab
                    </button>
                  </>
                )}
              </section>
            </div>
          </details>
        </div>
      </article>
    </div>
  );
};
