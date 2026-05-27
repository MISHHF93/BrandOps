import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import type { AgentWorkspaceResult } from '../../services/agent/agentWorkspaceEngine';
import { extractResumeNeuralPhaseArtifact } from '../../services/ai/resumeNeuralPhaseExtract';
import type { MobileWorkspaceSnapshot } from './buildWorkspaceSnapshot';
import type { ComposerBlankStarter } from './configurationStarters';
import { MobileTabSection, mobileChipClass } from './mobileTabPrimitives';

const chipBusy = (btnFocus: string) =>
  clsx(mobileChipClass(btnFocus), 'disabled:cursor-not-allowed disabled:opacity-50');

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
  onOperatorTraceCollectionChange
}: {
  btnFocus: string;
  onExportWorkspace: () => Promise<void>;
  onExportOperatorTraces: () => Promise<void>;
  onImportPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onRequestResetWorkspace: () => void;
  onRequestClearChat: () => void;
  importMessage: string | null;
  operatorTraceCollectionEnabled: boolean;
  onOperatorTraceCollectionChange: (enabled: boolean) => void;
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
  onPersistResumeNeuralPhaseContext
}: {
  snapshot: MobileWorkspaceSnapshot;
  btnFocus: string;
  applyBusy: boolean;
  onPersistResumeNeuralPhaseContext: (compressed: string) => void | Promise<void>;
}) {
  const MAX_RESUME_PLAINTEXT_BYTES = 196608;
  const statusId = useId();
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [panelBusy, setPanelBusy] = useState(false);
  const [banner, setBanner] = useState<{ msg: string; tone: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 5000);
    return () => window.clearTimeout(t);
  }, [banner]);

  const disabled = applyBusy || panelBusy;

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
      setBanner({ msg: 'Operator twin résumé ingest cleared.', tone: 'success' });
    } catch {
      setBanner({ msg: 'Clear failed — try again.', tone: 'danger' });
    } finally {
      setPanelBusy(false);
    }
  }, [disabled, onPersistResumeNeuralPhaseContext]);

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
      setBanner(null);
    };
    reader.onerror = () => setBanner({ msg: 'Could not read file.', tone: 'danger' });
    reader.readAsText(file);
  };

  return (
    <MobileTabSection
      id="settings-resume-neural-phase"
      title="Operator twin — résumé ingest (hosted Ask)"
      description="Encode step: paste plain-text résumé; we compress it into the twin résumé artifact so hosted models infer skills and roles. Brand profile still wins on conflicts."
      descriptionVisibility="sr-only"
    >
      <p className="mt-2 text-meta leading-relaxed text-textSoft">
        The compressed artifact is appended to the hosted Ask system prompt only (not the native
        on-device model). Nothing is uploaded until you send a message that calls the hosted bridge.
      </p>
      <div className="mt-2 rounded-lg border border-border/40 bg-bgSubtle/45 px-2.5 py-2 text-meta text-textMuted">
        <span className="font-medium text-textSoft">Stored preview</span>
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
          disabled={disabled || !draft.trim()}
          onClick={() => void compressAndSave()}
          className={clsx(
            'rounded-lg border border-borderStrong bg-surfaceActive px-3 py-2 text-xs font-semibold text-text disabled:opacity-50',
            btnFocus
          )}
        >
          Compress &amp; save
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
