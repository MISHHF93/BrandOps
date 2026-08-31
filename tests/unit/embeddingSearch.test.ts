import { describe, it, expect } from 'vitest';
import { cosineSimilarity, queryEmbeddingIndex, searchContentByRelevance } from '../../src/services/ai/embeddingSearch';
import type { BrandOpsData } from '../../src/types/domain';

function makeWorkspace(embeddingEntries: BrandOpsData['embeddingIndex']['entries'] = [], contentLibrary: BrandOpsData['contentLibrary'] = []): BrandOpsData {
  return {
    modules: [],
    brand: { operatorName: 'Test', primaryOffer: '', focusMetric: '' },
    brandVault: { positioning: '', bios: [], services: [], proofPoints: [], voiceNotes: [] },
    contentLibrary,
    publishingQueue: [],
    contacts: [],
    companies: [],
    opportunities: [],
    outreachDrafts: [],
    outreachTemplates: [],
    outreachHistory: [],
    followUps: [],
    activityNotes: [],
    settings: {} as BrandOpsData['settings'],
    embeddingIndex: { entries: embeddingEntries }
  } as BrandOpsData;
}

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });

  it('computes correct similarity for similar vectors', () => {
    const score = cosineSimilarity([1, 1, 0], [1, 0.9, 0]);
    expect(score).toBeGreaterThan(0.9);
  });
});

describe('queryEmbeddingIndex', () => {
  it('returns empty for no embeddings', () => {
    const ws = makeWorkspace([]);
    expect(queryEmbeddingIndex(ws, [1, 0, 0])).toEqual([]);
  });

  it('returns empty for empty query vector', () => {
    const ws = makeWorkspace([
      { id: 'emb-1', contentLibraryItemId: 'item-1', modelId: 'test', dims: 3, vector: [1, 0, 0], textFingerprint: 'fp1', updatedAt: '2026-01-01T00:00:00Z' }
    ]);
    expect(queryEmbeddingIndex(ws, [])).toEqual([]);
  });

  it('returns matching embeddings sorted by score', () => {
    const ws = makeWorkspace([
      { id: 'emb-1', contentLibraryItemId: 'item-1', modelId: 'test', dims: 3, vector: [1, 0, 0], textFingerprint: 'fp1', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'emb-2', contentLibraryItemId: 'item-2', modelId: 'test', dims: 3, vector: [0, 1, 0], textFingerprint: 'fp2', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'emb-3', contentLibraryItemId: 'item-3', modelId: 'test', dims: 3, vector: [0.9, 0.1, 0], textFingerprint: 'fp3', updatedAt: '2026-01-01T00:00:00Z' }
    ]);
    const results = queryEmbeddingIndex(ws, [1, 0, 0], 3);
    expect(results.length).toBe(2);
    expect(results[0].record.id).toBe('emb-1');
    expect(results[0].score).toBe(1);
    expect(results[1].record.id).toBe('emb-3');
  });

  it('respects topK limit', () => {
    const ws = makeWorkspace([
      { id: 'emb-1', contentLibraryItemId: 'item-1', modelId: 'test', dims: 3, vector: [1, 0, 0], textFingerprint: 'fp1', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'emb-2', contentLibraryItemId: 'item-2', modelId: 'test', dims: 3, vector: [0.9, 0.1, 0], textFingerprint: 'fp2', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'emb-3', contentLibraryItemId: 'item-3', modelId: 'test', dims: 3, vector: [0.8, 0.2, 0], textFingerprint: 'fp3', updatedAt: '2026-01-01T00:00:00Z' }
    ]);
    const results = queryEmbeddingIndex(ws, [1, 0, 0], 1);
    expect(results.length).toBe(1);
  });
});

describe('searchContentByRelevance', () => {
  it('returns empty for empty query', () => {
    const ws = makeWorkspace([], [
      { id: 'item-1', type: 'post-draft', status: 'draft', title: 'AI Engineering', body: 'Building AI systems', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ]);
    expect(searchContentByRelevance(ws, '')).toEqual([]);
  });

  it('returns matching content by token overlap', () => {
    const ws = makeWorkspace([], [
      { id: 'item-1', type: 'post-draft', status: 'draft', title: 'AI Engineering', body: 'Building AI systems', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'item-2', type: 'post-draft', status: 'draft', title: 'Cooking Recipes', body: 'Italian pasta dishes', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ]);
    const results = searchContentByRelevance(ws, 'AI engineering');
    expect(results.length).toBe(1);
    expect(results[0].itemId).toBe('item-1');
  });

  it('excludes archived content', () => {
    const ws = makeWorkspace([], [
      { id: 'item-1', type: 'post-draft', status: 'archived', title: 'AI Engineering', body: 'Building AI systems', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    ]);
    expect(searchContentByRelevance(ws, 'AI engineering')).toEqual([]);
  });

  it('respects topK limit', () => {
    const ws = makeWorkspace([], Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i}`, type: 'post-draft' as const, status: 'draft' as const,
      title: `AI Engineering Topic ${i}`, body: `Building AI systems number ${i}`,
      tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01'
    })));
    const results = searchContentByRelevance(ws, 'AI engineering', 3);
    expect(results.length).toBe(3);
  });
});
