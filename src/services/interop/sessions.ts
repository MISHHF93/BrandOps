/**
 * External-agent session lifecycle. Sessions are the unit of authorization:
 * a connected client holds a bearer token; BrandOps stores only the SHA-256
 * hash. Every session carries explicit workspace, bundle, and capability scopes.
 * Revocation is immediate (the hash is retained so the revoked token can never
 * be re-activated).
 */
import type {
  AgentCapabilityId,
  ContextBundleId,
  ExternalAgentClientKind,
  ExternalAgentSession,
  ExternalAgentSessionsState
} from '../../types/agentInterop';
import {
  AGENT_CAPABILITY_IDS,
  CONTEXT_BUNDLE_IDS,
  EXTERNAL_AGENT_CLIENT_KINDS
} from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { isReadCapability } from './capabilityRegistry';
import { prependCheckpoint } from '../execution/checkpointStore';
import { prependOperatorTrace } from '../dataset/operatorTraces';

export const MAX_AGENT_SESSIONS = 50;

const encoder = new TextEncoder();

export async function hashAgentToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateAgentToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface CreateAgentSessionInput {
  clientKind: ExternalAgentClientKind;
  clientName?: string;
  ownerUserId: string;
  workspaceId: string;
  grantedBundles: ContextBundleId[];
  grantedCapabilities: AgentCapabilityId[];
  readOnly?: boolean;
  expiresInMs?: number;
  token?: string;
}

export interface CreateAgentSessionResult {
  workspace: BrandOpsData;
  session: ExternalAgentSession;
  token: string;
}

function clampSessionScopes(
  bundles: ContextBundleId[],
  capabilities: AgentCapabilityId[],
  readOnly: boolean
): { bundles: ContextBundleId[]; capabilities: AgentCapabilityId[] } {
  const validBundles = bundles.filter((bundle) => CONTEXT_BUNDLE_IDS.includes(bundle));
  let validCapabilities = capabilities.filter((cap) => AGENT_CAPABILITY_IDS.includes(cap));
  if (readOnly) {
    validCapabilities = validCapabilities.filter(isReadCapability);
  }
  return {
    bundles: Array.from(new Set(validBundles)).slice(0, CONTEXT_BUNDLE_IDS.length),
    capabilities: Array.from(new Set(validCapabilities)).slice(0, AGENT_CAPABILITY_IDS.length)
  };
}

