import type {
  BrandOpsData,
  ContentItemEmbeddingRecord,
  ContentLibraryItem
} from '../../types/domain';
import { fingerprintTextSnippet } from './llmStructuredApply';
import { persistEmbeddingsGatewayTrace } from './aiGatewayTracing';
import { runEmbeddings } from './nlpInferenceGateway';

export const MAX_EMBEDDING_INDEX_ENTRIES = 48;

export function buildContentEmbeddingSourceText(item: ContentLibraryItem): string {
  return `${item.title}\n\n${item.body}`.trim().slice(0, 12_000);
}

export function upsertEmbeddingRecords(
  workspace: BrandOpsData,
  records: ContentItemEmbeddingRecord[]
): BrandOpsData {
  const prior = workspace.embeddingIndex?.entries ?? [];
  const map = new Map<string, ContentItemEmbeddingRecord>();
  for (const e of prior) {
    map.set(e.contentLibraryItemId, e);
  }
  for (const r of records) {
    map.set(r.contentLibraryItemId, r);
  }
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return {
    ...workspace,
    embeddingIndex: { entries: merged.slice(0, MAX_EMBEDDING_INDEX_ENTRIES) }
  };
}

/**
 * Batch-embed the first N content library items whose fingerprints drifted.
 * Requires external-opt-in adapter mode, configured embedding endpoint + API key.
 */
export async function refreshTopContentLibraryEmbeddings(
  loadData: () => Promise<BrandOpsData>,
  persist: (d: BrandOpsData) => Promise<void>,
  options?: { limit?: number }
): Promise<{ ok: boolean; updated: number; message: string }> {
  const workspace = await loadData();
  const settings = workspace.settings;
  if (settings.aiAdapterMode !== 'external-opt-in') {
    return {
      ok: false,
      updated: 0,
      message:
        'Set AI adapter mode to external-opt-in and configure aiBridge URLs plus API key before syncing embeddings.'
    };
  }
  const scanCap = Math.min(Math.max(options?.limit ?? 14, 1), 24);
  const todo: { item: ContentLibraryItem; fp: string; text: string }[] = [];
  for (const item of workspace.contentLibrary.slice(0, scanCap)) {
    const text = buildContentEmbeddingSourceText(item);
    const fp = fingerprintTextSnippet(text);
    const existing = workspace.embeddingIndex?.entries.find(
      (e) => e.contentLibraryItemId === item.id
    );
    if (
      existing &&
      existing.textFingerprint === fp &&
      Array.isArray(existing.vector) &&
      existing.vector.length > 0
    ) {
      continue;
    }
    todo.push({ item, fp, text });
  }
  if (todo.length === 0) {
    return {
      ok: true,
      updated: 0,
      message: 'No stale embeddings in the scanned content library slice.'
    };
  }

  const t0 = performance.now();
  const result = await runEmbeddings(settings, {
    texts: todo.map((row) => row.text),
    model: settings.aiBridge.embeddingModelId
  });
  const durationMs = Math.round(performance.now() - t0);
  await persistEmbeddingsGatewayTrace(loadData, persist, {
    result,
    durationMs,
    modelId: settings.aiBridge.embeddingModelId,
    batchSize: todo.length,
    route: 'contentEmbeddingsPipeline.refresh',
    surface: 'workspace'
  });

  if (!result.ok) {
    return {
      ok: false,
      updated: 0,
      message: result.message
    };
  }

  if (result.embeddings.length !== todo.length) {
    return {
      ok: false,
      updated: 0,
      message: 'Embedding provider returned an unexpected batch size.'
    };
  }

  const iso = new Date().toISOString();
  const records: ContentItemEmbeddingRecord[] = todo.map((row, i) => {
    const vec = result.embeddings[i];
    return {
      id: `emb-${row.item.id}-${iso.slice(0, 10)}-${i}`,
      contentLibraryItemId: row.item.id,
      modelId: settings.aiBridge.embeddingModelId,
      dims: vec.length,
      vector: vec,
      textFingerprint: row.fp,
      updatedAt: iso
    };
  });

  const fresh = await loadData();
  const merged = upsertEmbeddingRecords(fresh, records);
  await persist(merged);

  return {
    ok: true,
    updated: records.length,
    message: `Synced embeddings for ${records.length} content item(s).`
  };
}
