import { describe, expect, it } from 'vitest';
import {
  parseMobileShellFromSearchParams,
  sectionParamValueForShellState
} from '../../src/pages/mobile/mobileShellQuery';

describe('mobileShellQuery', () => {
  it('maps pulse, timeline, and workspace aliases to the Workspace overview tab', () => {
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=pulse'), 'chat')).toEqual({
      tab: 'workspace',
      workstream: null
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=timeline'), 'chat')
    ).toEqual({
      tab: 'workspace',
      workstream: null
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=workspace'), 'chat')
    ).toEqual({
      tab: 'workspace',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=home'), 'chat')).toEqual({
      tab: 'workspace',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=hub'), 'chat')).toEqual({
      tab: 'workspace',
      workstream: null
    });
  });

  it('parses tab tokens (case-insensitive)', () => {
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=settings'), 'chat')
    ).toEqual({
      tab: 'settings',
      workstream: null
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=SETTINGS'), 'chat')
    ).toEqual({
      tab: 'settings',
      workstream: null
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=chat'), 'chat')).toEqual({
      tab: 'chat',
      workstream: null
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=integrations'), 'chat')
    ).toEqual({
      tab: 'integrations',
      workstream: null
    });
  });

  it('parses daily and cockpit as Cockpit + default today', () => {
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=daily'), 'chat')).toEqual({
      tab: 'daily',
      workstream: 'today'
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=cockpit'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'today'
    });
  });

  it('parses workstream ids to Cockpit', () => {
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=pipeline'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'pipeline'
    });
    expect(parseMobileShellFromSearchParams(new URLSearchParams('section=today'), 'chat')).toEqual({
      tab: 'daily',
      workstream: 'today'
    });
  });

  it('parses workspace module ids to Cockpit workstreams', () => {
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=brand-vault'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'brand-content'
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=pipeline-crm'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'pipeline'
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=command-center'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'today'
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=linkedin-companion'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'brand-content'
    });
  });

  it('parses workstream and workspace module ids case-insensitively', () => {
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=PIPELINE'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'pipeline'
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=Brand-Vault'), 'chat')
    ).toEqual({
      tab: 'daily',
      workstream: 'brand-content'
    });
  });

  it('falls back to default tab on invalid section', () => {
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=not-a-real-token'), 'chat')
    ).toEqual({
      tab: 'chat',
      workstream: null
    });
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=not-a-real-token'), 'workspace')
    ).toEqual({
      tab: 'workspace',
      workstream: null
    });
  });

  it('sectionParamValueForShellState encodes tab vs workstream', () => {
    expect(sectionParamValueForShellState('workspace', 'today')).toBe('workspace');
    expect(sectionParamValueForShellState('settings', 'today')).toBe('settings');
    expect(sectionParamValueForShellState('chat', 'today')).toBe('chat');
    expect(sectionParamValueForShellState('integrations', 'today')).toBe('integrations');
    expect(sectionParamValueForShellState('daily', 'pipeline')).toBe('pipeline');
    expect(sectionParamValueForShellState('daily', 'today')).toBe('today');
  });

  /** Round-trip: URL param emitted by the shell encoder parses back to the same tab/workstream. */
  it('round-trips section param for every shell tab and cockpit workstream', () => {
    const defaultTab = 'chat' as const;
    const tabCases: Array<{ tab: 'workspace' | 'chat' | 'integrations' | 'settings'; ws: 'today' }> =
      [
        { tab: 'workspace', ws: 'today' },
        { tab: 'chat', ws: 'today' },
        { tab: 'integrations', ws: 'today' },
        { tab: 'settings', ws: 'today' }
      ];
    for (const { tab, ws } of tabCases) {
      const encoded = sectionParamValueForShellState(tab, ws);
      const parsed = parseMobileShellFromSearchParams(
        new URLSearchParams(`section=${encoded}`),
        defaultTab
      );
      expect(parsed.tab).toBe(tab);
      expect(parsed.workstream).toBeNull();
    }
    const workstreams = ['today', 'pipeline', 'brand-content', 'connections'] as const;
    for (const ws of workstreams) {
      const encoded = sectionParamValueForShellState('daily', ws);
      const parsed = parseMobileShellFromSearchParams(
        new URLSearchParams(`section=${encoded}`),
        defaultTab
      );
      expect(parsed.tab).toBe('daily');
      expect(parsed.workstream).toBe(ws);
    }
    const dailyTokens = ['daily', 'cockpit'] as const;
    for (const token of dailyTokens) {
      const parsed = parseMobileShellFromSearchParams(
        new URLSearchParams(`section=${token}`),
        defaultTab
      );
      expect(parsed).toEqual({ tab: 'daily', workstream: 'today' });
    }
    expect(
      parseMobileShellFromSearchParams(new URLSearchParams('section=timeline'), defaultTab).tab
    ).toBe('workspace');
  });
});