export async function createAgentSession(
  workspace: BrandOpsData,
  input: CreateAgentSessionInput
): Promise<CreateAgentSessionResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const token = input.token ?? generateAgentToken();
  const tokenHash = await hashAgentToken(token);
  const { bundles, capabilities } = clampSessionScopes(
    input.grantedBundles,
    input.grantedCapabilities,
    input.readOnly ?? false
  );
  const session: ExternalAgentSession = {
    id: `agent-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ownerUserId: input.ownerUserId.slice(0, 160),
    workspaceId: input.workspaceId.slice(0, 160),
    clientKind: input.clientKind,
    clientName: (input.clientName ?? input.clientKind).slice(0, 120),
    tokenHash,
    status: 'active',
    grantedBundles: bundles,
    grantedCapabilities: capabilities,
    createdAt: nowIso,
    lastActivityAt: nowIso,
    ...(input.expiresInMs
      ? { expiresAt: new Date(now.getTime() + input.expiresInMs).toISOString() }
      : {})
  };
  const prior = workspace.externalAgentSessions?.entries ?? [];
  const entries: ExternalAgentSession[] = [session, ...prior].slice(0, MAX_AGENT_SESSIONS);
  let next: BrandOpsData = {
    ...workspace,
    externalAgentSessions: { entries, updatedAt: nowIso }
  };
  next = prependCheckpoint(next, {
    conversationId: session.id,
    type: 'agent.session_connected',
    state: 'COMPLETED',
    summary:
      `Agent session connected (${session.clientKind}${session.clientName !== session.clientKind ? `: ${session.clientName}` : ''}). ` +
      `Token issued; only ${session.tokenHash.slice(0, 8)}… retained.`,
    source: 'user'
  });
  next = prependOperatorTrace(next, {
    source: 'user',
    verb: 'agent.session_connected',
    surface: 'external-agent',
    sessionId: session.id,
    entityType: 'agent-session',
    entityId: session.id,
    outcome: 'success',
    details: { clientKind: session.clientKind, capabilities: session.grantedCapabilities.length }
  });
  return {
    workspace: next,
    session,
    token
  };
}

export async function resolveAgentSession(
  workspace: BrandOpsData,
  token: string
): Promise<ExternalAgentSession | null> {
  const tokenHash = await hashAgentToken(token);
  const session = (workspace.externalAgentSessions?.entries ?? []).find(
    (entry) => entry.tokenHash === tokenHash
  );
  if (!session) return null;
  if (session.status !== 'active') return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session;
}

export function getAgentSessionById(
  workspace: BrandOpsData,
  sessionId: string
): ExternalAgentSession | null {
  return (
    (workspace.externalAgentSessions?.entries ?? []).find((entry) => entry.id === sessionId) ?? null
  );
}

export interface AgentTokenDiagnostic {
  resolved: boolean;
  reason: 'resolved' | 'no-sessions' | 'not-found' | 'revoked' | 'expired';
  tokenHashPrefix: string;
  activeSessionCount: number;
}

/**
 * Explain why a raw bearer token does or does not resolve in a workspace. Used
 * by the standalone MCP gateway to fail fast with actionable diagnostics
 * instead of surfacing E_UNAUTHORIZED only on the first tool call.
 */
export async function diagnoseAgentToken(
  workspace: BrandOpsData,
  token: string
): Promise<AgentTokenDiagnostic> {
  const tokenHash = await hashAgentToken(token);
  const tokenHashPrefix = tokenHash.slice(0, 8);
  const entries = workspace.externalAgentSessions?.entries ?? [];
  const activeSessionCount = entries.filter((entry) => entry.status === 'active').length;
  if (entries.length === 0) {
    return { resolved: false, reason: 'no-sessions', tokenHashPrefix, activeSessionCount };
  }
  const matching = entries.find((entry) => entry.tokenHash === tokenHash);
  if (!matching) {
    return { resolved: false, reason: 'not-found', tokenHashPrefix, activeSessionCount };
  }
  if (matching.status !== 'active') {
    return { resolved: false, reason: 'revoked', tokenHashPrefix, activeSessionCount };
  }
  if (matching.expiresAt && new Date(matching.expiresAt).getTime() < Date.now()) {
    return { resolved: false, reason: 'expired', tokenHashPrefix, activeSessionCount };
  }
  return { resolved: true, reason: 'resolved', tokenHashPrefix, activeSessionCount };
}

export function revokeAgentSession(workspace: BrandOpsData, sessionId: string): BrandOpsData {
  const prior = workspace.externalAgentSessions?.entries ?? [];
  const target = prior.find((entry) => entry.id === sessionId);
  if (!target) return workspace;
  const now = new Date().toISOString();
  const entries = prior.map((entry) =>
    entry.id === sessionId ? { ...entry, status: 'revoked' as const, revokedAt: now } : entry
  );
  return {
    ...workspace,
    externalAgentSessions: { entries, updatedAt: now }
  };
}

export function touchAgentSession(
  workspace: BrandOpsData,
  sessionId: string,
  at = new Date().toISOString()
): BrandOpsData {
  const prior = workspace.externalAgentSessions?.entries ?? [];
  const entries = prior.map((entry) =>
    entry.id === sessionId ? { ...entry, lastActivityAt: at } : entry
  );
  return {
    ...workspace,
    externalAgentSessions: { entries, updatedAt: at }
  };
}

export function listAgentSessions(workspace: BrandOpsData): ExternalAgentSession[] {
  return workspace.externalAgentSessions?.entries ?? [];
}

export function isClientKindSupported(kind: string): kind is ExternalAgentClientKind {
  return EXTERNAL_AGENT_CLIENT_KINDS.includes(kind as ExternalAgentClientKind);
}

export function sessionsState(workspace: BrandOpsData): ExternalAgentSessionsState {
  return (
    workspace.externalAgentSessions ?? {
      entries: [],
      updatedAt: workspace.seed.seededAt
    }
  );
}
