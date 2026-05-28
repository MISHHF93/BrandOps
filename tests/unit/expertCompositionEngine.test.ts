import { describe, expect, it } from 'vitest';
import {
  composeExpertTask,
  summarizeExpertComposition
} from '../../src/services/ai/expertCompositionEngine';

describe('expertCompositionEngine', () => {
  it('composes investor outreach across positioning, outreach, planning, and memory validation', () => {
    const result = composeExpertTask({
      userIntent: 'Plan investor outreach for our seed round with a warm intro pitch',
      mode: 'plan',
      profession: 'B2B SaaS founder',
      connectedPlatforms: ['linkedin'],
      twinProfile: {
        headline: 'Founder building workflow intelligence',
        professionalPositioning: 'B2B SaaS operator',
        hasApprovedMemory: true
      }
    });

    expect(result.trace.workflowType).toBe('investor_outreach');
    expect(result.trace.contributionOrder).toEqual([
      'positioning-expert',
      'outreach-expert',
      'planning-expert',
      'twin-memory-expert'
    ]);
    expect(result.expertContributions.map((contribution) => contribution.kind)).toEqual([
      'strategic_angle',
      'messaging_draft',
      'execution_sequence',
      'fact_validation'
    ]);
    expect(result.askResponse.sections).toHaveLength(4);
    expect(result.planWorkflow.steps.length).toBeGreaterThanOrEqual(5);
    expect(result.planWorkflow.approvalGates).toContain(
      'Operator approval required before sending, publishing, syncing, or mutating workspace records.'
    );
    expect(result.operationalRecommendations.length).toBeGreaterThan(4);
    expect(result.trace.compositionRules).toContain('memory-validation-added');
  });

  it('composes creator growth without unnecessary memory validation when no memory exists', () => {
    const result = composeExpertTask({
      userIntent: 'Build a creator growth strategy for audience and revenue using content cadence',
      mode: 'ask',
      profession: 'Creator educator',
      connectedPlatforms: ['linkedin', 'youtube'],
      behavioralMemory: {
        hasSignals: true,
        signalCount: 12,
        labels: ['weekly publishing cadence', 'audience replies']
      }
    });

    expect(result.trace.workflowType).toBe('creator_growth');
    expect(result.trace.contributionOrder).toEqual([
      'content-expert',
      'opportunity-expert',
      'behavioral-expert'
    ]);
    expect(result.trace.contributionOrder).not.toContain('twin-memory-expert');
    expect(result.expertContributions.map((contribution) => contribution.kind)).toEqual([
      'content_strategy',
      'opportunity_assessment',
      'behavioral_forecast'
    ]);
    expect(result.trace.compositionRules).toContain('memory-validation-not-needed');
  });

  it('returns structured and explainable outputs', () => {
    const result = composeExpertTask({
      userIntent: 'What does my twin remember about my voice and approved claims?',
      mode: 'ask',
      twinProfile: {
        headline: 'Fractional operator',
        professionalPositioning: 'Operational intelligence strategist',
        hasApprovedMemory: true
      }
    });

    const memoryContribution = result.expertContributions.find(
      (contribution) => contribution.expertId === 'twin-memory-expert'
    );

    expect(memoryContribution?.structuredOutput.validationVerdict).toBe('grounded');
    expect(memoryContribution?.explainability.routingReasons.length).toBeGreaterThan(0);
    expect(result.askResponse.headline).toMatch(/Composed/);
    expect(result.planWorkflow.readiness).toBe('needs_review');
    expect(summarizeExpertComposition(result)).toContain('workflow=twin_memory');
  });
});
