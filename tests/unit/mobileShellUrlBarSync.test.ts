/** @vitest-environment jsdom */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  replaceMobileShellQueryInUrl,
  sectionParamValueForShellState,
  parseMobileShellFromSearchParams
} from '../../src/pages/mobile/mobileShellQuery';

describe('mobileShellQuery URL bar sync (jsdom)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/mobile.html?keep=1');
  });

  it('replaceMobileShellQueryInUrl writes section for Cockpit workstream', () => {
    replaceMobileShellQueryInUrl('daily', 'pipeline');
    const sp = new URL(window.location.href).searchParams;
    expect(sp.get('section')).toBe('pipeline');
    expect(sp.get('keep')).toBe('1');
  });

  it('replaceMobileShellQueryInUrl writes tab tokens for non-daily tabs', () => {
    replaceMobileShellQueryInUrl('workspace', 'today');
    expect(new URL(window.location.href).searchParams.get('section')).toBe('workspace');
    replaceMobileShellQueryInUrl('chat', 'today');
    expect(new URL(window.location.href).searchParams.get('section')).toBe('chat');
    replaceMobileShellQueryInUrl('settings', 'today');
    expect(new URL(window.location.href).searchParams.get('section')).toBe('settings');
    replaceMobileShellQueryInUrl('integrations', 'today');
    expect(new URL(window.location.href).searchParams.get('section')).toBe('integrations');
  });

  it('round-trips URL encoding after replaceState (external navigation compat)', () => {
    replaceMobileShellQueryInUrl('daily', 'brand-content');
    const parsed = parseMobileShellFromSearchParams(
      new URL(window.location.href).searchParams,
      'workspace'
    );
    expect(parsed).toEqual({ tab: 'daily', workstream: 'brand-content' });
  });

  it('sectionParamValueForShellState matches encoder used by replaceMobileShellQueryInUrl', () => {
    expect(sectionParamValueForShellState('workspace', 'today')).toBe('workspace');
    expect(sectionParamValueForShellState('daily', 'connections')).toBe('connections');
  });
});
