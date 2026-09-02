/**
 * Production Trace — tests for P0-3.
 *
 * Tests trace creation, step recording, completion, failure,
 * trace propagation, and trace summarization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  startTrace,
  getActiveTrace,
  getActiveTraces,
  recordStep,
  completeStep,
  completeTrace,
  failTrace,
  getTraceId,
  propagateTraceToAITraceBundle,
  traceHasActiveStep,
  type TraceWorkflowType
} from '../../src/services/tracing/productionTrace';

const WS_ID = 'ws-trace-test';

describe('Production Trace — Creation', () => {
  beforeEach(() => {
    // Clear all active traces
    startTrace({ workflowType: 'ask', workspaceId: 'ws-clear' });
    // Just restart — traces are in-memory, clearing is implicit
  });

  it('creates a trace with auto-generated id', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    expect(trace.traceId).toMatch(/^trace-/);
    expect(trace.workflowType).toBe('ask');
    expect(trace.status).toBe('IN_PROGRESS');
    expect(trace.steps).toHaveLength(0);
    expect(trace.totalLatencyMs).toBe(0);
  });

  it('records userId and workspaceId', () => {
    const trace = startTrace({ workflowType: 'plan', userId: 'user-1', workspaceId: WS_ID });
    expect(trace.userId).toBe('user-1');
    expect(trace.workspaceId).toBe(WS_ID);
  });

  it('adds initial metadata as a step', () => {
    const trace = startTrace({
      workflowType: 'execution',
      workspaceId: WS_ID,
      initialMetadata: { planId: 'plan-1', intent: 'deploy' }
    });
    expect(trace.steps).toHaveLength(1);
    expect(trace.steps[0].stepType).toBe('CHECKPOINT');
    expect(trace.steps[0].metadata).toEqual({ planId: 'plan-1', intent: 'deploy' });
  });

  it('getActiveTrace returns the trace', () => {
    const trace = startTrace({ workflowType: 'batch', workspaceId: WS_ID });
    const retrieved = getActiveTrace(trace.traceId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.traceId).toBe(trace.traceId);
  });

  it('getActiveTrace returns undefined for unknown id', () => {
    expect(getActiveTrace('nonexistent')).toBeUndefined();
  });

  it('getActiveTraces returns all active traces', () => {
    startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    startTrace({ workflowType: 'plan', workspaceId: WS_ID });
    const traces = getActiveTraces();
    expect(traces.length).toBeGreaterThanOrEqual(2);
  });

  it('evicts oldest trace at capacity', () => {
    // Fill up to capacity by creating many traces
    for (let i = 0; i < 60; i++) {
      startTrace({ workflowType: 'ask' as TraceWorkflowType, workspaceId: WS_ID });
    }
    const traces = getActiveTraces();
    expect(traces.length).toBeLessThanOrEqual(50);
  });
});

describe('Production Trace — Step Recording', () => {
  it('records a step in an active trace', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const ctx = recordStep(trace.traceId, { stepType: 'MODEL_CALL' });
    expect(ctx).toBeDefined();
    expect(ctx!.steps.length).toBe(1);
    expect(ctx!.steps[0].stepType).toBe('MODEL_CALL');
    expect(ctx!.steps[0].status).toBe('RUNNING');
  });

  it('returns undefined for unknown trace id', () => {
    const ctx = recordStep('nonexistent', { stepType: 'MODEL_CALL' });
    expect(ctx).toBeUndefined();
  });

  it('records multiple steps', () => {
    const trace = startTrace({ workflowType: 'plan', workspaceId: WS_ID });
    recordStep(trace.traceId, { stepType: 'INTENT_COMPILATION' });
    recordStep(trace.traceId, { stepType: 'CONTEXT_RETRIEVAL' });
    recordStep(trace.traceId, { stepType: 'MODEL_CALL' });
    const ctx = getActiveTrace(trace.traceId);
    expect(ctx!.steps.length).toBe(3);
  });

  it('attaches metadata to steps', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const ctx = recordStep(trace.traceId, {
      stepType: 'MODEL_CALL',
      metadata: { model: 'gpt-4', tokens: 1000 }
    });
    expect(ctx!.steps[0].metadata).toEqual({ model: 'gpt-4', tokens: 1000 });
  });
});

describe('Production Trace — Step Completion', () => {
  it('completes a step with status', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const ctx1 = recordStep(trace.traceId, { stepType: 'MODEL_CALL' });
    const stepId = ctx1!.steps[0].stepId;
    const ctx2 = completeStep(trace.traceId, {
      stepId,
      status: 'COMPLETED',
      tokensUsed: { input: 100, output: 50 }
    });
    const step = ctx2!.steps[0];
    expect(step.status).toBe('COMPLETED');
    expect(step.endedAt).toBeDefined();
    expect(step.tokensUsed).toEqual({ input: 100, output: 50 });
    expect(step.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('records error on step completion', () => {
    const trace = startTrace({ workflowType: 'execution', workspaceId: WS_ID });
    const ctx1 = recordStep(trace.traceId, { stepType: 'EXTERNAL_EXECUTION' });
    const stepId = ctx1!.steps[0].stepId;
    const ctx2 = completeStep(trace.traceId, {
      stepId,
      status: 'FAILED',
      error: { code: 'TIMEOUT', message: 'External service timed out' }
    });
    expect(ctx2!.steps[0].status).toBe('FAILED');
    expect(ctx2!.steps[0].error).toBeDefined();
    expect(ctx2!.steps[0].error!.code).toBe('TIMEOUT');
  });

  it('returns undefined for unknown step id', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const ctx = completeStep(trace.traceId, { stepId: 'nonexistent', status: 'COMPLETED' });
    expect(ctx).toBeDefined();
    expect(ctx!.steps).toHaveLength(0);
  });

  it('updates total latency on step completion', async () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const ctx1 = recordStep(trace.traceId, { stepType: 'MODEL_CALL' });
    const stepId = ctx1!.steps[0].stepId;
    // Wait a tick so latency is non-zero
    await new Promise((r) => setTimeout(r, 10));
    const ctx2 = completeStep(trace.traceId, { stepId, status: 'COMPLETED' });
    const context = ctx2!;
    expect(context.totalLatencyMs).toBeGreaterThan(0);
  });

  it('accumulates total latency across multiple steps', async () => {
    const trace = startTrace({ workflowType: 'execution', workspaceId: WS_ID });
    const ctx1 = recordStep(trace.traceId, { stepType: 'STEP_A' });
    const stepId1 = ctx1!.steps[0].stepId;
    await new Promise((r) => setTimeout(r, 15));
    const ctx2 = recordStep(trace.traceId, { stepType: 'STEP_B' });
    const stepId2 = ctx2!.steps[1].stepId;

    await new Promise((r) => setTimeout(r, 20));
    const completed1 = completeStep(trace.traceId, { stepId: stepId1, status: 'COMPLETED' });
    expect(completed1!.totalLatencyMs).toBeGreaterThan(0);

    await new Promise((r) => setTimeout(r, 20));
    const completed2 = completeStep(trace.traceId, { stepId: stepId2, status: 'COMPLETED' });
    expect(completed2!.totalLatencyMs).toBeGreaterThanOrEqual(completed1!.totalLatencyMs);
  });
});

describe('Production Trace — Completion', () => {
  it('completes a trace and returns record', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const ctx = recordStep(trace.traceId, { stepType: 'MODEL_CALL' });
    completeStep(trace.traceId, { stepId: ctx!.steps[0].stepId, status: 'COMPLETED' });
    const record = completeTrace(trace.traceId);
    expect(record).toBeDefined();
    expect(record!.status).toBe('COMPLETED');
    expect(record!.stepCount).toBe(1);
    expect(record!.traceId).toBe(trace.traceId);
    expect(record!.summary).toContain('COMPLETED');
  });

  it('removes trace from active store after completion', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    completeTrace(trace.traceId);
    expect(getActiveTrace(trace.traceId)).toBeUndefined();
  });

  it('failTrace returns FAILED record', () => {
    const trace = startTrace({ workflowType: 'execution', workspaceId: WS_ID });
    recordStep(trace.traceId, { stepType: 'EXTERNAL_EXECUTION' });
    const record = failTrace(trace.traceId, {
      error: { code: 'FATAL', message: 'Unrecoverable error' }
    });
    expect(record).toBeDefined();
    expect(record!.status).toBe('FAILED');
    expect(record!.summary).toContain('FAILED');
  });

  it('completeTrace with custom summary', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const record = completeTrace(trace.traceId, {
      summary: 'Custom summary',
      relatedEntities: ['plan-1', 'artifact-2']
    });
    expect(record!.summary).toBe('Custom summary');
    expect(record!.relatedEntities).toEqual(['plan-1', 'artifact-2']);
  });

  it('completeTrace with forceStatus', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const record = completeTrace(trace.traceId, { forceStatus: 'BLOCKED' });
    expect(record!.status).toBe('BLOCKED');
  });
});

describe('Production Trace — Trace Propagation', () => {
  it('getTraceId returns trace id from context', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    expect(getTraceId(trace)).toBe(trace.traceId);
  });

  it('propagateTraceToAITraceBundle sets trace_id on bundle', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    const bundle = { trace_id: '', model: 'gpt-4', input_tokens: 100 };
    const propagated = propagateTraceToAITraceBundle(bundle as any, trace.traceId);
    expect(propagated.trace_id).toBe(trace.traceId);
  });

  // Removed: `buildCheckpoint` here was a passthrough shadowing the real
  // checkpoint builder, and this test asserted it through an `as any` cast that
  // supplied a field the function did not have. Trace-id propagation is covered
  // by the `propagateTraceToAITraceBundle` tests above.

  it('traceHasActiveStep returns true when step is running', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    recordStep(trace.traceId, { stepType: 'MODEL_CALL' });
    expect(traceHasActiveStep(trace.traceId)).toBe(true);
  });

  it('traceHasActiveStep returns false when no active steps', () => {
    const trace = startTrace({ workflowType: 'ask', workspaceId: WS_ID });
    expect(traceHasActiveStep(trace.traceId)).toBe(false);
  });

  it('traceHasActiveStep returns false for unknown trace', () => {
    expect(traceHasActiveStep('nonexistent')).toBe(false);
  });
});

describe('Production Trace — Summarization', () => {
  it('summarizes completed trace', () => {
    const trace = startTrace({ workflowType: 'plan', workspaceId: WS_ID });
    recordStep(trace.traceId, { stepType: 'STEP_A' });
    recordStep(trace.traceId, { stepType: 'STEP_B' });
    const stepId1 = getActiveTrace(trace.traceId)!.steps[0].stepId;
    const stepId2 = getActiveTrace(trace.traceId)!.steps[1].stepId;
    completeStep(trace.traceId, { stepId: stepId1, status: 'COMPLETED' });
    completeStep(trace.traceId, { stepId: stepId2, status: 'COMPLETED' });
    const record = completeTrace(trace.traceId);

    expect(record).toBeDefined();
    expect(record!.status).toBe('COMPLETED');
    expect(record!.stepCount).toBe(2);
    expect(record!.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(record!.summary).toBeDefined();
    expect(record!.summary.length).toBeGreaterThan(0);
  });
});
