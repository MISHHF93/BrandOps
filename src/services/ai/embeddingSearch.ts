/**
 * Cosine similarity search over the content library embedding index.
 * Reads the write-only `embeddingIndex` and provides a retrieval path
 * for context retrieval and MCP `brandops_get_relevant_context`.
 */
import type { BrandOpsData, ContentItemEmbeddingRecord } from '../../types/domain';

const MAX_QUERY_RESULTS = 10;

/**
 * Cosine similarity between two vectors of equal length.
 * Returns a value in [-1, 1] where 1 means identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export interface EmbeddingSearchResult {
  record: ContentItemEmbeddingRecord;
  score: number;
}

/**
 * Query the embedding index with a pre-computed query vector.
 * Returns the top-K most similar content library items, sorted by score descending.
 */
export function queryEmbeddingIndex(
  workspace: BrandOpsData,
  queryVector: number[],
  topK: number = MAX_QUERY_RESULTS
): EmbeddingSearchResult[] {
  const entries = workspace.embeddingIndex?.entries ?? [];
  if (entries.length === 0 || queryVector.length === 0) return [];

  const results: EmbeddingSearchResult[] = [];
  for (const record of entries) {
    if (record.vector.length === 0) continue;
    if (record.vector.length !== queryVector.length) continue;
    const score = cosineSimilarity(queryVector, record.vector);
    if (score > 0) {
      results.push({ record, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Find embedding-matched content library items for a text query.
 * Uses token overlap as a lightweight proxy for semantic similarity
 * when no embedding model is available (deterministic fallback).
 *
 * When an embedding model IS available, callers should embed the query
 * via `runEmbeddings()` and pass the vector to `queryEmbeddingIndex()`.
 */
export function searchContentByRelevance(
  workspace: BrandOpsData,
  query: string,
  topK: number = MAX_QUERY_RESULTS
): Array<{ itemId: string; title: string; body: string; score: number }> {
  if (!query.trim()) return [];

  const queryTokens = tokenizeSimple(query);
  if (queryTokens.size === 0) return [];

  const results: Array<{ itemId: string; title: string; body: string; score: number }> = [];

  for (const item of workspace.contentLibrary) {
    if (item.status === 'archived') continue;
    const text = `${item.title} ${item.body}`;
    const itemTokens = tokenizeSimple(text);
    if (itemTokens.size === 0) continue;

    let overlap = 0;
    for (const token of queryTokens) {
      if (itemTokens.has(token)) overlap += 1;
    }
    const score = overlap / Math.min(queryTokens.size, itemTokens.size);
    if (score > 0) {
      results.push({ itemId: item.id, title: item.title, body: item.body, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

function tokenizeSimple(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}
