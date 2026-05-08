import { describe, expect, it } from 'vitest';
import { prependAiAssistantTurnTrace } from '../../src/services/ai/aiAssistantTraceLog';
import { cloneSeedData } from '../helpers/fixtures';

describe('prependAiAssistantTurnTrace', () => {
  it('respects operatorTraceCollectionEnabled', () => {
    const base = cloneSeedData();
    base.settings.operatorTraceCollectionEnabled = false;
    const next = prependAiAssistantTurnTrace(base, {
      surface: 'assistant_chat',
      outcome: 'success',
      user_turn_preview: 'hi',
      assistant_preview: 'yo',
      citations: [{ source: 'Doc' }]
    });
    expect(next.aiAssistantTraces?.entries?.length ?? 0).toBe(0);
  });

  it('stores orphan inline markers when collection enabled', () => {
    const base = cloneSeedData();
    base.settings.operatorTraceCollectionEnabled = true;
    base.aiAssistantTraces = { entries: [] };
    const next = prependAiAssistantTurnTrace(base, {
      surface: 'assistant_chat',
      outcome: 'success',
      user_turn_preview: 'hi',
      assistant_preview: 'See [cite: x]',
      citations: [],
      orphan_inline_markers: ['x', 'y'.repeat(120)]
    });
    expect(next.aiAssistantTraces?.entries?.[0].orphan_inline_markers).toEqual([
      'x',
      'y'.repeat(80)
    ]);
  });

  it('prepends sanitized citations when collection enabled', () => {
    const base = cloneSeedData();
    base.settings.operatorTraceCollectionEnabled = true;
    base.aiAssistantTraces = { entries: [] };
    const next = prependAiAssistantTurnTrace(base, {
      surface: 'assistant_chat',
      outcome: 'success',
      user_turn_preview: 'hi',
      assistant_preview: 'yo',
      citations: [{ source: 'Hub', confidence: 3 }]
    });
    expect(next.aiAssistantTraces?.entries).toHaveLength(1);
    expect(next.aiAssistantTraces?.entries?.[0].citations[0]?.confidence).toBe(1);
  });
});
