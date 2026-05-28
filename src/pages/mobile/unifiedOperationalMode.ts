import type { OperatingPresetId } from '../../types/domain';
import { getOperatingPresetDefinition } from '../../shared/workspace/operatingProfileCatalog';
import type { MobileSettingsFullReadout } from './mobileSettingsReadout';

export interface UnifiedOperationalModeSummary {
  /** Primary label: preset title or “Custom mix”. */
  headline: string;
  /** Preset marketing line or explanation for custom mixes. */
  subhead: string;
  /** Factual bullets describing how the workspace behaves now. */
  facets: string[];
  /** When persisted preset label ≠ inferred match from live sliders. */
  driftNote?: string;
}

function cockpitLayoutLabel(layout: string): string {
  return layout === 'unified-scroll' ? 'Unified scroll' : 'Sections';
}

function cockpitDensityLabel(density: string): string {
  return density === 'comfortable' ? 'Comfortable density' : 'Compact density';
}

function aiAdapterSentence(mode: string): string {
  switch (mode) {
    case 'disabled':
      return 'AI adapter is disabled — no outbound model calls.';
    case 'local-only':
      return 'AI adapter is local-only — external endpoints stay blocked.';
    case 'external-opt-in':
      return 'AI adapter allows external calls when you opt in — bridge URLs apply.';
    default:
      return `AI adapter mode: ${mode}.`;
  }
}

function aiGuidanceSentence(mode: string): string {
  switch (mode) {
    case 'rule-based':
      return 'Guidance leans rule-based (lighter prompts).';
    case 'prompt-ready':
      return 'Guidance is prompt-ready (suited to richer Ask prompts).';
    case 'hybrid':
      return 'Guidance is hybrid — rules plus prompt-ready behavior.';
    default:
      return `AI guidance mode: ${mode}.`;
  }
}

function hostedInferenceSentence(readout: MobileSettingsFullReadout): string {
  const preview = readout.aiInferenceEndpointPreview.trim();
  if (!preview || preview === '—') {
    return 'No inference URL on file — configure AI bridge for hosted chat/embeddings.';
  }
  return 'Inference endpoint configured — hosted Ask can use your OpenAI-compatible bridge.';
}

function normalizeSavedPresetLabel(raw: string): string {
  const t = raw.trim();
  if (t === 'Custom') return 'Custom mix';
  return t;
}

function livePresetHeadline(inferredPresetId: OperatingPresetId | 'custom'): string {
  if (inferredPresetId === 'custom') return 'Custom mix';
  return getOperatingPresetDefinition(inferredPresetId).title;
}

/**
 * Single read-only summary of “how this workspace is operating” for Settings:
 * fixed daily cadence, cockpit chrome, AI policy, bridge, copilot, optional operator twin résumé ingest.
 */
export function buildUnifiedOperationalModeSummary(input: {
  readout: MobileSettingsFullReadout;
  inferredPresetId: OperatingPresetId | 'custom';
}): UnifiedOperationalModeSummary {
  const { readout, inferredPresetId } = input;
  const headline = livePresetHeadline(inferredPresetId);
  const subhead =
    inferredPresetId === 'custom'
      ? 'Cockpit layout, AI adapter, and guidance are mixed manually instead of matching one named preset.'
      : getOperatingPresetDefinition(inferredPresetId).shortDescription;

  const facets: string[] = [
    'Daily schedule uses BrandOps daily cadence — one adaptive block layout inside your workday.',
    `Today cockpit uses ${cockpitLayoutLabel(readout.cockpitLayout)} · ${cockpitDensityLabel(readout.cockpitDensity)}.`,
    aiAdapterSentence(readout.aiAdapterMode),
    aiGuidanceSentence(readout.aiGuidanceMode),
    hostedInferenceSentence(readout),
    `On-device / local model path: ${readout.localModelEnabled ? 'enabled' : 'disabled'}.`,
    `Hosted Ask copilot: ${readout.copilotActiveWorkerPreview}.`
  ];

  const resume = readout.resumeNeuralPhasePreview.trim();
  if (resume && resume !== '—') {
    facets.push('Phase R résumé ingest is saved — hosted Ask appends the compressed artifact.');
  }

  const saved = readout.operatingProfileLastApplied.trim();
  facets.push(
    saved === '—' || saved === ''
      ? 'Preset on record: none — apply a named profile below if you want that baseline remembered.'
      : `Preset on record: ${saved}.`
  );

  let driftNote: string | undefined;
  const live = headline;
  const savedNorm = normalizeSavedPresetLabel(saved);
  if (saved !== '—' && saved !== '' && savedNorm !== live) {
    driftNote = `Saved label “${saved}” no longer matches live settings (“${live}”). Re-apply a preset or keep this mix intentionally.`;
  }

  return { headline, subhead, facets, driftNote };
}
