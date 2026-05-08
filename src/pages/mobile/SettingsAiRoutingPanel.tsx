import clsx from 'clsx';
import type { AiOperatorMode } from '../../types/aiIntegrationSuite';
import { MobileTabSection, mobileChipClass } from './mobileTabPrimitives';

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
  const chip = mobileChipClass(btnFocus);
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
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="AI operator mode">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onModeChange(opt.id)}
            title={opt.hint}
            className={clsx(chip, mode === opt.id && 'border-primary/60 bg-primarySoft/25')}
          >
            {opt.label}
          </button>
        ))}
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
