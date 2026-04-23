import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIntelligenceRules,
  getIntelligenceRulesLoadProvenance,
  initIntelligenceRulesFromRemote,
  resetIntelligenceRulesForTests
} from '../../src/rules/intelligenceRulesRuntime';
import { INTELLIGENCE_RULES_DEFAULTS } from '../../src/rules/intelligenceRulesDefaults';

describe('intelligenceRulesRuntime', () => {
  beforeEach(() => {
    resetIntelligenceRulesForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reset leaves provenance at initial defaults marker', () => {
    const p = getIntelligenceRulesLoadProvenance();
    expect(p.mode).toBe('defaults');
    expect(new Date(p.loadedAt).getTime()).toBe(0);
    expect(getIntelligenceRules().schemaVersion).toBe(INTELLIGENCE_RULES_DEFAULTS.schemaVersion);
  });

  it('loads bundled-json when fetch returns partial pack', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('brandops-intelligence-rules.json')) {
          return {
            ok: true,
            json: async () => ({
              schemaVersion: 1,
              contentPriority: { baseScore: 41 }
            })
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );

    await initIntelligenceRulesFromRemote();
    const p = getIntelligenceRulesLoadProvenance();
    expect(p.mode).toBe('bundled-json');
    expect(p.detail).toContain('brandops-intelligence-rules.json');
    expect(getIntelligenceRules().contentPriority.baseScore).toBe(41);
  });

  it('uses env-url when VITE_INTELLIGENCE_RULES_URL fetch succeeds', async () => {
    vi.stubEnv('VITE_INTELLIGENCE_RULES_URL', 'https://rules.example/intel.json');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('rules.example')) {
          return {
            ok: true,
            json: async () => ({
              schemaVersion: 1,
              outreachUrgency: { staleAfterHours: 99 }
            })
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );

    await initIntelligenceRulesFromRemote();
    const p = getIntelligenceRulesLoadProvenance();
    expect(p.mode).toBe('env-url');
    expect(p.detail).toContain('rules.example');
    expect(getIntelligenceRules().outreachUrgency.staleAfterHours).toBe(99);
  });
});
