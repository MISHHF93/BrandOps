import { describe, expect, it } from 'vitest';
import {
  suggestIntents,
  getInputRouteHint,
  getIntentByCommandLine
} from '../../src/pages/mobile/chatIntents';

describe('chatIntents', () => {
  it('returns ranked smart chips when input is empty', () => {
    const { chips } = suggestIntents('', { recentLines: [], limit: 8, chipCap: 6 });
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.length).toBeLessThanOrEqual(6);
    expect(chips[0].title.length).toBeGreaterThan(0);
  });

  it('matches plain language in typeahead', () => {
    const { list } = suggestIntents('pipeline', { recentLines: [], limit: 5, chipCap: 6 });
    expect(list.some((i) => i.command.includes('pipeline health'))).toBe(true);
  });

  it('surfaces BrandOps strategy functions in discovery', () => {
    const { list } = suggestIntents('positioning', { recentLines: [], limit: 8, chipCap: 6 });
    expect(list.some((i) => i.command === 'audit_positioning')).toBe(true);
  });

  it('getInputRouteHint explains supported routes', () => {
    expect(getInputRouteHint('pipeline health')).toContain('pipeline');
    expect(getInputRouteHint('add note: x')).toContain('note');
    expect(getInputRouteHint('define_offer_stack')).toContain('BrandOps strategy');
  });

  it('resolves intent metadata for catalog command lines', () => {
    const i = getIntentByCommandLine('pipeline health');
    expect(i?.title).toMatch(/pipeline/i);
  });
});
