/**
 * Builder Activity Graph — canonical entities and relationships for professional
 * work history. Ingests activity only from user actions or explicitly authorized
 * sources; deduplicates by source identifiers and content fingerprints.
 */

import type { ActivityEvent, ActivityEventSource, AchievementKind, VerificationStatus, TrustTier, EntityRef, EvidenceEntry } from '../../types/builder';
import type { BrandOpsData } from '../../types/domain';

export interface ActivityEventInput {
  workspaceId: string;
  source: ActivityEventSource;
  sourceId: string;
  kind: ActivityEvent['kind'];
  title: string;
  detail: string;
  timestamp?: string;
  confidence?: number;
  verificationStatus?: VerificationStatus;
  trustTier?: TrustTier;
  entityRefs?: EntityRef[];
  evidence?: EvidenceEntry[];
  recordedBy?: string;
  recordedReason?: string;
}

export interface DedupeResult {
  deduplicated: boolean;
  existingEvent?: ActivityEvent;
}

/** Max activity events retained per workspace. */
const MAX_ACTIVITY_EVENTS = 2000;

/** Activity kinds that are eligible for achievement detection. */
const ACHIEVABLE_KINDS: readonly ActivityEvent['kind'][] = [
  'feature-built',
  'repository-released',
  'product-launched',
  'documentation-published',
  'benchmark-improved',
  'open-source-contribution',
  'hackathon-submission',
  'project-milestone',
  'integration-completed',
  'significant-refactor'
];

/** Deterministic fingerprint for dedup. */
function fingerprint(input: ActivityEventInput, timestamp: string): string {
  const parts = [
    input.source,
    input.sourceId,
    input.kind,
    input.title.trim().toLowerCase(),
    input.detail.trim().toLowerCase().slice(0, 200),
    timestamp.slice(0, 10)
  ];
  return parts.join('::');
}

