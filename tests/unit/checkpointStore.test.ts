import { describe, expect, it } from 'vitest';
import { cloneSeedData } from '../helpers/fixtures';
import {
  MAX_CHECKPOINT_ENTRIES,
  buildCheckpoint,
  findActiveCheckpoints,
  findCheckpointChainRoot,
  findCheckpointsByConversation,
  findPendingApprovalCheckpoints,
  prependCheckpoint
} from '../../src/services/execution/checkpointStore';
import type { Checkpoint } from '../../src/types/executionState';

describe('checkpointStore', () => {
  it('prepends newest-first and respects the cap', () => {
    let data = cloneSeedData();
    for (let i = 0; i < MAX_CHECKPOINT_ENTRIES + 5; i += 1) {
      data = prependCheckpoint(data, {
        conversationId: 'c1',
        type: 'tool.invocation',
        state: 'COMPLETED',
        summary: `entry-${i}`,
        source: 'user'
      });
    }
    expect(data.checkpoints?.entries.length).toBe(MAX_CHECKPOINT_ENTRIES);
    expect(data.checkpoints?.entries[0]?.summary).toBe(`entry-${MAX_CHECKPOINT_ENTRIES + 4}`);
  });

  it('is unconditional — persists even when operatorTraceCollectionEnabled is false (unlike operatorTraces)', () => {
    let data = cloneSeedData();
    data.settings = { ...data.settings, operatorTraceCollectionEnabled: false };
    data = prependCheckpoint(data, {
      conversationId: 'c1',
      type: 'ask.question',
      state: 'UNDERSTANDING',
      summary: 'hello',
      source: 'user'
    });
    expect(data.checkpoints?.entries.length).toBe(1);
  });

  it('filters by conversation id', () => {
    let data = cloneSeedData();
    data = prependCheckpoint(data, {
      conversationId: 'a',
      type: 'ask.question',
      state: 'UNDERSTANDING',
      summary: 'x',
      source: 'user'
    });
    data = prependCheckpoint(data, {
      conversationId: 'b',
      type: 'ask.question',
      state: 'UNDERSTANDING',
      summary: 'y',
      source: 'user'
    });
    expect(findCheckpointsByConversation(data, 'a')).toHaveLength(1);
    expect(findCheckpointsByConversation(data, 'b')).toHaveLength(1);
  });

  it('findActiveCheckpoints / findPendingApprovalCheckpoints filter by state', () => {
    let data = cloneSeedData();
    data = prependCheckpoint(data, {
      conversationId: 'a',
      type: 'ask.question',
      state: 'WORKING',
      summary: 'x',
      source: 'user'
    });
    data = prependCheckpoint(data, {
      conversationId: 'a',
      type: 'plan.approval_requested',
      state: 'NEEDS_APPROVAL',
      summary: 'y',
      source: 'assistant'
    });
    data = prependCheckpoint(data, {
      conversationId: 'a',
      type: 'ask.response',
      state: 'COMPLETED',
      summary: 'z',
      source: 'assistant'
    });
    expect(findActiveCheckpoints(data)).toHaveLength(1);
    expect(findPendingApprovalCheckpoints(data)).toHaveLength(1);
  });

  it('buildCheckpoint clamps summary length and generates an id', () => {
    const checkpoint = buildCheckpoint({
      conversationId: 'a',
      type: 'ask.question',
      state: 'UNDERSTANDING',
      summary: 'x'.repeat(500),
      source: 'user'
    });
    expect(checkpoint.id).toBeTruthy();
    expect(checkpoint.summary.length).toBeLessThanOrEqual(240);
  });

  it('findCheckpointChainRoot walks a normal chain to the root', () => {
    let data = cloneSeedData();
    const root = buildCheckpoint({
      conversationId: 'a',
      type: 'ask.question',
      state: 'UNDERSTANDING',
      summary: 'original question',
      source: 'user'
    });
    const child = buildCheckpoint({
      conversationId: 'a',
      parentCheckpointId: root.id,
      type: 'ask.response',
      state: 'FAILED',
      summary: 'failed',
      source: 'assistant'
    });
    data = { ...data, checkpoints: { entries: [child, root] } };
    expect(findCheckpointChainRoot(data, child.id)?.id).toBe(root.id);
  });

  it('findCheckpointChainRoot does not hang on a corrupted cyclic parent chain (e.g. a hand-edited import)', () => {
    let data = cloneSeedData();
    // Two checkpoints whose parentCheckpointId points at each other — cannot happen through
    // normal creation (a parent always predates its child), but a crafted import JSON could.
    const a: Checkpoint = {
      id: 'chk-a',
      conversationId: 'a',
      parentCheckpointId: 'chk-b',
      type: 'ask.response',
      state: 'FAILED',
      at: new Date().toISOString(),
      summary: 'a',
      source: 'assistant'
    };
    const b: Checkpoint = {
      id: 'chk-b',
      conversationId: 'a',
      parentCheckpointId: 'chk-a',
      type: 'tool.invocation',
      state: 'COMPLETED',
      at: new Date().toISOString(),
      summary: 'b',
      source: 'automation'
    };
    data = { ...data, checkpoints: { entries: [a, b] } };
    const result = findCheckpointChainRoot(data, 'chk-a');
    expect(result).not.toBeNull();
    expect(['chk-a', 'chk-b']).toContain(result?.id);
  });
});
