/**
 * The missing step between an approved external action and the world.
 *
 * Approving `send-email` used to mark the proposal `approved`, write a
 * checkpoint reading **`agent.proposal_approved/COMPLETED`**, and do nothing
 * else. No connector was called, no receipt was written, no failure was
 * recorded. The user was told their approval completed; nothing had been sent,
 * and the agent that asked got no signal either.
 *
 * That is not a missing feature, it is a false statement — a COMPLETED
 * checkpoint for work that never ran is fabricated verification, which the
 * healing directive lists as a hard release gate. The most important thing this
 * module does is therefore not execution. It is refusing to claim execution.
 *
 * Three outcomes, and only one of them says the work happened:
 *
 * | outcome | state | meaning |
 * |---|---|---|
 * | `executed` | `COMPLETED` | a connector ran and reported success |
 * | `failed` | `FAILED` | a connector ran and reported failure |
 * | `no_connector` | `BLOCKED` | nothing is registered to do this |
 * | `not_approved` | `BLOCKED` | the approval was never granted, or no longer stands |
 *
 * `BLOCKED` is the honest answer to "approved, but BrandOps cannot do this yet",
 * and it is what the interface must show. A product that cannot perform an
 * action should say so at the moment of approval, not imply success and leave
 * the user to discover the email never arrived.
 */
import type { BrandOpsData } from '../../types/domain';
import type { AgentProposal } from '../../types/agentInterop';
import { prependCheckpoint } from './checkpointStore';
import { createReceipt } from '../builder/executionReceiptService';

export interface ExternalActionRequest {
  action: string;
  target: string;
  summary: string;
  /** The proposal this came from, for receipt linkage. */
  proposalId: string;
}

export interface ExternalActionResult {
  ok: boolean;
  /**
   * Independent evidence that the side effect happened — a provider message id,
   * a delivery receipt, a status code. Absent means the connector performed the
   * action but cannot prove it, which is recorded as such rather than assumed.
   */
  verification?: string;
  error?: string;
}

export interface ExternalActionConnector {
  id: string;
  label: string;
  /** Action names this connector is registered to perform. */
  actions: readonly string[];
  execute: (request: ExternalActionRequest) => Promise<ExternalActionResult>;
}

export type ExternalActionOutcome = 'executed' | 'failed' | 'no_connector' | 'not_approved';

export interface DispatchResult {
  workspace: BrandOpsData;
  outcome: ExternalActionOutcome;
  /** Plain-language explanation, suitable for the approval surface. */
  message: string;
  receiptId?: string;
  verification?: string;
}

/**
 * Runs an approved external action through a registered connector.
 *
 * Deliberately takes the connector list as an argument rather than reading a
 * module-level registry: what a workspace may reach is an operator decision, and
 * a dispatcher that discovers its own connectors is one nobody can scope.
 */
/**
 * A receipt for an action that did not happen.
 *
 * `createReceipt` was called on the success path only, so the durable ledger
 * held nothing but successes — you could not audit what did *not* work from the
 * artifact built to answer exactly that. A user asking why their email never
 * arrived is the person receipts exist for.
 *
 * `blocked` and `failed` stay distinct: nothing was attempted versus something
 * was attempted and did not work. Collapsing them would tell that user the wrong
 * story about whether to retry.
 */
function receiptForNonEvent(
  workspace: BrandOpsData,
  proposal: AgentProposal,
  resultState: 'blocked' | 'failed' | 'rejected',
  message: string,
  nextAction: string
): { workspace: BrandOpsData; receiptId: string } {
  const action = proposal.externalAction;
  const receipt = createReceipt({
    workspace,
    requestedBy: proposal.agentId ? `agent:${proposal.agentId}` : 'agent',
    ...(proposal.status === 'approved' ? { approvedBy: 'user' } : {}),
    source: 'bridge',
    command: action?.action ?? 'external-action',
    ok: false,
    resultState,
    result: { status: resultState, message },
    affectedObjects: action ? [{ type: 'external-action', id: action.target }] : [],
    nextAction,
    summary: message,
    // Nothing reached the destination, so there is nothing to have verified.
    verification: { type: 'pending', detail: message }
  });
  return { workspace: receipt.workspace, receiptId: receipt.receipt.id };
}

