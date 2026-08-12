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
import type { CheckpointType, ExecutionState } from '../../types/executionState';
import type { BrandOpsData } from '../../types/domain';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import { prependCheckpoint } from '../execution/checkpointStore';
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
  proposedState?: {
    twinMemoryType?: 'approvedClaims' | 'rejectedClaims' | 'none';
    approvedClaimText?: string;
    externalAction?: { action: string; target: string; summary: string };
    artifact?: MaterializedArtifactPayload;
    contentOpportunity?: {
      format?: string;
      angle?: string;
      whyNow?: string;
      audience?: string;
    };
  };
}

const PROPOSAL_CHECKPOINT_TYPE: Record<AgentProposalKind, string> = {
  twin_update: 'agent.proposal_created',
  artifact: 'agent.artifact_proposed',
  content_opportunity: 'agent.opportunity_detected',
  /** An external_action proposal IS an agent requesting an external side effect — its own checkpoint type, distinct from generic proposal creation. */
  external_action: 'agent.action_requested'
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
    tier: 'GENERATE',
    sessionId: input.sessionId?.slice(0, 160),
    agentId: input.agentId?.slice(0, 160),
    relatedEventId: input.relatedEventId,
    createdAt: now,
    updatedAt: now,
    ...(input.proposedState?.twinMemoryType && {
      twinMemoryType: input.proposedState.twinMemoryType,
      approvedClaimText: input.proposedState.approvedClaimText
    }),
    ...(input.proposedState?.externalAction && {
      externalAction: input.proposedState.externalAction
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
export function decideAgentProposal(
  workspace: BrandOpsData,
  input: DecideAgentProposalInput
): BrandOpsData {
  const proposal = getAgentProposalById(workspace, input.proposalId);
  if (!proposal || proposal.status !== 'pending') return workspace;
  const now = new Date().toISOString();
  const conversationId = proposal.relatedEventId ?? proposal.id;

  let base: BrandOpsData = workspace;
  if (
    input.decision === 'approved' &&
    proposal.kind === 'twin_update' &&
    proposal.twinMemoryType &&
    proposal.approvedClaimText
  ) {
    base = applyTwinUpdateProposal(base, proposal, now);
  } else if (input.decision === 'approved' && proposal.kind === 'artifact' && proposal.artifact) {
    base = materializeArtifactProposal(base, proposal, now);
  }

  const entries = (base.agentProposals?.entries ?? []).map((entry) =>
    entry.id === proposal.id
      ? {
          ...entry,
          status: input.decision as AgentProposal['status'],
          decidedAt: now,
          decisionNote: input.note?.slice(0, 500)
        }
      : entry
  );

  let next: BrandOpsData = {
    ...base,
    agentProposals: { entries, updatedAt: now }
  };
  next = prependCheckpoint(next, {
    conversationId,
    type: PROPOSAL_DECISION_CHECKPOINT[input.decision].type,
    state: PROPOSAL_DECISION_CHECKPOINT[input.decision].state,
    summary:
      input.decision === 'approved'
        ? `Approved: ${proposal.title}.${input.note ? ` ${input.note}` : ''}`
        : `Rejected: ${proposal.title}.${input.note ? ` ${input.note}` : ''}`,
    source: 'user',
    approvalStatus: input.decision,
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
