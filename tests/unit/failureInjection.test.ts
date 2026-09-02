/**
 * Failure injection — what happens when the ground moves.
 *
 * The suites elsewhere ask whether BrandOps does the right thing when its inputs
 * are hostile. These ask what it does when its own storage is corrupt, its
 * records have been deleted underneath it, or a write cannot land. Reliability is
 * not the absence of those events; it is behaving comprehensibly during them.
 *
 * Two defects came out of the first pass, and both were the same shape: a
 * failure reported as something other than a failure.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createWorkspaceFileStore,
  WorkspaceUnreadableError
} from '../../scripts/lib/workspaceStore.mjs';
import { withDefaults } from '../../src/services/storage/storage';
import { resolveTask } from '../../src/services/interop/mcp/tasks';
import { populatedWorkspace, POPULATED_IDS } from '../helpers/populatedWorkspace';
import type { BrandOpsData } from '../../src/types/domain';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function storeWith(contents: string) {
  const dir = mkdtempSync(join(tmpdir(), 'brandops-fail-'));
  dirs.push(dir);
  const path = join(dir, 'workspace.json');
  writeFileSync(path, contents);
  return { path, store: createWorkspaceFileStore(path, withDefaults) };
}

/** An approved execution task pointing at a plan id. */
function workspaceWithTask(planId: string | null): BrandOpsData {
  const base = populatedWorkspace();
  const now = new Date().toISOString();
  return {
    ...base,
    planWorkspace: {
      ...base.planWorkspace!,
      plans: planId ? base.planWorkspace!.plans : []
    },
    agentProposals: {
      entries: [
        {
          id: 'proposal-1',
          kind: 'external_action',
          title: 'Execute plan',
          detail: 'd',
          rationale: 'r',
          status: 'approved',
          tier: 'EXTERNAL_ACTION',
          createdAt: now,
          updatedAt: now,
          sessionId: 'session-1',
          taskId: 'br_task_probe',
          planId: POPULATED_IDS.plan,
          externalAction: { action: 'execute-plan', target: POPULATED_IDS.plan, summary: 's' }
        }
      ],
      updatedAt: now
    }
  } as unknown as BrandOpsData;
}

describe('failure injection — storage', () => {
  it('explains a corrupt workspace instead of leaking a parser error', () => {
    const { store } = storeWith('{ this is not json');
    // The store re-reads on every call, so a file corrupted at any moment turns
    // *every* later request into this. It has to say what is wrong.
    expect(() => store.read()).toThrow(WorkspaceUnreadableError);
    try {
      store.read();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('could not be read as JSON');
      expect(message).toContain('Nothing was served from it');
      expect((error as { code: string }).code).toBe('workspace_unreadable');
    }
  });

  it('explains a workspace file that vanished', () => {
    const { path, store } = storeWith('{}');
    rmSync(path);
    expect(() => store.read()).toThrow(WorkspaceUnreadableError);
  });

  it('a corrupt file fails the mutation rather than overwriting it', async () => {
    const { path, store } = storeWith(JSON.stringify(populatedWorkspace()));
    writeFileSync(path, 'not json at all');
    await expect(
      store.mutate(async (current) => ({ workspace: { ...current, touched: true }, value: null }))
    ).rejects.toThrow(WorkspaceUnreadableError);
    // The unreadable bytes are still there, untouched. Overwriting them would
    // destroy whatever a person might still recover by hand.
    expect(readFileSync(path, 'utf8')).toBe('not json at all');
  });

  it('recovers as soon as the file is valid again', () => {
    const { path, store } = storeWith('broken');
    expect(() => store.read()).toThrow();
    writeFileSync(path, JSON.stringify(populatedWorkspace()));
    // No cached failure state: the next call simply works.
    expect(store.read().planWorkspace?.plans.length).toBeGreaterThan(0);
  });
});

describe('failure injection — durable tasks', () => {
  it('reports failed, not working, when the plan has been deleted', () => {
    const lookup = resolveTask(workspaceWithTask(null), 'br_task_probe', 'session-1');
    expect(lookup.ok).toBe(true);
    // It used to report `working` forever: with no checkpoints the fallback was
    // `working` regardless of whether anything could still happen. An agent
    // polling tasks/get waited on a job that could never start.
    expect(lookup.task?.status).toBe('failed');
    expect(lookup.task?.error?.code).toBe('plan_missing');
    expect(lookup.task?.statusMessage).toContain('no longer exists');
  });

  it('still tracks a task whose plan is present', () => {
    const lookup = resolveTask(workspaceWithTask(POPULATED_IDS.plan), 'br_task_probe', 'session-1');
    expect(lookup.ok).toBe(true);
    expect(lookup.task?.status).not.toBe('failed');
  });

  it('refuses a task belonging to another session even when state is broken', () => {
    const lookup = resolveTask(workspaceWithTask(null), 'br_task_probe', 'someone-else');
    // Ownership is checked before state is interpreted; a broken workspace must
    // not become a way to read another session's task.
    expect(lookup.ok).toBe(false);
    expect(lookup.errorCode).toBe('task_not_owned');
  });
});

describe('failure injection — normalization', () => {
  it('survives structurally wrong collections instead of throwing', () => {
    const base = populatedWorkspace();
    const mangled = {
      ...base,
      checkpoints: { entries: null },
      contacts: 'not an array',
      planWorkspace: { plans: null, receipts: undefined },
      agentProposals: { entries: 42 }
    } as unknown as BrandOpsData;

    // A workspace from an older schema, a partial write, or a hand-edited export
    // must load. Refusing to open is a worse failure than dropping a bad record.
    const normalized = withDefaults(mangled);
    expect(Array.isArray(normalized.checkpoints?.entries)).toBe(true);
    expect(Array.isArray(normalized.contacts)).toBe(true);
    expect(Array.isArray(normalized.planWorkspace?.plans)).toBe(true);
    expect(Array.isArray(normalized.agentProposals?.entries)).toBe(true);
  });

  it('does not invent content while repairing structure', () => {
    const normalized = withDefaults({
      ...populatedWorkspace(),
      contacts: 'not an array'
    } as unknown as BrandOpsData);
    // Repairing the shape must not fabricate records to fill it.
    expect(normalized.contacts).toEqual([]);
  });
});
