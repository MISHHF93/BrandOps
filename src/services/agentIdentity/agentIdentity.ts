/**
 * Agent Identity & Trust Levels — extends the existing ExternalAgentSession with trust level classification
 * and provides a unified registry for all agent identities.
 *
 * This is P0-2 from BRANDOPS_NEXT_CAPABILITIES.md.
 *
 * Existing: ExternalAgentSession already has clientKind, clientName, tokenHash, status,
 * grantedBundles, grantedCapabilities, createdAt, lastActivityAt, revokedAt, expiresAt.
 *
 * Missing: trust level classification (READ_ONLY, CONTEXT_CONSUMER, PROPOSER, ACTION_REQUESTER),
 * unified registry view, Agent Trust Center UI wiring.
 */

import type {
  ExternalAgentSession,
  ExternalAgentClientKind,
  ExternalAgentTrustLevel,
  AgentCapabilityId,
  ContextBundleId
} from '../../types/agentInterop';
import { EXTERNAL_AGENT_CLIENT_KINDS, EXTERNAL_AGENT_TRUST_LEVELS } from '../../types/agentInterop';
import { trustFromCapabilities } from '../interop/policyEngine';
import type { BrandOpsData } from '../../types/domain';

// ---------------------------------------------------------------------------
// Trust Level Classification
// ---------------------------------------------------------------------------

/**
 * Trust levels for external agents. Defined in `types/agentInterop` and
 * re-exported here for the existing importers: a level shown to a person and a
 * level the gateway enforces must be the same type, not two that look alike.
 */
export type { ExternalAgentTrustLevel } from '../../types/agentInterop';

/** Human-readable label for each trust level. */
export function trustLevelLabel(level: ExternalAgentTrustLevel): string {
  switch (level) {
    case 'READ_ONLY':
      return 'Read Only — can view context only';
    case 'CONTEXT_CONSUMER':
      return 'Context Consumer — can view builder context and projects';
    case 'PROPOSER':
      return 'Proposer — can propose achievements, artifacts, twin updates, and opportunities';
    case 'ACTION_REQUESTER':
      return 'Action Requester — can request external actions (approval required)';
    case 'NONE':
      return 'No active session';
  }
}

/** Whether this trust level allows proposal creation. */
export function trustLevelAllowsProposals(level: ExternalAgentTrustLevel): boolean {
  return level === 'PROPOSER' || level === 'ACTION_REQUESTER';
}

/** Whether this trust level allows action requests. */
export function trustLevelAllowsActions(level: ExternalAgentTrustLevel): boolean {
  return level === 'ACTION_REQUESTER';
}

/** Whether this trust level allows context reading. */
export function trustLevelAllowsContext(level: ExternalAgentTrustLevel): boolean {
  return (
    level === 'READ_ONLY' ||
    level === 'CONTEXT_CONSUMER' ||
    level === 'PROPOSER' ||
    level === 'ACTION_REQUESTER'
  );
}

// ---------------------------------------------------------------------------
// Trust Level Derivation
// ---------------------------------------------------------------------------

/**
 * Derive a trust level from a session's granted capabilities.
 *
 * **Delegates to the policy engine on purpose.** This function used to classify
 * by matching capability *names* — `action.request` → ACTION_REQUESTER, four
 * named proposal capabilities → PROPOSER, anything starting with `builder.` →
 * CONTEXT_CONSUMER. That list stopped being true the moment a capability was
 * added without editing it: a session holding `builder.sessions.revoke`, the
 * single most consequential capability in the registry, was classified
 * READ_ONLY.
 *
 * The registry already records each capability's tier and whether it is
 * read-only, so trust is derived from that. Displaying a level the gateway would
 * not enforce is worse than showing nothing — it tells a person a session is
 * safer than it is.
 */
export function deriveTrustLevel(
  session: ExternalAgentSession | null | undefined
): ExternalAgentTrustLevel {
  if (!session || session.status === 'revoked') return 'NONE';
  return trustFromCapabilities(session.grantedCapabilities);
}

// ---------------------------------------------------------------------------
// Agent Identity (unified view)
// ---------------------------------------------------------------------------

/** A unified agent identity combining session, trust level, and recent activity. */
export interface AgentIdentity {
  /** Session id. */
  sessionId: string;
  /** Trust level derived from capabilities. */
  trustLevel: ExternalAgentTrustLevel;
  /** Client kind (claude-code, codex, vscode, etc.). */
  clientKind: ExternalAgentClientKind;
  /** Human-readable client name. */
  clientName: string;
  /** Owner user id. */
  ownerUserId: string;
  /** Workspace id. */
  workspaceId: string;
  /** Granted capabilities (capability ids). */
  capabilities: AgentCapabilityId[];
  /** Granted context bundles. */
  bundles: ContextBundleId[];
  /** Authentication status. */
  authenticationStatus: 'authenticated' | 'revoked' | 'expired';
  /** When the session was created. */
  createdAt: string;
  /** Last activity timestamp. */
  lastActivityAt: string;
  /** When revoked (if applicable). */
  revokedAt: string | null;
  /** When expired (if applicable). */
  expiresAt: string | null;
  /** Whether this session is currently active. */
  isActive: boolean;
  /** Time since last activity (human-readable). */
  lastActivityAge: string;
}

