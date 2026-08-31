import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import type { AgentWorkspaceResult } from '../../services/agent/agentWorkspaceEngine';
import { extractResumeNeuralPhaseArtifact } from '../../services/ai/resumeNeuralPhaseExtract';
import type { DigitalTwin, DigitalTwinSourceType, TwinFactStatus } from '../../types/domain';
import { twinActionPrompt } from '../../services/digitalTwin/digitalTwin';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { ComposerBlankStarter } from './configurationStarters';
import { MobileTabSection, mobileChipClass } from './mobileTabPrimitives';

const chipBusy = (btnFocus: string) =>
  clsx(mobileChipClass(btnFocus), 'disabled:cursor-not-allowed disabled:opacity-50');

type FactReviewRow = {
  id: string;
  itemKind: 'experience' | 'education' | 'project';
  kindLabel: string;
  label: string;
  status: TwinFactStatus;
};

function factReviewRows(twin: DigitalTwin): FactReviewRow[] {
  const rows: FactReviewRow[] = [];
  for (const item of twin.resumeProfile.experience) {
    rows.push({
      id: item.id,
      itemKind: 'experience',
      kindLabel: 'Experience',
      label: item.role || item.organization || 'Experience entry',
      status: item.verificationStatus
    });
  }
  for (const item of twin.resumeProfile.education) {
    rows.push({
      id: item.id,
      itemKind: 'education',
      kindLabel: 'Education',
      label: item.institution || 'Education entry',
      status: item.verificationStatus
    });
  }
  for (const item of twin.resumeProfile.projects) {
    rows.push({
      id: item.id,
      itemKind: 'project',
      kindLabel: 'Project',
      label: item.name || 'Project entry',
      status: item.verificationStatus
    });
  }
  return rows;
}

export function SettingsTierAOverview({
  snapshot,
  rulesSourceLabel,
  btnFocus
}: {
  snapshot: MobileWorkspaceSnapshot;
  rulesSourceLabel: string;
  btnFocus: string;
}) {
  const seedLine = `${snapshot.seedReadout.source} · v${snapshot.seedReadout.version}`;
  const offerPreview =
    snapshot.primaryOffer.length > 48
      ? `${snapshot.primaryOffer.slice(0, 46)}…`
      : snapshot.primaryOffer;
  const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
  const profileSavedSummary = (() => {
    const o = oneLine(snapshot.operatorName) || '—';
    const off = oneLine(offerPreview) || '—';
    const m = oneLine(snapshot.focusMetric) || '—';
    if (o === '—' && off === '—' && m === '—') return '—';
    const raw = `${o} · ${off} · ${m}`;
    return raw.length > 220 ? `${raw.slice(0, 218)}…` : raw;
  })();

  return (
    <section
      className="bo-tab-section bo-mobile-sheet p-3.5"
      aria-labelledby="settings-tier-a-heading"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border/40 pb-2.5">
        <h2 id="settings-tier-a-heading" className="text-h3 text-text">
          Workspace
        </h2>
        <a
          href="#settings-editable"
          className={clsx('bo-link bo-link--sm ml-auto inline !normal-case', btnFocus)}
        >
          Edit
        </a>
      </div>
      <p className="mt-2.5 text-meta leading-relaxed text-textSoft">
        Unified appearance · {snapshot.reminderWindow} · rules: {rulesSourceLabel}
      </p>

      <dl className="mt-3 overflow-hidden rounded-lg border border-border/45 text-meta text-textMuted">
        <div className="border-b border-border/40 px-2.5 py-2.5">
          <dt className="text-fine font-medium uppercase tracking-wide text-textSoft">
            Profile (saved)
          </dt>
          <dd className="mt-1 min-w-0 break-words text-left leading-relaxed text-text">
            {profileSavedSummary}
          </dd>
        </div>
        <div className="px-2.5 py-2.5">
          <dt className="text-fine font-medium uppercase tracking-wide text-textSoft">Seed</dt>
          <dd className="mt-1 min-w-0 break-words text-left text-text leading-relaxed">
            {seedLine}
          </dd>
        </div>
      </dl>
      {snapshot.intelligenceRulesReadout.error ? (
        <p
          className="mt-2 rounded border border-warning/30 bg-warningSoft/10 px-2 py-1.5 text-fine text-warning"
          role="status"
        >
          Rules: {snapshot.intelligenceRulesReadout.error}
        </p>
      ) : null}
    </section>
  );
}

