/**
 * Agent-reported professional signals (ExternalAgentEvent). Lifecycle:
 *
 *   proposed → reviewed → verified → promoted (to Twin, only by user action)
 *                    ↘ rejected
 *
 * Rule: an agent's word is NEVER a verified fact. Every event starts as
 * `AGENT_REPORTED` / `proposed`. Promotion writes to the Twin only after the
 * user verifies it, and every transition is recorded in the checkpoint ledger
 * plus an operator trace.
 */
import type {
  ExternalAgentEvent,
  ExternalAgentEventEvidenceRef,
  ExternalAgentEventKind,
  ExternalAgentEventStatus,
  TrustTier
} from '../../types/agentInterop';
import { EXTERNAL_AGENT_EVENT_KINDS } from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';
import { prependOperatorTrace } from '../dataset/operatorTraces';
import { prependCheckpoint } from '../execution/checkpointStore';

export const MAX_AGENT_EVENTS = 200;

export interface IngestAgentEventInput {
  sessionId: string;
  clientKind: ExternalAgentEvent['clientKind'];
  kind: ExternalAgentEventKind;
  title: string;
  detail: string;
  evidence?: Array<{ ref: string; kind?: ExternalAgentEventEvidenceRef['kind']; label: string }>;
  dedupeKey?: string;
  sourceRef?: string;
}

export interface IngestAgentEventResult {
  workspace: BrandOpsData;
  event: ExternalAgentEvent;
  deduplicated: boolean;
}

/** Deterministic dedupe key when the caller doesn't supply one (e.g. git sha or milestone title). */
export function deriveAgentEventDedupeKey(input: IngestAgentEventInput): string {
  const evidenceRef = input.evidence
    ?.map((e) => e.ref)
    .sort()
    .join('|');
  if (evidenceRef) return `${input.kind}:${evidenceRef}`;
  return `${input.kind}:${input.title.trim().toLowerCase().replace(/\s+/g, ' ')}:${input.detail.trim().toLowerCase().slice(0, 120)}`;
}

export function findAgentEventByDedupeKey(
  workspace: BrandOpsData,
  key: string
): ExternalAgentEvent | null {
  return (
    (workspace.externalAgentEvents?.entries ?? []).find((event) => event.dedupeKey === key) ?? null
  );
}

/**
 * Ingest an agent-reported signal. Duplicate dedupeKeys are ignored (returns the
 * existing event) so the same git commit / milestone cannot create duplicate
 * opportunities. Never promotes anything.
 */
