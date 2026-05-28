import { describe, expect, it } from 'vitest';
import {
  getOperationalExpert,
  listOperationalExpertIds,
  listOperationalExperts,
  routeOperationalExperts,
  summarizeOperationalExpertRegistry
} from '../../src/services/ai/expertRegistry';

describe('expertRegistry', () => {
  it('registers the eight initial operational experts', () => {
    expect(listOperationalExpertIds()).toEqual([
      'positioning-expert',
      'outreach-expert',
      'content-expert',
      'planning-expert',
      'opportunity-expert',
      'behavioral-expert',
      'integration-expert',
      'twin-memory-expert'
    ]);
  });

  it('defines required contracts for every expert', () => {
    for (const expert of listOperationalExperts()) {
      expect(expert.purpose.length).toBeGreaterThan(20);
      expect(expert.supportedTasks.length).toBeGreaterThan(0);
      expect(expert.requiredContext.length).toBeGreaterThan(0);
      expect(expert.inputSchema.schemaVersion).toBe('1.0.0');
      expect(expert.outputSchema.schemaVersion).toBe('1.0.0');
      expect(Object.keys(expert.inputSchema.fields)).toContain('userIntent');
      expect(Object.keys(expert.outputSchema.fields)).toContain('recommendation');
      expect(expert.confidenceScoring.signals.length).toBeGreaterThan(0);
      expect(expert.routingConditions.length).toBeGreaterThan(0);
    }
  });

  it('routes content requests to the Content Expert', () => {
    const [first] = routeOperationalExperts({
      text: 'Create a LinkedIn post from this proof point and add it to the publishing queue',
      mode: 'plan',
      taskHints: ['content_drafting'],
      availableContext: ['content_library', 'brand_vault', 'publishing_queue'],
      maxExperts: 2
    });

    expect(first?.expert.id).toBe('content-expert');
    expect(first?.matchedRoutingConditions).toContain('content-keywords');
  });

  it('routes behavior prediction requests to the Behavioral Expert', () => {
    const [first] = routeOperationalExperts({
      text: 'Predict the best timing and cadence for this follow-up pattern',
      mode: 'ask',
      taskHints: ['behavior_prediction', 'cadence_optimization'],
      availableContext: ['operator_traces', 'scheduler', 'ai_assistant_traces'],
      maxExperts: 1
    });

    expect(first?.expert.id).toBe('behavioral-expert');
    expect(first?.score).toBeGreaterThan(0.6);
  });

  it('exposes lookup and summary helpers', () => {
    expect(getOperationalExpert('twin-memory-expert')?.name).toBe('Twin Memory Expert');
    expect(summarizeOperationalExpertRegistry()).toHaveLength(8);
  });
});
