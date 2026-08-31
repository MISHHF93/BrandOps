/**
 * Interop audit trail. Every inbound tool call is recorded in the workspace's
 * `externalAgentAudit` so the user can review what agents did, when, with which
 * capability, and whether it succeeded. Request previews are bounded — never
 * full prompts.
 */
import type {
  AgentCapabilityId,
  ExternalAgentAuditEntry,
  ExternalAgentClientKind
} from '../../types/agentInterop';
import type { BrandOpsData } from '../../types/domain';

export const MAX_AUDIT_ENTRIES = 500;

export type { AgentCapabilityId, ExternalAgentAuditEntry, ExternalAgentClientKind } from '../../types/agentInterop';

export interface AppendAuditEntryInput {
  sessionId: string;
  clientKind: ExternalAgentClientKind;
  capabilityId: AgentCapabilityId;
  operation: string;
  ok: boolean;
  errorCode?: string;
  summary: string;
  requestPreview: string;
  latencyMs?: number;
}

export function appendAuditEntry(
  workspace: BrandOpsData,
  input: AppendAuditEntryInput
): BrandOpsData {
  const now = new Date().toISOString();
  const entry: ExternalAgentAuditEntry = {
    id: `agent-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    sessionId: input.sessionId,
    clientKind: input.clientKind,
    capabilityId: input.capabilityId,
    operation: input.operation.slice(0, 120),
    ok: input.ok,
    ...(input.errorCode && { errorCode: input.errorCode.slice(0, 64) }),
    summary: input.summary.slice(0, 400),
    requestPreview: input.requestPreview.replace(/\s+/g, ' ').trim().slice(0, 240),
    ...(input.latencyMs !== undefined && { latencyMs: Math.round(input.latencyMs) })
  };
  return {
    ...workspace,
    externalAgentAudit: {
      entries: [entry, ...(workspace.externalAgentAudit?.entries ?? [])].slice(
        0,
        MAX_AUDIT_ENTRIES
      ),
      updatedAt: now
    }
  };
}
