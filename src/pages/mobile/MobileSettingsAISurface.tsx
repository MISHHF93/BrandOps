import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import type { AgentWorkspaceResult } from '../../services/agent/agentWorkspaceEngine';
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
    <section className="bo-flagship-surface p-3.5" aria-labelledby="settings-tier-a-heading">
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
      <p className="mt-2.5 text-[11px] leading-relaxed text-textSoft">
        Unified appearance · {snapshot.reminderWindow} · rules: {rulesSourceLabel}
      </p>

      <dl className="mt-3 overflow-hidden rounded-lg border border-border/45 text-[11px] text-textMuted">
        <div className="border-b border-border/40 px-2.5 py-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-textSoft">
            Profile (saved)
          </dt>
          <dd className="mt-1 min-w-0 break-words text-left leading-relaxed text-text">
            {profileSavedSummary}
          </dd>
        </div>
        <div className="px-2.5 py-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-textSoft">Seed</dt>
          <dd className="mt-1 min-w-0 break-words text-left text-text leading-relaxed">
            {seedLine}
          </dd>
        </div>
      </dl>
      {snapshot.intelligenceRulesReadout.error ? (
        <p
          className="mt-2 rounded border border-warning/30 bg-warningSoft/10 px-2 py-1.5 text-[10px] text-warning"
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
          className="min-w-0 flex-1 touch-manipulation bg-transparent px-2 py-2 text-base text-text outline-none placeholder:text-textSoft sm:text-sm"
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
        {applyBusy ? <p className="text-[11px] text-textSoft">Applying…</p> : null}
        {!applyBusy && applyError ? (
          <p
            className="rounded border border-danger/35 bg-dangerSoft/10 px-2 py-1.5 text-[11px] text-danger"
            role="alert"
          >
            {applyError}
          </p>
        ) : null}
        {!applyBusy && applyHint ? <p className="text-[11px] text-success">{applyHint}</p> : null}
      </div>
    </MobileTabSection>
  );
}

export function SettingsDataSafetyBlock({
  btnFocus,
  onExportWorkspace,
  onImportPick,
  onRequestResetWorkspace,
  onRequestClearChat,
  importMessage
}: {
  btnFocus: string;
  onExportWorkspace: () => Promise<void>;
  onImportPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onRequestResetWorkspace: () => void;
  onRequestClearChat: () => void;
  importMessage: string | null;
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
        <span className="ml-2 text-[11px] font-normal text-textSoft">Backup, import, reset</span>
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
              className="mb-2 rounded border border-border/50 bg-bgSubtle/60 px-2 py-1.5 text-[11px] text-textMuted"
              role="status"
            >
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
