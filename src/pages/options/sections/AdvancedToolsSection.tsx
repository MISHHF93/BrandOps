import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { ComponentLibraryShowcase } from '../componentLibraryShowcase';
import type { BrandOpsData } from '../../../types/domain';

interface AiSettingsResult {
  prompt: string;
  applied: string[];
  skipped: string[];
  failed: string[];
  warnings: string[];
}

interface AdvancedToolsSectionProps {
  data: BrandOpsData;
  aiPrompt: string;
  aiBusy: boolean;
  aiSettingsLastResult: AiSettingsResult | null;
  onAiPromptChange: (value: string) => void;
  onApplyAiSettings: () => Promise<void>;
  onUndoAiSettings: () => Promise<void>;
  onSetDebugMode: (enabled: boolean) => Promise<void>;
  onResetWorkspaceToEmpty: () => Promise<void>;
}

export function AdvancedToolsSection({
  data,
  aiPrompt,
  aiBusy,
  aiSettingsLastResult,
  onAiPromptChange,
  onApplyAiSettings,
  onUndoAiSettings,
  onSetDebugMode,
  onResetWorkspaceToEmpty
}: AdvancedToolsSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section id="options-advanced-tools" className="bo-card scroll-mt-4 space-y-3">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FlaskConical size={18} strokeWidth={2} className="shrink-0 text-primary/90" aria-hidden />
          Advanced and developer tools
        </h2>
        <p className="text-xs text-textMuted">
          AI adjustment mode, automation references, QA controls, and component previews.
        </p>
      </button>

      {!open ? (
        <p className="text-xs text-textSoft">Collapsed by default for a cleaner launch-ready settings flow.</p>
      ) : null}

      {open ? (
        <div className="space-y-4">
          <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
            <h3 className="text-sm font-semibold">AI settings mode</h3>
            <textarea
              value={aiPrompt}
              onChange={(event) => onAiPromptChange(event.target.value)}
              rows={4}
              placeholder='Example: "set cadence launch day, motion off, 70% business focus, prioritize launch blockers"'
              className="w-full rounded-xl border border-border bg-bg/60 px-3 py-2 text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="bo-link"
                disabled={aiBusy || !aiPrompt.trim()}
                onClick={() => void onApplyAiSettings()}
              >
                {aiBusy ? 'Applying AI adjustments…' : 'Apply AI adjustments'}
              </button>
              <button type="button" className="bo-link" onClick={() => void onUndoAiSettings()}>
                Undo last AI adjustment
              </button>
            </div>
            {aiSettingsLastResult ? (
              <article className="rounded-xl border border-border bg-bg/55 p-3 text-xs">
                <p className="font-medium">Last AI run summary</p>
                <p className="mt-1 text-textMuted">Prompt: {aiSettingsLastResult.prompt}</p>
                <p className="mt-1 text-textMuted">
                  Applied {aiSettingsLastResult.applied.length} · Skipped {aiSettingsLastResult.skipped.length} · Failed{' '}
                  {aiSettingsLastResult.failed.length}
                </p>
              </article>
            ) : null}
          </article>

          <article className="rounded-xl border border-border bg-bg/40 p-3">
            <h3 className="text-sm font-semibold">Automation rules</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {data.settings.automationRules.map((rule) => (
                <article key={rule.id} className="rounded-xl border border-border bg-bg/55 p-3 text-sm">
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-textMuted">
                    Trigger: {rule.trigger} / Action: {rule.action}
                  </p>
                  <span className="bo-pill mt-2">{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                </article>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-border bg-bg/40 p-3 space-y-3">
            <h3 className="text-sm font-semibold">Flight deck tools</h3>
            <label className="flex items-center justify-between rounded-xl border border-border bg-bg/55 p-3 text-sm">
              <span>Debug mode</span>
              <input
                type="checkbox"
                checked={data.settings.debugMode}
                onChange={(event) => void onSetDebugMode(event.target.checked)}
              />
            </label>
            <p className="text-xs text-textSoft">
              Component library previews render only when debug mode is on — enable the toggle above, then reopen this
              section if needed.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="bo-link" onClick={() => void onResetWorkspaceToEmpty()}>
                Reset workspace (empty)
              </button>
            </div>
          </article>

          {data.settings.debugMode ? <ComponentLibraryShowcase /> : null}
        </div>
      ) : null}
    </section>
  );
}