export function SettingsAssistantComposer({
  applySettingsConfigure,
  applyBusy,
  btnFocus,
  blankStarters
}: {
  applySettingsConfigure: (line: string) => Promise<AgentWorkspaceResult | null>;
  applyBusy: boolean;
  btnFocus: string;
  blankStarters: readonly ComposerBlankStarter[];
}) {
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [line, setLine] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyHint, setApplyHint] = useState<string | null>(null);

  useEffect(() => {
    if (!applyHint) return;
    const t = window.setTimeout(() => setApplyHint(null), 4000);
    return () => window.clearTimeout(t);
  }, [applyHint]);

  useEffect(() => {
    if (!applyError) return;
    const t = window.setTimeout(() => setApplyError(null), 6000);
    return () => window.clearTimeout(t);
  }, [applyError]);

  const submit = useCallback(async () => {
    const t = line.trim();
    if (!t || applyBusy) return;
    setApplyError(null);
    setApplyHint(null);
    const r = await applySettingsConfigure(t);
    if (r === null) return;
    if (!r.ok) {
      setApplyError(r.summary);
      return;
    }
    setApplyHint(r.summary.trim() || 'Applied.');
    setLine('');
  }, [line, applyBusy, applySettingsConfigure]);

  const primeLine = (snippet: string) => {
    setLine(snippet);
    setApplyError(null);
    setApplyHint(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <MobileTabSection
      id="settings-assistant"
      title="Assistant"
      description="Starter chips only fill the line below — edit, then Apply. Schedule and operating mode are in Preferences below. On-device configure engine; not a remote model."
      descriptionVisibility="sr-only"
    >
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Fill composer with a starting line">
        {blankStarters.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={applyBusy}
            onClick={() => primeLine(s.snippet)}
            className={chipBusy(btnFocus)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2 rounded-xl border border-border/55 bg-bgElevated/60 p-2">
        <label htmlFor="settings-assistant-input" className="sr-only">
          Workspace assistant
        </label>
        <input
          ref={inputRef}
          id="settings-assistant-input"
          value={line}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder="What should we change about how this workspace runs?"
          className="min-w-0 flex-1 touch-manipulation bg-transparent px-2 py-2 text-base text-text outline-none placeholder:text-textMuted sm:text-sm"
        />
        <button
          type="button"
          disabled={applyBusy || !line.trim()}
          onClick={() => void submit()}
          className={clsx(
            'shrink-0 rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-xs font-semibold text-text disabled:opacity-50',
            btnFocus
          )}
        >
          Apply
        </button>
      </div>
      <div id={statusId} className="mt-2 min-h-[1.25rem]" role="status" aria-live="polite">
        {applyBusy ? <p className="text-meta text-textSoft">Applying…</p> : null}
        {!applyBusy && applyError ? (
          <p
            className="rounded border border-danger/35 bg-dangerSoft/10 px-2 py-1.5 text-meta text-danger"
            role="alert"
          >
            {applyError}
          </p>
        ) : null}
        {!applyBusy && applyHint ? <p className="text-meta text-success">{applyHint}</p> : null}
      </div>
    </MobileTabSection>
  );
}

export function SettingsDataSafetyBlock({
  btnFocus,
  onExportWorkspace,
  onExportOperatorTraces,
  onImportPick,
  onRequestResetWorkspace,
  onRequestClearChat,
  importMessage,
  operatorTraceCollectionEnabled,
  connectedIdentityLearningEnabled,
  onOperatorTraceCollectionChange,
  onConnectedIdentityLearningChange
}: {
  btnFocus: string;
  onExportWorkspace: () => Promise<void>;
  onExportOperatorTraces: () => Promise<void>;
  onImportPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onRequestResetWorkspace: () => void;
  onRequestClearChat: () => void;
  importMessage: string | null;
  operatorTraceCollectionEnabled: boolean;
  connectedIdentityLearningEnabled: boolean;
  onOperatorTraceCollectionChange: (enabled: boolean) => void;
  onConnectedIdentityLearningChange: (enabled: boolean) => void;
}) {
  const importRef = useRef<HTMLInputElement>(null);
  const dataBtn = clsx(
    'w-full rounded-lg border border-border/60 bg-surface/55 px-2.5 py-2.5 text-left text-body text-text hover:border-borderStrong disabled:cursor-not-allowed disabled:opacity-50',
    btnFocus
  );

  return (
    <details className="bo-disclosure group">
      <summary
        className={`cursor-pointer list-none rounded-xl px-3 py-3 text-sm font-semibold text-text ${btnFocus} [&::-webkit-details-marker]:hidden`}
      >
        Data &amp; session
        <span className="ml-2 text-meta font-normal text-textSoft">Backup, import, reset</span>
      </summary>
      <div className="border-t border-border/40 px-3 pb-4 pt-4">
        <MobileTabSection
          id="settings-data-tier-a"
          title="Data controls"
          description="Backup and restore your workspace JSON. Reset replaces all workspace data with the built-in seed. Clear chat only removes this page’s message history."
          descriptionVisibility="sr-only"
        >
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportPick(e)}
          />
          {importMessage ? (
            <p
              className="mb-2 rounded border border-border/50 bg-bgSubtle/60 px-2 py-1.5 text-meta text-textMuted"
              role="status"
            >
              {importMessage}
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/50 bg-surface/40 px-2.5 py-2.5 text-left text-body text-text">
              <input
                type="checkbox"
                className="border-border mt-0.5"
                checked={operatorTraceCollectionEnabled}
                onChange={(e) => onOperatorTraceCollectionChange(e.target.checked)}
              />
              <span>
                <span className="font-medium">Record operator traces locally</span>
                <span className="mt-1 block text-meta font-normal leading-snug text-textSoft">
                  Saves navigation, assistant commands, and appearance changes on this device
                  only—no automatic upload. Turn off anytime. Use export for analysis or training
                  datasets; files may include business-sensitive metadata.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-primary/35 bg-primarySoft/10 px-2.5 py-2.5 text-left text-body text-text">
              <input
                type="checkbox"
                className="border-border mt-0.5"
                checked={connectedIdentityLearningEnabled}
                onChange={(e) => onConnectedIdentityLearningChange(e.target.checked)}
              />
              <span>
                <span className="font-medium">Enable Connected Identity Engine</span>
                <span className="mt-1 block text-meta font-normal leading-snug text-textSoft">
                  Explicit opt-in. BrandOps may evolve the digital twin from connected platform
                  metadata, approved summaries, content patterns, workflow behavior, calendar
                  patterns, and operational habits. It must not automatically ingest raw private
                  Gmail, Slack, Notion, or calendar content.
                </span>
              </span>
            </label>
            <button type="button" onClick={() => void onExportWorkspace()} className={dataBtn}>
              Export workspace JSON
            </button>
            <button type="button" onClick={() => void onExportOperatorTraces()} className={dataBtn}>
              Export operator traces (JSONL)…
            </button>
            <button type="button" onClick={() => importRef.current?.click()} className={dataBtn}>
              Import workspace JSON…
            </button>
            <button
              type="button"
              onClick={onRequestResetWorkspace}
              className={clsx(dataBtn, 'border-warning/40 text-warning')}
            >
              Reset workspace to seed…
            </button>
            <button
              type="button"
              onClick={onRequestClearChat}
              className={clsx(mobileChipClass(btnFocus), 'w-full justify-center')}
            >
              Clear chat transcript
            </button>
          </div>
        </MobileTabSection>
      </div>
    </details>
  );
}

export function SettingsResumeNeuralPhasePanel({
  snapshot,
  btnFocus,
  applyBusy,
  onPersistResumeNeuralPhaseContext,
  onCreateDigitalTwinFromText
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  applyBusy: boolean;
  onPersistResumeNeuralPhaseContext: (compressed: string) => void | Promise<void>;
  onCreateDigitalTwinFromText: (input: {
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
}) {
  const MAX_RESUME_PLAINTEXT_BYTES = 196608;
  const statusId = useId();
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [review, setReview] = useState<{
    displayName: string;
    headline: string;
    summary: string;
    professionalPositioning: string;
  } | null>(null);
  const [panelBusy, setPanelBusy] = useState(false);
  const [banner, setBanner] = useState<{ msg: string; tone: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 5000);
    return () => window.clearTimeout(t);
  }, [banner]);

  const disabled = applyBusy || panelBusy;

  const buildReview = useCallback(() => {
    const raw = draft.trim();
    if (!raw || disabled) return;
    const lines = raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      setBanner({ msg: 'Add more profile detail before review.', tone: 'danger' });
      return;
    }
    const displayName =
      lines.find((line) => line.length <= 70 && !/[@:/\\]|\d{3,}/.test(line)) ||
      snapshot.operatorName ||
      'Digital Twin';
    const headline =
      lines.find((line) =>
        /(engineer|operator|founder|creator|manager|designer|consultant|lead)/i.test(line)
      ) ||
      snapshot.positioning ||
      'Professional operator';
    const summary =
      lines.find((line) => line.length > 80 && !/^[-•*▪▸]/.test(line)) ||
      lines.slice(0, 4).join(' ');
    setReview({
      displayName,
      headline,
      summary: summary.slice(0, 700),
      professionalPositioning: snapshot.positioning || headline
    });
    setBanner({
      msg: 'Profile extracted for review. Edit facts before generating the twin.',
      tone: 'success'
    });
  }, [disabled, draft, snapshot.operatorName, snapshot.positioning]);

  const compressAndSave = useCallback(async () => {
    const raw = draft.trim();
    if (!raw || disabled) return;
    const artifact = extractResumeNeuralPhaseArtifact(raw);
    if (!artifact.length) {
      setBanner({
        msg: 'Nothing useful to extract — add sections, bullets, or skills.',
        tone: 'danger'
      });
      return;
    }
    setPanelBusy(true);
    setBanner(null);
    try {
      await onPersistResumeNeuralPhaseContext(artifact);
      setDraft('');
      setBanner({ msg: 'Operator twin résumé artifact saved for hosted Ask.', tone: 'success' });
    } catch {
      setBanner({ msg: 'Save failed — try again.', tone: 'danger' });
    } finally {
      setPanelBusy(false);
    }
  }, [draft, disabled, onPersistResumeNeuralPhaseContext]);

  const clearStored = useCallback(async () => {
    if (disabled) return;
    setPanelBusy(true);
    setBanner(null);
    try {
      await onPersistResumeNeuralPhaseContext('');
      setReview(null);
      setBanner({ msg: 'Operator twin résumé ingest cleared.', tone: 'success' });
    } catch {
      setBanner({ msg: 'Clear failed — try again.', tone: 'danger' });
    } finally {
      setPanelBusy(false);
    }
  }, [disabled, onPersistResumeNeuralPhaseContext]);

  const generateTwin = useCallback(async () => {
    if (!review || disabled) return;
    setPanelBusy(true);
    setBanner(null);
    try {
      await onCreateDigitalTwinFromText({
        rawText: draft,
        sourceType: 'resume',
        sourceSummary: 'Manual paste or plain-text resume file',
        reviewOverrides: review
      });
      setDraft('');
      setReview(null);
      setBanner({
        msg: 'Digital twin generated and BrandOps profile artifacts updated. Review Twin below.',
        tone: 'success'
      });
    } catch {
      setBanner({
        msg: 'Digital twin generation failed — check the text and retry.',
        tone: 'danger'
      });
    } finally {
      setPanelBusy(false);
    }
  }, [disabled, draft, onCreateDigitalTwinFromText, review]);

  const chip = clsx(mobileChipClass(btnFocus), 'disabled:cursor-not-allowed disabled:opacity-50');

  const onResumeFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || disabled) return;
    if (file.size > MAX_RESUME_PLAINTEXT_BYTES) {
      setBanner({ msg: 'File too large — use plain text under 192 KB.', tone: 'danger' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft(String(reader.result ?? ''));
      setReview(null);
      setBanner(null);
    };
    reader.onerror = () => setBanner({ msg: 'Could not read file.', tone: 'danger' });
    reader.readAsText(file);
  };

  return (
    <MobileTabSection
      id="settings-resume-neural-phase"
      title="Create AI digital twin"
      description="Create a persistent Digital Twin from your professional identity, expertise, goals, and work history. The twin powers contextual memory, expert routing, predictive intelligence, and plan generation across BrandOps."
      descriptionVisibility="sr-only"
    >
      <p className="mt-2 text-meta leading-relaxed text-textSoft">
        Paste your résumé, LinkedIn profile, or professional bio — then review the extracted facts and
        generate your local AI twin. The twin learns from verified facts over time, improving Ask
        quality, Plan recommendations, and Execute routing. PDF/DOCX: convert to text first.
      </p>
      <div className="mt-2 rounded-lg border border-primary/35 bg-primarySoft/15 px-2.5 py-2 text-meta leading-relaxed text-textMuted">
        <span className="font-semibold text-text">Consent:</span> uploaded or pasted profile data
        stays in this workspace by default. It is exported/deleted with workspace JSON. Hosted AI
        only receives twin context when you choose to use ASK with an external model.
      </div>
      <div className="mt-2 rounded-lg border border-border/40 bg-bgSubtle/45 px-2.5 py-2 text-meta text-textMuted">
        <span className="font-medium text-textSoft">Twin status</span>
        <p className="mt-1 text-text">
          {snapshot.activeDigitalTwin
            ? `${snapshot.activeDigitalTwin.displayName} · ${snapshot.activeDigitalTwin.status} · ${snapshot.activeDigitalTwin.confidenceScore}% confidence — higher scores indicate stronger fact coverage across skills, experience, and positioning`
            : 'No digital twin yet'}
        </p>
        <span className="mt-2 block font-medium text-textSoft">Stored profile</span>
        <p className="mt-1 min-w-0 break-words leading-relaxed text-text">
          {snapshot.resumeNeuralPhaseArtifactPreview.trim().length > 0
            ? snapshot.resumeNeuralPhaseArtifactPreview
            : '—'}
        </p>
      </div>
      <label htmlFor="settings-resume-draft" className="sr-only">
        Paste résumé text to compress
      </label>
      <textarea
        id="settings-resume-draft"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder="Paste résumé or CV as plain text…"
        className="mt-3 w-full resize-y rounded-lg border border-border/55 bg-surface/55 px-2.5 py-2 text-sm text-text outline-none placeholder:text-textMuted disabled:opacity-60"
      />
      <input
        ref={resumeFileInputRef}
        type="file"
        accept=".txt,.text,.md,text/plain,text/markdown"
        className="hidden"
        onChange={onResumeFilePicked}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => resumeFileInputRef.current?.click()}
          className={chip}
        >
          Load plain-text file…
        </button>
        <button
          type="button"
          disabled
          className={chip}
          title="PDF/DOCX parsing is not bundled yet. Convert to plain text first."
        >
          PDF/DOCX parsing unavailable
        </button>
        <button
          type="button"
          disabled={disabled || !draft.trim()}
          onClick={buildReview}
          className={chip}
        >
          Extract &amp; review
        </button>
        <button
          type="button"
          disabled={disabled || !draft.trim()}
          onClick={() => void compressAndSave()}
          className={clsx(
            'rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-xs font-semibold text-text disabled:opacity-50',
            btnFocus
          )}
        >
          Save profile context
        </button>
        <button
          type="button"
          disabled={disabled || !review}
          onClick={() => void generateTwin()}
          className={clsx('bo-btn-primary bo-btn-primary--sm disabled:opacity-50', btnFocus)}
        >
          Generate digital twin
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void clearStored()}
          className={chip}
        >
          Clear stored
        </button>
      </div>
      {review ? (
        <section
          className="mt-3 rounded-xl border border-border/50 bg-surface/45 p-3"
          aria-label="Extracted profile review"
        >
          <p className="text-label font-semibold text-text">Review extracted profile</p>
          <p className="mt-1 text-fine text-textMuted">
            Edit anything that is wrong. Unverified fields stay unverified and are never treated as
            confirmed — the twin only uses approved facts for positioning and expert routing.
          </p>
          <div className="mt-3 grid gap-2">
            {(
              [
                ['displayName', 'Display name'],
                ['headline', 'Headline'],
                ['professionalPositioning', 'Positioning'],
                ['summary', 'Summary']
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="grid gap-1 text-meta text-textMuted">
                {label}
                {key === 'summary' ? (
                  <textarea
                    value={review[key]}
                    onChange={(e) => setReview({ ...review, [key]: e.target.value })}
                    rows={3}
                    className="rounded-lg border border-border/55 bg-bgElevated px-2.5 py-2 text-sm text-text outline-none focus:border-borderStrong"
                  />
                ) : (
                  <input
                    value={review[key]}
                    onChange={(e) => setReview({ ...review, [key]: e.target.value })}
                    className="rounded-lg border border-border/55 bg-bgElevated px-2.5 py-2 text-sm text-text outline-none focus:border-borderStrong"
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ) : null}
      <div id={statusId} className="mt-2 min-h-[1.25rem]" role="status" aria-live="polite">
        {panelBusy ? <p className="text-meta text-textSoft">Saving…</p> : null}
        {!panelBusy && banner ? (
          <p
            className={
              banner.tone === 'danger' ? 'text-meta text-danger' : 'text-meta text-success'
            }
            role={banner.tone === 'danger' ? 'alert' : undefined}
          >
            {banner.msg}
          </p>
        ) : null}
      </div>
    </MobileTabSection>
  );
}

function TwinGoalsEditor({
  twin,
  disabled,
  btnFocus,
  onUpdateTwinGoals
}: {
  twin: DigitalTwin;
  disabled: boolean;
  btnFocus: string;
  onUpdateTwinGoals: (input: { twinId: string; goals: string[] }) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const goals = twin.identity.goals;
  const applyGoals = async (nextGoals: string[]) => {
    setSaving(true);
    try {
      await onUpdateTwinGoals({ twinId: twin.id, goals: nextGoals });
    } finally {
      setSaving(false);
    }
  };
  const addGoal = async () => {
    const next = draft.replace(/\s+/g, ' ').trim();
    if (!next || goals.some((goal) => goal.toLowerCase() === next.toLowerCase())) return;
    await applyGoals([...goals, next]);
    setDraft('');
  };
  const removeGoal = async (goal: string) => {
    await applyGoals(goals.filter((item) => item !== goal));
  };
  return (
    <section className="rounded-xl border border-border/45 bg-surface/45 p-3">
      <p className="text-label font-semibold text-text">Goals</p>
      <p className="mt-1 text-fine leading-snug text-textMuted">
        Professional goals drive twin-aware suggestions, expert routing, and plan prioritization.
        Captured at creation and updated here — these are plain facts, never treated as verified
        experience.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void addGoal();
          }}
          placeholder="Add a goal…"
          disabled={disabled || saving}
          className="min-w-0 flex-1 rounded-lg border border-border/50 bg-bgElevated/70 px-2.5 py-1.5 text-meta text-text placeholder:text-textSoft disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || saving || !draft.trim()}
          onClick={() => void addGoal()}
          className={clsx(
            mobileChipClass(btnFocus),
            'shrink-0 border-primary/40 text-primary disabled:opacity-50'
          )}
        >
          Add
        </button>
      </div>
      {goals.length ? (
        <ul className="mt-2 space-y-1.5">
          {goals.map((goal) => (
            <li
              key={goal}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/35 bg-bgSubtle/55 px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 text-meta leading-snug text-text">{goal}</span>
              <button
                type="button"
                disabled={disabled || saving}
                onClick={() => void removeGoal(goal)}
                aria-label={`Remove goal: ${goal}`}
                className={clsx(
                  'shrink-0 rounded-md border border-border/45 px-1.5 py-0.5 text-fine font-semibold text-textMuted',
                  btnFocus,
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-meta text-textMuted">No goals captured yet — add one above.</p>
      )}
    </section>
  );
}

export function SettingsTwinDashboard({
  snapshot,
  btnFocus,
  disabled,
  runCommand,
  onDeleteActiveDigitalTwin,
  onUpdateTwinFactStatus,
  onUpdateTwinGoals
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  disabled: boolean;
  runCommand: (command: string) => void | Promise<void>;
  onDeleteActiveDigitalTwin: () => void | Promise<void>;
  onUpdateTwinFactStatus?: (input: {
    twinId: string;
    itemKind: 'experience' | 'education' | 'project';
    itemId: string;
    status: Exclude<TwinFactStatus, 'unverified'>;
  }) => void | Promise<void>;
  onUpdateTwinGoals?: (input: { twinId: string; goals: string[] }) => void | Promise<void>;
}) {
  const twin = snapshot.activeDigitalTwin;
  if (!twin) return null;
  const connectedIdentity = snapshot.connectedIdentityEngine;
  const actionCards = [
    ['generate_professional_bio', 'Generate Bio'],
    ['generate_linkedin_about', 'LinkedIn About'],
    ['draft_outreach', 'Create Outreach Plan'],
    ['create_30_day_content_plan', 'Build Content Plan'],
    ['generate_pitch_email', 'Create Pitch'],
    ['improve_profile_gaps', 'Improve Twin Profile']
  ] as const;
  const twinCoreArtifacts = snapshot.recentAiCoreArtifacts
    .filter((artifact) => artifact.twinId === twin.id)
    .slice(0, 4);
  const latestBatch = snapshot.recentAiCoreBatchRuns.find((run) =>
    run.completedArtifacts.some((artifactId) =>
      snapshot.recentAiCoreArtifacts.some(
        (artifact) => artifact.id === artifactId && artifact.twinId === twin.id
      )
    )
  );
  const exportTwin = () => {
    const blob = new Blob([JSON.stringify(twin, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandops-digital-twin-${twin.displayName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MobileTabSection
      id="settings-digital-twin-dashboard"
      title="Twin"
      description="Review the active AI digital twin, confidence, missing information, and safe action controls."
      descriptionVisibility="sr-only"
    >
      <div className="mt-2 grid gap-3">
        <section className="rounded-xl border border-primary/35 bg-primarySoft/15 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-h3 text-text">{twin.displayName}</p>
              <p className="mt-1 text-meta text-textMuted">{twin.identity.headline}</p>
            </div>
            <span className="rounded-full border border-border/50 bg-bgElevated px-2 py-1 text-fine font-semibold text-text">
              {twin.confidenceScore}% confidence
            </span>
          </div>
          <p className="mt-2 text-meta leading-relaxed text-text">
            {twin.identity.summary || 'No summary yet.'}
          </p>
          <div className="mt-3 rounded-lg border border-border/40 bg-bgSubtle/55 px-2.5 py-2 text-fine leading-snug text-textMuted">
            <span className="font-semibold text-text">Captured into BrandOps:</span> workspace
            profile, brand vault, messaging vault, content seeds, local integration artifacts,
            hosted Ask résumé artifact, and twin audit trail.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportTwin}
              className={clsx(mobileChipClass(btnFocus), 'text-text')}
            >
              Export twin data
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void onDeleteActiveDigitalTwin()}
              className={clsx(
                mobileChipClass(btnFocus),
                'border-danger/40 text-danger disabled:opacity-50'
              )}
            >
              Delete twin
            </button>
          </div>
        </section>

        {onUpdateTwinFactStatus ? (
          <section className="rounded-xl border border-border/45 bg-surface/45 p-3">
            <p className="text-label font-semibold text-text">Improve Twin — verify facts</p>
            <p className="mt-1 text-fine leading-snug text-textMuted">
              Approved facts strengthen your twin's positioning accuracy, improve expert routing, and
              increase the precision of predictions and recommendations across Ask, Plan, and Execute.
              Unverified facts stay unverified — nothing is auto-confirmed.
            </p>
            {factReviewRows(twin).length === 0 ? (
              <p className="mt-2 text-meta text-textMuted">No extracted facts to review yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border/35">
                {factReviewRows(twin).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-meta font-medium text-text">{row.label}</p>
                      <p className="text-fine text-textMuted">
                        {row.kindLabel} · {row.status}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {row.status !== 'verified' ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            void onUpdateTwinFactStatus({
                              twinId: twin.id,
                              itemKind: row.itemKind,
                              itemId: row.id,
                              status: 'verified'
                            })
                          }
                          className={clsx(
                            mobileChipClass(btnFocus),
                            'border-success/40 text-success disabled:opacity-50'
                          )}
                        >
                          Approve
                        </button>
                      ) : null}
                      {row.status !== 'rejected' ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            void onUpdateTwinFactStatus({
                              twinId: twin.id,
                              itemKind: row.itemKind,
                              itemId: row.id,
                              status: 'rejected'
                            })
                          }
                          className={clsx(
                            mobileChipClass(btnFocus),
                            'border-danger/40 text-danger disabled:opacity-50'
                          )}
                        >
                          Reject
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {onUpdateTwinGoals ? (
          <TwinGoalsEditor
            twin={twin}
            disabled={disabled}
            btnFocus={btnFocus}
            onUpdateTwinGoals={onUpdateTwinGoals}
          />
        ) : null}

        {twinCoreArtifacts.length > 0 || latestBatch ? (
          <section className="rounded-xl border border-primary/30 bg-primarySoft/10 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-label font-semibold text-text">AI Core continuity</p>
                <p className="mt-1 text-fine leading-snug text-textMuted">
                  Twin actions, Ask outputs, Plan conversions, and batch runs resolve into the same
                  BrandOps AI Core artifact ledger.
                </p>
              </div>
              {latestBatch ? (
                <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
                  {latestBatch.status} · {latestBatch.completedArtifacts.length}/
                  {latestBatch.steps.length}
                </span>
              ) : null}
            </div>
            {latestBatch ? (
              <div className="mt-2 rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textMuted">
                <p className="font-semibold text-text">Latest batch</p>
                <p className="mt-1">{latestBatch.finalSummary}</p>
                {latestBatch.failedArtifacts.length ? (
                  <p className="mt-1 text-warning">
                    Retry needed:{' '}
                    {latestBatch.failedArtifacts.map((item) => item.artifactType).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
            {twinCoreArtifacts.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {twinCoreArtifacts.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="rounded-lg border border-border/35 bg-bgElevated/55 px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-fine font-semibold uppercase tracking-wide text-primary">
                          {artifact.type}
                        </p>
                        <p className="mt-1 text-meta font-semibold leading-tight text-text">
                          {artifact.title}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border/35 bg-bg/50 px-2 py-0.5 text-overline font-bold uppercase text-textMuted">
                        {artifact.confidenceScore}%
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-fine leading-snug text-textMuted">
                      {artifact.content}
                    </p>
                    <p className="mt-1 text-fine text-textSoft">
                      Status: {artifact.status} · Approval:{' '}
                      {artifact.auditReceipt.approvalRequired ? 'required' : 'not required'}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-primary/35 bg-primarySoft/10 p-3 sm:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-label font-semibold text-text">Connected Identity Engine</p>
                <p className="mt-1 text-meta leading-snug text-textMuted">
                  {connectedIdentity.evolutionSummary}
                </p>
              </div>
              <span className="rounded-full border border-border/45 bg-bgElevated px-2 py-1 text-fine font-semibold text-textMuted">
                {connectedIdentity.consentGranted ? 'Opted in' : 'Consent required'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-fine">
              <span className="rounded-full border border-border/35 bg-bgSubtle/60 px-2 py-1 text-textMuted">
                {connectedIdentity.signalCount} identity signals
              </span>
              {connectedIdentity.platformCoverage.slice(0, 6).map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-border/35 bg-bgSubtle/60 px-2 py-1 text-textMuted"
                >
                  {source}
                </span>
              ))}
            </div>
            <p className="mt-2 rounded-lg border border-border/35 bg-bgSubtle/45 px-2.5 py-2 text-fine leading-snug text-textSoft">
              Safety rule: no automatic ingestion of sensitive/private platform data. Gmail,
              Calendar, Slack, and Notion use metadata or user-approved summaries only.
            </p>
          </section>
          <section className="rounded-xl border border-border/45 bg-surface/45 p-3">
            <p className="text-label font-semibold text-text">Identity Summary</p>
            <p className="mt-1 text-meta text-textMuted">
              {twin.identity.professionalPositioning || 'Needs positioning review.'}
            </p>
            <p className="mt-2 text-fine text-textSoft">Voice: {twin.identity.toneOfVoice}</p>
          </section>
          <section className="rounded-xl border border-border/45 bg-surface/45 p-3">
            <p className="text-label font-semibold text-text">Skills & Experience</p>
            <p className="mt-1 text-meta text-textMuted">
              {twin.resumeProfile.skills.slice(0, 10).join(' · ') || 'No skills extracted yet.'}
            </p>
            <p className="mt-2 text-fine text-textSoft">
              {twin.resumeProfile.experience.length} experience rows ·{' '}
              {twin.resumeProfile.projects.length} projects
            </p>
          </section>
          <section className="rounded-xl border border-border/45 bg-surface/45 p-3">
            <p className="text-label font-semibold text-text">Missing Information</p>
            {twin.memory.missingInfo.length ? (
              <ul className="mt-1 list-disc space-y-1 pl-4 text-meta text-textMuted">
                {twin.memory.missingInfo.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-meta text-success">No obvious gaps in the current profile.</p>
            )}
          </section>
          <section className="rounded-xl border border-border/45 bg-surface/45 p-3">
            <p className="text-label font-semibold text-text">Recent Twin Activity</p>
            <ul className="mt-1 space-y-1 text-meta text-textMuted">
              {twin.actions.auditTrail.slice(0, 4).map((entry) => (
                <li key={entry.id}>{entry.summary}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-xl border border-border/45 bg-surface/45 p-3">
          <p className="text-label font-semibold text-text">Twin Action Studio</p>
          <p className="mt-1 text-fine text-textMuted">
            Input and review happens in Chat via hosted Ask.
            Confirm before external outreach or publishing. Results can be copied or saved from the
            transcript/workspace.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {actionCards.map(([actionType, label]) => (
              <button
                key={actionType}
                type="button"
                disabled={disabled}
                onClick={() => runCommand(twinActionPrompt(actionType, twin))}
                className={clsx(
                  'rounded-xl border border-border/55 bg-bgElevated/70 px-3 py-2 text-left text-meta font-semibold text-text hover:border-borderStrong disabled:cursor-not-allowed disabled:opacity-50',
                  btnFocus
                )}
              >
                {label}
                <span className="mt-1 block text-fine font-normal text-textMuted">
                  Review → confirm → copy/save.
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </MobileTabSection>
  );
}
