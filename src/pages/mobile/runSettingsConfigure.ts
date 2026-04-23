import { executeAgentWorkspaceCommand, type AgentWorkspaceResult } from '../../services/agent/agentWorkspaceEngine';
import { mapDocumentSurfaceToAgentSource } from '../../shared/navigation/appDocumentSurface';
import type { AppDocumentSurfaceId } from '../../shared/navigation/appDocumentSurface';

export function normalizeConfigureText(line: string): string {
  const full = line.trim();
  if (!full) return '';
  return full.startsWith('configure:') ? full : `configure: ${full}`;
}

/**
 * Run the same `configure:` route as Chat, for Settings forms. Returns `null` when the call is
 * skipped (empty line or `alreadyLoading`); otherwise the engine result (check `ok` and `summary`).
 */
export async function runSettingsConfigure(
  line: string,
  surfaceLabel: AppDocumentSurfaceId | 'chatbot',
  alreadyLoading: boolean
): Promise<AgentWorkspaceResult | null> {
  if (alreadyLoading) return null;
  const text = normalizeConfigureText(line);
  if (!text) return null;
  return executeAgentWorkspaceCommand({
    text,
    actorName: 'mobile-operator',
    source: mapDocumentSurfaceToAgentSource(surfaceLabel)
  });
}
