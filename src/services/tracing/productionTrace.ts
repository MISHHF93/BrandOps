/**
 * Production Trace — correlated trace across the full workflow lifecycle.
 *
 * The production-tracing work is tracked in the README product backlog.
 *
 * Assigns one traceId to a complete workflow and propagates it through all
 * tracing systems: AI trace bundles, operator traces, audit entries, checkpoints,
 * assistant turn traces, and AI Core artifacts.
 */

import type { TraceBundle } from '../../types/aiTraceGraph';

// ---------------------------------------------------------------------------
// Trace Context
// ---------------------------------------------------------------------------

/** The top-level trace context for a correlated workflow. */
export interface TraceContext {
  /** Unique trace ID (UUID-like, generated at creation). */
  traceId: string;
  /** Workflow type (ask, plan, execution, agent-call, batch). */
  workflowType: TraceWorkflowType;
  /** When the trace was started. */
  startedAt: string;
  /** User id (if available). */
  userId?: string;
  /** Workspace id. */
  workspaceId: string;
  /** Current status. */
  status: TraceStatus;
  /** Steps recorded so far. */
  steps: TraceStep[];
  /** Total latency so far (ms, from start to last step end). */
  totalLatencyMs: number;
  /** Total tokens used across all model calls (if available). */
  totalTokensUsed?: number;
  /** Total cost (if available). */
  totalCostUsd?: number;
}

/** Workflow types. */
export type TraceWorkflowType =
  | 'ask'
  | 'plan'
  | 'execution'
  | 'agent-call'
  | 'batch'
  | 'approval'
  | 'verification';

/** Trace status. */
export type TraceStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED';

/** A step within a trace. */
export type TraceStepType =
  | 'ASK_QUERY'
  | 'INTENT_COMPILATION'
  | 'CONTEXT_RETRIEVAL'
  | 'EXPERT_SELECTION'
  | 'MODEL_CALL'
  | 'TOOL_CALL'
  | 'CHECKPOINT'
  | 'PLAN_CREATION'
  | 'APPROVAL'
  | 'EXTERNAL_EXECUTION'
  | 'VERIFICATION'
  | 'OUTCOME';

/** A step within a trace. */
export interface TraceStep {
  /** Step id (unique within trace). */
  stepId: string;
  /** Step type. */
  stepType: TraceStepType;
  /** When the step started. */
  startedAt: string;
  /** When the step ended (if completed). */
  endedAt?: string;
  /** Status. */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  /** Arbitrary metadata (summaries, not full prompts). */
  metadata?: Record<string, string | number | boolean>;
  /** Error info (if failed). */
  error?: { code: string; message: string };
  /** Latency in ms (computed when ended). */
  latencyMs?: number;
  /** Tokens used (if model call). */
  tokensUsed?: { input: number; output: number };
  /** Cost in USD (if available). */
  costUsd?: number;
}

// ---------------------------------------------------------------------------
// Trace Store
// ---------------------------------------------------------------------------

/** Persisted production traces. */
export interface ProductionTracesState {
  /** All traces (capped). */
  traces: ProductionTraceRecord[];
  /** Max traces to retain. */
  maxTraces: number;
  /** Updated at. */
  updatedAt: string;
}

/** A persisted trace record (summary, not full details). */
export interface ProductionTraceRecord {
  /** Trace id. */
  traceId: string;
  /** Workflow type. */
  workflowType: TraceWorkflowType;
  /** Started at. */
  startedAt: string;
  /** Completed at (if finished). */
  completedAt?: string;
  /** Status. */
  status: TraceStatus;
  /** Step count. */
  stepCount: number;
  /** Total latency (ms). */
  totalLatencyMs: number;
  /** Total tokens (if available). */
  totalTokensUsed?: number;
  /** Total cost (if available). */
  totalCostUsd?: number;
  /** Short summary (for listing). */
  summary: string;
  /** Related entities (plan ids, conversation ids, etc.). */
  relatedEntities: string[];
}

/** In-memory store for active traces (not yet persisted). */
const activeTraces: Map<string, TraceContext> = new Map();

/** Maximum active traces. */
const MAX_ACTIVE_TRACES = 50;

// ---------------------------------------------------------------------------
// Trace Creation
// ---------------------------------------------------------------------------

/**
 * Generate a trace id.
 */
