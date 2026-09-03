/**
 * Agent bridge facade — the single surface the BrandOps UI uses to talk to the
 * external-agent interoperability layer. All operations are pure functions over
 * `BrandOpsData` (the app's immutable workspace model), so the Connected Agents
 * panel can call them directly and persist the returned workspace.
 */
import type {
  AgentCapabilityId,
  AgentProposal,
  ExternalAgentAuditEntry,
  ExternalAgentEvent,
  ExternalAgentSession
} from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { appendAuditEntry } from './audit';
import { previewPromotion, type PromotionPreview } from '../builder/promotions';
import type { AchievementCandidate } from '../../types/builder';
import {
  canConnectAgent,
  canDelegateBetweenAgents,
  type GateDecision
} from '../monetization/featureGates';
import type { EntitlementState } from '../monetization/entitlements';
import {
  cancelHandoff,
  effectiveCapabilities,
  expireHandoffs,
  handoffsState,
  listHandoffs
} from './handoffs';
import type { AgentHandoff } from '../../types/agentInterop';
import {
  AGENT_CAPABILITY_DEFINITIONS,
  getAgentCapability,
  isAgentCapabilityId
} from './capabilityRegistry';
import { convertAgentEventToPlan, convertOpportunityProposalToPlan } from './convertToPlan';
import {
  decideAgentProposal,
  getAgentProposalsByEventId,
  createAgentProposal as createProposal
} from './proposals';
import { ingestAgentEvent, reviewAgentEvent, promoteAgentEventToTwin } from './events';
import { createAgentSession, listAgentSessions, revokeAgentSession } from './sessions';
import { listMcpTools, type McpToolDefinition } from './mcp/server';
import { executeAgentToolCall, type ExecuteAgentToolCallInput } from './gateway';

export interface AgentBridgeCounts {
  sessions: number;
  activeSessions: number;
  events: number;
  unverifiedEvents: number;
  verifiedEvents: number;
  proposals: number;
  pendingProposals: number;
  /** Delegations that can still confer access, so the summary says it out loud. */
  liveHandoffs: number;
  auditEntries: number;
}

function counts(workspace: BrandOpsData): AgentBridgeCounts {
  const sessions = workspace.externalAgentSessions?.entries ?? [];
  const events = workspace.externalAgentEvents?.entries ?? [];
  const proposals = workspace.agentProposals?.entries ?? [];
  const audit = workspace.externalAgentAudit?.entries ?? [];
  /**
   * Swept first, so a lapsed delegation is not counted as live. Reading the
   * state rather than the array keeps this beside the other four.
   */
  const handoffs = handoffsState(expireHandoffs(workspace)).entries;
  return {
    sessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === 'active').length,
    events: events.length,
    unverifiedEvents: events.filter((e) => e.status === 'proposed' || e.status === 'reviewed')
      .length,
    verifiedEvents: events.filter((e) => e.status === 'verified' || e.status === 'promoted').length,
    proposals: proposals.length,
    pendingProposals: proposals.filter((p) => p.status === 'pending').length,
    liveHandoffs: handoffs.filter((h: AgentHandoff) =>
      ['proposed', 'accepted', 'in_progress'].includes(h.status)
    ).length,
    auditEntries: audit.length
  };
}

