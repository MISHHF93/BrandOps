import { describe, expect, it } from 'vitest';
import {
  escBrandField,
  escBrandMultiline,
  formatBrandProfileForAi,
  getBrandTemplateReplacements,
  LLM_BRAND_TEMPLATE_TOKENS
} from '../../src/services/ai/brandProfileContext';
import { defaultBrandProfile } from '../../src/config/workspaceDefaults';

describe('brandProfileContext', () => {
  it('escBrandField collapses horizontal whitespace', () => {
    expect(escBrandField('  a \t b  ')).toBe('a b');
  });

  it('escBrandMultiline preserves line breaks for multi-sentence brand voice', () => {
    expect(escBrandMultiline('A\n  B\n\nC')).toBe('A\nB\nC');
  });

  it('exposes a stable list of template tokens in sync with getBrandTemplateReplacements', () => {
    const reps = getBrandTemplateReplacements({ ...defaultBrandProfile });
    expect(Object.keys(reps).sort()).toEqual([...LLM_BRAND_TEMPLATE_TOKENS].map(String).sort());
  });

  it('formatBrandProfileForAi includes semantic labels and values', () => {
    const out = formatBrandProfileForAi({
      operatorName: 'Alex Mercer',
      positioning: 'AI architect for teams',
      primaryOffer: 'Sprint delivery',
      voiceGuide: 'Direct.\nNo fluff.',
      focusMetric: '4 calls / mo'
    });
    expect(out).toContain('Operator name (how to address this person): Alex Mercer');
    expect(out).toContain('Positioning (who they help / how they work): AI architect for teams');
    expect(out).toContain('Primary offer (main product, package, or wedge): Sprint delivery');
    expect(out).toContain('Direct.');
    expect(out).toContain('Focus metric (north-star number or phrase): 4 calls / mo');
  });
});
