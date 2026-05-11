import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import {
  inferCapabilityFromModelId,
  resolveHostedAssistantRouting,
  suggestAlternateModelIds
} from '../../src/services/ai/aiAskRouting';

describe('aiAskRouting', () => {
  it('infers higher reasoning score for non-mini GPT-4 class ids', () => {
    const big = inferCapabilityFromModelId('gpt-4o');
    const mini = inferCapabilityFromModelId('gpt-4o-mini');
    expect((big.reasoning ?? 0) > (mini.reasoning ?? 0)).toBe(true);
  });

  it('suggests mini alternates for fast mode when primary is full-size 4o', () => {
    const alts = suggestAlternateModelIds('gpt-4o', 'fast');
    expect(alts.some((a) => a.includes('mini'))).toBe(true);
  });

  it('selects stronger reasoning model in deep_reasoning mode when worker unset', () => {
    const base = cloneSeedData();
    base.settings.aiBridge = {
      ...base.settings.aiBridge,
      chatModelId: 'gpt-4o-mini'
    };
    base.settings.aiOperatorMode = 'deep_reasoning';
    base.settings.aiRoutingDiagnosticsEnabled = false;
    const r = resolveHostedAssistantRouting({
      settings: base.settings,
      workerModelId: null
    });
    expect(r.modelId).toContain('gpt-4');
    expect(r.modelId).not.toContain('mini');
  });

  it('includes diagnosticsDetail only when diagnostics enabled', () => {
    const base = cloneSeedData();
    base.settings.aiRoutingDiagnosticsEnabled = false;
    expect(
      resolveHostedAssistantRouting({ settings: base.settings }).diagnosticsDetail
    ).toBeUndefined();
    base.settings.aiRoutingDiagnosticsEnabled = true;
    expect(
      resolveHostedAssistantRouting({ settings: base.settings }).diagnosticsDetail?.includes(
        'policy='
      )
    ).toBe(true);
  });
});
