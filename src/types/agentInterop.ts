/**
 * Canonical external-agent interoperability types — the contract between BrandOps
 * (the authoritative professional-intelligence layer) and authorized AI clients
 * (Claude Code, Codex, VS Code/MCP, future IDEs/CLIs) that connect through MCP or
 * the canonical interop gateway.
 *
 * Design rules (see BRANDOPS_AGENT_INTEROP_ARCHITECTURE.md):
 * - Agents are authorized clients, never peers. Every interaction is scoped by
 *   user, workspace, client, purpose, capability, and permission.
 * - Agent-reported facts are `AGENT_REPORTED` and are NEVER silently promoted to
 *   verified Twin facts. Promotion requires a reviewable checkpoint + user action.
 * - No external side effect is ever executed from a tool call; consequential work
 *   becomes proposals/checkpoints/plans inside BrandOps for the user to approve.
 */
import type { PermissionTier } from './executionState';

/** Trust boundary every piece of information carries when it crosses the boundary. */
export type TrustTier =
  | 'USER_VERIFIED'
  | 'BRANDOPS_VERIFIED'
  | 'AGENT_REPORTED'
  | 'EXTERNAL_SOURCE'
  | 'MODEL_INFERRED'
  | 'UNKNOWN';

export const TRUST_TIER_RANK: Record<TrustTier, number> = {
  USER_VERIFIED: 6,
  BRANDOPS_VERIFIED: 5,
  AGENT_REPORTED: 3,
  EXTERNAL_SOURCE: 2,
  MODEL_INFERRED: 1,
  UNKNOWN: 0
};

export type ExternalAgentClientKind =
  | 'claude-code'
  | 'codex'
  | 'vscode'
  | 'generic-mcp'
  | 'cli'
  | 'brandops';

export const EXTERNAL_AGENT_CLIENT_KINDS: readonly ExternalAgentClientKind[] = [
  'claude-code',
  'codex',
  'vscode',
  'generic-mcp',
  'cli',
  'brandops'
];

/**
 * Purpose-scoped context bundles. An external agent is granted a subset of these;
 * context retrieval never returns anything outside the requested + granted bundles.
 */
export type ContextBundleId =
  | 'PUBLIC_IDENTITY'
  | 'BUILDER_CONTEXT'
  | 'PROJECT_CONTEXT'
  | 'WRITING_VOICE'
  | 'CURRENT_GOALS'
  | 'POSITIONING_CONTEXT'
  | 'CONTENT_CONTEXT';

export const CONTEXT_BUNDLE_IDS: readonly ContextBundleId[] = [
  'PUBLIC_IDENTITY',
  'BUILDER_CONTEXT',
  'PROJECT_CONTEXT',
  'WRITING_VOICE',
  'CURRENT_GOALS',
  'POSITIONING_CONTEXT',
  'CONTENT_CONTEXT'
];

/**
 * Canonical agent capabilities. Tools exposed over MCP map 1:1 to these ids so
 * vendor connectors stay thin and the authorization/permission logic lives once.
 */
export type AgentCapabilityId =
  | 'context.read'
  | 'goals.read'
  | 'artifacts.read'
  | 'plans.read'
  | 'achievement.record'
  | 'artifact.create'
  | 'twin.propose_update'
  | 'opportunity.create'
  | 'plan.convert'
  | 'action.request';

export const AGENT_CAPABILITY_IDS: readonly AgentCapabilityId[] = [
  'context.read',
  'goals.read',
  'artifacts.read',
  'plans.read',
  'achievement.record',
  'artifact.create',
  'twin.propose_update',
  'opportunity.create',
  'plan.convert',
  'action.request'
];

export type AgentCapabilityAccess = 'auto' | 'approval';

export interface AgentCapabilityDefinition {
  id: AgentCapabilityId;
  /** MCP tool name when exposed over the protocol (null for capabilities that are not tools). */
  toolName?: string;
  label: string;
  description: string;
  tier: PermissionTier;
  /** `auto` runs when the capability is granted; `approval` requires BrandOps-side approval first. */
  access: AgentCapabilityAccess;
  /** Only read capabilities may be granted to read-only sessions. */
  readOnly: boolean;
}

export interface ExternalAgentSession {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  clientKind: ExternalAgentClientKind;
  clientName: string;
  /** Hash of the bearer token (SHA-256 hex). Raw tokens never enter workspace JSON. */
  tokenHash: string;
  status: 'active' | 'revoked';
  grantedBundles: ContextBundleId[];
  grantedCapabilities: AgentCapabilityId[];
  createdAt: string;
  lastActivityAt: string;
  revokedAt?: string;
  /** Optional TTL. Absent = non-expiring local session. */
  expiresAt?: string;
}

export interface ExternalAgentSessionsState {
  entries: ExternalAgentSession[];
  updatedAt: string;
}

export type ExternalAgentEventKind =
  | 'repository_analyzed'
  | 'feature_completed'
  | 'release_prepared'
  | 'documentation_created'
  | 'milestone_proposed'
  | 'technical_decision'
  | 'experiment_completed'
  | 'open_source_contribution'
  | 'project_completed'
  | 'development_session';

export const EXTERNAL_AGENT_EVENT_KINDS: readonly ExternalAgentEventKind[] = [
  'repository_analyzed',
  'feature_completed',
  'release_prepared',
  'documentation_created',
  'milestone_proposed',
  'technical_decision',
  'experiment_completed',
  'open_source_contribution',
  'project_completed',
  'development_session'
];

