import { describe, expect, it } from 'vitest';
import { seedData } from '../../src/modules/brandMemory/seed';
import {
  MAX_EMBEDDING_INDEX_ENTRIES,
  buildContentEmbeddingSourceText,
  upsertEmbeddingRecords
} from '../../src/services/ai/contentEmbeddingsPipeline';

describe('contentEmbeddingsPipeline', () => {
  it('buildContentEmbeddingSourceText merges title and body', () => {
    expect(
      buildContentEmbeddingSourceText({
        id: '1',
        type: 'post-draft',
        title: 'T',
        body: 'B',
        tags: [],
        audience: '',
        goal: '',
        status: 'idea',
        publishChannel: 'linkedin',
        notes: '',
        createdAt: '',
        updatedAt: ''
      })
    ).toBe('T\n\nB');
  });

  it('upsertEmbeddingRecords replaces by contentLibraryItemId and caps length', () => {
    const base = {
      ...seedData,
      embeddingIndex: {
        entries: Array.from({ length: MAX_EMBEDDING_INDEX_ENTRIES + 5 }, (_, i) => ({
          id: `e-${i}`,
          contentLibraryItemId: `c-${i}`,
          modelId: 'm',
          dims: 1,
          vector: [i],
          textFingerprint: `fp-${i}`,
          updatedAt: new Date(2020, 0, i + 1).toISOString()
        }))
      }
    };
    const merged = upsertEmbeddingRecords(base, [
      {
        id: 'new',
        contentLibraryItemId: 'c-2',
        modelId: 'm2',
        dims: 2,
        vector: [0.5, 0.5],
        textFingerprint: 'fp-new',
        updatedAt: new Date(2030, 0, 1).toISOString()
      }
    ]);
    const hit = merged.embeddingIndex?.entries.find((e) => e.contentLibraryItemId === 'c-2');
    expect(hit?.modelId).toBe('m2');
    expect(merged.embeddingIndex?.entries.length).toBeLessThanOrEqual(MAX_EMBEDDING_INDEX_ENTRIES);
  });
});
