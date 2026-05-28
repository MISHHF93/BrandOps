import { describe, expect, it } from 'vitest';
import { composeExpertTask } from '../../src/services/ai/expertCompositionEngine';
import { observeExpertExecution } from '../../src/services/ai/expertObservability';
import { cloneSeedData } from '../helpers/fixtures';

describe('expertObservability', () => {
  it('tracks internal expert execution signals while returning a safe receipt', () => {
    const ws = cloneSeedData();
    ws.brand.positioning = 'Founder running investor outreach';
    const composition = composeExpertTask({
      workspace: ws,
      userIntent: 'Plan investor outreach for next week',
      mode: 'plan',
      profession: ws.brand.positioning
    });

    const observed = observeExpertExecution({
      mode: 'PLAN',
      composition,
      startedAtMs: 10,
      endedAtMs: 42,
      approvals: { approved: 1, rejected: 0, pending: 2 },
      fallbackReasons: ['Recovered missing memory validation.']
    });

    expect(observed.internalTrace.developerOnly).toBe(true);
    expect(observed.internalTrace.activatedExperts.map((expert) => expert.name)).toContain(
      'Positioning Expert'
    );
    expect(observed.internalTrace.latencyMs).toBe(32);
    expect(observed.internalTrace.routingConfidence).toBeGreaterThan(0);
    expect(observed.internalTrace.outputQuality.score).toBeGreaterThan(0);
    expect(observed.internalTrace.fallbackUsage.used).toBe(true);
    expect(observed.internalTrace.approvals.pending).toBe(2);

    expect(observed.receipt.title).toBe('PLAN expert receipt');
    expect(observed.receipt.activatedExperts).toContain('Positioning Expert');
    expect(observed.receipt.confidenceLabel).toContain('routing confidence');
    expect(observed.receipt.qualityLabel).toContain('output');
    expect(observed.receipt.latencyLabel).toBe('32ms expert execution');
    expect(observed.receipt.approvalStatus).toContain('pending approval');
    expect(JSON.stringify(observed.receipt)).not.toMatch(/developerOnly|routingTrace|observedSignals/i);
  });
});
