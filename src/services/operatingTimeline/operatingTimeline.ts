import type { BrandOpsAIArtifact, BrandOpsAIResponse } from '../../types/brandOpsAiCore';
import type {
  BrandOpsOperatingTimelineCategory,
  BrandOpsOperatingTimelineEvent,
  BrandOpsOperatingTimelineState,
  BrandOpsOperatingTimelineTone
} from '../../types/operatingTimeline';

export const BRANDOPS_OPERATING_TIMELINE_SCHEMA_VERSION = '1.0.0';
export const MAX_BRANDOPS_OPERATING_TIMELINE_EVENTS = 240;

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value: unknown, max = 1200): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clampPercent(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function timelineToneForArtifact(artifact: BrandOpsAIArtifact): BrandOpsOperatingTimelineTone {
  if (artifact.status === 'rejected') return 'danger';
  if (artifact.auditReceipt.approvalRequired) return 'warning';
  if (artifact.status === 'approved' || artifact.status === 'executed') return 'success';
  return 'primary';
}

function categoryForArtifact(artifact: BrandOpsAIArtifact): BrandOpsOperatingTimelineCategory {
  switch (artifact.type) {
    case 'operational plan':
    case 'workflow plan':
    case 'content plan':
      return 'generated-plan';
    case 'outreach draft':
      return 'outreach-sequence';
    case 'positioning statement':
      return 'positioning-change';
    case 'opportunity analysis':
    case 'content idea':
      return 'ai-recommendation';
    case 'approval item':
      return 'decision';
    case 'timeline event':
      return 'operational-milestone';
    default:
      return 'artifact';
  }
}

export function buildOperatingTimelineEventsFromAiCoreResponse(
  response: BrandOpsAIResponse
): BrandOpsOperatingTimelineEvent[] {
  const artifactEvents = response.artifacts.map((artifact): BrandOpsOperatingTimelineEvent => ({
    id: uid('op-timeline'),
    at: artifact.createdAt,
    category: categoryForArtifact(artifact),
    title: artifact.title,
    detail: `${artifact.type} captured by BrandOps AI Core from "${artifact.sourcePrompt}".`,
    source: 'BrandOps AI Core',
    tone: timelineToneForArtifact(artifact),
    entityType: 'ai-core-artifact',
    entityId: artifact.id,
    replayCommand: `ask: Replay this BrandOps AI Core artifact as an operating timeline memory. Explain strategic meaning, source facts, confidence, approvals, next actions, and what changed.\n\nArtifact: ${artifact.title}\nType: ${artifact.type}\nStatus: ${artifact.status}\nContent: ${artifact.content.slice(0, 1200)}`,
    confidence: clampPercent(artifact.confidenceScore)
  }));

  const batch = response.batchRun;
  if (!batch) return artifactEvents;
  return [
    {
      id: uid('op-timeline-batch'),
      at: batch.completedAt || batch.createdAt,
      category: 'batch-run',
      title: 'AI Batch Run completed',
      detail: batch.finalSummary,
      source: 'BrandOps AI Core',
      tone: batch.status === 'completed' ? 'success' : batch.status === 'failed' ? 'danger' : 'warning',
      entityType: 'ai-core-batch-run',
      entityId: batch.id,
      replayCommand: `ask: Replay this BrandOps AI Batch Run. Summarize completed artifacts, failed artifacts, retry path, approvals, and strategic evolution.\n\nIntent: ${batch.intent}\nSummary: ${batch.finalSummary}`,
      confidence: undefined
    },
    ...artifactEvents
  ];
}

export function prependOperatingTimelineEvents(
  state: unknown,
  events: BrandOpsOperatingTimelineEvent[]
): BrandOpsOperatingTimelineState {
  const current = normalizeOperatingTimelineState(state);
  const seen = new Set<string>();
  const next = [...events, ...current.events]
    .filter((event) => {
      const key = `${event.entityType ?? event.category}:${event.entityId ?? event.id}:${event.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_BRANDOPS_OPERATING_TIMELINE_EVENTS);
  return {
    schemaVersion: BRANDOPS_OPERATING_TIMELINE_SCHEMA_VERSION,
    events: next
  };
}

export function normalizeOperatingTimelineState(value: unknown): BrandOpsOperatingTimelineState {
  if (!value || typeof value !== 'object') {
    return { schemaVersion: BRANDOPS_OPERATING_TIMELINE_SCHEMA_VERSION, events: [] };
  }
  const raw = (value as { events?: unknown }).events;
  const events = Array.isArray(raw)
    ? raw.map(normalizeOperatingTimelineEvent).filter((event): event is BrandOpsOperatingTimelineEvent => Boolean(event))
    : [];
  return {
    schemaVersion: BRANDOPS_OPERATING_TIMELINE_SCHEMA_VERSION,
    events: events
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, MAX_BRANDOPS_OPERATING_TIMELINE_EVENTS)
  };
}

function normalizeOperatingTimelineEvent(value: unknown): BrandOpsOperatingTimelineEvent | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<BrandOpsOperatingTimelineEvent>;
  if (!item.id || !item.at || !item.title || !item.detail) return null;
  const at = new Date(item.at).getTime();
  if (!Number.isFinite(at)) return null;
  return {
    id: clean(item.id, 120),
    at: new Date(at).toISOString(),
    category: item.category || 'operational-milestone',
    title: clean(item.title, 180),
    detail: clean(item.detail, 1200),
    source: clean(item.source || 'BrandOps', 160),
    tone: item.tone || 'muted',
    ...(item.entityType ? { entityType: clean(item.entityType, 120) } : {}),
    ...(item.entityId ? { entityId: clean(item.entityId, 160) } : {}),
    ...(item.replayCommand ? { replayCommand: clean(item.replayCommand, 1800) } : {}),
    ...(clampPercent(item.confidence) !== undefined ? { confidence: clampPercent(item.confidence) } : {})
  };
}
