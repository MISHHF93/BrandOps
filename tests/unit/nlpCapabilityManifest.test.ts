import { describe, expect, it } from 'vitest';
import {
  NLP_CAPABILITY_CHECKLIST,
  countNlpCapabilitiesByStatus
} from '../../src/services/ai/nlpCapabilityManifest';

describe('nlpCapabilityManifest', () => {
  it('lists unique ids', () => {
    const ids = NLP_CAPABILITY_CHECKLIST.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('counts rows by status', () => {
    const implemented = countNlpCapabilitiesByStatus('implemented');
    expect(implemented).toBeGreaterThan(0);
    expect(implemented + countNlpCapabilitiesByStatus('stub') + countNlpCapabilitiesByStatus('planned')).toBe(
      NLP_CAPABILITY_CHECKLIST.length
    );
  });
});
