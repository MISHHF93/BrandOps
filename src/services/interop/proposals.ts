/**
 * Agent-generated proposals (AgentProposal). Lifecycle:
 *
 *   proposed → approved → materialized (state now stores the outcome)
 *            ↘ rejected (closed, recorded)
 *
 * Proposals are the canonical "opportunity" surface for agent flows: content
 * opportunities, twin updates, artifact pulls, and external actions all flow
 * through here, each leaving a checkpoint ledger trail and operator trace.
 */
import type {
  AgentProposal,
  AgentProposalDecision,
  AgentProposalKind,
  ExternalAgentEvent,
  MaterializedArtifactPayload
} from '../../types/agentInterop';
import type { CheckpointType, ExecutionState, PermissionTier } from '../../types/executionState';
import type { BrandOpsData } from '../../types/domain';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import {
  checkApprovalBinding,
  planApprovalBinding,
  promotionApprovalBinding
} from './approvalBinding';
import { prependCheckpoint } from '../execution/checkpointStore';
import {
  dispatchExternalAction,
  type ExternalActionConnector,
  type ExternalActionOutcome
} from '../execution/externalActionDispatch';
import { applyAchievementVerification, applyTwinProposalAcceptance } from '../builder/promotions';
import { executePlan } from '../execution/planExecutor';
import { getAgentEventById } from './events';

export const MAX_AGENT_PROPOSALS = 150;
export const MAX_INTEGRATION_ARTIFACTS = 120;

export interface CreateAgentProposalInput {
  kind: AgentProposalKind;
  title: string;
  detail: string;
  sessionId?: string;
  agentId?: string;
  relatedEventId?: string;
  rationale: string;
  /** Opaque MCP task handle, set when this proposal is an execution request. */
  taskId?: string;
  /** Plan this proposal is about, when it already exists (execution requests). */
  planId?: string;
  proposedState?: {
    /** Binds the approval to the content the user was shown. */
    approvalBinding?: { fingerprint: string; stepCount: number };
    twinMemoryType?: 'approvedClaims' | 'rejectedClaims' | 'none';
    approvedClaimText?: string;
    externalAction?: { action: string; target: string; summary: string };
    promotion?: { action: 'verify-achievement' | 'accept-twin-proposal'; targetId: string };
    artifact?: MaterializedArtifactPayload;
    contentOpportunity?: {
      format?: string;
      angle?: string;
      whyNow?: string;
      audience?: string;
    };
  };
}

/** Risk tier each proposal kind carries onto the approval surface. */
const PROPOSAL_TIER: Record<AgentProposalKind, PermissionTier> = {
  twin_update: 'PREPARE',
  artifact: 'PREPARE',
  content_opportunity: 'GENERATE',
  external_action: 'EXTERNAL_ACTION',
  // Promotion is not an external action, but it is every bit as consequential:
  // it is the step that turns a claim into professional evidence.
  promotion: 'EXTERNAL_ACTION'
};

const PROPOSAL_CHECKPOINT_TYPE: Record<AgentProposalKind, string> = {
  twin_update: 'agent.proposal_created',
  artifact: 'agent.artifact_proposed',
  content_opportunity: 'agent.opportunity_detected',
  /** An external_action proposal IS an agent requesting an external side effect — its own checkpoint type, distinct from generic proposal creation. */
  external_action: 'agent.action_requested',
  /** Its own checkpoint type so the review queue can show promotions distinctly. */
  promotion: 'agent.promotion_requested'
};

