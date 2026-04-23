import { describe, expect, it } from 'vitest';
import {
  parseMobileShellFromSearchParams,
  sectionParamValueForShellState
} from '../../src/pages/mobile/mobileShellQuery';

describe('mobileShellQuery', () => {
  it('parses pulse and timeline tab tokens', () => {
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=pulse'), 'chat')).toEqual({
      tab: 'pulse',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=timeline'), 'chat')).toEqual({
      tab: 'pulse',
      workstream: null
    });
  });

  it('parses tab tokens (case-insensitive)', () => {
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=settings'), 'chat')).toEqual({
      tab: 'settings',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=SETTINGS'), 'chat')).toEqual({
      tab: 'settings',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=chat'), 'chat')).toEqual({
      tab: 'chat',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=integrations'), 'chat')).toEqual({
      tab: 'integrations',
      workstream: null
    });
  });

  it('parses daily and cockpit as Cockpit + default today', () => {
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=daily'), 'chat')).toEqual({
      tab: 'daily',
      workstream: 'today'
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=cockpit'), 'chat')).toEqual({
      tab: 'daily',
      workstream: 'today'
    });
  });

  it('parses workstream ids to Cockpit', () => {
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=pipeline'), 'chat')).toEqual({
      tab: 'daily',
      workstream: 'pipeline'
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=today'), 'chat')).toEqual({
      tab: 'daily',
      workstream: 'today'
    });
  });

  it('falls back to default tab on invalid section', () => {
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=not-a-real-token'), 'chat')).toEqual({
      tab: 'chat',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=not-a-real-token'), 'pulse')).toEqual({
      tab: 'pulse',
      workstream: null
    });
  });

  it('sectionParamValueForShellState encodes tab vs workstream', () => {
    expect(sectionParamValueForShellState('pulse', 'today')).toBe('pulse');
    expect(sectionParamValueForShellState('settings', 'today')).toBe('settings');
    expect(sectionParamValueForShellState('chat', 'today')).toBe('chat');
    expect(sectionParamValueForShellState('integrations', 'today')).toBe('integrations');
    expect(sectionParamValueForShellState('daily', 'pipeline')).toBe('pipeline');
    expect(sectionParamValueForShellState('daily', 'today')).toBe('today');
  });

  /** Round-trip: URL param emitted by the shell encoder parses back to the same tab/workstream. */
  it('round-trips section param for every shell tab and cockpit workstream', () => {
    const defaultTab = 'chat' as const;
    const tabCases: Array<{ tab: 'pulse' | 'chat' | 'integrations' | 'settings'; ws: 'today' }> = [
      { tab: 'pulse', ws: 'today' },
      { tab: 'chat', ws: 'today' },
      { tab: 'integrations', ws: 'today' },
      { tab: 'settings', ws: 'today' }
    ];
    for (const { tab, ws } of tabCases) {
      const encoded = sectionParamValueForShellState(tab, ws);
      const parsed = parseMobileShellFromSearchParams(new URLSearchParams(`section=${encoded}`), defaultTab);
      expect(parsed.tab).toBe(tab);
      expect(parsed.workstream).toBeNull();
    }
    const workstreams = ['today', 'pipeline', 'brand-content', 'connections'] as const;
    for (const ws of workstreams) {
      const encoded = sectionParamValueForShellState('daily', ws);
      const parsed = parseMobileShellFromSearchParams(new URLSearchParams(`section=${encoded}`), defaultTab);
      expect(parsed.tab).toBe('daily');
      expect(parsed.workstream).toBe(ws);
    }
    const dailyTokens = ['daily', 'cockpit'] as const;
    for (const token of dailyTokens) {
      const parsed = parseMobileShellFromSearchParams(new URLSearchParams(`section=${token}`), defaultTab);
      expect(parsed).toEqual({ tab: 'daily', workstream: 'today' });
    }
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=timeline'), defaultTab).tab).toBe('pulse');
  });
});
