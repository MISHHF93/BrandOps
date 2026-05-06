import { describe, expect, it } from 'vitest';
import {
  suggestIntents,
  getInputRouteHint,
  getIntentsForPlanPage,
  getAssistantQuickPlanPicks
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

  it('getIntentsForPlanPage exposes essentials through strategy in stable order', () => {
    const intents = getIntentsForPlanPage();
    expect(intents.some((i) => i.command === 'sync content embeddings')).toBe(true);
    expect(intents.map((i) => i.groupId)).toContain('strategy');
    expect(intents[0]?.command.toLowerCase()).toContain('pipeline');
  });

  it('getAssistantQuickPlanPicks dedupes planning essentials against excluded commands', () => {
    const empty = getAssistantQuickPlanPicks(new Set());
    expect(empty.every((i) => i.groupId === 'essentials')).toBe(true);
    expect(empty.length).toBeGreaterThan(0);
    expect(empty[0]!.title.length).toBeGreaterThan(0);

    const noPipeline = getAssistantQuickPlanPicks(new Set(['pipeline health']));
    expect(noPipeline.every((i) => i.command.toLowerCase() !== 'pipeline health')).toBe(true);
    expect(noPipeline.some((i) => i.command === 'sync content embeddings')).toBe(true);
  });
});
