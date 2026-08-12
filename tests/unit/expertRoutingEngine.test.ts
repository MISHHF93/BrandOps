import { describe, expect, it } from 'vitest';
import {
  routeExpertSlate,
  summarizeExpertRoutingResolution
} from '../../src/services/ai/expertRoutingEngine';

describe('expertRoutingEngine', () => {
  it('routes broad founder work through positioning, outreach, and planning', () => {
    const resolution = routeExpertSlate({
      userIntent: 'Help me decide the next operating path for this week',
      mode: 'plan',
      profession: 'Founder and CEO'
    });

    expect(resolution.trace.professionPath).toBe('founder');
    expect(resolution.trace.workflowType).toBe('founder_ops');
    expect(resolution.activatedExperts.map((expert) => expert.expertId)).toEqual([
      'positioning-expert',
      'outreach-expert',
      'planning-expert'
    ]);
  });

  it('activates only positioning, outreach, and planning for investor outreach', () => {
    const resolution = routeExpertSlate({
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

    const activeIds = resolution.activatedExperts.map((expert) => expert.expertId);

    expect(resolution.trace.workflowType).toBe('investor_outreach');
    expect(activeIds).toEqual(['positioning-expert', 'outreach-expert', 'planning-expert']);
    expect(activeIds).not.toContain('content-expert');
    expect(activeIds).not.toContain('integration-expert');
    expect(resolution.trace.deactivatedExperts).toContainEqual({
      expertId: 'content-expert',
      reason: 'outside_investor_outreach_workflow'
    });
  });

  it('activates only content, opportunity, and behavioral for creator growth', () => {
    const resolution = routeExpertSlate({
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

    const activeIds = resolution.activatedExperts.map((expert) => expert.expertId);

    expect(resolution.trace.workflowType).toBe('creator_growth');
    expect(activeIds).toEqual(['content-expert', 'opportunity-expert', 'behavioral-expert']);
    expect(activeIds).not.toContain('positioning-expert');
    expect(activeIds).not.toContain('planning-expert');
    expect(resolution.trace.observedSignals).toContain('connected_platforms:linkedin,youtube');
    expect(resolution.trace.observedSignals).toContain('behavioral_memory:12');
  });

  it('routes broad creator work through content, opportunity, and behavioral experts', () => {
    const resolution = routeExpertSlate({
      userIntent: 'Help me choose what to focus on next',
      mode: 'ask',
      profession: 'Independent creator and educator',
      behavioralMemory: {
        hasSignals: true,
        signalCount: 5,
        labels: ['publishing cadence']
      }
    });

    expect(resolution.trace.professionPath).toBe('creator');
    expect(resolution.trace.workflowType).toBe('creator_growth');
    expect(resolution.activatedExperts.map((expert) => expert.expertId)).toEqual([
      'content-expert',
      'opportunity-expert',
      'behavioral-expert'
    ]);
  });

  it('routes recruiter work through outreach, planning, and integration experts', () => {
    const resolution = routeExpertSlate({
      userIntent: 'Improve my candidate sourcing and hiring workflow',
      mode: 'plan',
      profession: 'Recruiter / talent acquisition partner',
      connectedPlatforms: ['linkedin', 'greenhouse']
    });

    expect(resolution.trace.professionPath).toBe('recruiter');
    expect(resolution.trace.workflowType).toBe('recruiter_ops');
    expect(resolution.activatedExperts.map((expert) => expert.expertId)).toEqual([
      'outreach-expert',
      'planning-expert',
      'integration-expert'
    ]);
    expect(resolution.activatedExperts.map((expert) => expert.expertId)).not.toContain(
      'content-expert'
    );
  });

  it('keeps routing observable without requiring execution', () => {
    const resolution = routeExpertSlate({
      userIntent: 'What does my twin remember about my voice and approved claims?',
      mode: 'ask',
      twinProfile: {
        headline: 'Fractional operator',
        professionalPositioning: 'Operational intelligence strategist',
        hasApprovedMemory: true
      }
    });

    expect(resolution.activatedExperts.map((expert) => expert.expertId)).toContain(
      'twin-memory-expert'
    );
    expect(resolution.trace.schemaVersion).toBe('1.0.0');
    expect(resolution.trace.inferredTaskHints).toContain('memory_retrieval');
    expect(summarizeExpertRoutingResolution(resolution)).toContain('workflow=twin_memory');
  });
});
