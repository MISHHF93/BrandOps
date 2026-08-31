import { describe, expect, it } from 'vitest';

import { cloneSeedData } from '../helpers/fixtures';
import type { BrandOpsData, Plan, PlanStep } from '../../src/types/domain';
import { verifyPlanOutcomes } from '../../src/services/execution/planVerifier';
import {
  recordLearningSignal,
  recordOutcome,
  getRecentLearningSignals,
  getOutcomeScoresByDimension,
  getAverageOutcomeScore,
  getPreferenceHints,
  decayExpiredSignals,
  DEFAULT_LEARNING_STATE
} from '../../src/services/builder/outcomeLearning';

/**
 * Outcome → Controlled Learning (Section XXII). Asserts that plan verification
 * feeds a durable, inspectable learning signal and outcome score, that a
 * preference confirmation actually raises confidence (regression for a defect
 * where confidence was computed from stale counts), and that learning stays
 * bounded and expiring rather than silently mutating verified identity.
 */
describe('Outcome → Learning', () => {
  function makeWorkspace(): BrandOpsData {
    const ws = cloneSeedData();
    ws.builderActivity = {
      events: [],
      workspaceId: 'ws-learn',
      signals: [],
      outcomeScores: [],
      preferenceHints: []
    };
    return ws;
  }

  const step = (id: string): PlanStep => ({
    id,
    title: id,
    description: `${id} description`,
    owner: 'ops',
    requiredInput: '',
    approvalRequired: false,
    status: 'todo'
  });

  function makePlan(ws: BrandOpsData, status: Plan['status'], id = 'plan-1'): Plan {
    const now = new Date().toISOString();
    return {
      id,
      title: 'Ship Q3 positioning refresh',
      summary: 'Update positioning and publish a follow-up',
      objective: 'Refresh positioning for the new ICP',
      planType: 'positioning-refresh',
      confidenceScore: 70,
      sourceResponseId: 'msg-1',
      assumptions: [],
      missingInputs: [],
      requiredApprovals: [],
      steps: [step('s1'), step('s2')],
      timeline: [],
      outputsAssets: [],
      risks: [],
      nextActions: [],
      status,
      source: {
        sourceSurface: 'ask-my-twin',
        originalUserMessage: 'x',
        aiResponse: 'y',
        activeTwinId: null,
        professionContext: '',
        verifiedFactsUsed: [],
        unverifiedMissingFacts: [],
        timestamp: now,
        conversationId: 'c1',
        messageId: 'msg-1'
      },
      estimatedEffort: '1 session',
      expectedOutput: 'positioning',
      savedAt: now,
      receiptId: 'receipt-1'
    };
  }

  it('planVerifier: a fully-verified plan records a plan-completed-successfully signal', () => {
    const ws = makeWorkspace();
    ws.planWorkspace = { plans: [makePlan(ws, 'executed')], receipts: [], updatedAt: new Date().toISOString() };

    const result = verifyPlanOutcomes(ws, 'plan-1', {
      outcomes: [
        { stepId: 's1', achieved: true },
        { stepId: 's2', achieved: true }
      ]
    });
    expect(result.verified).toBe(true);
    expect(result.allAchieved).toBe(true);

    const signals = getRecentLearningSignals(result.workspace);
    expect(signals.some((s) => s.signalType === 'plan-completed-successfully')).toBe(true);

    const scores = getOutcomeScoresByDimension(result.workspace, 'plan-completion-rate');
    expect(scores.length).toBe(1);
    expect(scores[0].score).toBe(1);
  });

  it('planVerifier: a partially-failed plan records a plan-failed signal and partial score', () => {
    const ws = makeWorkspace();
    ws.planWorkspace = { plans: [makePlan(ws, 'executed')], receipts: [], updatedAt: new Date().toISOString() };

    const result = verifyPlanOutcomes(ws, 'plan-1', {
      outcomes: [
        { stepId: 's1', achieved: true },
        { stepId: 's2', achieved: false }
      ]
    });
    expect(result.verified).toBe(true);
    expect(result.allAchieved).toBe(false);
    expect(getRecentLearningSignals(result.workspace).some((s) => s.signalType === 'plan-failed')).toBe(true);
    expect(getAverageOutcomeScore(result.workspace, 'plan-completion-rate')).toBe(0.5);
  });

  it('a second confirmation raises preference confidence (regression: stale-count defect)', () => {
    let ws = makeWorkspace();
    ws = recordLearningSignal({
      workspace: ws,
      signalType: 'user-accepted-recommendation',
      source: 'test',
      detail: 'prefer concise recommendations',
      strength: 1
    });
    ws = recordLearningSignal({
      workspace: ws,
      signalType: 'user-accepted-recommendation',
      source: 'test',
      detail: 'prefer concise recommendations',
      strength: 1
    });

    const hints = getPreferenceHints(ws);
    expect(hints.length).toBe(1);
    // 0.5 base + 2 confirmations * 0.1 (the defect previously kept this at 0.5*?)
    expect(hints[0].confirmations).toBe(2);
    expect(hints[0].contradictions).toBe(0);
    expect(hints[0].confidence).toBeGreaterThan(0.5);
  });

  it('a contradiction lowers confidence towards zero', () => {
    let ws = makeWorkspace();
    ws = recordLearningSignal({
      workspace: ws,
      signalType: 'user-dismissed-recommendation',
      source: 'test',
      detail: 'topic: always include a CTA',
      strength: 1
    });
    ws = recordLearningSignal({
      workspace: ws,
      signalType: 'user-dismissed-recommendation',
      source: 'test',
      detail: 'topic: always include a CTA',
      strength: 1
    });
    const hints = getPreferenceHints(ws);
    expect(hints[0].contradictions).toBe(2);
    expect(hints[0].confidence).toBeLessThan(0.5);
  });

  it('signals decay after expiry and signals are bounded', () => {
    let ws = makeWorkspace();
    for (let i = 0; i < 40; i++) {
      ws = recordLearningSignal({
        workspace: ws,
        signalType: 'plan-completed-successfully',
        source: 'test',
        detail: `plan-${i}`,
        strength: 0.5
      });
    }
    // bounded at 500
    expect(ws.builderActivity!.signals!.length).toBeLessThanOrEqual(500);
    // force-expire by injecting an already-expired signal
    ws.builderActivity!.signals!.push({
      id: 'old',
      workspaceId: 'ws-learn',
      signalType: 'plan-completed-successfully',
      source: 'test',
      detail: 'expired',
      strength: 0.5,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });
    const before = ws.builderActivity!.signals!.length;
    const after = decayExpiredSignals(ws).builderActivity!.signals!;
    expect(after.length).toBe(before - 1);
  });

  it('exposes default empty learning state', () => {
    expect(DEFAULT_LEARNING_STATE.signals).toEqual([]);
    expect(DEFAULT_LEARNING_STATE.outcomeScores).toEqual([]);
    expect(DEFAULT_LEARNING_STATE.preferenceHints).toEqual([]);
  });

  it('recordOutcome clamps score into [0,1] and links plan id', () => {
    const ws = makeWorkspace();
    const next = recordOutcome({
      workspace: ws,
      planId: 'p-1',
      dimension: 'tool-effectiveness',
      score: 2.5,
      evidence: ['tool worked'],
      notedBy: 'test'
    });
    const records = next.builderActivity!.outcomeScores!;
    expect(records[0].score).toBe(1);
    expect(records[0].planId).toBe('p-1');
  });
});
