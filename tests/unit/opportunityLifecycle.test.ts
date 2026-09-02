/**
 * Opportunity Lifecycle — tests for P0-6.
 *
 * Tests lifecycle state transitions, signal creation, dismissal tracking,
 * rediscovery prevention, and lifecycle query.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSignalFromRecommendation,
  addSignal,
  getAllSignals,
  getActiveSignals,
  getUnactedSignals,
  qualifySignal,
  dismissSignal,
  saveSignal,
  planSignal,
  actSignal,
  observeOutcome,
  learnSignal,
  isDismissed,
  filterDismissedSignals,
  isSignalDismissedBySourceId,
  clearSignalStore,
  getSignalStore
} from '../../src/services/opportunity/opportunityLifecycle';
import type { OpportunityRecommendation } from '../../src/types/builder';

const WS_ID = 'ws-opp-test';

function makeRecommendation(
  overrides: Partial<OpportunityRecommendation> = {}
): OpportunityRecommendation {
  return {
    id: 'opp-rec-1',
    workspaceId: WS_ID,
    category: 'hiring',
    title: 'Hiring opportunity at Acme',
    description: 'Acme is hiring for a senior role',
    reason: 'Job posting detected',
    evidence: [{ ref: 'job:acme/123', kind: 'job-posting', label: 'Acme Senior Role' }],
    confidence: 0.8,
    expectedValue: 0.7,
    effort: 'medium',
    goalAlignment: ['growth'],
    primaryAction: 'Evaluate and plan outreach',
    actions: [
      { type: 'save', label: 'Save for later' },
      { type: 'dismiss', label: 'Not relevant' }
    ],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe('Opportunity Lifecycle — Signal Creation', () => {
  beforeEach(() => {
    // Clear the store by deleting the workspace
    clearSignalStore(WS_ID);
  });

  it('creates signal in DETECTED state from recommendation', () => {
    const rec = makeRecommendation();
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });

    expect(signal.id).toMatch(/^sig-/);
    expect(signal.lifecycleState).toBe('DETECTED');
    expect(signal.transitions.DETECTED).toBeDefined();
    expect(signal.createdAt).toBeDefined();
    expect(signal.updatedAt).toBeDefined();
    expect(signal.sourceRecommendationId).toBe('opp-rec-1');
  });

  it('creates signal with custom lifecycle state', () => {
    const rec = makeRecommendation();
    const signal = createSignalFromRecommendation({
      recommendation: rec,
      workspaceId: WS_ID,
      lifecycleState: 'QUALIFIED'
    });

    expect(signal.lifecycleState).toBe('QUALIFIED');
    expect(signal.transitions.QUALIFIED).toBeDefined();
  });

  it('creates signal with all optional fields from recommendation', () => {
    const rec = makeRecommendation({
      id: 'opp-rec-2',
      category: 'partnership',
      title: 'Partnership opportunity',
      description: 'Partner integration proposed',
      reason: 'Partner inquiry',
      evidence: [{ ref: 'partner:acme', kind: 'partner', label: 'Acme Corp' }],
      confidence: 0.9,
      expectedValue: 0.85,
      effort: 'high',
      goalAlignment: ['revenue', 'ecosystem'],
      primaryAction: 'Schedule meeting',
      actions: [
        { type: 'save', label: 'Save' },
        { type: 'dismiss', label: 'Dismiss' },
        { type: 'plan', label: 'Plan approach' }
      ]
    });

    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });

    expect(signal.sourceRecommendationId).toBe('opp-rec-2');
    expect(signal.actions.length).toBe(3);
    expect(signal.evidence.length).toBe(1);
  });

  it('adds signal to store', () => {
    const rec = makeRecommendation({ id: 'rec-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);

    const all = getAllSignals(WS_ID);
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(signal.id);
  });
});

describe('Opportunity Lifecycle — State Transitions', () => {
  beforeEach(() => {
    clearSignalStore(WS_ID);
  });

  it('qualifies a DETECTED signal', () => {
    const rec = makeRecommendation({ id: 'rec-qual-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);

    const qualified = qualifySignal(WS_ID, signal.id);
    expect(qualified).toBeDefined();
    expect(qualified!.lifecycleState).toBe('QUALIFIED');
    expect(qualified!.transitions.QUALIFIED).toBeDefined();
    expect(qualified!.transitions.DETECTED).toBeDefined();
  });

  it('returns undefined for unknown signal on qualify', () => {
    expect(qualifySignal(WS_ID, 'nonexistent')).toBeUndefined();
  });

  it('transitions through full lifecycle', () => {
    const rec = makeRecommendation({ id: 'rec-full-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);

    // DETECTED → QUALIFIED
    qualifySignal(WS_ID, signal.id);

    // QUALIFIED → SAVED
    const saved = saveSignal({ workspaceId: WS_ID, signalId: signal.id });
    expect(saved!.lifecycleState).toBe('SAVED');

    // SAVED → PLANNED
    const planned = planSignal({ workspaceId: WS_ID, signalId: signal.id, planId: 'plan-1' });
    expect(planned!.lifecycleState).toBe('PLANNED');
    expect(planned!.savedPlanId).toBe('plan-1');

    // PLANNED → ACTED
    const acted = actSignal({ workspaceId: WS_ID, signalId: signal.id, executionId: 'exec-1' });
    expect(acted!.lifecycleState).toBe('ACTED');
    expect(acted!.actedExecutionId).toBe('exec-1');

    // ACTED → OUTCOME_OBSERVED
    const observed = observeOutcome({
      workspaceId: WS_ID,
      signalId: signal.id,
      observation: 'Great results'
    });
    expect(observed!.lifecycleState).toBe('OUTCOME_OBSERVED');
    expect(observed!.outcomeObservation).toBe('Great results');

    // OUTCOME_OBSERVED → LEARNED
    const learned = learnSignal({
      workspaceId: WS_ID,
      signalId: signal.id,
      learning: 'Content works well'
    });
    expect(learned!.lifecycleState).toBe('LEARNED');
    expect(learned!.learning).toBe('Content works well');
  });

  it('getActiveSignals excludes DISMISSED and LEARNED', () => {
    const rec1 = makeRecommendation({ id: 'rec-active-1' });
    const sig1 = createSignalFromRecommendation({ recommendation: rec1, workspaceId: WS_ID });
    addSignal(WS_ID, sig1);

    const rec2 = makeRecommendation({ id: 'rec-dismissed-1' });
    const sig2 = createSignalFromRecommendation({ recommendation: rec2, workspaceId: WS_ID });
    addSignal(WS_ID, sig2);
    dismissSignal({ workspaceId: WS_ID, signalId: sig2.id, reason: 'Not relevant' });

    const rec3 = makeRecommendation({ id: 'rec-learned-1' });
    const sig3 = createSignalFromRecommendation({ recommendation: rec3, workspaceId: WS_ID });
    addSignal(WS_ID, sig3);
    learnSignal({ workspaceId: WS_ID, signalId: sig3.id, learning: 'Lesson' });

    const active = getActiveSignals(WS_ID);
    expect(active.length).toBe(1);
    expect(active[0].id).toBe(sig1.id);
  });

  it('getUnactedSignals excludes SAVED, PLANNED, ACTED, etc.', () => {
    const rec1 = makeRecommendation({ id: 'rec-unacted-1' });
    const sig1 = createSignalFromRecommendation({ recommendation: rec1, workspaceId: WS_ID });
    addSignal(WS_ID, sig1);

    const rec2 = makeRecommendation({ id: 'rec-saved-1' });
    const sig2 = createSignalFromRecommendation({ recommendation: rec2, workspaceId: WS_ID });
    addSignal(WS_ID, sig2);
    saveSignal({ workspaceId: WS_ID, signalId: sig2.id });

    const rec3 = makeRecommendation({ id: 'rec-planned-1' });
    const sig3 = createSignalFromRecommendation({ recommendation: rec3, workspaceId: WS_ID });
    addSignal(WS_ID, sig3);
    planSignal({ workspaceId: WS_ID, signalId: sig3.id, planId: 'plan-1' });

    const unacteds = getUnactedSignals(WS_ID);
    expect(unacteds.length).toBe(1);
    expect(unacteds[0].id).toBe(sig1.id);
  });
});

describe('Opportunity Lifecycle — Dismissal', () => {
  beforeEach(() => {
    clearSignalStore(WS_ID);
  });

  it('dismisses a signal with reason', () => {
    const rec = makeRecommendation({ id: 'rec-dismiss-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);

    const dismissed = dismissSignal({
      workspaceId: WS_ID,
      signalId: signal.id,
      reason: 'Not relevant to current strategy'
    });
    expect(dismissed).toBeDefined();
    expect(dismissed!.lifecycleState).toBe('DISMISSED');
    expect(dismissed!.dismissedReason).toBe('Not relevant to current strategy');
    expect(dismissed!.transitions.DISMISSED).toBeDefined();
  });

  it('returns dismissed signals via store check', () => {
    const rec1 = makeRecommendation({ id: 'rec-active-dismiss-1' });
    const sig1 = createSignalFromRecommendation({ recommendation: rec1, workspaceId: WS_ID });
    addSignal(WS_ID, sig1);

    const rec2 = makeRecommendation({ id: 'rec-dismiss-2' });
    const sig2 = createSignalFromRecommendation({ recommendation: rec2, workspaceId: WS_ID });
    addSignal(WS_ID, sig2);
    dismissSignal({ workspaceId: WS_ID, signalId: sig2.id, reason: 'Not now' });

    expect(isDismissed(WS_ID, sig2.id)).toBe(true);
    expect(isDismissed(WS_ID, sig1.id)).toBe(false);
  });

  it('dismissed signal prevents rediscovery', () => {
    const rec = makeRecommendation({ id: 'rec-rediscover-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);
    dismissSignal({ workspaceId: WS_ID, signalId: signal.id, reason: 'Not relevant' });

    const filtered = filterDismissedSignals(WS_ID, [{ id: signal.id }]);
    expect(filtered.length).toBe(0);
  });

  it('isSignalDismissedBySourceId works', () => {
    const rec = makeRecommendation({ id: 'rec-source-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);
    dismissSignal({ workspaceId: WS_ID, signalId: signal.id, reason: 'Dismissed' });

    expect(isSignalDismissedBySourceId(WS_ID, 'rec-source-1')).toBe(true);
    expect(isSignalDismissedBySourceId(WS_ID, 'rec-unknown')).toBe(false);
  });
});

describe('Opportunity Lifecycle — Query', () => {
  beforeEach(() => {
    clearSignalStore(WS_ID);
  });

  it('getAllSignals returns all signals', () => {
    const rec1 = makeRecommendation({ id: 'rec-q-1' });
    const sig1 = createSignalFromRecommendation({ recommendation: rec1, workspaceId: WS_ID });
    addSignal(WS_ID, sig1);

    const rec2 = makeRecommendation({ id: 'rec-q-2' });
    const sig2 = createSignalFromRecommendation({ recommendation: rec2, workspaceId: WS_ID });
    addSignal(WS_ID, sig2);

    const all = getAllSignals(WS_ID);
    expect(all.length).toBe(2);
  });

  it('getAllSignals returns empty for new workspace', () => {
    expect(getAllSignals('new-ws')).toHaveLength(0);
  });

  it('signals from different workspaces are isolated', () => {
    const recA = makeRecommendation({ id: 'rec-a' });
    const sigA = createSignalFromRecommendation({ recommendation: recA, workspaceId: 'ws-a' });
    addSignal('ws-a', sigA);

    const recB = makeRecommendation({ id: 'rec-b' });
    const sigB = createSignalFromRecommendation({ recommendation: recB, workspaceId: 'ws-b' });
    addSignal('ws-b', sigB);

    const wsASignals = getAllSignals('ws-a');
    const wsBSignals = getAllSignals('ws-b');

    expect(wsASignals.length).toBe(1);
    expect(wsBSignals.length).toBe(1);
    expect(wsASignals[0].title).toBe('Hiring opportunity at Acme');
    expect(wsBSignals[0].title).toBe('Hiring opportunity at Acme');
  });
});

describe('Opportunity Lifecycle — Rediscovery Prevention', () => {
  beforeEach(() => {
    clearSignalStore(WS_ID);
  });

  it('dismissed signals are tracked in dismissedIds set', () => {
    const rec = makeRecommendation({ id: 'rec-tracked-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);

    const store = getSignalStore(WS_ID);
    expect(store.dismissedIds.size).toBe(0);

    dismissSignal({ workspaceId: WS_ID, signalId: signal.id, reason: 'Not relevant' });

    const updatedStore = getSignalStore(WS_ID);
    expect(updatedStore.dismissedIds.size).toBe(1);
    expect(updatedStore.dismissedIds.has(signal.id)).toBe(true);
  });

  it('LEARNED signals are fully processed', () => {
    const rec = makeRecommendation({ id: 'rec-learned-1' });
    const signal = createSignalFromRecommendation({ recommendation: rec, workspaceId: WS_ID });
    addSignal(WS_ID, signal);

    // Full lifecycle to LEARNED
    qualifySignal(WS_ID, signal.id);
    saveSignal({ workspaceId: WS_ID, signalId: signal.id });
    planSignal({ workspaceId: WS_ID, signalId: signal.id, planId: 'plan-1' });
    actSignal({ workspaceId: WS_ID, signalId: signal.id, executionId: 'exec-1' });
    observeOutcome({ workspaceId: WS_ID, signalId: signal.id, observation: 'Success' });
    const learned = learnSignal({
      workspaceId: WS_ID,
      signalId: signal.id,
      learning: 'Content strategy works'
    });

    expect(learned!.lifecycleState).toBe('LEARNED');
    expect(learned!.learning).toBe('Content strategy works');
    expect(learned!.transitions.LEARNED).toBeDefined();
  });
});
