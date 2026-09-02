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
  | 'CONTENT_CONTEXT'
  | 'PROFESSION_CONTEXT';

export const CONTEXT_BUNDLE_IDS: readonly ContextBundleId[] = [
  'PUBLIC_IDENTITY',
  'BUILDER_CONTEXT',
  'PROJECT_CONTEXT',
  'WRITING_VOICE',
  'CURRENT_GOALS',
  'POSITIONING_CONTEXT',
  'CONTENT_CONTEXT',
  'PROFESSION_CONTEXT'
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
  | 'action.request'
  | 'builder.context.read'
  | 'builder.achievements.list'
  | 'builder.achievements.verify'
  | 'builder.achievements.dismiss'
  | 'builder.opportunities.list'
  | 'builder.opportunities.convert-to-plan'
  | 'builder.opportunities.dismiss'
  | 'builder.twin-proposals.list'
  | 'builder.twin-proposals.accept'
  | 'builder.twin-proposals.reject'
  | 'builder.projects.list'
  | 'builder.projects.intelligence'
  | 'builder.receipts.list'
  | 'builder.sessions.list'
  | 'builder.sessions.revoke'
  | 'builder.activity.ingest'
  | 'builder.activity.ingest-session-summary'
  | 'builder.skill-packed-instructions'
  | 'builder.feature-registry.read'
  | 'builder.handoffs.list'
  | 'builder.handoffs.propose'
  | 'builder.handoffs.decide'
  | 'builder.handoffs.complete'
  | 'evidence.read'
  | 'authority.read'
  | 'next-best-actions.read'
  | 'receipts.read'
  | 'outcome.report'
  | 'execution.request'
  | 'execution.read'
  | 'execution.cancel'
  | 'voice.read'
  | 'relationship.read'
  | 'artifact.read';

export const AGENT_CAPABILITY_IDS: readonly AgentCapabilityId[] = [
  'context.read',
  'goals.read',
  'artifacts.read',
  'plans.read',
  'evidence.read',
  'authority.read',
  'next-best-actions.read',
  'receipts.read',
  'outcome.report',
  'execution.request',
  'execution.read',
  'execution.cancel',
  'voice.read',
  'relationship.read',
  'artifact.read',
  'achievement.record',
  'artifact.create',
  'twin.propose_update',
  'opportunity.create',
  'plan.convert',
  'action.request',
  'builder.context.read',
  'builder.achievements.list',
  'builder.achievements.verify',
  'builder.achievements.dismiss',
  'builder.opportunities.list',
  'builder.opportunities.convert-to-plan',
  'builder.opportunities.dismiss',
  'builder.twin-proposals.list',
  'builder.twin-proposals.accept',
  'builder.twin-proposals.reject',
  'builder.projects.list',
  'builder.projects.intelligence',
  'builder.receipts.list',
  'builder.sessions.list',
  'builder.sessions.revoke',
  'builder.activity.ingest',
  'builder.activity.ingest-session-summary',
  'builder.skill-packed-instructions',
  'builder.feature-registry.read',
  'builder.handoffs.list',
  'builder.handoffs.propose',
  'builder.handoffs.decide',
  'builder.handoffs.complete'
];

export type AgentCapabilityAccess = 'auto' | 'approval';

/**
 * Canonical work-capability families.
 *
 * The surface is organized around *what kind of work* a capability performs,
 * not around which application screen it came from. That is the difference
 * between an MCP server exposing "a collection of random application endpoints"
 * and one exposing work capabilities an external AI can reason about.
 *
 * Families with no capabilities yet are deliberately kept in this list. An AI
 * asking what BrandOps can do deserves to know the difference between "BrandOps
 * does not do this" and "BrandOps has no capability in this family yet", and a
 * taxonomy that silently omits its empty branches cannot express that.
 */
export type CapabilityFamily =
  | 'KNOW'
  | 'REMEMBER'
  | 'SEARCH'
  | 'RESEARCH'
  | 'UNDERSTAND'
  | 'REASON'
  | 'ANALYZE'
  | 'COMPARE'
  | 'SIMULATE'
  | 'CREATE'
  | 'PLAN'
  | 'DELEGATE'
  | 'ACT'
  | 'COMMUNICATE'
  | 'MONITOR'
  | 'VERIFY'
  | 'MEASURE'
  | 'LEARN'
  | 'ADVISE'
  | 'AUTOMATE';

export const CAPABILITY_FAMILIES: readonly CapabilityFamily[] = [
  'KNOW',
  'REMEMBER',
  'SEARCH',
  'RESEARCH',
  'UNDERSTAND',
  'REASON',
  'ANALYZE',
  'COMPARE',
  'SIMULATE',
  'CREATE',
  'PLAN',
  'DELEGATE',
  'ACT',
  'COMMUNICATE',
  'MONITOR',
  'VERIFY',
  'MEASURE',
  'LEARN',
  'ADVISE',
  'AUTOMATE'
];

/** One line on what each family is for, shown in discovery. */
export const CAPABILITY_FAMILY_PURPOSE: Record<CapabilityFamily, string> = {
  KNOW: 'Retrieve governed professional context, identity, goals and project state.',
  REMEMBER: 'Record signals and proposals into BrandOps state — never as verified fact.',
  SEARCH: 'Find existing records: artifacts, evidence, receipts, sessions.',
  RESEARCH: 'Gather new external information with sources and coverage.',
  UNDERSTAND: 'Interpret a document, dataset or situation into structured meaning.',
  REASON: 'Draw evidence-grounded conclusions with stated assumptions.',
  ANALYZE: 'Score, classify and find patterns, gaps and risks in existing state.',
  COMPARE: 'Set two or more things side by side against explicit criteria.',
  SIMULATE: 'Explore hypothetical outcomes, always labelled hypothetical.',
  CREATE: 'Produce artifacts and proposals for the user to accept or reject.',
  PLAN: 'Compile intent into a governed Plan with steps and approvals.',
  DELEGATE: 'Select and assign a worker for a required capability.',
  ACT: 'Request consequential work; execution stays behind approval.',
  COMMUNICATE: 'Prepare and, under approval, send outbound messages.',
  MONITOR: 'Watch a subject and emit canonical events on change.',
  VERIFY: 'Establish that what was requested actually happened.',
  MEASURE: 'Record and read outcomes, distinguishing reported from verified.',
  LEARN: 'Turn validated outcomes into governed improvement.',
  ADVISE: 'Recommend the next best action from current state.',
  AUTOMATE: 'Create standing rules that act without a fresh request.'
};

export interface AgentCapabilityDefinition {
  id: AgentCapabilityId;
  /** MCP tool name when exposed over the protocol (null for capabilities that are not tools). */
  toolName?: string;
  label: string;
  description: string;
  tier: PermissionTier;
  /** What kind of work this capability performs. Organizes the whole surface. */
  family: CapabilityFamily;
  /** `auto` runs when the capability is granted; `approval` requires BrandOps-side approval first. */
  access: AgentCapabilityAccess;
  /** Only read capabilities may be granted to read-only sessions. */
  readOnly: boolean;
  /**
   * True when invoking this capability *mints* a durable task handle, so a
   * task-aware client should receive a `CreateTaskResult` instead of an ordinary
   * tool result. Reading or cancelling an existing task does not create one, and
   * must return the ordinary envelope its `outputSchema` describes.
   */
  createsTask?: boolean;
  /** Human-readable name for UI display. */
  name?: string;
}

/**
 * User Intent Contract — the declared purpose an external agent must carry on a
 * consequential request. BrandOps evaluates whether the request actually belongs
 * to the work the user authorized, so a confused or compromised client cannot
 * launder an unrelated action through a granted capability.
 *
 * Required on `EXTERNAL_ACTION` and `SENSITIVE_ACTION` capabilities; synthesized
 * and audited for every other mutation so no write is ever unattributed.
 */
export interface AgentIntentContract {
  /** What the agent is trying to accomplish for the user. */
  objective: string;
  /** Why this capability is the right way to accomplish it. */
  reason: string;
  /** The capability the contract authorizes. */
  requestedCapability: AgentCapabilityId;
  /** Optional concrete target (account, recipient, repository, plan id). */
  target?: string;
  /** Actions the agent claims it needs; anything outside this is out of contract. */
  allowedActions: string[];
  /** Limits the agent commits to (budget, tone, scope, do-not-touch). */
  constraints: string[];
  /** ISO timestamp after which the contract is void. */
  expiresAt?: string;
  /** Explicit confirmation, required for `SENSITIVE_ACTION` capabilities. */
  confirmed: boolean;
  /** `declared` when the client supplied it; `synthesized` when BrandOps derived it. */
  origin: 'declared' | 'synthesized';
}

export type { PermissionTier } from './executionState';
export type { PermissionBundle } from './domain';

/**
 * How much an external agent is trusted, as one ordered ladder.
 *
 * This lives here rather than in a service because two of them need it and they
 * must not drift: `policyEngine` derives a level from the capability registry to
 * *enforce*, and `agentIdentity` shows the same level to a person. When the two
 * had separate definitions and separate derivations, they disagreed — a session
 * holding `builder.sessions.revoke` was displayed as READ_ONLY.
 */
export type ExternalAgentTrustLevel =
  | 'NONE' // no active session, or revoked
  | 'READ_ONLY' // may read; may not write anything
  | 'CONTEXT_CONSUMER' // may read and consume builder context; still no write
  | 'PROPOSER' // may create proposals — none of which apply without approval
  | 'ACTION_REQUESTER'; // may request external actions; still requires approval

/** Ordered weakest to strongest. Used to build total maps over the ladder. */
export const EXTERNAL_AGENT_TRUST_LEVELS: readonly ExternalAgentTrustLevel[] = [
  'NONE',
  'READ_ONLY',
  'CONTEXT_CONSUMER',
  'PROPOSER',
  'ACTION_REQUESTER'
];

/**
 * Operator-assigned ceiling on what a session may do, independent of the
 * capabilities it was granted. It can only lower effective trust, never raise
 * it, so an operator can neuter a session without editing its grant list.
 *
 * A ceiling is expressed in the same vocabulary as a level because it *is* one,
 * used as a cap. `CONTEXT_CONSUMER` is currently reachable only this way: no
 * capability in the registry derives it, but an operator can pin a session there
 * to hold it between reading and proposing.
 */
export type ExternalAgentTrustCeiling = ExternalAgentTrustLevel;

export interface ExternalAgentSession {
  id: string;
  /** Optional cap on effective trust. Absent means "whatever the grants imply". */
  trustCeiling?: ExternalAgentTrustCeiling;
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
  | 'external_action'
  /**
   * A request to *promote* existing agent-reported content into verified state —
   * verifying an achievement, accepting a Twin proposal. Distinct from
   * `external_action` because nothing leaves BrandOps: the consequence is
   * internal and it is exactly the one the fourth invariant reserves for a
   * person. Recording it as an external action would put a lie in the ledger.
   */
  | 'promotion';

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
  /** What a `promotion` proposal will promote, once a person approves it. */
  promotion?: { action: 'verify-achievement' | 'accept-twin-proposal'; targetId: string };
  /**
   * Fingerprint of the executable content at the moment this was described to
   * the user. Recomputed at decision time: an approval binds to what the person
   * saw, not to the id of something that can change underneath it.
   */
  approvalBinding?: { fingerprint: string; stepCount: number };
  artifact?: MaterializedArtifactPayload;
  contentOpportunity?: {
    format?: string;
    angle?: string;
    whyNow?: string;
    audience?: string;
  };
  /**
   * Opaque MCP task handle when this proposal is an execution request. The
   * protocol task is a *view* over this proposal plus the Plan/Checkpoint state
   * it points at — BrandOps runs no second task engine.
   */
  taskId?: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decisionNote?: string;
}

/** MCP Tasks extension status values (`io.modelcontextprotocol/tasks`). */
export type McpTaskStatus = 'working' | 'input_required' | 'completed' | 'failed' | 'cancelled';

/** One pending input the protocol task is waiting on (approval, recovery decision). */
export interface McpTaskInputRequest {
  method: string;
  params: Record<string, unknown>;
}

/**
 * Protocol-shaped task, projected from canonical BrandOps state. Field names
 * follow the MCP Tasks extension so this object can be returned verbatim.
 */
export interface McpTask {
  taskId: string;
  status: McpTaskStatus;
  statusMessage?: string;
  createdAt: string;
  lastUpdatedAt: string;
  /** Null = no expiry. BrandOps tasks are durable workspace state. */
  ttlMs: number | null;
  pollIntervalMs?: number;
  result?: Record<string, unknown>;
  error?: { code: string; message: string };
  inputRequests?: Record<string, McpTaskInputRequest>;
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

/** Agent handoff state — explicit task delegation between agents with full context, budget, and lifecycle tracking. */
export interface AgentHandoff {
  id: string;
  sourceAgent: string;
  targetAgent: string;
  objective: string;
  checkpointId?: string;
  requiredCapabilities: string[];
  minimumContext: import('./agentInterop').ContextBundleId[];
  sourceArtifacts: string[];
  allowedActions: string[];
  prohibitedActions: string[];
  expectedOutput: string;
  budget: {
    tokenLimit?: number;
    timeLimitMs?: number;
    toolCallLimit?: number;
    costLimit?: number;
  };
  /**
   * What the handoff has actually spent.
   *
   * Without this the budget is decoration: four numbers nobody counts against.
   * Every field here pairs with one above, and `recordHandoffUsage` refuses the
   * call that would cross a limit rather than the one after it.
   */
  usage: {
    tokens: number;
    elapsedMs: number;
    toolCalls: number;
    cost: number;
  };
  expiration?: string;
  returnDestination?: string;
  status:
    | 'proposed'
    | 'accepted'
    | 'in_progress'
    | 'completed'
    | 'expired'
    | 'cancelled'
    | 'rejected';
  result?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentHandoffsState {
  entries: AgentHandoff[];
  updatedAt: string;
}