function proposalId(): string {
  return `agent-proposal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getAgentProposalById(
  workspace: BrandOpsData,
  proposalId: string
): AgentProposal | null {
  return (workspace.agentProposals?.entries ?? []).find((p) => p.id === proposalId) ?? null;
}

export function getAgentProposalsByEventId(
  workspace: BrandOpsData,
  eventId: string
): AgentProposal[] {
  return (workspace.agentProposals?.entries ?? []).filter((p) => p.relatedEventId === eventId);
}

export function createAgentProposal(
  workspace: BrandOpsData,
  input: CreateAgentProposalInput
): BrandOpsData {
  const now = new Date().toISOString();
  const proposal: AgentProposal = {
    id: proposalId(),
    kind: input.kind,
    title: input.title.slice(0, 300),
    detail: input.detail.slice(0, 4000),
    rationale: input.rationale.slice(0, 1000),
    status: 'pending',
    // The approval surface states the real risk tier. An external action shown
    // as GENERATE tells whoever is approving it that less is at stake than is.
    tier: PROPOSAL_TIER[input.kind],
    sessionId: input.sessionId?.slice(0, 160),
    agentId: input.agentId?.slice(0, 160),
    relatedEventId: input.relatedEventId,
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.planId ? { planId: input.planId } : {}),
    createdAt: now,
    updatedAt: now,
    ...(input.proposedState?.twinMemoryType && {
      twinMemoryType: input.proposedState.twinMemoryType,
      approvedClaimText: input.proposedState.approvedClaimText
    }),
    ...(input.proposedState?.externalAction && {
      externalAction: input.proposedState.externalAction
    }),
    ...(input.proposedState?.approvalBinding && {
      approvalBinding: input.proposedState.approvalBinding
    }),
    ...(input.proposedState?.promotion && {
      promotion: input.proposedState.promotion
    }),
    ...(input.proposedState?.artifact && { artifact: input.proposedState.artifact }),
    ...(input.proposedState?.contentOpportunity && {
      contentOpportunity: input.proposedState.contentOpportunity
    })
  };

  const conversationId = input.relatedEventId ?? proposal.id;
  let next: BrandOpsData = {
    ...workspace,
    agentProposals: {
      entries: [proposal, ...(workspace.agentProposals?.entries ?? [])].slice(
        0,
        MAX_AGENT_PROPOSALS
      ),
      updatedAt: now
    }
  };
  const createdCheckpoint = prependCheckpoint(next, {
    conversationId,
    type: PROPOSAL_CHECKPOINT_TYPE[input.kind] as CheckpointType,
    state: 'NEEDS_APPROVAL',
    summary: `Proposal awaiting approval (${input.kind}): ${proposal.title}`,
    source: 'bridge',
    approvalStatus: 'pending',
    receiptRef: proposal.id
  });
  const checkpointId = createdCheckpoint.checkpoints?.entries[0]?.id;
  next = {
    ...createdCheckpoint,
    agentProposals: {
      entries: (createdCheckpoint.agentProposals?.entries ?? []).map((entry) =>
        entry.id === proposal.id ? { ...entry, checkpointId } : entry
      ),
      updatedAt: now
    }
  };
  next = prependOperatorTrace(next, {
    source: 'bridge',
    verb: 'agent.proposal_created',
    surface: 'external-agent',
    capabilityId: 'achievement.record',
    sessionId: proposal.sessionId,
    entityType: 'agent-proposal',
    entityId: proposal.id,
    outcome: 'success',
    labels: [input.kind, 'awaiting-approval']
  });
  return next;
}

/** Convenience wrapper: content opportunities are proposals that surface in the Connected Agents panel. */
export function createContentOpportunity(
  workspace: BrandOpsData,
  input: Omit<CreateAgentProposalInput, 'kind'>
): BrandOpsData {
  return createAgentProposal(workspace, { ...input, kind: 'content_opportunity' });
}

export interface DecideAgentProposalInput {
  proposalId: string;
  decision: AgentProposalDecision;
  note?: string;
  /**
   * Set by `approveAndDispatchExternalAction`, which performs the connector call
   * itself and records the real outcome. Direct callers leave it unset and get
   * the honest default: an approved external action nothing performed is marked
   * BLOCKED, not left implying success.
   */
  deferExternalDispatch?: boolean;
}

const PROPOSAL_DECISION_CHECKPOINT: Record<
  AgentProposalDecision,
  { type: CheckpointType; state: ExecutionState }
> = {
  approved: { type: 'agent.proposal_approved', state: 'COMPLETED' },
  rejected: { type: 'agent.proposal_rejected', state: 'REJECTED' }
};

/**
 * Approve or reject an agent proposal. Approving a twin_update applies it to
 * the active Twin; approving an artifact materializes it in the integration
 * hub; content opportunities and external actions are recorded as decisions.
 */
/**
 * Performs an approved promotion by calling the canonical builder services.
 *
 * Deliberately a dispatcher and nothing more: a promotion proposal carries an
 * action and a target id, so an approved proposal cannot do more than the user
 * saw when they approved it. The effects themselves live in
 * `builder/promotions.ts`, next to the services that already own them — a copy
 * here would be a second implementation of a governed write.
 */
function applyPromotion(
  workspace: BrandOpsData,
  promotion: { action: 'verify-achievement' | 'accept-twin-proposal'; targetId: string }
): BrandOpsData {
  return promotion.action === 'verify-achievement'
    ? applyAchievementVerification(workspace, promotion.targetId)
    : applyTwinProposalAcceptance(workspace, promotion.targetId);
}

export function decideAgentProposal(
  workspace: BrandOpsData,
  input: DecideAgentProposalInput
): BrandOpsData {
  const proposal = getAgentProposalById(workspace, input.proposalId);
  if (!proposal || proposal.status !== 'pending') return workspace;
  const now = new Date().toISOString();
  const conversationId = proposal.relatedEventId ?? proposal.id;

  let base: BrandOpsData = workspace;
  /**
   * Set when an approval could not be honoured because its subject changed. The
   * proposal becomes `superseded`, not `rejected`: the user declined nothing.
   */
  let bindingBroken: string | undefined;
  if (
    input.decision === 'approved' &&
    proposal.kind === 'twin_update' &&
    proposal.twinMemoryType &&
    proposal.approvedClaimText
  ) {
    base = applyTwinUpdateProposal(base, proposal, now);
  } else if (input.decision === 'approved' && proposal.kind === 'artifact' && proposal.artifact) {
    base = materializeArtifactProposal(base, proposal, now);
  } else if (input.decision === 'approved' && proposal.kind === 'promotion' && proposal.promotion) {
    /**
     * The promotion the agent requested, performed now that a person approved
     * it. The agent asked; the user decided; BrandOps acts. That ordering is the
     * fourth invariant, and this branch is where it is honoured rather than
     * merely asserted.
     */
    /**
     * The promotion binds to what the user read, not to a target id.
     *
     * Enumerating the proposal kinds found this was the one still binding to a
     * reference after cycle 9 — and the one that writes `USER_VERIFIED` state.
     * A proposal reading "Verify achievement: Fixed a typo in the README" was
     * approved and "Led the company-wide platform rewrite" became verified
     * professional evidence: a claim about the user's career, at the highest
     * trust tier, that they never saw.
     */
    const promotionBinding = checkApprovalBinding(
      proposal.approvalBinding,
      promotionApprovalBinding(base, proposal.promotion),
      'promotion'
    );

    if (!promotionBinding.ok) {
      bindingBroken = promotionBinding.reason;
      base = prependCheckpoint(base, {
        conversationId,
        type: 'plan.execution_blocked',
        state: 'BLOCKED',
        summary: `Not promoted — ${promotionBinding.reason}`,
        source: 'bridge',
        receiptRef: proposal.id
      });
    } else {
      base = applyPromotion(base, proposal.promotion);
    }
  } else if (
    input.decision === 'approved' &&
    proposal.kind === 'external_action' &&
    proposal.externalAction?.action === 'execute-plan' &&
    proposal.planId
  ) {
    /**
     * An approved execution request runs the plan through the canonical
     * executor — the same one the PLAN workspace uses. That executor performs no
     * external side effects: steps that would need one are recorded BLOCKED
     * rather than attempted. Without this the approval boundary would open onto
     * nothing and an agent polling the task would wait forever.
     */
    /**
     * The approval binds to what the user saw, not to a plan id.
     *
     * Without this, appending steps to the plan while the proposal sat pending
     * meant a person approved two steps and four executed. The boundary held —
     * someone was asked — but the subject of their decision had changed, which
     * spends an approval on an action nobody agreed to.
     */
    const plan = (base.planWorkspace?.plans ?? []).find((entry) => entry.id === proposal.planId);
    const binding = plan
      ? checkApprovalBinding(proposal.approvalBinding, planApprovalBinding(plan))
      : { ok: true as const };

    if (!binding.ok) {
      bindingBroken = binding.reason;
      base = prependCheckpoint(base, {
        conversationId,
        type: 'plan.execution_blocked',
        state: 'BLOCKED',
        summary: `Not executed — ${binding.reason}`,
        source: 'bridge',
        receiptRef: proposal.id
      });
    } else {
      base = executePlan(base, proposal.planId).workspace;
    }
  } else if (
    input.decision === 'approved' &&
    proposal.kind === 'external_action' &&
    proposal.externalAction &&
    !input.deferExternalDispatch
  ) {
    /**
     * Approving an external action used to mark the proposal `approved`, write a
     * `COMPLETED` checkpoint, and perform nothing — the user was told their
     * approval completed while no email was sent and no receipt existed. A
     * COMPLETED checkpoint for work that never ran is fabricated verification.
     *
     * Nothing here can reach the outside world synchronously, so the truthful
     * record is BLOCKED with the reason. Callers that hold connectors use
     * `approveAndDispatchExternalAction`, which sets `deferExternalDispatch` and
     * records what actually happened instead.
     */
    base = prependCheckpoint(base, {
      conversationId,
      type: 'plan.execution_blocked',
      state: 'BLOCKED',
      summary:
        `Approved, but not performed: "${proposal.externalAction.action}" needs a connector and ` +
        `none ran. BrandOps recorded the approval and did not send anything.`,
      source: 'bridge',
      receiptRef: proposal.id
    });
  }

  const entries = (base.agentProposals?.entries ?? []).map((entry) =>
    entry.id === proposal.id
      ? {
          ...entry,
          status: (bindingBroken ? 'superseded' : input.decision) as AgentProposal['status'],
          decidedAt: now,
          decisionNote: (bindingBroken ?? input.note)?.slice(0, 500)
        }
      : entry
  );

  let next: BrandOpsData = {
    ...base,
    agentProposals: { entries, updatedAt: now }
  };
  /**
   * For an external action, approving is not finishing.
   *
   * The decision checkpoint used to record COMPLETED for every kind, so an
   * approved `send-email` produced a COMPLETED entry against the proposal before
   * any connector existed — and a reader filtering by proposal saw completion.
   * `EXECUTING` says what is true at that instant: the user decided, the work has
   * not happened yet. The terminal state then comes from the dispatcher —
   * COMPLETED, FAILED or BLOCKED — and there is exactly one of them.
   */
  const decisionState = bindingBroken
    ? ('BLOCKED' as const)
    : input.decision === 'approved' && proposal.kind === 'external_action'
      ? ('EXECUTING' as const)
      : PROPOSAL_DECISION_CHECKPOINT[input.decision].state;

  /**
   * When the binding broke, this checkpoint must not say "Approved … EXECUTING".
   *
   * The first version of the binding fix left it saying exactly that: the
   * proposal was correctly `superseded` and nothing ran, while the newest
   * checkpoint — the one a reader sees first — announced an approved execution
   * in progress. Blocking the work and then narrating it as running is the same
   * defect the block was written to prevent, one layer over.
   */
  next = prependCheckpoint(next, {
    conversationId,
    type: bindingBroken
      ? 'plan.execution_blocked'
      : PROPOSAL_DECISION_CHECKPOINT[input.decision].type,
    state: decisionState,
    summary: bindingBroken
      ? `Not executed: ${proposal.title}. ${bindingBroken}`
      : input.decision === 'approved'
        ? `Approved: ${proposal.title}.${input.note ? ` ${input.note}` : ''}`
        : `Rejected: ${proposal.title}.${input.note ? ` ${input.note}` : ''}`,
    source: 'user',
    ...(bindingBroken ? {} : { approvalStatus: input.decision }),
    receiptRef: proposal.id
  });
  next = prependOperatorTrace(next, {
    source: 'user',
    verb: 'agent.proposal_decide',
    surface: 'external-agent',
    capabilityId: 'achievement.record',
    sessionId: proposal.sessionId,
    entityType: 'agent-proposal',
    entityId: proposal.id,
    outcome: input.decision === 'approved' ? 'success' : 'failure',
    labels: [input.decision, proposal.kind]
  });
  return next;
}

/** Only allows a promoted (verified) event to spawn a twin update; an approved twin update is never an autonomous write. */
export function createTwinUpdateProposalFromEvent(
  workspace: BrandOpsData,
  eventId: string,
  text: string
): BrandOpsData {
  const event: ExternalAgentEvent | null = getAgentEventById(workspace, eventId);
  if (!event || event.status !== 'promoted') return workspace;
  return createAgentProposal(workspace, {
    kind: 'twin_update',
    title: `Twin update: ${event.title}`,
    detail: text,
    sessionId: event.sessionId,
    agentId: event.clientKind,
    relatedEventId: eventId,
    rationale:
      'User promoted this agent report; asking whether it should also refine the Twin memory.',
    proposedState: {
      twinMemoryType: 'approvedClaims',
      approvedClaimText: `${event.title} — ${event.detail.slice(0, 280)}`
    }
  });
}

function applyTwinUpdateProposal(
  workspace: BrandOpsData,
  proposal: AgentProposal,
  now: string
): BrandOpsData {
  const twinState = workspace.digitalTwins;
  if (!twinState?.twins.length || !proposal.approvedClaimText) return workspace;
  const active = twinState.twins.find((t) => t.id === twinState.activeTwinId) ?? twinState.twins[0];
  const claim = proposal.approvedClaimText.slice(0, 400);
  const twins = twinState.twins.map((twin) => {
    if (twin.id !== active.id) return twin;
    const hasClaim = twin.memory.approvedClaims.some(
      (c) => c.toLowerCase() === claim.toLowerCase()
    );
    return {
      ...twin,
      updatedAt: now,
      memory: {
        ...twin.memory,
        approvedClaims: hasClaim
          ? twin.memory.approvedClaims
          : [claim, ...twin.memory.approvedClaims].slice(0, 60),
        rejectedClaims: twin.memory.rejectedClaims.filter(
          (c) => c.toLowerCase() !== claim.toLowerCase()
        )
      }
    };
  });
  return { ...workspace, digitalTwins: { ...twinState, twins } };
}

/** On approval, the artifact proposal's payload is recorded in the integration hub under the agent-ingest source. */
function materializeArtifactProposal(
  workspace: BrandOpsData,
  proposal: AgentProposal,
  now: string
): BrandOpsData {
  const artifact = proposal.artifact;
  if (!artifact) return workspace;
  const hub = workspace.integrationHub ?? {
    liveFeed: [],
    sshTargets: [],
    sources: [],
    artifacts: []
  };
  let sources = hub.sources;
  if (!sources.some((s) => s.id === 'agent-ingest')) {
    sources = [
      ...sources,
      {
        id: 'agent-ingest',
        name: 'Connected Agents (ingest)',
        kind: 'webhook',
        status: 'monitoring',
        artifactTypes: ['external-artifact'],
        tags: ['agent', 'proposal'],
        notes: 'Artifacts approved from agent proposals.',
        createdAt: now
      }
    ];
  }
  const record = {
    id: proposal.id,
    sourceId: 'agent-ingest',
    title: artifact.title.slice(0, 300),
    artifactType: artifact.artifactType,
    summary: artifact.summary.slice(0, 2000),
    externalUrl: artifact.externalUrl?.slice(0, 800),
    externalId: artifact.externalId?.slice(0, 300),
    tags: artifact.tags.slice(0, 12),
    syncedAt: now,
    createdAt: now,
    updatedAt: now
  };
  return {
    ...workspace,
    integrationHub: {
      ...hub,
      sources,
      artifacts: [record, ...hub.artifacts].slice(0, MAX_INTEGRATION_ARTIFACTS)
    }
  };
}

/**
 * Approves an external-action proposal **and** performs it through a connector.
 *
 * The async counterpart to `decideAgentProposal` for the one case that has to
 * reach outside BrandOps. Separate rather than folded in, because making the
 * whole decision path async to serve one branch would ripple through every
 * caller and every UI handler for no benefit to the other kinds.
 *
 * The dispatch runs *after* the approval is recorded, so a connector failure
 * leaves an approved proposal with a FAILED checkpoint — which is the truth —
 * rather than silently un-approving something the user did approve.
 */
export async function approveAndDispatchExternalAction(
  workspace: BrandOpsData,
  proposalId: string,
  connectors: readonly ExternalActionConnector[],
  note?: string
): Promise<{ workspace: BrandOpsData; outcome: ExternalActionOutcome; message: string }> {
  const proposal = getAgentProposalById(workspace, proposalId);
  if (!proposal || proposal.status !== 'pending') {
    return {
      workspace,
      outcome: 'no_connector',
      message: 'No pending proposal with that id.'
    };
  }

  const approved = decideAgentProposal(workspace, {
    proposalId,
    decision: 'approved',
    note,
    deferExternalDispatch: true
  });

  const decided = getAgentProposalById(approved, proposalId);
  if (!decided?.externalAction) {
    return { workspace: approved, outcome: 'no_connector', message: 'Nothing to perform.' };
  }

  /**
   * Deciding can refuse. This used to dispatch on the strength of
   * `externalAction` being present, which was a sound proxy only while every
   * decision approved — so the binding check added one layer down blocked the
   * execution and this function called the connector anyway.
   *
   * `dispatchExternalAction` now refuses too, so this is the second of two
   * checks rather than the only one. It stays because returning here keeps the
   * user's own words — the reason the approval did not stand — in the message,
   * instead of a generic refusal assembled after the fact.
   */
  if (decided.status !== 'approved') {
    return {
      workspace: approved,
      outcome: 'not_approved',
      message: `Not performed: ${decided.decisionNote ?? 'the approval did not stand.'}`
    };
  }

  const dispatched = await dispatchExternalAction(approved, decided, connectors);
  return {
    workspace: dispatched.workspace,
    outcome: dispatched.outcome,
    message: dispatched.message
  };
}