export function ingestAgentEvent(
  workspace: BrandOpsData,
  input: IngestAgentEventInput
): IngestAgentEventResult {
  const now = new Date().toISOString();
  const dedupeKey = input.dedupeKey?.trim() || deriveAgentEventDedupeKey(input);
  const existing = findAgentEventByDedupeKey(workspace, dedupeKey);
  if (existing) {
    return { workspace, event: existing, deduplicated: true };
  }

  const event: ExternalAgentEvent = {
    id: `agent-event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: input.sessionId.slice(0, 160),
    clientKind: input.clientKind,
    kind: input.kind,
    title: input.title.slice(0, 300),
    detail: input.detail.slice(0, 4000),
    evidence: (input.evidence ?? []).slice(0, 12).map((ref) => ({
      ref: ref.ref.slice(0, 240),
      kind: ref.kind ?? 'other',
      label: ref.label.slice(0, 200)
    })),
    dedupeKey: dedupeKey.slice(0, 320),
    status: 'proposed',
    trustTier: 'AGENT_REPORTED',
    sourceRef: input.sourceRef?.slice(0, 240) ?? input.clientKind,
    createdAt: now
  };

  const prior = workspace.externalAgentEvents?.entries ?? [];
  let next: BrandOpsData = {
    ...workspace,
    externalAgentEvents: {
      entries: [event, ...prior].slice(0, MAX_AGENT_EVENTS),
      updatedAt: now
    }
  };
  const detectionCheckpoint = prependCheckpoint(next, {
    conversationId: event.id,
    type: 'agent.achievement_detected',
    state: 'COMPLETED',
    summary: `Achievement detected (${input.kind}): ${event.title}`,
    source: 'bridge',
    receiptRef: event.id
  });
  next = prependCheckpoint(detectionCheckpoint, {
    conversationId: event.id,
    parentCheckpointId: detectionCheckpoint.checkpoints?.entries[0]?.id,
    type: 'agent.event_ingested',
    state: 'COMPLETED',
    summary: `Agent event recorded as UNVERIFIED (${event.clientKind} → ${input.kind}).`,
    source: 'bridge',
    receiptRef: event.id
  });
  next = prependOperatorTrace(next, {
    source: 'bridge',
    verb: 'agent.event_ingested',
    surface: 'external-agent',
    capabilityId: 'achievement.record',
    sessionId: event.sessionId,
    entityType: 'agent-event',
    entityId: event.id,
    outcome: 'success',
    labels: ['agent-reported', 'unverified', event.kind],
    details: { kind: event.kind, clientKind: event.clientKind }
  });
  const withOrigin: BrandOpsData = {
    ...next,
    externalAgentEvents: {
      entries: (next.externalAgentEvents?.entries ?? []).map((entry) =>
        entry.id === event.id
          ? {
              ...entry,
              originCheckpointId: detectionCheckpoint.checkpoints?.entries[0]?.id
            }
          : entry
      ),
      updatedAt: now
    }
  };
  return { workspace: withOrigin, event, deduplicated: false };
}

export interface ReviewAgentEventInput {
  eventId: string;
  decision: 'verified' | 'rejected';
  note?: string;
}

export function getAgentEventById(
  workspace: BrandOpsData,
  eventId: string
): ExternalAgentEvent | null {
  return (workspace.externalAgentEvents?.entries ?? []).find((e) => e.id === eventId) ?? null;
}

/** User reviews a proposed achievement. `verified` moves it one step toward the Twin; `rejected` closes it. */
export function reviewAgentEvent(
  workspace: BrandOpsData,
  input: ReviewAgentEventInput
): BrandOpsData {
  const event = getAgentEventById(workspace, input.eventId);
  if (!event || event.status === 'promoted' || event.status === 'rejected') return workspace;
  const now = new Date().toISOString();
  const nextStatus: ExternalAgentEventStatus =
    input.decision === 'verified' ? 'verified' : 'rejected';
  const entries = (workspace.externalAgentEvents?.entries ?? []).map((entry) =>
    entry.id === event.id
      ? {
          ...entry,
          status: nextStatus,
          ...(input.decision === 'verified'
            ? { verifiedAt: now, reviewedAt: now }
            : { rejectedAt: now, reviewedAt: now })
        }
      : entry
  );
  let next: BrandOpsData = {
    ...workspace,
    externalAgentEvents: { entries, updatedAt: now }
  };
  next = prependCheckpoint(next, {
    conversationId: event.id,
    type: 'agent.achievement_verified',
    state: input.decision === 'verified' ? 'VERIFYING' : 'REJECTED',
    summary:
      input.decision === 'verified'
        ? `Achievement verified by user: ${event.title}. Ready to promote to the Twin on request.`
        : `Achievement rejected by user: ${event.title}.${input.note ? ` ${input.note}` : ''}`,
    source: 'user',
    approvalStatus: input.decision === 'verified' ? 'approved' : 'rejected',
    receiptRef: event.id
  });
  next = prependOperatorTrace(next, {
    source: 'user',
    verb: 'agent.achievement_review',
    surface: 'external-agent',
    capabilityId: 'achievement.record',
    sessionId: event.sessionId,
    entityType: 'agent-event',
    entityId: event.id,
    outcome: input.decision === 'verified' ? 'success' : 'failure',
    labels: [input.decision]
  });
  return next;
}

/**
 * Promote a verified achievement into the Twin. This is the ONLY path that
 * upgrades an agent report to a USER_VERIFIED claim, and it is always an
 * explicit user action. Also flags a content/positioning opportunity.
 */
export function promoteAgentEventToTwin(workspace: BrandOpsData, eventId: string): BrandOpsData {
  const event = getAgentEventById(workspace, eventId);
  if (!event || event.status !== 'verified') return workspace;
  const now = new Date().toISOString();
  const twinState = workspace.digitalTwins;
  if (!twinState?.twins.length) return workspace;

  const active = twinState.twins.find((t) => t.id === twinState.activeTwinId) ?? twinState.twins[0];
  const claim = `${event.title} — ${event.detail.slice(0, 280)}`;
  const hasClaim = active.memory.approvedClaims.some(
    (c) => c.toLowerCase() === claim.toLowerCase()
  );
  const hasAchievement = active.resumeProfile.achievements.some(
    (a) => a.toLowerCase() === claim.toLowerCase()
  );

  const twins = twinState.twins.map((twin) => {
    if (twin.id !== active.id) return twin;
    return {
      ...twin,
      updatedAt: now,
      memory: {
        ...twin.memory,
        approvedClaims: hasClaim
          ? twin.memory.approvedClaims
          : [claim, ...twin.memory.approvedClaims].slice(0, 60),
        rejectedClaims: twin.memory.rejectedClaims.filter((c) => c !== claim)
      },
      resumeProfile: {
        ...twin.resumeProfile,
        achievements: hasAchievement
          ? twin.resumeProfile.achievements
          : [claim, ...twin.resumeProfile.achievements].slice(0, 120)
      }
    };
  });

  const entries = (workspace.externalAgentEvents?.entries ?? []).map((entry) =>
    entry.id === eventId
      ? {
          ...entry,
          status: 'promoted' as const,
          trustTier: 'USER_VERIFIED' as TrustTier,
          promotedAt: now
        }
      : entry
  );

  let next: BrandOpsData = {
    ...workspace,
    digitalTwins: { ...twinState, twins },
    externalAgentEvents: { entries, updatedAt: now }
  };
  next = prependCheckpoint(next, {
    conversationId: event.id,
    type: 'agent.achievement_promoted',
    state: 'COMPLETED',
    summary: `Achievement added to Twin (user-confirmed): ${event.title}.`,
    source: 'user',
    receiptRef: event.id
  });
  next = prependOperatorTrace(next, {
    source: 'user',
    verb: 'agent.achievement_promote',
    surface: 'external-agent',
    capabilityId: 'achievement.record',
    sessionId: event.sessionId,
    entityType: 'agent-event',
    entityId: event.id,
    outcome: 'success',
    labels: ['promoted-to-twin']
  });
  return next;
}

/** Event kinds valid as inbound tool input. */
export function isAgentEventKind(value: string): value is ExternalAgentEventKind {
  return EXTERNAL_AGENT_EVENT_KINDS.includes(value as ExternalAgentEventKind);
}
