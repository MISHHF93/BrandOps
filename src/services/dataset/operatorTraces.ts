import type { BrandOpsData, OperatorTraceActor, OperatorTraceEntry } from '../../types/domain';

/** Export file / contract version for downstream annotation jobs. Bump when trace shape changes. */
export const OPERATOR_TRACE_EXPORT_SCHEMA_VERSION = '1.0.0';

export const MAX_OPERATOR_TRACE_ENTRIES = 1000;

const MAX_DETAIL_KEYS = 12;
const MAX_DETAIL_STRING_LEN = 200;
const MAX_VERB_LEN = 80;
const MAX_ROUTE_LEN = 120;
const MAX_ENTITY_ID_LEN = 120;
const MAX_NOTE_LEN = 500;

export type OperatorTraceInput = Omit<OperatorTraceEntry, 'id' | 'at'> & {
  id?: string;
  at?: string;
};

/** Matches agent command `source` without importing the agent module (avoids cycles). */
export type WorkspaceCommandSourceKind =
  | 'chatbot-web'
  | 'chatbot-mobile'
  | 'telegram'
  | 'whatsapp';

export function mapWorkspaceCommandSourceToActor(
  source: WorkspaceCommandSourceKind
): OperatorTraceActor {
  if (source === 'telegram' || source === 'whatsapp') return 'bridge';
  return 'assistant';
}

export function sanitizeOperatorTraceDetails(
  details: Record<string, unknown> | undefined
): Record<string, string | number | boolean | null> | undefined {
  if (!details || typeof details !== 'object') return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  let n = 0;
  for (const [k, v] of Object.entries(details)) {
    if (n >= MAX_DETAIL_KEYS) break;
    const key = k.slice(0, 40);
    if (typeof v === 'string') {
      out[key] = v.length > MAX_DETAIL_STRING_LEN ? `${v.slice(0, MAX_DETAIL_STRING_LEN)}…` : v;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[key] = v;
    } else if (typeof v === 'boolean') {
      out[key] = v;
    } else if (v === null) {
      out[key] = null;
    }
    n += 1;
  }
  return Object.keys(out).length ? out : undefined;
}

function clampVerb(verb: string): string {
  const t = verb.trim().slice(0, MAX_VERB_LEN);
  return t || 'unknown';
}

function isOperatorTraceActor(s: string): s is OperatorTraceActor {
  return s === 'user' || s === 'assistant' || s === 'automation' || s === 'bridge';
}

export function buildOperatorTraceEntry(input: OperatorTraceInput): OperatorTraceEntry {
  const id =
    input.id ?? `trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const at = input.at ?? new Date().toISOString();
  const source = isOperatorTraceActor(input.source) ? input.source : 'user';
  const entry: OperatorTraceEntry = {
    id,
    at,
    source,
    verb: clampVerb(input.verb)
  };
  if (typeof input.surface === 'string' && input.surface.trim()) {
    entry.surface = input.surface.trim().slice(0, 40);
  }
  if (typeof input.route === 'string' && input.route.trim()) {
    entry.route = input.route.trim().slice(0, MAX_ROUTE_LEN);
  }
  if (typeof input.capabilityId === 'string' && input.capabilityId.trim()) {
    entry.capabilityId = input.capabilityId.trim().slice(0, 60);
  }
  if (typeof input.sessionId === 'string' && input.sessionId.trim()) {
    entry.sessionId = input.sessionId.trim().slice(0, 80);
  }
  if (typeof input.entityType === 'string' && input.entityType.trim()) {
    entry.entityType = input.entityType.trim().slice(0, 60);
  }
  if (typeof input.entityId === 'string' && input.entityId.trim()) {
    entry.entityId = input.entityId.trim().slice(0, MAX_ENTITY_ID_LEN);
  }
  const details = sanitizeOperatorTraceDetails(input.details as Record<string, unknown> | undefined);
  if (details) entry.details = details;
  if (input.outcome === 'success' || input.outcome === 'failure') {
    entry.outcome = input.outcome;
  }
  if (Array.isArray(input.labels)) {
    entry.labels = input.labels
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim().slice(0, 64))
      .filter(Boolean)
      .slice(0, 12);
  }
  if (input.reviewStatus === 'pending' || input.reviewStatus === 'approved') {
    entry.reviewStatus = input.reviewStatus;
  }
  if (typeof input.annotatorNote === 'string' && input.annotatorNote.trim()) {
    entry.annotatorNote = input.annotatorNote.trim().slice(0, MAX_NOTE_LEN);
  }
  return entry;
}

/** Prepend one trace when collection is enabled. Returns `data` unchanged if disabled. */
export function prependOperatorTrace(data: BrandOpsData, input: OperatorTraceInput): BrandOpsData {
  if (!data.settings.operatorTraceCollectionEnabled) return data;
  const entry = buildOperatorTraceEntry(input);
  const prior = data.operatorTraces?.entries ?? [];
  return {
    ...data,
    operatorTraces: {
      entries: [entry, ...prior].slice(0, MAX_OPERATOR_TRACE_ENTRIES)
    }
  };
}

export type OperatorTracesFileMetadata = {
  type: 'brandops.operator_traces.metadata';
  schemaVersion: string;
  exportedAt: string;
  entryCount: number;
};

export function serializeOperatorTracesJsonl(data: BrandOpsData): string {
  const entries = data.operatorTraces?.entries ?? [];
  const meta: OperatorTracesFileMetadata = {
    type: 'brandops.operator_traces.metadata',
    schemaVersion: OPERATOR_TRACE_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    entryCount: entries.length
  };
  const lines = [JSON.stringify(meta)];
  for (const e of entries) {
    lines.push(JSON.stringify(e));
  }
  return `${lines.join('\n')}\n`;
}
