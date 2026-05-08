import { describe, expect, it } from 'vitest';
import {
  MAX_AI_TRACE_BUNDLES,
  prependAITraceBundle,
  sanitizeTraceBundle
} from '../../src/services/ai/aiTracePersistence';
import type { TraceBundle } from '../../src/types/aiTraceGraph';
import { AI_TRACE_GRAPH_SCHEMA_VERSION } from '../../src/types/aiTraceGraph';
import { cloneSeedData } from '../helpers/fixtures';

const minimalBundle = (id: string): TraceBundle => ({
  trace_id: id,
  schema_version: AI_TRACE_GRAPH_SCHEMA_VERSION,
  created_at: new Date().toISOString(),
  surface: 'assistant_chat',
  artifacts: [],
  links: [],
  invocations: [],
  retrieval_chunks: []
});

describe('aiTracePersistence', () => {
  it('sanitizeTraceBundle drops malformed artifact kinds', () => {
    const dirty = {
      ...minimalBundle('t1'),
      artifacts: [
        {
          artifact_id: 'x',
          trace_id: 't1',
          kind: 'bogus',
          created_at: '2026-01-01T00:00:00.000Z'
        }
      ]
    };
    const s = sanitizeTraceBundle(dirty as TraceBundle);
    expect(s.artifacts).toHaveLength(0);
  });

  it('prepend respects operatorTraceCollectionEnabled', () => {
    const base = cloneSeedData();
    base.settings.operatorTraceCollectionEnabled = false;
    const next = prependAITraceBundle(base, minimalBundle('t'));
    expect(next.aiTraceGraph).toBeUndefined();
  });

  it('prepends and caps bundle count', () => {
    const base = cloneSeedData();
    base.settings.operatorTraceCollectionEnabled = true;
    base.aiTraceGraph = { schema_version: AI_TRACE_GRAPH_SCHEMA_VERSION, bundles: [] };
    let cur = base;
    for (let i = 0; i < MAX_AI_TRACE_BUNDLES + 5; i++) {
      cur = prependAITraceBundle(cur, minimalBundle(`z-${i}`));
    }
    expect(cur.aiTraceGraph?.bundles.length).toBe(MAX_AI_TRACE_BUNDLES);
  });
});