export const agentBridge = {
  listTools: (): McpToolDefinition[] => listMcpTools(),
  listCapabilities: () => AGENT_CAPABILITY_DEFINITIONS,
  capability: (id: AgentCapabilityId) => getAgentCapability(id),
  isCapabilityId: isAgentCapabilityId,

  counts,
  listSessions: (workspace: BrandOpsData): ExternalAgentSession[] => listAgentSessions(workspace),
  createSession: createAgentSession,

  /**
   * Whether another agent may be connected, and whether work may be delegated
   * between them.
   *
   * Decided here rather than only in the interface, so a gate is not something
   * a rendered button happens to enforce. It is a product boundary, not a
   * security one — there is no server, so a determined user can edit their own
   * workspace — and the service layer is the strongest place available until
   * one exists.
   *
   * Only active sessions count toward the limit: a revoked session holds no
   * capability, and counting it would charge someone for tidying up.
   */
  canConnectAgent: (workspace: BrandOpsData, entitlement: EntitlementState): GateDecision =>
    canConnectAgent(
      entitlement,
      listAgentSessions(workspace).filter((session) => session.status === 'active').length
    ),

  canDelegate: (entitlement: EntitlementState): GateDecision =>
    canDelegateBetweenAgents(entitlement),
  revokeSession: (workspace: BrandOpsData, sessionId: string): BrandOpsData =>
    revokeAgentSession(workspace, sessionId),

  listEvents: (workspace: BrandOpsData): ExternalAgentEvent[] =>
    workspace.externalAgentEvents?.entries ?? [],

  /**
   * Achievement candidates an agent has reported and nobody has verified.
   *
   * These could strand. `builder.activity.ingest-session-summary` stores a
   * candidate; a *different* tool turns one into the proposal a person decides
   * on. An agent that summarises a session and never calls the second leaves
   * work sitting in `builderActivity.achievements` — state that, until now, had
   * no reader outside the services layer at all. Nothing was wrong with the
   * data; there was simply nowhere it could be seen.
   *
   * Candidates whose proposal already exists are left out: the review queue
   * above is where those belong, and listing them twice would read as two
   * pieces of work.
   */
  listUnclaimedAchievements: (workspace: BrandOpsData): AchievementCandidate[] => {
    const claimed = new Set(
      (workspace.agentProposals?.entries ?? [])
        .filter((entry) => entry.promotion?.action === 'verify-achievement')
        .map((entry) => entry.promotion?.targetId)
    );
    return (workspace.builderActivity?.achievements ?? []).filter(
      (candidate) => !claimed.has(candidate.eventId) && !claimed.has(candidate.id)
    );
  },
  ingestEvent: ingestAgentEvent,
  reviewEvent: (
    workspace: BrandOpsData,
    eventId: string,
    decision: 'verified' | 'rejected',
    note?: string
  ): BrandOpsData => reviewAgentEvent(workspace, { eventId, decision, note }),
  promoteEvent: (workspace: BrandOpsData, eventId: string): BrandOpsData =>
    promoteAgentEventToTwin(workspace, eventId),
  convertEventToPlan: convertAgentEventToPlan,

  listProposals: (workspace: BrandOpsData): AgentProposal[] =>
    workspace.agentProposals?.entries ?? [],
  proposalsForEvent: (workspace: BrandOpsData, eventId: string): AgentProposal[] =>
    getAgentProposalsByEventId(workspace, eventId),

  /**
   * What approving this proposal will actually change, for proposals that
   * promote something. Returns `null` for kinds that promote nothing.
   *
   * The review row could not previously answer this: a twin update's deltas sit
   * in `builderActivity.twinProposals`, which nothing outside the services layer
   * could reach, so a person approved edits to their own identity without being
   * shown them.
   */
  previewProposal: (workspace: BrandOpsData, proposal: AgentProposal): PromotionPreview | null =>
    proposal.promotion ? previewPromotion(workspace, proposal.promotion) : null,
  decideProposal: (
    workspace: BrandOpsData,
    proposalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): BrandOpsData => decideAgentProposal(workspace, { proposalId, decision, note }),
  convertProposalToPlan: convertOpportunityProposalToPlan,
  createProposal: createProposal,

  /**
   * Delegations between agents, with lapsed ones shown as expired rather than
   * as still live. Expiry is enforced at every point of use in `handoffs.ts`;
   * sweeping here means a reader does not have to try a row to find out.
   */
  listHandoffs: (workspace: BrandOpsData): AgentHandoff[] =>
    listHandoffs(expireHandoffs(workspace)),

  /**
   * What a handoff confers *right now* — the target's own capabilities
   * intersected with what the handoff asked for. Never read the stored
   * `requiredCapabilities` as an authority; that is the frozen-grant bug.
   */
  handoffCapabilities: (workspace: BrandOpsData, handoffId: string) =>
    effectiveCapabilities(workspace, handoffId),

  /** Withdraw a delegation. The one control over this a person needs. */
  cancelHandoff: (workspace: BrandOpsData, handoffId: string): BrandOpsData =>
    cancelHandoff(workspace, handoffId).workspace,

  listAudit: (workspace: BrandOpsData): ExternalAgentAuditEntry[] =>
    workspace.externalAgentAudit?.entries ?? [],

  appendAudit: appendAuditEntry,

  callTool: (input: ExecuteAgentToolCallInput) => executeAgentToolCall(input)
};
