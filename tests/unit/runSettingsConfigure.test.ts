import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeConfigureText,
  runSettingsConfigure
} from '../../src/pages/mobile/runSettingsConfigure';

vi.mock('../../src/services/agent/agentWorkspaceEngine', () => ({
  executeAgentWorkspaceCommand: vi.fn()
}));

import { executeAgentWorkspaceCommand } from '../../src/services/agent/agentWorkspaceEngine';

const mocked = vi.mocked(executeAgentWorkspaceCommand);

describe('runSettingsConfigure', () => {
  beforeEach(() => {
    mocked.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when alreadyLoading', async () => {
    expect(await runSettingsConfigure('retro', 'mobile', true)).toBeNull();
    expect(mocked).not.toHaveBeenCalled();
  });

  it('returns null for empty/whitespace line', async () => {
    expect(await runSettingsConfigure('  ', 'mobile', false)).toBeNull();
    expect(mocked).not.toHaveBeenCalled();
  });

  it('normalizes line and returns engine result on success', async () => {
    mocked.mockResolvedValue({
      ok: true,
      action: 'configure-workspace',
      summary: 'Workday window set to 9:00-17:00.'
    });
    const r = await runSettingsConfigure('workday 9 to 17', 'dashboard', false);
    expect(r?.ok).toBe(true);
    expect(r?.summary).toContain('Workday');
    expect(mocked).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'configure: workday 9 to 17',
        actorName: 'mobile-operator',
        source: 'chatbot-web'
      })
    );
  });

  it('returns failed result when engine reports not ok', async () => {
    mocked.mockResolvedValue({
      ok: false,
      action: 'configure-workspace',
      summary: 'No supported workspace configuration operation found in that command.'
    });
    const r = await runSettingsConfigure('gibberish xyzzy', 'mobile', false);
    expect(r?.ok).toBe(false);
    expect(r?.summary).toBeTruthy();
  });
});

describe('normalizeConfigureText', () => {
  it('adds configure prefix when missing', () => {
    expect(normalizeConfigureText('cadence balanced')).toBe('configure: cadence balanced');
  });

  it('leaves line alone when it already has configure', () => {
    expect(normalizeConfigureText('configure: workday 9 to 17')).toBe('configure: workday 9 to 17');
  });
});
