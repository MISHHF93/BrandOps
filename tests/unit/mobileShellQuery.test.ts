import { describe, expect, it } from 'vitest';
import {
  parseMobileShellFromSearchParams,
  sectionParamValueForShellState
} from '../../src/pages/mobile/mobileShellQuery';

describe('mobileShellQuery', () => {
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
  });

  it('sectionParamValueForShellState encodes tab vs workstream', () => {
    expect(sectionParamValueForShellState('settings', 'today')).toBe('settings');
    expect(sectionParamValueForShellState('chat', 'today')).toBe('chat');
    expect(sectionParamValueForShellState('integrations', 'today')).toBe('integrations');
    expect(sectionParamValueForShellState('daily', 'pipeline')).toBe('pipeline');
    expect(sectionParamValueForShellState('daily', 'today')).toBe('today');
  });
});