export async function dispatchExternalAction(
  workspace: BrandOpsData,
  proposal: AgentProposal,
  connectors: readonly ExternalActionConnector[]
): Promise<DispatchResult> {
  const action = proposal.externalAction;
  if (!action) {
    return {
      workspace,
      outcome: 'no_connector',
      message: 'This proposal carries no external action to perform.'
    };
  }

  /**
   * Nothing reaches the outside world without a standing approval.
   *
   * `approveAndDispatchExternalAction` used to decide the proposal and then
   * dispatch on the strength of `externalAction` merely being present, never
   * looking at what the decision returned. That was sound only while deciding
   * could not refuse. Cycle 9 gave it a way to refuse — a plan whose steps
   * changed after the user saw them becomes `superseded` — and the caller was
   * not updated, so a probe drove a connector to completion for a proposal
   * whose approval had just been withheld, and got back `executed` with a
   * verification id.
   *
   * The check belongs here rather than in that one caller. This function is
   * exported and takes a proposal from anywhere; a guard that protects a single
   * call path is the kind that the next call path walks straight past.
   */
  if (proposal.status !== 'approved') {
    const message =
      proposal.status === 'superseded'
        ? `Not performed: ${proposal.decisionNote ?? 'the approval no longer stands.'}`
        : `Not performed: this action is ${proposal.status}, not approved. Nothing was sent.`;
    const recorded = receiptForNonEvent(
      workspace,
      proposal,
      proposal.status === 'rejected' ? 'rejected' : 'blocked',
      message,
      'Review the action and request it again if it is still wanted.'
    );
    return {
      workspace: prependCheckpoint(recorded.workspace, {
        conversationId: proposal.relatedEventId ?? proposal.id,
        type: 'plan.execution_blocked',
        state: 'BLOCKED',
        summary: message,
        source: 'bridge',
        receiptRef: proposal.id
      }),
      outcome: 'not_approved',
      message,
      receiptId: recorded.receiptId
    };
  }

  const connector = connectors.find((entry) => entry.actions.includes(action.action));

  if (!connector) {
    /**
     * The case that used to be silently mislabelled COMPLETED. The checkpoint
     * says BLOCKED and the message names the missing capability, so the
     * interface has something true to render and the requesting agent has a
     * reason it can report back.
     */
    const message =
      `Approved, but nothing performed it: no connector is registered for "${action.action}". ` +
      `BrandOps recorded the approval and did not send anything.`;
    const recorded = receiptForNonEvent(
      workspace,
      proposal,
      'blocked',
      message,
      'Connect an integration that can perform this action.'
    );
    return {
      workspace: prependCheckpoint(recorded.workspace, {
        conversationId: proposal.relatedEventId ?? proposal.id,
        type: 'plan.execution_blocked',
        state: 'BLOCKED',
        summary: message,
        source: 'bridge',
        receiptRef: proposal.id
      }),
      outcome: 'no_connector',
      message,
      receiptId: recorded.receiptId
    };
  }

  let result: ExternalActionResult;
  try {
    result = await connector.execute({
      action: action.action,
      target: action.target,
      summary: action.summary,
      proposalId: proposal.id
    });
  } catch (error) {
    // A connector that throws is a connector that failed. It must never fall
    // through to the success path.
    result = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  if (!result.ok) {
    const message = `${connector.label} did not complete "${action.action}": ${
      result.error ?? 'no reason given'
    }`;
    const recorded = receiptForNonEvent(
      workspace,
      proposal,
      'failed',
      message,
      'Check the destination, then retry or withdraw the request.'
    );
    return {
      workspace: prependCheckpoint(recorded.workspace, {
        conversationId: proposal.relatedEventId ?? proposal.id,
        // There is no `plan.execution_failed` checkpoint type; the state carries
        // the failure and `execution_blocked` is the closest canonical type. The
        // distinction the user needs — "it ran and failed" vs "nothing ran" — is
        // in the state and the summary, not the type name.
        type: 'plan.execution_blocked',
        state: 'FAILED',
        summary: message,
        source: 'bridge',
        receiptRef: proposal.id
      }),
      outcome: 'failed',
      receiptId: recorded.receiptId,
      message
    };
  }

  const verified = result.verification
    ? `Verified: ${result.verification}`
    : `${connector.label} reported success but returned no independent verification.`;
  const message = `${connector.label} performed "${action.action}" on ${action.target}. ${verified}`;

  const receipt = createReceipt({
    workspace,
    requestedBy: proposal.agentId ? `agent:${proposal.agentId}` : 'agent',
    approvedBy: 'user',
    source: 'bridge',
    command: action.action,
    result: { status: 'success', message },
    affectedObjects: [{ type: 'external-action', id: action.target }],
    nextAction: 'Confirm the effect at the destination.',
    summary: message,
    /**
     * The distinction the directive asks receipts to keep: a connector that
     * returned proof is `system-verified`; one that reported success without it
     * is `pending`, because "it worked" and "it worked, here is the evidence"
     * are different claims. This used to live only in the prose of `summary`.
     */
    verification: result.verification
      ? { type: 'system-verified', detail: result.verification }
      : {
          type: 'pending',
          detail: `${connector.label} reported success but returned no independent verification.`
        }
  });

  return {
    workspace: prependCheckpoint(receipt.workspace, {
      conversationId: proposal.relatedEventId ?? proposal.id,
      type: 'plan.execution_completed',
      state: 'COMPLETED',
      summary: message,
      source: 'bridge',
      receiptRef: proposal.id
    }),
    outcome: 'executed',
    message,
    receiptId: receipt.receipt.id,
    verification: result.verification
  };
}
