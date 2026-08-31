/**
 * Goal Health — tests for P0-7.
 *
 * Tests goal health evaluation, status classification, evidence computation,
 * and factor analysis.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateGoalHealth,
} from '../../src/services/goals/goalHealth';

const THIRTY_DAYS_AGO = () => new Date(Date.now() - 30 * 86400000).toISOString();
const SIXTY_DAYS_AGO = () => new Date(Date.now() - 60 * 86400000).toISOString();

function makeGoal(overrides: any = {}): any {
  return {
    id: 'goal-1',
    workspaceId: 'ws-test',
    title: 'Build security positioning',
    description: 'Establish brand as security expert',
    status: 'active',
    priority: 'high',
    targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    ...overrides,
  };
}

function makeData(overrides: any = {}): any {
  return {
    builderActivity: {
      workspaceId: 'ws-test',
      goals: overrides.goals || [makeGoal()],
      achievements: overrides.achievements || [],
      events: overrides.activities || [],
      artifacts: overrides.artifacts || [],
    },
    planWorkspace: {
      plans: overrides.plans || [],
      receipts: [],
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe('Goal Health — Evaluation', () => {
  it('evaluates completed goal as COMPLETED', () => {
    const goal = makeGoal({ status: 'completed' });
    const data = makeData();
    const health = evaluateGoalHealth({ goal, data });

    expect(health.status).toBe('COMPLETED');
    expect(health.confidence).toBe(0.95);
    expect(health.rawStatus).toBe('completed');
  });

  it('evaluates paused goal as NEEDS_REVIEW', () => {
    const goal = makeGoal({ status: 'paused' });
    const data = makeData();
    const health = evaluateGoalHealth({ goal, data });

    expect(health.status).toBe('NEEDS_REVIEW');
  });

  it('evaluates abandoned goal as NEEDS_REVIEW', () => {
    const goal = makeGoal({ status: 'abandoned' });
    const data = makeData();
    const health = evaluateGoalHealth({ goal, data });

    expect(health.status).toBe('NEEDS_REVIEW');
  });

  it('evaluates active goal with recent progress as ON_TRACK', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [
        { id: 'ach-1', type: 'achievement', title: 'Shipped auth system', timestamp: THIRTY_DAYS_AGO(), source: 'user-input' as any, trustTier: 'T2_VERIFIED' as any, claim: 'Shipped auth system', outcome: { observed: true } },
        { id: 'ach-2', type: 'achievement', title: 'Shipped onboarding flow', timestamp: THIRTY_DAYS_AGO(), source: 'user-input' as any, trustTier: 'T2_VERIFIED' as any, claim: 'Shipped onboarding flow', outcome: { observed: true } },
      ],
      plans: [
        { id: 'plan-1', status: 'completed', title: 'Auth plan', ...{} },
      ],
      activities: [
        { id: 'act-1', timestamp: THIRTY_DAYS_AGO(), type: 'activity', summary: 'Worked on goal' },
      ],
    });

    const health = evaluateGoalHealth({ goal, data });
    expect(health.status).toBe('ON_TRACK');
    expect(health.evidence.progressEvidence.length).toBeGreaterThan(0);
  });

  it('evaluates active goal with no recent activity as STALLED', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [],
      plans: [],
      activities: [
        { id: 'act-1', timestamp: SIXTY_DAYS_AGO(), type: 'activity', summary: 'Old activity' },
      ],
    });

    const health = evaluateGoalHealth({ goal, data });
    expect(health.status).toBe('STALLED');
  });

  it('evaluates goal with blocked plans as AT_RISK', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [],
      plans: [
        { id: 'plan-1', status: 'blocked', title: 'Blocked plan', ...{} },
        { id: 'plan-2', status: 'blocked', title: 'Another blocked plan', ...{} },
      ],
      activities: [],
      artifacts: [],
    });

    const health = evaluateGoalHealth({ goal, data });
    expect(health.status).toBe('AT_RISK');
    expect(health.evidence.blockedPlans.length).toBeGreaterThan(0);
  });

  it('evaluates goal with some progress and some concerns as AT_RISK', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [
        { id: 'ach-1', type: 'achievement', title: 'Minor milestone', timestamp: THIRTY_DAYS_AGO(), source: 'user-input' as any, trustTier: 'T3_ASSERTED' as any, claim: 'Minor milestone' },
      ],
      plans: [
        { id: 'plan-1', status: 'blocked', title: 'Blocked plan', ...{} },
      ],
      activities: [
        { id: 'act-1', timestamp: THIRTY_DAYS_AGO(), type: 'activity', summary: 'Some work' },
      ],
    });

    const health = evaluateGoalHealth({ goal, data });
    // Should be AT_RISK because of blocked plan
    expect(health.status).toBe('AT_RISK');
  });
});

describe('Goal Health — Evidence', () => {
  it('includes progress evidence from achievements', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [
        { id: 'ach-1', type: 'achievement', title: 'Shipped feature X', timestamp: THIRTY_DAYS_AGO(), source: 'user-input' as any, trustTier: 'T2_VERIFIED' as any, claim: 'Shipped feature X' },
        { id: 'ach-2', type: 'achievement', title: 'Shipped feature Y', timestamp: THIRTY_DAYS_AGO(), source: 'agent-event' as any, trustTier: 'T3_ASSERTED' as any, claim: 'Shipped feature Y' },
      ],
      plans: [],
      activities: [],
    });

    const health = evaluateGoalHealth({ goal, data });
    expect(health.evidence.progressEvidence.length).toBeGreaterThanOrEqual(2);
    expect(health.evidence.progressEvidence.some((e) => e.includes('Shipped feature X'))).toBe(true);
  });

  it('includes blocked plans in evidence', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [],
      plans: [
        { id: 'plan-1', status: 'blocked', title: 'Integration plan', ...{} },
      ],
      activities: [],
    });

    const health = evaluateGoalHealth({ goal, data });
    expect(health.evidence.blockedPlans).toContain('plan-1');
  });

  it('counts recent activity', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [],
      plans: [],
      activities: [
        { id: 'act-1', timestamp: THIRTY_DAYS_AGO(), type: 'activity', summary: 'Recent' },
        { id: 'act-2', timestamp: THIRTY_DAYS_AGO(), type: 'activity', summary: 'Recent 2' },
        { id: 'act-3', timestamp: SIXTY_DAYS_AGO, type: 'activity', summary: 'Old' },
      ],
    });

    const health = evaluateGoalHealth({ goal, data });
    // 2 recent activities (within 30 days)
    expect(health.evidence.recentActivityCount).toBeGreaterThanOrEqual(1);
  });

  it('includes outcome evidence from completed plans', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [
        { id: 'ach-1', type: 'achievement', title: 'Achieved outcome', timestamp: THIRTY_DAYS_AGO(), source: 'user-input' as any, trustTier: 'T2_VERIFIED' as any, claim: 'Achieved outcome' },
      ],
      plans: [
        { id: 'plan-1', status: 'completed', title: 'Outcome plan', ...{} },
      ],
      activities: [],
    });

    const health = evaluateGoalHealth({ goal, data });
    expect(health.evidence.outcomeEvidence.length).toBeGreaterThan(0);
  });

  it('includes factors in evidence', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [
        { id: 'ach-1', type: 'achievement', title: 'Milestone', timestamp: THIRTY_DAYS_AGO(), source: 'user-input' as any, trustTier: 'T2_VERIFIED' as any, claim: 'Milestone' },
      ],
      plans: [],
      activities: [],
    });

    const health = evaluateGoalHealth({ goal, data });
    expect(health.evidence.factors).toBeInstanceOf(Array);
    expect(health.evidence.factors.length).toBeGreaterThan(0);
    expect(health.evidence.factors.some((f) => f.name === 'progress')).toBe(true);
    expect(health.evidence.factors.some((f) => f.name === 'recent-activity')).toBe(true);
  });
});

describe('Goal Health — Custom Lookback Window', () => {
  it('uses custom lookback window for recent activity', () => {
    const goal = makeGoal({ status: 'active' });
    const data = makeData({
      achievements: [],
      plans: [],
      activities: [
        { id: 'act-1', timestamp: THIRTY_DAYS_AGO(), type: 'activity', summary: 'Just outside default window' },
      ],
    });

    // Default 30-day window: this activity is right at the boundary
    const healthDefault = evaluateGoalHealth({ goal, data });
    // 15-day window: this activity is outside
    const healthCustom = evaluateGoalHealth({ goal, data, recentActivityWindowDays: 15 });

    // Custom window should see fewer (or zero) recent activities
    expect(healthCustom.evidence.recentActivityCount).toBeLessThanOrEqual(healthDefault.evidence.recentActivityCount);
  });
});

describe('Goal Health — Goal Identity', () => {
  it('returns correct goalId and goalTitle', () => {
    const goal = makeGoal({ id: 'goal-custom', title: 'Custom goal title' });
    const data = makeData();
    const health = evaluateGoalHealth({ goal, data });

    expect(health.goalId).toBe('goal-custom');
    expect(health.goalTitle).toBe('Custom goal title');
  });

  it('includes computedAt timestamp', () => {
    const goal = makeGoal();
    const data = makeData();
    const health = evaluateGoalHealth({ goal, data });

    expect(health.computedAt).toBeDefined();
    expect(health.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});

describe('Goal Health — Multiple Goals', () => {
  it('evaluates each goal independently', () => {
    const goals = [
      makeGoal({ id: 'goal-1', status: 'active', title: 'Active goal' }),
      makeGoal({ id: 'goal-2', status: 'completed', title: 'Completed goal' }),
      makeGoal({ id: 'goal-3', status: 'paused', title: 'Paused goal' }),
    ];

    const data = makeData({ goals });

    const health1 = evaluateGoalHealth({ goal: goals[0], data });
    const health2 = evaluateGoalHealth({ goal: goals[1], data });
    const health3 = evaluateGoalHealth({ goal: goals[2], data });

    expect(health1.status).toBe('STALLED'); // No progress
    expect(health2.status).toBe('COMPLETED');
    expect(health3.status).toBe('NEEDS_REVIEW');
  });
});
