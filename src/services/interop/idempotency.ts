/**
 * Tool-call idempotency. Lives in memory (module-level LRU) — intentionally
 * NOT persisted in workspace JSON so a flood of duplicate agent calls cannot
 * bloat stored state. Replays: if a session retries a call with the same
 * (capabilityId, idempotencyKey) we return the stored result instead of
 * creating duplicate checkpoints/traces.
 */
import type { AgentCapabilityId, AgentToolResult } from '../../types/agentInterop';

const MAX_ENTRIES = 250;

export interface IdempotencyKey {
  sessionId: string;
  capabilityId: AgentCapabilityId;
  idempotencyKey: string;
}

interface IdempotencyEntry {
  key: string;
  result: AgentToolResult;
  at: string;
}

const cache = new Map<string, IdempotencyEntry>();

export function hashIdempotencyKey(input: IdempotencyKey): string {
  return `${input.sessionId}:${input.capabilityId}:${input.idempotencyKey}`;
}

export function findIdempotentResult(input: IdempotencyKey): AgentToolResult | null {
  const entry = cache.get(hashIdempotencyKey(input));
  if (!entry) return null;
  cache.delete(hashIdempotencyKey(input));
  cache.set(hashIdempotencyKey(input), entry);
  return { ...entry.result, deduplicated: true };
}

export function storeIdempotentResult(input: IdempotencyKey, result: AgentToolResult): void {
  const key = hashIdempotencyKey(input);
  if (cache.has(key)) return;
  cache.set(key, { key, result, at: new Date().toISOString() });
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

/**
 * The same record, in the workspace, so it survives the crash it exists for.
 *
 * The cache above is a process-local `Map`. It is correct while the process
 * lives, and a client retrying *within* a session gets the stored result. But an
 * idempotency key is most needed after a crash — that is the case it is for —
 * and a restart emptied the map. Driving the real gateway proved it: the same
 * key, replayed after a restart, ingested a second event.
 *
 * Persisting the record makes the guarantee survive a restart, because the
 * gateway re-reads the workspace on every call. The cache stays as the fast
 * path; this is the durable one.
 */
export interface DurableIdempotencyEntry {
  hash: string;
  sessionId: string;
  capabilityId: string;
  at: string;
  result: AgentToolResult;
}

/** Bounded like the audit and receipt logs: a workspace is not a journal. */
const MAX_DURABLE_ENTRIES = 200;

export function findDurableIdempotentResult(
  workspace: { agentIdempotency?: { entries?: DurableIdempotencyEntry[] } },
  input: IdempotencyKey
): AgentToolResult | null {
  const hash = hashIdempotencyKey(input);
  return (
    (workspace.agentIdempotency?.entries ?? []).find((entry) => entry.hash === hash)?.result ?? null
  );
}

export function recordDurableIdempotentResult<
  T extends { agentIdempotency?: { entries?: DurableIdempotencyEntry[]; updatedAt?: string } }
>(workspace: T, input: IdempotencyKey, result: AgentToolResult): T {
  const hash = hashIdempotencyKey(input);
  const existing = workspace.agentIdempotency?.entries ?? [];
  // First write wins, matching the in-memory cache: a replay must return what
  // the original call returned, not what a later one would have.
  if (existing.some((entry) => entry.hash === hash)) return workspace;

  const now = new Date().toISOString();
  return {
    ...workspace,
    agentIdempotency: {
      entries: [
        { hash, sessionId: input.sessionId, capabilityId: input.capabilityId, at: now, result },
        ...existing
      ].slice(0, MAX_DURABLE_ENTRIES),
      updatedAt: now
    }
  };
}
