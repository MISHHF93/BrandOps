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
  auditEntries: number;
}

function counts(workspace: BrandOpsData): AgentBridgeCounts {
  const sessions = workspace.externalAgentSessions?.entries ?? [];
  const events = workspace.externalAgentEvents?.entries ?? [];
  const proposals = workspace.agentProposals?.entries ?? [];
  const audit = workspace.externalAgentAudit?.entries ?? [];
  return {
    sessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === 'active').length,
    events: events.length,
    unverifiedEvents: events.filter((e) => e.status === 'proposed' || e.status === 'reviewed')
      .length,
    verifiedEvents: events.filter((e) => e.status === 'verified' || e.status === 'promoted').length,
    proposals: proposals.length,
    pendingProposals: proposals.filter((p) => p.status === 'pending').length,
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
  revokeSession: (workspace: BrandOpsData, sessionId: string): BrandOpsData =>
    revokeAgentSession(workspace, sessionId),

  listEvents: (workspace: BrandOpsData): ExternalAgentEvent[] =>
    workspace.externalAgentEvents?.entries ?? [],
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
  decideProposal: (
    workspace: BrandOpsData,
    proposalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): BrandOpsData => decideAgentProposal(workspace, { proposalId, decision, note }),
  convertProposalToPlan: convertOpportunityProposalToPlan,
  createProposal: createProposal,

  listAudit: (workspace: BrandOpsData): ExternalAgentAuditEntry[] =>
    workspace.externalAgentAudit?.entries ?? [],

  appendAudit: appendAuditEntry,

  callTool: (input: ExecuteAgentToolCallInput) => executeAgentToolCall(input)
};
