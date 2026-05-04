import type { AppSettings, BrandOpsData, CopilotWorker } from '../../types/domain';

export function resolveActiveCopilotWorker(settings: AppSettings): CopilotWorker | null {
  const reg = settings.copilotWorkers;
  if (!reg.workers.length) return null;
  const byId = reg.activeWorkerId
    ? reg.workers.find((w) => w.id === reg.activeWorkerId)
    : undefined;
  return byId ?? reg.workers[0] ?? null;
}

/** Phase E: shallow grounding lines derived from workspace + worker hints (no network). */
export function buildCopilotContextHintBlock(
  workspace: BrandOpsData,
  worker: CopilotWorker | null
): string {
  const hints = worker?.contextHints;
  if (!hints) return '';

  const lines: string[] = [];

  if (hints.includeBrandVault) {
    const bv = workspace.brandVault;
    const ps = bv.positioningStatement?.trim() ?? '';
    lines.push(
      `Brand vault — positioning (truncated): ${ps.slice(0, 320)}${ps.length > 320 ? '…' : ''}`
    );
    lines.push(
      `Brand vault — counts: headlines ${bv.headlineOptions.length}, proof ${bv.proofPoints.length}, snippets ${bv.reusableSnippets.length}`
    );
  }

  if (hints.contentTags?.length) {
    const tagSet = new Set(hints.contentTags.map((t) => t.toLowerCase()));
    const matched = workspace.contentLibrary.filter((item) =>
      item.tags.some((t) => tagSet.has(t.toLowerCase()))
    );
    lines.push(
      `Content tagged [${hints.contentTags.join(', ')}]: ${matched.length} item(s)`
    );
    const top = matched[0];
    if (top) lines.push(`Example item title: ${top.title.slice(0, 120)}`);
  }

  if (hints.integrationArtifactKinds?.length) {
    const kindSet = new Set(hints.integrationArtifactKinds.map((k) => k.toLowerCase()));
    const n = workspace.integrationHub.artifacts.filter((a) =>
      kindSet.has(a.artifactType.toLowerCase())
    ).length;
    lines.push(`Artifacts typed [${hints.integrationArtifactKinds.join(', ')}]: ${n}`);
  }

  if (!lines.length) return '';
  return `\n\nFocused context (copilot scope):\n${lines.join('\n')}`;
}