/**
 * Lifecycle of an agent-reported signal. `proposed` is always the initial state.
 * Promotion to a Twin fact is an explicit user action (`promoteAgentEventToTwin`).
 */
export type ExternalAgentEventStatus =
  | 'proposed'
  | 'reviewed'
  | 'verified'
  | 'rejected'
  | 'promoted';

export interface ExternalAgentEventEvidenceRef {
  /** e.g. `git:owner/repo@sha`, `release:v1.2.3`, `file:docs/api.md`. */
  ref: string;
  kind: 'git' | 'release' | 'document' | 'milestone' | 'link' | 'other';
  /** Short human label for the review queue. */
  label: string;
}

export interface ExternalAgentEvent {
  id: string;
  sessionId: string;
  clientKind: ExternalAgentClientKind;
  kind: ExternalAgentEventKind;
  title: string;
  detail: string;
  /** Pointers the agent supplies as evidence. Kept as AGENT_REPORTED until the user verifies. */
  evidence: ExternalAgentEventEvidenceRef[];
  /** Deterministic key used to dedupe repeated ingestions (git sha, release tag, title+type+repo). */
  dedupeKey: string;
  status: ExternalAgentEventStatus;
  /** Always `AGENT_REPORTED` until promoted by a user action. */
  trustTier: TrustTier;
  sourceRef: string;
  createdAt: string;
  reviewedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  promotedAt?: string;
  /** Checkpoint that records the detection/review chain. */
  originCheckpointId?: string;
  /** Plan created from this event via convert-to-plan. */
  convertedPlanId?: string;
}

export interface ExternalAgentEventsState {
  entries: ExternalAgentEvent[];
  updatedAt: string;
}

export type AgentProposalKind =
  | 'twin_update'
  | 'artifact'
  | 'content_opportunity'
  | 'external_action';

export type AgentProposalStatus = 'pending' | 'approved' | 'rejected' | 'superseded';

export type AgentProposalDecision = 'approved' | 'rejected';

/** Payload materialized into the integration hub when an artifact proposal is approved. */
export interface MaterializedArtifactPayload {
  title: string;
  artifactType: string;
  summary: string;
  externalUrl?: string;
  externalId?: string;
  tags: string[];
}

export interface AgentProposal {
  id: string;
  kind: AgentProposalKind;
  sessionId?: string;
  /** Free-form client label (e.g. 'claude-code'). */
  agentId?: string;
  title: string;
  detail: string;
  /** Why the agent believes this change is justified. */
  rationale: string;
  status: AgentProposalStatus;
  tier: PermissionTier;
  /** Checkpoint that records the proposal so the user can inspect/approve/reject. */
  checkpointId?: string;
  /** Event this proposal was derived from, when applicable. */
  relatedEventId?: string;
  /** Populated when the user approves and the proposal becomes a Plan. */
  planId?: string;
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
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface AgentProposalsState {
  entries: AgentProposal[];
  updatedAt: string;
}

export interface ExternalAgentAuditEntry {
  id: string;
  at: string;
  sessionId: string;
  clientKind: ExternalAgentClientKind;
  capabilityId: AgentCapabilityId;
  operation: string;
  ok: boolean;
  errorCode?: string;
  summary: string;
  /** Bounded preview of the inbound request text (never full prompts). */
  requestPreview: string;
  latencyMs?: number;
}

export interface ExternalAgentAuditState {
  entries: ExternalAgentAuditEntry[];
  updatedAt: string;
}

/** One scoped context payload item handed to an agent, with full provenance. */
export interface AgentContextPayloadItem {
  bundleId: ContextBundleId;
  text: string;
  source: 'digital-twin' | 'workspace' | 'agent-event' | 'artifact' | 'plan';
  entityId?: string;
  trustTier: TrustTier;
  verified: boolean;
  relevanceScore: number;
  freshnessScore: number;
  retrievedAt: string;
  /** Pointer the agent can cite back to BrandOps. */
  provenanceRef: string;
}

export interface AgentContextBundleResult {
  bundleId: ContextBundleId;
  items: AgentContextPayloadItem[];
  /** Context-minimization: never the full Twin/memory DB. */
  truncated: boolean;
  /** Human-readable trust summary for the bundle (verified vs agent-reported vs inferred). */
  provenance?: string;
}

/** Inbound tool-call envelope from an authorized agent session. */
export interface AgentToolCall {
  capabilityId: AgentCapabilityId;
  sessionId: string;
  /** Optional idempotency key — repeating a call with the same key returns the stored result. */
  idempotencyKey?: string;
  /** Purpose declaration: which bundles/why. Enforced against granted scopes. */
  purpose?: string;
  args: Record<string, unknown>;
}

export interface AgentToolResult {
  ok: boolean;
  capabilityId: AgentCapabilityId;
  data: Record<string, unknown>;
  errorCode?: string;
  error?: string;
  /** True when a duplicate call returned a previously stored result. */
  deduplicated?: boolean;
  /** True when the capability is `approval`-access: the call only produced an approval-gated request, nothing executed. */
  approvalRequired?: boolean;
  /** Checkpoint id(s) recorded for the chain (audit receipt linkage). */
  checkpointIds: string[];
  auditEntryId: string;
}