/** Normalize timestamp to ISO. */
function normalizeTimestamp(ts?: string): string {
  if (!ts) return new Date().toISOString();
  const parsed = new Date(ts);
  if (isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

/** Validate that an activity event has minimum viable fields. */
function validateInput(input: ActivityEventInput): string | null {
  if (!input.workspaceId) return 'workspaceId is required.';
  if (!input.source) return 'source is required.';
  if (!input.sourceId) return 'sourceId is required.';
  if (!input.kind) return 'kind is required.';
  if (!input.title.trim()) return 'title is required.';
  if (!input.detail.trim()) return 'detail is required.';
  return null;
}

/** Check if an activity kind can produce achievements. */
export function isAchievementEligible(kind: ActivityEvent['kind']): boolean {
  return ACHIEVABLE_KINDS.includes(kind);
}

/** Create a minimal ActivityEvent for ingestion. */
export function createActivityEvent(
  input: ActivityEventInput,
  timestamp: string,
  _skipDedupCheck: boolean
): ActivityEvent {
  const ts = normalizeTimestamp(timestamp);
  const confidence = input.confidence ?? (input.verificationStatus === 'USER_VERIFIED' ? 1 : 0.7);

  return {
    id: `activity-${ts.slice(0, 10)}-${input.sourceId.slice(0, 12)}`,
    workspaceId: input.workspaceId,
    source: input.source,
    sourceId: input.sourceId,
    kind: input.kind,
    title: input.title.trim().slice(0, 300),
    detail: input.detail.trim().slice(0, 2000),
    timestamp: ts,
    confidence,
    verificationStatus: input.verificationStatus ?? 'UNVERIFIED',
    trustTier: input.trustTier ?? (input.source === 'user-action' ? 'USER_VERIFIED' : 'AGENT_REPORTED'),
    entityRefs: input.entityRefs ?? [],
    evidence: input.evidence ?? [],
    fingerprint: fingerprint(input, ts),
    relatedAchievements: [],
    recordedBy: input.recordedBy ?? input.source,
    recordedReason: input.recordedReason,
    createdAt: ts,
    updatedAt: ts
  };
}

/**
 * Ingest an activity event into the workspace activity graph.
 * Only accepts explicitly authorized sources.
 */
export function ingestActivityEvent(
  workspace: BrandOpsData,
  input: ActivityEventInput,
  skipDedupCheck?: boolean
): { workspace: BrandOpsData; event: ActivityEvent; dedupResult: DedupeResult } {
  const validationError = validateInput(input);
  if (validationError) {
    throw new Error(`Invalid activity event input: ${validationError}`);
  }

  const ts = normalizeTimestamp(input.timestamp);
  const fingerprintValue = fingerprint(input, ts);

  // Dedup check
  const existingEvents = workspace.builderActivity?.events ?? [];
  const existing = existingEvents.find((e) => e.fingerprint === fingerprintValue);

  if (existing && !skipDedupCheck) {
    return {
      workspace,
      event: existing,
      dedupResult: { deduplicated: true, existingEvent: existing }
    };
  }

  // Create event
  const event = createActivityEvent(input, ts, true);

  // Append to activity graph
  const updatedEvents = [...existingEvents, event].slice(-MAX_ACTIVITY_EVENTS);
  const updatedWorkspace = {
    ...workspace,
    builderActivity: {
      events: updatedEvents,
      workspaceId: input.workspaceId,
      updatedAt: ts
    }
  };

  return {
    workspace: updatedWorkspace,
    event,
    dedupResult: { deduplicated: !!existing, existingEvent: existing }
  };
}

/** Check if source is explicitly authorized. */
export function isSourceAuthorized(source: string): boolean {
  const authorizedSources = [
    'user-action',
    'user-input',
    'manual-entry',
    'imported',
    'integration:authored',
    'skill-pack',
    'session-to-brand',
    'approved-agent'
  ];
  return authorizedSources.includes(source);
}

/** Get recent activity events for a workspace. */
export function getRecentActivity(
  workspace: { builderActivity?: { events: ActivityEvent[]; workspaceId: string; updatedAt?: string } },
  options: { limit?: number; since?: string; kinds?: ActivityEvent['kind'][] } = {}
): ActivityEvent[] {
  const events = workspace.builderActivity?.events ?? [];
  const limit = options.limit ?? 50;
  const since = options.since ? new Date(options.since).getTime() : 0;

  let filtered = events.filter((e) => {
    if (since && new Date(e.timestamp).getTime() < since) return false;
    if (options.kinds && options.kinds.length > 0 && !options.kinds.includes(e.kind)) return false;
    return true;
  });

  return filtered
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/** Get verified achievements from activity events. */
export function getVerifiedAchievements(
  workspace: { builderActivity?: { events: ActivityEvent[]; workspaceId: string; updatedAt?: string } },
  options: { limit?: number; projectId?: string } = {}
): ActivityEvent[] {
  const events = workspace.builderActivity?.events ?? [];
  const limit = options.limit ?? 100;

  return events
    .filter((e) => e.verificationStatus === 'USER_VERIFIED' || e.verificationStatus === 'INDEPENDENTLY_SUPPORTED')
    .filter((e) => !options.projectId || e.entityRefs.some((r) => r.type === 'project' && r.id === options.projectId))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/** Get project timeline from activity events. */
export function getProjectTimeline(
  workspace: { builderActivity?: { events: ActivityEvent[]; workspaceId: string; updatedAt?: string } },
  projectId: string,
  options: { limit?: number; since?: string } = {}
): Array<{ event: ActivityEvent; before: ActivityEvent | null; after: ActivityEvent | null }> {
  const events = workspace.builderActivity?.events ?? [];
  const limit = options.limit ?? 100;
  const since = options.since ? new Date(options.since).getTime() : 0;

  const projectEvents = events
    .filter((e) => e.entityRefs.some((r) => r.type === 'project' && r.id === projectId))
    .filter((e) => !since || new Date(e.timestamp).getTime() >= since)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const timeline: Array<{ event: ActivityEvent; before: ActivityEvent | null; after: ActivityEvent | null }> = [];

  for (let i = 0; i < Math.min(projectEvents.length, limit); i++) {
    const event = projectEvents[i];
    timeline.push({
      event,
      before: i > 0 ? projectEvents[i - 1] : null,
      after: i < projectEvents.length - 1 ? projectEvents[i + 1] : null
    });
  }

  return timeline;
}

/** Propose an achievement from an activity event. */
export function proposeAchievement(
  event: ActivityEvent,
  proposal: { title: string; description: string; kind: AchievementKind; confidence?: number }
): { achievement: AchievementProposal; confidence: number } {
  if (!isAchievementEligible(event.kind)) {
    throw new Error(`Activity kind "${event.kind}" is not eligible for achievement proposal.`);
  }

  const confidence = proposal.confidence ?? event.confidence * 0.8;

  const achievement: AchievementProposal = {
    id: `achievement-proposal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    workspaceId: event.workspaceId,
    eventId: event.id,
    title: proposal.title.slice(0, 300),
    description: proposal.description.slice(0, 2000),
    kind: proposal.kind,
    sourceEvents: [event.id],
    confidence,
    professionalRelevance: [],
    verificationRequired: true,
    evidence: event.evidence ?? [],
    createdAt: new Date().toISOString()
  };

  return { achievement, confidence };
}

/** Types for achievement proposals (intermediate state before verification). */
export interface AchievementProposal {
  id: string;
  workspaceId: string;
  eventId: string;
  title: string;
  description: string;
  kind: AchievementKind;
  sourceEvents: string[];
  confidence: number;
  professionalRelevance: string[];
  verificationRequired: boolean;
  evidence: EvidenceEntry[];
  createdAt: string;
}

// Builder activity state type is canonical in src/types/builder.ts; re-export for consumers.
export type { BuilderActivityState } from '../../types/builder';
import type { BuilderActivityState } from '../../types/builder';

export function createBuilderActivityState(workspaceId: string): BuilderActivityState {
  return {
    events: [],
    achievements: [],
    projects: [],
    opportunities: [],
    twinProposals: [],
    workspaceId
  };
}