function generateTraceId(): string {
  return `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Start a new production trace.
 */
export function startTrace(params: {
  workflowType: TraceWorkflowType;
  userId?: string;
  workspaceId: string;
  conversationId?: string;
  initialMetadata?: Record<string, string | number | boolean>;
}): TraceContext {
  // Evict oldest if at capacity
  if (activeTraces.size >= MAX_ACTIVE_TRACES) {
    const oldestKey = Array.from(activeTraces.keys()).sort()[0];
    activeTraces.delete(oldestKey);
  }

  const traceId = generateTraceId();
  const now = new Date().toISOString();

  const context: TraceContext = {
    traceId,
    workflowType: params.workflowType,
    startedAt: now,
    userId: params.userId,
    workspaceId: params.workspaceId,
    status: 'IN_PROGRESS',
    steps: [],
    totalLatencyMs: 0
  };

  // Add initial metadata as a step if provided
  if (params.initialMetadata && Object.keys(params.initialMetadata).length > 0) {
    context.steps.push({
      stepId: `step-initial-${Date.now().toString(36)}`,
      stepType: 'CHECKPOINT',
      startedAt: now,
      status: 'COMPLETED',
      latencyMs: 0,
      metadata: params.initialMetadata
    });
  }

  activeTraces.set(traceId, context);
  return context;
}

/**
 * Get an active trace by id.
 */
export function getActiveTrace(traceId: string): TraceContext | undefined {
  return activeTraces.get(traceId);
}

/**
 * Get all active traces.
 */
export function getActiveTraces(): TraceContext[] {
  return Array.from(activeTraces.values());
}

// ---------------------------------------------------------------------------
// Step Recording
// ---------------------------------------------------------------------------

/**
 * Record a step in the trace.
 */
export function recordStep(
  traceId: string,
  params: {
    stepType: TraceStepType;
    metadata?: Record<string, string | number | boolean>;
  }
): TraceContext | undefined {
  const context = activeTraces.get(traceId);
  if (!context) return undefined;

  const now = new Date().toISOString();
  const step: TraceStep = {
    stepId: `step-${context.steps.length + 1}-${Date.now().toString(36)}`,
    stepType: params.stepType,
    startedAt: now,
    status: 'RUNNING',
    metadata: params.metadata
  };

  context.steps.push(step);
  return context;
}

/**
 * Complete a step in the trace.
 */
export function completeStep(
  traceId: string,
  params: {
    stepId: string;
    status?: 'COMPLETED' | 'FAILED' | 'SKIPPED';
    error?: { code: string; message: string };
    tokensUsed?: { input: number; output: number };
    costUsd?: number;
  }
): TraceContext | undefined {
  const context = activeTraces.get(traceId);
  if (!context) return undefined;

  const step = context.steps.find((s) => s.stepId === params.stepId);
  if (!step) return context;

  const now = new Date();
  const nowIso = now.toISOString();
  const startTime = new Date(step.startedAt).getTime();
  const endTime = now.getTime();
  step.status = params.status ?? 'COMPLETED';
  step.endedAt = nowIso;
  step.error = params.error;
  step.tokensUsed = params.tokensUsed;
  step.costUsd = params.costUsd;
  step.latencyMs = endTime - startTime;

  // Update totals
  context.totalLatencyMs = endTime - new Date(context.startedAt).getTime();

  if (params.tokensUsed) {
    if (context.totalTokensUsed === undefined) {
      context.totalTokensUsed = 0;
    }
    context.totalTokensUsed += params.tokensUsed.input + params.tokensUsed.output;
  }

  if (params.costUsd !== undefined) {
    if (context.totalCostUsd === undefined) {
      context.totalCostUsd = 0;
    }
    context.totalCostUsd += params.costUsd;
  }

  // Update status
  if (params.status === 'FAILED') {
    context.status = 'FAILED';
  } else if (context.steps.every((s) => s.status === 'COMPLETED' || s.status === 'SKIPPED')) {
    context.status = 'COMPLETED';
  }

  return context;
}

/**
 * Record an error on a step without completing it.
 */
export function recordError(
  traceId: string,
  params: {
    stepId: string;
    error: { code: string; message: string };
  }
): TraceContext | undefined {
  const context = activeTraces.get(traceId);
  if (!context) return undefined;

  const step = context.steps.find((s) => s.stepId === params.stepId);
  if (step) {
    step.error = params.error;
    step.status = 'FAILED';
    context.status = 'FAILED';
  }

  return context;
}

// ---------------------------------------------------------------------------
// Trace Completion
// ---------------------------------------------------------------------------

/**
 * Complete a trace and persist it.
 */
export function completeTrace(
  traceId: string,
  params?: {
    forceStatus?: TraceStatus;
    summary?: string;
    relatedEntities?: string[];
  }
): ProductionTraceRecord | undefined {
  const context = activeTraces.get(traceId);
  if (!context) return undefined;

  const now = new Date().toISOString();
  const status = params?.forceStatus ?? context.status;

  const record: ProductionTraceRecord = {
    traceId: context.traceId,
    workflowType: context.workflowType,
    startedAt: context.startedAt,
    completedAt: now,
    status,
    stepCount: context.steps.length,
    totalLatencyMs: context.totalLatencyMs,
    totalTokensUsed: context.totalTokensUsed,
    totalCostUsd: context.totalCostUsd,
    summary: params?.summary ?? summarizeTrace(context),
    relatedEntities: params?.relatedEntities ?? []
  };

  // Persist the record (in production, this would go to storage)
  // For now, we just remove from active traces
  activeTraces.delete(traceId);

  return record;
}

/**
 * Fail a trace.
 */
export function failTrace(
  traceId: string,
  params: {
    error?: { code: string; message: string };
    summary?: string;
  }
): ProductionTraceRecord | undefined {
  const context = activeTraces.get(traceId);
  if (!context) return undefined;

  if (params.error) {
    // Record error on the last incomplete step
    const lastStep = [...context.steps].reverse().find((s) => s.status === 'RUNNING');
    if (lastStep) {
      lastStep.status = 'FAILED';
      lastStep.error = params.error;
      lastStep.endedAt = new Date().toISOString();
    }
    context.status = 'FAILED';
  }

  return completeTrace(traceId, {
    forceStatus: 'FAILED',
    summary: params.summary ?? summarizeTrace(context)
  });
}

/**
 * Summarize a trace for display.
 */
function summarizeTrace(context: TraceContext): string {
  const completedSteps = context.steps.filter((s) => s.status === 'COMPLETED').length;
  const failedSteps = context.steps.filter((s) => s.status === 'FAILED').length;
  const status = context.status;

  let summary = `${completedSteps} step(s) completed`;
  if (failedSteps > 0) summary += `, ${failedSteps} failed`;
  if (context.totalLatencyMs > 0) {
    const secs = (context.totalLatencyMs / 1000).toFixed(1);
    summary += `, ${secs}s total`;
  }
  if (context.totalTokensUsed !== undefined) {
    summary += `, ${context.totalTokensUsed.toLocaleString()} tokens`;
  }
  if (context.totalCostUsd !== undefined && context.totalCostUsd > 0) {
    summary += `, $${context.totalCostUsd.toFixed(4)}`;
  }
  summary += ` — ${status}`;

  return summary;
}

// ---------------------------------------------------------------------------
// Integration Helpers
// ---------------------------------------------------------------------------

/**
 * Get the trace id from an active trace context (for propagation to other systems).
 */
export function getTraceId(context: TraceContext): string {
  return context.traceId;
}

/**
 * Propagate trace id to an AI trace bundle.
 */
export function propagateTraceToAITraceBundle(bundle: TraceBundle, traceId: string): TraceBundle {
  return {
    ...bundle,
    trace_id: traceId
  };
}

/*
 * REMOVED (2026-08-31): `buildCheckpoint`, `buildOperatorTrace` and
 * `buildAuditEntry` lived here, shadowing by name the three builders that
 * actually write BrandOps' audit ledger — `checkpointStore.buildCheckpoint`,
 * the operator-trace builder in `dataset/operatorTraces.ts`, and
 * `interop/audit.ts`.
 *
 * They were passthroughs: no id, no timestamp, no length clamping, and return
 * types of bare `string` fields rather than `Checkpoint` / `OperatorTraceEntry`.
 * Nothing outside this module's own test called them, so they were dead — but a
 * developer reaching for `buildCheckpoint` and taking the editor's first
 * suggestion would have produced a checkpoint with no id and no `at`, and
 * written it into the ledger the whole audit story depends on.
 *
 * The tracing core below (startTrace / recordStep / completeTrace / failTrace)
 * is unwired but coherent, and is left alone. Trace ids reach AI trace bundles
 * through `propagateTraceToAITraceBundle`.
 */

/** Check if a trace has any active (RUNNING) steps. */
export function traceHasActiveStep(traceId: string): boolean {
  const context = activeTraces.get(traceId);
  if (!context) return false;
  return context.steps.some((s) => s.status === 'RUNNING');
}
