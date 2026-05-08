import type { BrandOpsData } from '../../types/domain';
import type { AIArtifact } from '../../types/aiTraceGraph';

/**
 * Bounded snapshot of workspace entities that may participate in retrieval / grounding stories.
 * IDs only — no titles/bodies from vault (keeps traces compact + avoids secrets).
 */
export function discoverWorkspaceArtifactsForTrace(
  data: BrandOpsData,
  traceId: string,
  opts?: { max?: number }
): AIArtifact[] {
  const max = Math.min(Math.max(opts?.max ?? 28, 4), 48);
  const created_at = new Date().toISOString();
  const out: AIArtifact[] = [];
  const push = (a: AIArtifact) => {
    if (out.length >= max) return;
    out.push(a);
  };

  for (const item of data.contentLibrary.slice(0, 8)) {
    push({
      artifact_id: `${traceId}:cl:${item.id}`,
      trace_id: traceId,
      kind: 'content_library_ref',
      created_at,
      workspace_entity_id: item.id,
      source_type: 'content_library_item'
    });
  }
  for (const n of data.notes.slice(0, 8)) {
    push({
      artifact_id: `${traceId}:note:${n.id}`,
      trace_id: traceId,
      kind: 'workspace_entity_ref',
      created_at,
      workspace_entity_id: n.id,
      source_type: 'activity_note'
    });
  }
  for (const o of data.opportunities.filter((x) => !x.archivedAt).slice(0, 6)) {
    push({
      artifact_id: `${traceId}:opp:${o.id}`,
      trace_id: traceId,
      kind: 'workspace_entity_ref',
      created_at,
      workspace_entity_id: o.id,
      source_type: 'opportunity'
    });
  }
  const hubArts = data.integrationHub?.artifacts ?? [];
  for (const art of hubArts.slice(0, 6)) {
    push({
      artifact_id: `${traceId}:ih:${art.id}`,
      trace_id: traceId,
      kind: 'integration_record_ref',
      created_at,
      workspace_entity_id: art.id,
      source_type: art.artifactType || 'integration_artifact'
    });
  }
  return out;
}