/** Format the time since last activity as a human-readable string. */
function formatLastActivityAge(lastActivityAt: string): string {
  const last = new Date(lastActivityAt).getTime();
  const now = Date.now();
  const diffMs = now - last;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(lastActivityAt).toLocaleDateString();
}

/**
 * Build an AgentIdentity from a session.
 */
export function buildAgentIdentity(session: ExternalAgentSession): AgentIdentity {
  // Revoked sessions display NONE rather than the level their grants imply —
  // a revoked agent is not a PROPOSER that happens to be switched off.
  const trustLevel = deriveTrustLevel(session);
  const now = new Date();

  let authenticationStatus: 'authenticated' | 'revoked' | 'expired';
  if (session.status === 'revoked') {
    authenticationStatus = 'revoked';
  } else if (session.expiresAt && new Date(session.expiresAt).getTime() < now.getTime()) {
    authenticationStatus = 'expired';
  } else {
    authenticationStatus = 'authenticated';
  }

  return {
    sessionId: session.id,
    trustLevel,
    clientKind: session.clientKind,
    clientName: session.clientName,
    ownerUserId: session.ownerUserId,
    workspaceId: session.workspaceId,
    capabilities: session.grantedCapabilities,
    bundles: session.grantedBundles as ContextBundleId[],
    authenticationStatus,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    revokedAt: session.revokedAt ?? null,
    expiresAt: session.expiresAt ?? null,
    isActive:
      session.status === 'active' &&
      (!session.expiresAt || new Date(session.expiresAt).getTime() >= now.getTime()),
    lastActivityAge: formatLastActivityAge(session.lastActivityAt)
  };
}

// ---------------------------------------------------------------------------
// Agent Identity Registry
// ---------------------------------------------------------------------------

/** A registry of all agent identities in a workspace. */
export interface AgentIdentityRegistry {
  /** All agent identities (active + revoked). */
  identities: AgentIdentity[];
  /** Active identities only. */
  activeIdentities: AgentIdentity[];
  /** Identities by trust level. */
  byTrustLevel: Record<ExternalAgentTrustLevel, AgentIdentity[]>;
  /** Identities by client kind. */
  byClientKind: Record<ExternalAgentClientKind, AgentIdentity[]>;
  /** Total count. */
  totalCount: number;
  /** Active count. */
  activeCount: number;
  /** Updated at timestamp. */
  updatedAt: string;
}

/**
 * Build an AgentIdentityRegistry from workspace data.
 */
export function buildAgentIdentityRegistry(data: BrandOpsData): AgentIdentityRegistry {
  const sessions = data.externalAgentSessions?.entries ?? [];
  const identities = sessions.map(buildAgentIdentity);

  const activeIdentities = identities.filter((id) => id.isActive);

  /**
   * Every level and every client kind gets a key, even when empty.
   *
   * These are typed as total `Record`s, and they used to be built sparsely and
   * then cast — so `registry.byTrustLevel.PROPOSER.length`, which the type says
   * is safe, threw whenever no session happened to hold that level. The cast was
   * what hid it. Seeding the maps makes the type true instead of asserted.
   */
  const byTrustLevel = Object.fromEntries(
    EXTERNAL_AGENT_TRUST_LEVELS.map((level) => [level, [] as AgentIdentity[]])
  ) as Record<ExternalAgentTrustLevel, AgentIdentity[]>;
  const byClientKind = Object.fromEntries(
    EXTERNAL_AGENT_CLIENT_KINDS.map((kind) => [kind, [] as AgentIdentity[]])
  ) as Record<ExternalAgentClientKind, AgentIdentity[]>;

  for (const identity of identities) {
    byTrustLevel[identity.trustLevel].push(identity);
    byClientKind[identity.clientKind].push(identity);
  }

  return {
    identities,
    activeIdentities,
    byTrustLevel,
    byClientKind,
    totalCount: identities.length,
    activeCount: activeIdentities.length,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Get a single agent identity by session id.
 */
export function getAgentIdentityById(
  registry: AgentIdentityRegistry,
  sessionId: string
): AgentIdentity | undefined {
  return registry.identities.find((id) => id.sessionId === sessionId);
}

/**
 * Get identities that require attention (revoked, expired, or inactive for > 30 days).
 */
export function getIdentitiesRequiringAttention(registry: AgentIdentityRegistry): AgentIdentity[] {
  const now = Date.now();
  return registry.identities.filter((id) => {
    if (id.authenticationStatus === 'authenticated' && id.isActive) {
      // Check if inactive for > 30 days
      const lastActivity = new Date(id.lastActivityAt).getTime();
      if (now - lastActivity > 30 * 24 * 60 * 60 * 1000) {
        return true;
      }
      return false;
    }
    return id.authenticationStatus === 'revoked' || id.authenticationStatus === 'expired';
  });
}
