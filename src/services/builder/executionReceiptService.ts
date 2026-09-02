/**
 * Execution Receipt Service — the durable record of every consequential BrandOps
 * command.
 *
 * Two rows are written per command, because they answer different questions.
 * The `PlanReceipt` is the plan-surface row the interface renders. The
 * `ExecutionReceipt` is the governance record: who asked, under what authority,
 * which capability ran, what it touched, and how it ended. The directive's
 * mutation flow ends `… → Command → Execution → Verification → Receipt →
 * Outcome`, and that last artifact has to be able to answer for the ones before
 * it.
 *
 * It could not. `ExecutionReceipt` was a fully specified type with a declared
 * store slot that nothing ever wrote, while this function accepted
 * `requestedBy`, `approvedBy`, `command`, `result`, `affectedObjects` and
 * `nextAction` from every call site and silently dropped all six into a
 * `PlanReceipt` that has fields for none of them. Every caller looked correct.
 * The artifact was a timestamp and a summary string.
 *
 * `approvedBy` is now derived rather than asserted. Five call sites passed the
 * literal `'user'`, three of them for `access: 'auto'` capabilities that ask no
 * one — a receipt claiming a human decision that never happened. Authority comes
 * from the registry, which is the only thing that knows whether the capability
 * required a person.
 */

import type { BrandOpsData, PlanReceipt } from '../../types/domain';
import type {
  AffectedObjectRef,
  EntityRefType,
  ExecutionReceipt,
  ReceiptResult as ReceiptOutcome,
  ReceiptVerification
} from '../../types/builder';
import type { AgentToolResult } from '../../types/agentInterop';
import { AGENT_CAPABILITY_REGISTRY } from '../interop/capabilityRegistry';
import { resolveWorkspaceId } from '../workspaceIdentity';
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
  /**
   * Whether the command succeeded. The audit entry and the operator trace used
   * to be hardcoded to `ok: true` / `outcome: 'success'` regardless — so a
   * failed capability call would have been recorded as a success in the two
   * places anyone looks to find out what happened.
   */
  ok?: boolean;
  /**
   * The precise outcome, when "succeeded or not" is too coarse.
   *
   * `blocked` and `failed` are different facts: nothing was attempted versus
   * something was attempted and did not work. Collapsing them would tell a user
   * asking why their email never arrived the wrong story.
   */
  resultState?: ReceiptOutcome;
  /**
   * Independent evidence that the effect happened, and of what kind.
   *
   * `ReceiptVerification` was a defined type nothing wrote — the same shape as
   * `ExecutionReceipt` itself before cycle 8. The dispatcher knew whether the
   * connector had returned proof and put the answer in an English sentence
   * inside `summary`, so telling *verified* from *claimed* meant parsing prose.
   * That is the exact distinction the directive asks receipts to keep.
   */
  verification?: ReceiptVerification;
}

/**
 * Who authorised this, according to the registry rather than the call site.
 *
 * An `access: 'auto'` capability asks nobody: the authority is the session grant
 * the user issued earlier, and `requestedBy` already records who used it.
 * Naming a user as approver there would put a human decision in the record that
 * no human made — which is exactly the sort of thing a receipt exists to rule
 * out. An unknown command is treated as needing approval: guessing "auto" for
 * something the registry does not describe is the unsafe direction.
 */
function approvalProvenance(command: string, supplied?: string): string | undefined {
  const access =
    AGENT_CAPABILITY_REGISTRY[command as keyof typeof AGENT_CAPABILITY_REGISTRY]?.access;
  return access === 'auto' ? undefined : supplied;
}

/** Callers pass loose object refs; the receipt needs a label to be readable. */
function toAffectedObjects(refs: CreateReceiptInput['affectedObjects']): AffectedObjectRef[] {
  return (refs ?? []).map((ref) => ({
    type: ref.type as EntityRefType,
    id: ref.id,
    label: ref.label ?? ref.id
  }));
}

export interface ReceiptResult {
  workspace: BrandOpsData;
  receipt: PlanReceipt;
  /** The governance record — who asked, under what authority, what it touched. */
  executionReceipt: ExecutionReceipt;
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
      ...(input.outputs ?? []).map((o) => (typeof o === 'string' ? o : (o.title ?? '')))
    ].filter((step) => step.length > 0),
    userAction: 'save-plan',
    timestamp,
    summary: input.summary
  };

  const succeeded = input.ok ?? true;

  /**
   * The governance record. Everything the call sites were already passing and
   * this function was already discarding.
   */
  const executionReceipt: ExecutionReceipt = {
    id,
    workspaceId: resolveWorkspaceId(input.workspace),
    requestedBy: input.requestedBy,
    ...(approvalProvenance(input.command, input.approvedBy)
      ? { approvedBy: approvalProvenance(input.command, input.approvedBy) as string }
      : {}),
    source: input.source ?? 'brandops',
    ...(input.planId ? { planId: input.planId } : {}),
    ...(input.checkpointId ? { checkpointId: input.checkpointId } : {}),
    command: input.command,
    startedAt: timestamp,
    completedAt: timestamp,
    result: input.resultState ?? ((succeeded ? 'success' : 'failed') satisfies ReceiptOutcome),
    ...(input.verification ? { verification: input.verification } : {}),
    affectedObjects: toAffectedObjects(input.affectedObjects),
    ...(input.nextAction ? { nextAction: input.nextAction } : {}),
    summary: input.summary
  };

  const prior = input.workspace.planWorkspace;
  const priorActivity = input.workspace.builderActivity;
  const withReceipt: BrandOpsData = {
    ...input.workspace,
    planWorkspace: {
      plans: prior?.plans ?? [],
      receipts: [receipt, ...(prior?.receipts ?? [])].slice(0, 80),
      updatedAt: timestamp
    },
    builderActivity: {
      ...priorActivity,
      // `builderActivity` may not exist yet on a fresh workspace; its two
      // required fields are filled from the canonical resolver rather than
      // minted, which is the identity-drift bug this codebase has had twice.
      events: priorActivity?.events ?? [],
      workspaceId: priorActivity?.workspaceId ?? resolveWorkspaceId(input.workspace),
      executionReceipts: [executionReceipt, ...(priorActivity?.executionReceipts ?? [])].slice(
        0,
        200
      ),
      updatedAt: timestamp
    }
  };

  // Audit trail
  const withAudit = appendAuditEntry(withReceipt, {
    sessionId: input.checkpointId ?? id,
    clientKind: 'brandops',
    capabilityId: input.command as 'builder.receipts.list',
    operation: `receipt:${id}`,
    ok: succeeded,
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
    outcome: succeeded ? 'success' : 'failure',
    labels: [input.command, 'receipt']
  });

  // Checkpoint for traceability
  const withCheckpoint = prependCheckpoint(withTrace, {
    conversationId: input.checkpointId ?? id,
    type: 'tool.invocation',
    state: succeeded ? 'COMPLETED' : 'FAILED',
    summary: input.summary,
    source: 'assistant',
    receiptRef: id
  });

  return {
    workspace: withCheckpoint,
    receipt,
    executionReceipt
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
    // Derived from the registry inside `createReceipt`; passing it here only
    // supplies the approver's name for capabilities that actually require one.
    approvedBy: 'user',
    ok: toolResult.ok,
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
