import { describe, expect, it } from 'vitest';
import { suggestIntents, getInputRouteHint, getIntentByCommandLine } from '../../src/pages/mobile/chatIntents';

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

  it('getInputRouteHint explains supported routes', () => {
    expect(getInputRouteHint('pipeline health')).toContain('pipeline');
    expect(getInputRouteHint('add note: x')).toContain('note');
  });

  it('resolves intent metadata for catalog command lines', () => {
    const i = getIntentByCommandLine('pipeline health');
    expect(i?.title).toMatch(/pipeline/i);
  });
});
