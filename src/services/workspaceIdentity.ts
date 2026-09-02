/**
 * The workspace's identity, resolved in one place.
 *
 * `builderActivity.workspaceId` is what the policy engine binds an agent session
 * to, which makes it an authorization input — but nothing owned it. Any service
 * that happened to materialize `builderActivity` first also got to name the
 * workspace, and they did not agree: `digitalTwin.ts` used `'local-workspace'`
 * while `outcomeLearning.ts` used `'default'`.
 *
 * The consequence was not cosmetic. On a workspace that had no `builderActivity`
 * yet — a fresh install — the first reported outcome minted the id `'default'`,
 * and from that moment every agent session issued against `'local-workspace'`
 * was refused with `workspace_mismatch`. Reporting an outcome could lock every
 * connected agent out of the workspace it was already working in.
 *
 * So identity is derived, never invented: whatever the workspace already calls
 * itself wins, and the fallback is one constant rather than each caller's guess.
 */
import type { BrandOpsData } from '../types/domain';

/** The id a local-first workspace carries when it has not been told otherwise. */
export const CANONICAL_WORKSPACE_ID = 'local-workspace';

/**
 * Resolution order, most authoritative first. A workspace that has already named
 * itself is never renamed by a later write — that is the whole point.
 */
export function resolveWorkspaceId(workspace: BrandOpsData): string {
  const fromActivity = workspace.builderActivity?.workspaceId;
  if (typeof fromActivity === 'string' && fromActivity.trim()) return fromActivity.trim();

  const twins = workspace.digitalTwins?.twins ?? [];
  const activeId = workspace.digitalTwins?.activeTwinId;
  const twin = twins.find((entry) => entry.id === activeId) ?? twins[0];
  const fromTwin = twin?.workspaceId;
  if (typeof fromTwin === 'string' && fromTwin.trim()) return fromTwin.trim();

  return CANONICAL_WORKSPACE_ID;
}
