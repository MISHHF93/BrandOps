import clsx from 'clsx';
import type { AiOperatorMode } from '../../types/aiIntegrationSuite';
import { MobileTabSection } from './mobileTabPrimitives';

const MODE_OPTIONS: Array<{ id: AiOperatorMode; label: string; hint: string }> = [
  { id: 'fast', label: 'Fast', hint: 'Latency/cost first' },
  { id: 'balanced', label: 'Balanced', hint: 'General default' },
  { id: 'deep_reasoning', label: 'Deep', hint: 'More analysis depth' },
  { id: 'private_local', label: 'Private', hint: 'Grounded + concise' },
  { id: 'best_evidence', label: 'Evidence', hint: 'Citations & provenance' }
];

export function SettingsAiRoutingPanel({
  btnFocus,
  mode,
  diagnosticsEnabled,
  onModeChange,
  onDiagnosticsChange
}: {
  btnFocus: string;
  mode: AiOperatorMode;
  diagnosticsEnabled: boolean;
  onModeChange: (m: AiOperatorMode) => void;
  onDiagnosticsChange: (enabled: boolean) => void;
}) {
  return (
    <MobileTabSection
      id="settings-ai-routing"
      title="Hosted Ask routing"
      description="Choose how the Assistant biases hosted models for ask: turns (OpenAI-compatible bridge)."
      descriptionVisibility="sr-only"
    >
      <p className="mt-2 text-meta leading-relaxed text-textSoft">
        Simple modes tune latency, reasoning depth, privacy posture, and citation bias. Advanced:
        expose routing scores inside system prompts for troubleshooting.
      </p>
      <div className="mt-3">
        <p className="text-fine font-medium uppercase tracking-wide text-textMuted">
          Routing mode
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onModeChange(opt.id)}
              title={opt.hint}
              className={clsx(
                'rounded-xl border px-2.5 py-2 text-left transition-colors',
                mode === opt.id
                  ? 'border-primary/60 bg-primarySoft/20 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                  : 'border-border/40 bg-bgSubtle/45 text-textMuted hover:border-borderStrong hover:text-text',
                btnFocus
              )}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-overline text-textSoft/80">{opt.hint}</p>
            </button>
          ))}
        </div>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-2 text-meta text-textMuted">
        <input
          type="checkbox"
          checked={diagnosticsEnabled}
          onChange={(e) => onDiagnosticsChange(e.target.checked)}
          className={clsx('mt-0.5 accent-primary', btnFocus)}
        />
        <span>
          <span className="font-semibold text-text">Routing diagnostics</span> — append scoring
          breadcrumbs to hosted Ask system prompts (verbose).
        </span>
      </label>
    </MobileTabSection>
  );
}
