/**
 * Decision Ledger — tests for P0-4.
 *
 * Tests createDecision, createDecisionFromTwinProposal, createDecisionFromSignal,
 * createDecisionFromPlanRejection, getDecision, getAllDecisions, getDecisionsByType,
 * getRejectedDecisions, getApprovedDecisions, hasUserRejected, getDecisionHistory,
 * supersedeDecision, and export/import.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDecision,
  createDecisionFromTwinProposal,
  createDecisionFromSignal,
  createDecisionFromPlanRejection,
  getDecision,
  getAllDecisions,
  getDecisionsByType,
  getRejectedDecisions,
  getApprovedDecisions,
  hasUserRejected,
  getDecisionHistory,
  supersedeDecision,
  exportDecisions,
  importDecisions,
  clearDecisions,
  type DecisionType,
} from '../../src/services/decisions/decisionLedger';

const WS_ID = 'ws-test-1';

describe('Decision Ledger — Creation', () => {
  beforeEach(() => {
    clearDecisions(WS_ID);
  });

  it('creates a decision with all fields', () => {
    const decision = createDecision({
      type: 'positioning',
      polarity: 'approved',
      title: 'Position as security specialist',
      description: 'We will position the brand as a security specialist.',
      reason: 'Customer demand for security positioning',
      source: 'user-via-proposal',
      workspaceId: WS_ID,
      confidence: 0.9,
      goal: 'goal-1',
      traceId: 'trace-1',
    });

    expect(decision.id).toMatch(/^dec-/);
    expect(decision.type).toBe('positioning');
    expect(decision.polarity).toBe('approved');
    expect(decision.title).toBe('Position as security specialist');
    expect(decision.description).toBe('We will position the brand as a security specialist.');
    expect(decision.reason).toBe('Customer demand for security positioning');
    expect(decision.source).toBe('user-via-proposal');
    expect(decision.confidence).toBe(0.9);
    expect(decision.goal).toBe('goal-1');
    expect(decision.traceId).toBe('trace-1');
    expect(decision.supersedes).toHaveLength(0);
    expect(decision.supersededBy).toHaveLength(0);
    expect(decision.workspaceId).toBe(WS_ID);
  });

  it('defaults confidence to 0.85', () => {
    const decision = createDecision({
      type: 'strategy',
      polarity: 'approved',
      title: 'Test',
      description: 'Test',
      reason: 'Test',
      source: 'user-via-proposal',
      workspaceId: WS_ID,
    });
    expect(decision.confidence).toBe(0.85);
  });

  it('creates decision from twin proposal', () => {
    const decision = createDecisionFromTwinProposal({
      proposalId: 'prop-1',
      proposalTitle: 'Update twin with new skill',
      proposalKind: 'twin_update',
      polarity: 'approved',
      reason: 'Confirmed by user',
      workspaceId: WS_ID,
    });

    expect(decision.type).toBe('twin-update');
    expect(decision.polarity).toBe('approved');
    expect(decision.source).toBe('user-via-proposal');
    expect(decision.sourceDetail).toBe('prop-1');
  });

  it('creates artifact approval decision from twin proposal', () => {
    const decision = createDecisionFromTwinProposal({
      proposalId: 'prop-2',
      proposalTitle: 'New artifact proposal',
      proposalKind: 'artifact',
      polarity: 'approved',
      reason: 'Looks good',
      workspaceId: WS_ID,
    });

    expect(decision.type).toBe('artifact-approval');
  });

  it('creates content direction decision from twin proposal', () => {
    const decision = createDecisionFromTwinProposal({
      proposalId: 'prop-3',
      proposalTitle: 'Content opportunity',
      proposalKind: 'content_opportunity',
      polarity: 'approved',
      reason: 'Relevant',
      workspaceId: WS_ID,
    });

    expect(decision.type).toBe('content-direction');
  });

  it('creates strategy decision from external_action twin proposal', () => {
    const decision = createDecisionFromTwinProposal({
      proposalId: 'prop-4',
      proposalTitle: 'External action',
      proposalKind: 'external_action',
      polarity: 'approved',
      reason: 'Approved',
      workspaceId: WS_ID,
    });

    expect(decision.type).toBe('strategy');
  });

  it('creates decision from signal', () => {
    const decision = createDecisionFromSignal({
      signalId: 'sig-1',
      signalClaim: 'User is a security expert',
      polarity: 'approved',
      reason: 'Verified by achievements',
      workspaceId: WS_ID,
      goal: 'goal-1',
    });

    expect(decision.type).toBe('signal-acceptance');
    expect(decision.title).toBe('User is a security expert');
    expect(decision.source).toBe('user-via-signal');
    expect(decision.sourceDetail).toBe('sig-1');
  });

  it('creates decision from plan rejection', () => {
    const decision = createDecisionFromPlanRejection({
      planId: 'plan-1',
      planTitle: 'Content plan',
      reason: 'Not aligned with current strategy',
      workspaceId: WS_ID,
      goal: 'goal-1',
    });

    expect(decision.type).toBe('rejected-strategy');
    expect(decision.polarity).toBe('rejected');
    expect(decision.source).toBe('user-via-plan');
    expect(decision.sourceDetail).toBe('plan-1');
  });
});

describe('Decision Ledger — Query', () => {
  beforeEach(() => {
    clearDecisions(WS_ID);
  });

  it('getDecision returns the decision by id', () => {
    const decision = createDecision({
      type: 'positioning',
      polarity: 'approved',
      title: 'Positioning decision',
      description: 'Desc',
      reason: 'Reason',
      source: 'user-via-proposal',
      workspaceId: WS_ID,
    });
    const retrieved = getDecision(WS_ID, decision.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(decision.id);
  });

  it('getDecision returns undefined for unknown id', () => {
    expect(getDecision(WS_ID, 'nonexistent')).toBeUndefined();
  });

  it('getAllDecisions returns all decisions for workspace', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'D1', description: 'D1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    createDecision({ type: 'strategy', polarity: 'rejected', title: 'D2', description: 'D2', reason: 'R', source: 'user-via-plan', workspaceId: WS_ID });
    const all = getAllDecisions(WS_ID);
    expect(all.length).toBe(2);
  });

  it('getAllDecisions returns empty for new workspace', () => {
    expect(getAllDecisions('new-ws')).toHaveLength(0);
  });

  it('getDecisionsByType filters by type', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'P1', description: 'P1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    createDecision({ type: 'strategy', polarity: 'approved', title: 'S1', description: 'S1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    createDecision({ type: 'positioning', polarity: 'rejected', title: 'P2', description: 'P2', reason: 'R', source: 'user-via-signal', workspaceId: WS_ID });

    const positioning = getDecisionsByType(WS_ID, 'positioning');
    expect(positioning.length).toBe(2);
    expect(positioning.every((d) => d.type === 'positioning')).toBe(true);
  });

  it('getRejectedDecisions returns only rejected', () => {
    createDecision({ type: 'strategy', polarity: 'approved', title: 'A1', description: 'A1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    createDecision({ type: 'strategy', polarity: 'rejected', title: 'R1', description: 'R1', reason: 'R', source: 'user-via-plan', workspaceId: WS_ID });
    createDecision({ type: 'strategy', polarity: 'rejected', title: 'R2', description: 'R2', reason: 'R', source: 'user-via-plan', workspaceId: WS_ID });

    const rejected = getRejectedDecisions(WS_ID);
    expect(rejected.length).toBe(2);
    expect(rejected.every((d) => d.polarity === 'rejected')).toBe(true);
  });

  it('getApprovedDecisions returns only approved', () => {
    createDecision({ type: 'strategy', polarity: 'approved', title: 'A1', description: 'A1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    createDecision({ type: 'strategy', polarity: 'approved', title: 'A2', description: 'A2', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    createDecision({ type: 'strategy', polarity: 'rejected', title: 'R1', description: 'R1', reason: 'R', source: 'user-via-plan', workspaceId: WS_ID });

    const approved = getApprovedDecisions(WS_ID);
    expect(approved.length).toBe(2);
    expect(approved.every((d) => d.polarity === 'approved')).toBe(true);
  });
});

describe('Decision Ledger — Rejection Prevention', () => {
  beforeEach(() => {
    clearDecisions(WS_ID);
  });

  it('hasUserRejected returns true for matching topic', () => {
    createDecision({
      type: 'rejected-strategy',
      polarity: 'rejected',
      title: 'Content strategy X',
      description: 'Rejected because not aligned',
      reason: 'Not aligned',
      source: 'user-via-plan',
      workspaceId: WS_ID,
    });

    expect(hasUserRejected(WS_ID, 'content strategy')).toBe(true);
  });

  it('hasUserRejected returns false for non-matching topic', () => {
    createDecision({
      type: 'rejected-strategy',
      polarity: 'rejected',
      title: 'Content strategy X',
      description: 'Rejected',
      reason: 'Not aligned',
      source: 'user-via-plan',
      workspaceId: WS_ID,
    });

    expect(hasUserRejected(WS_ID, 'marketing')).toBe(false);
  });

  it('hasUserRejected with exactMatch on strategy', () => {
    createDecision({
      type: 'rejected-strategy',
      polarity: 'rejected',
      title: 'Some other strategy',
      description: 'Rejected: content-strategy-X',
      reason: 'Not aligned',
      source: 'user-via-plan',
      workspaceId: WS_ID,
    });

    expect(hasUserRejected(WS_ID, 'strategy', { strategy: 'content-strategy-X', exactMatch: true })).toBe(true);
    expect(hasUserRejected(WS_ID, 'strategy', { strategy: 'other-strategy', exactMatch: true })).toBe(false);
  });

  it('hasUserRejected returns false when no rejected decisions', () => {
    expect(hasUserRejected(WS_ID, 'any-topic')).toBe(false);
  });

  it('hasUserRejected checks description for topic match', () => {
    createDecision({
      type: 'rejected-strategy',
      polarity: 'rejected',
      title: 'Untitled',
      description: 'Rejected: video-content approach is too expensive',
      reason: 'Too expensive',
      source: 'user-via-plan',
      workspaceId: WS_ID,
    });

    expect(hasUserRejected(WS_ID, 'video-content')).toBe(true);
  });
});

describe('Decision Ledger — History', () => {
  beforeEach(() => {
    clearDecisions(WS_ID);
  });

  it('getDecisionHistory returns decisions matching topic', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'Security positioning', description: 'Desc', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID, goal: 'goal-1' });
    createDecision({ type: 'strategy', polarity: 'rejected', title: 'Security strategy B', description: 'Desc', reason: 'R', source: 'user-via-plan', workspaceId: WS_ID });

    const history = getDecisionHistory(WS_ID, 'security');
    expect(history.length).toBe(2);
  });

  it('getDecisionHistory returns decisions matching goal', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'Positioning', description: 'Desc', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID, goal: 'goal-1' });
    createDecision({ type: 'strategy', polarity: 'approved', title: 'Strategy', description: 'Desc', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID, goal: 'goal-2' });

    const history = getDecisionHistory(WS_ID, 'goal-1');
    expect(history.length).toBe(1);
    expect(history[0].goal).toBe('goal-1');
  });

  it('getDecisionHistory returns empty for no matches', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'Positioning', description: 'Desc', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    expect(getDecisionHistory(WS_ID, 'nonexistent-topic')).toHaveLength(0);
  });

  it('getDecisionHistory sorts by timestamp descending', async () => {
    const d1 = createDecision({ type: 'positioning', polarity: 'approved', title: 'Positioning First', description: 'First positioning', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    const d2 = createDecision({ type: 'positioning', polarity: 'approved', title: 'Positioning Second', description: 'Second positioning', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });

    const history = getDecisionHistory(WS_ID, 'positioning');
    expect(history[0].id).toBe(d2.id);
    expect(history[1].id).toBe(d1.id);
  });
});

describe('Decision Ledger — Supersession', () => {
  beforeEach(() => {
    clearDecisions(WS_ID);
  });

  it('supersedeDecision links decisions', () => {
    const d1 = createDecision({ type: 'positioning', polarity: 'approved', title: 'Old positioning', description: 'Old', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    const d2 = createDecision({ type: 'positioning', polarity: 'approved', title: 'New positioning', description: 'New', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });

    const result = supersedeDecision(WS_ID, d1.id, d2.id);
    expect(result).toBe(true);

    const updatedD1 = getDecision(WS_ID, d1.id)!;
    const updatedD2 = getDecision(WS_ID, d2.id)!;
    expect(updatedD1.supersededBy).toContain(d2.id);
    expect(updatedD2.supersedes).toContain(d1.id);
  });

  it('supersedeDecision returns false if decision not found', () => {
    const d1 = createDecision({ type: 'positioning', polarity: 'approved', title: 'P1', description: 'P1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    expect(supersedeDecision(WS_ID, 'nonexistent', d1.id)).toBe(false);
  });

  it('supersedeDecision returns false if superseding decision not found', () => {
    const d1 = createDecision({ type: 'positioning', polarity: 'approved', title: 'P1', description: 'P1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    expect(supersedeDecision(WS_ID, d1.id, 'nonexistent')).toBe(false);
  });
});

describe('Decision Ledger — Export/Import', () => {
  beforeEach(() => {
    clearDecisions(WS_ID);
  });

  it('exportDecisions returns the store', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'P1', description: 'P1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    const store = exportDecisions(WS_ID);
    expect(store.decisions.length).toBe(1);
    expect(store.maxDecisions).toBe(200);
  });

  it('importDecisions replaces store contents', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'Original', description: 'Orig', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });

    const externalStore = {
      decisions: [
        { id: 'imported-1', type: 'strategy' as DecisionType, polarity: 'approved', title: 'Imported', description: 'Imp', reason: 'R', source: 'user-via-proposal', timestamp: new Date().toISOString(), confidence: 0.9, workspaceId: WS_ID, supersedes: [], supersededBy: [] },
      ],
      maxDecisions: 100,
      updatedAt: new Date().toISOString(),
    };

    importDecisions(WS_ID, externalStore);
    const all = getAllDecisions(WS_ID);
    expect(all.length).toBe(1);
    expect(all[0].title).toBe('Imported');
  });

  it('clearDecisions removes all decisions', () => {
    createDecision({ type: 'positioning', polarity: 'approved', title: 'P1', description: 'P1', reason: 'R', source: 'user-via-proposal', workspaceId: WS_ID });
    clearDecisions(WS_ID);
    expect(getAllDecisions(WS_ID)).toHaveLength(0);
  });
});
