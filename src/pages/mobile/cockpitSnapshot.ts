import { localIntelligence } from '../../services/intelligence/localIntelligence';
import type { BrandOpsData } from '../../types/domain';

function buildNextPublishingHint(workspace: BrandOpsData): string | null {
  const queue = workspace.publishingQueue.filter(
    (item) => item.status !== 'posted' && item.status !== 'skipped'
  );
  if (queue.length === 0) return null;
  const sorted = [...queue].sort((a, b) => {
    const ta = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  });
  const first = sorted[0];
  const title = first.title.trim().slice(0, 48) || 'Untitled';
  if (first.scheduledFor) {
    try {
      return `${title} · ${new Date(first.scheduledFor).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })}`;
    } catch {
      return title;
    }
  }
  return `${title} · no schedule`;
}

/**
 * Extra cockpit fields derived in one pass from workspace + localIntelligence.
 */
export function buildCockpitIntelligenceExtras(workspace: BrandOpsData) {
  const contentTopSignals = localIntelligence.contentPriority(workspace.contentLibrary).slice(0, 5);
  const outreachUrgencyTop = localIntelligence
    .outreachUrgency(workspace.outreachDrafts)
    .slice(0, 5);
  const followUpRiskTop = localIntelligence.overdueRisk(workspace).slice(0, 5);
  const integrationArtifactCount = workspace.integrationHub.artifacts.length;
  const sshTargetsCount = workspace.integrationHub.sshTargets.length;
  const nextPublishingHint = buildNextPublishingHint(workspace);

  return {
    contentTopSignals,
    outreachUrgencyTop,
    followUpRiskTop,
    integrationArtifactCount,
    sshTargetsCount,
    nextPublishingHint
  };
}
