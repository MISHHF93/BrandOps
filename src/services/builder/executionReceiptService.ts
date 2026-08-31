/**
 * Execution Receipt Service — creates standardized durable receipts for every
 * consequential BrandOps command. Each receipt captures the source command,
 * resulting plan reference, generated steps, and a verifiable summary. Receipts
 * are stored as PlanReceipt rows inside `workspace.planWorkspace.receipts`.
 */

import type { BrandOpsData, PlanReceipt } from '../../types/domain';
import type { AgentToolResult } from '../../types/agentInterop';
import { prependOperatorTrace } from '../../services/dataset/operatorTraces';
import { prependCheckpoint } from '../../services/execution/checkpointStore';
import { appendAuditEntry } from '../interop/audit';

export interface CreateReceiptInput {
  workspace: BrandOpsData;
  requestedBy: string;
  approvedBy?: string;
  source?: string;
  command: string;
  planId?: string;
  checkpointId?: string;
  sourceMessageId?: string;
  generatedOutputs?: string[];
  outputs?: Array<string | { title?: string }>;
  result?: Record<string, unknown>;
  affectedObjects?: Array<{ type: string; id: string; label?: string }>;
  nextAction?: string;
  summary: string;
}

export interface ReceiptResult {
  workspace: BrandOpsData;
  receipt: PlanReceipt;
}

export function createReceipt(input: CreateReceiptInput): ReceiptResult {
  const timestamp = new Date().toISOString();
  const id = `receipt-${timestamp.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;

  const receipt: PlanReceipt = {
    id,
    planId: input.planId ?? '',
    convertedFrom: 'builder.execution',
    planType: 'custom-plan',
    sourceMessageId: input.sourceMessageId ?? id,
    generatedSteps: [
      ...(input.generatedOutputs ?? []),
      ...(input.outputs ?? []).map((o) => (typeof o === 'string' ? o : o.title ?? ''))
    ].filter((step) => step.length > 0),
    userAction: 'save-plan',
    timestamp,
    summary: input.summary
  };

  const prior = input.workspace.planWorkspace;
  const withReceipt: BrandOpsData = {
    ...input.workspace,
    planWorkspace: {
      plans: prior?.plans ?? [],
      receipts: [receipt, ...(prior?.receipts ?? [])].slice(0, 80),
      updatedAt: timestamp
    }
  };

  // Audit trail
  const withAudit = appendAuditEntry(withReceipt, {
    sessionId: input.checkpointId ?? id,
    clientKind: 'brandops',
    capabilityId: input.command as 'builder.receipts.list',
    operation: `receipt:${id}`,
    ok: true,
    errorCode: undefined,
    summary: input.summary,
    requestPreview: JSON.stringify(input.result ?? {}),
    latencyMs: 0
  });

  // Operator trace
  const withTrace = prependOperatorTrace(withAudit, {
    source: 'assistant',
    verb: `receipt.${id.replace(/[^a-z0-9]/g, '_')}`,
    surface: 'plan',
    capabilityId: input.command as 'builder.receipts.list',
    sessionId: id,
    entityType: 'receipt',
    entityId: id,
    outcome: 'success',
    labels: [input.command, 'receipt']
  });

  // Checkpoint for traceability
  const withCheckpoint = prependCheckpoint(withTrace, {
    conversationId: input.checkpointId ?? id,
    type: 'tool.invocation',
    state: 'COMPLETED',
    summary: input.summary,
    source: 'assistant',
    receiptRef: id
  });

  return {
    workspace: withCheckpoint,
    receipt
  };
}

/**
 * Create a receipt from an MCP tool call result.
 */
export function createReceiptFromToolResult(
  workspace: BrandOpsData,
  sessionLabel: string,
  capabilityId: string,
  toolResult: AgentToolResult,
  command: string,
  summary: string,
  affectedObjects?: Array<{ type: string; id: string; label?: string }>
): ReceiptResult {
  const result: Record<string, unknown> = {
    ok: toolResult.ok,
    capabilityId,
    data: toolResult.data,
    errorCode: toolResult.errorCode,
    error: toolResult.error,
    approvalRequired: toolResult.approvalRequired
  };

  return createReceipt({
    workspace,
    requestedBy: sessionLabel,
    approvedBy: 'user',
    source: 'bridge',
    command,
    result,
    affectedObjects,
    summary,
    nextAction: toolResult.ok
      ? 'Review the result in the appropriate section.'
      : 'Review the error and retry or dismiss.'
  });
}