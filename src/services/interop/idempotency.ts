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
