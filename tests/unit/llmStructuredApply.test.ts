import { describe, expect, it } from 'vitest';
import {
  extractFirstJsonString,
  fingerprintTextSnippet,
  isAllowedAutoExecuteAiCommand,
  isAllowedForWorker,
  normalizeAgentCommandToken,
  parseStructuredAiApplyPayload
} from '../../src/services/ai/llmStructuredApply';
import { defaultCopilotWorkerRegistry } from '../../src/config/copilotWorkerDefaults';

describe('llmStructuredApply', () => {
  it('normalizes agent command tokens', () => {
    expect(normalizeAgentCommandToken('Pipeline   HEALTH')).toBe('pipeline health');
    expect(normalizeAgentCommandToken('pipeline-health')).toBe('pipeline health');
  });
  it('fingerprints stable for same snippet', () => {
    expect(fingerprintTextSnippet('hello')).toBe(fingerprintTextSnippet('hello'));
    expect(fingerprintTextSnippet('hello')).not.toBe(fingerprintTextSnippet('hallo'));
  });

  it('extracts fenced json', () => {
    const text = 'Hello\n```json\n{"brandOpsStructuredApply":{"version":1}}\n```';
    expect(extractFirstJsonString(text)).toContain('brandOpsStructuredApply');
  });

  it('parses executeAgentCommand when valid', () => {
    const text =
      'Done.\n```json\n{"brandOpsStructuredApply":{"version":1,"executeAgentCommand":"pipeline health"}}\n```';
    expect(parseStructuredAiApplyPayload(text)).toEqual({
      kind: 'execute_agent_command',
      commandText: 'pipeline health'
    });
  });

  it('rejects commands outside allow-list for auto-exec', () => {
    expect(isAllowedAutoExecuteAiCommand('pipeline health')).toBe(true);
    expect(isAllowedAutoExecuteAiCommand('pipeline-health')).toBe(true);
    expect(isAllowedAutoExecuteAiCommand('archive opportunity')).toBe(false);
  });

  it('isAllowedForWorker respects per-worker allow-list', () => {
    const strategist = defaultCopilotWorkerRegistry.workers.find((w) => w.id === 'content-strategist')!;
    expect(isAllowedForWorker(strategist, 'pipeline health')).toBe(false);
    const def = defaultCopilotWorkerRegistry.workers.find((w) => w.id === 'brandops-default')!;
    expect(isAllowedForWorker(def, 'pipeline health')).toBe(true);
  });

  it('returns none when JSON invalid', () => {
    expect(parseStructuredAiApplyPayload('no json here')).toEqual({ kind: 'none' });
  });
});
