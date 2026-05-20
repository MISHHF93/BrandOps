import type { BrandOpsData } from '../../types/domain';

/**
 * Canonical résumé artifact for hosted Ask (operator twin). Reads `settings.operatorTwin.resumeArtifact` only —
 * legacy `notificationCenter.resumeNeuralPhaseContext` is merged into twin on persist via {@link normalizeWorkspaceSettings}.
 */
export function getOperatorTwinResumeArtifact(workspace: BrandOpsData): string {
  return workspace.settings.operatorTwin.resumeArtifact.trim();
}
