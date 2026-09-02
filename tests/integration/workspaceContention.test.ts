/**
 * Two writers, one workspace file.
 *
 * This is the product's headline scenario, not an edge case: an agent connected
 * over MCP while the person has the app open, both writing the same workspace.
 * The gateway's file store is the only thing between them.
 *
 * **The safety property was already correct.** Two processes hammering one file
 * produced *zero* lost updates across eighty attempts — the store re-reads the
 * raw bytes before writing and refuses if they changed, which is a
 * compare-and-swap and does the job.
 *
 * **What it did not do was retry.** 43% of those attempts failed outright, with
 * a message telling the caller to try again. Nothing did. The in-app service
 * already retried three times; this layer threw, so contention was absorbed on
 * one side of the product and passed to whoever was unlucky on the other.
 *
 * With a bounded retry the same run lands 79 of 80, still with no lost updates.
 * The one that fails is honest: after three attempts under sustained contention
 * it gives up rather than looping forever.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createWorkspaceFileStore,
  WorkspaceConflictError
} from '../../scripts/lib/workspaceStore.mjs';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function store(initial: Record<string, unknown> = { marks: [] }) {
  const dir = mkdtempSync(join(tmpdir(), 'brandops-contend-'));
  dirs.push(dir);
  const path = join(dir, 'workspace.json');
  writeFileSync(path, JSON.stringify(initial, null, 2));
  return { path, store: createWorkspaceFileStore(path, (data: unknown) => data) };
}

const marksIn = (path: string): string[] =>
  (JSON.parse(readFileSync(path, 'utf8')).marks ?? []) as string[];

describe('a write that races another writer', () => {
  it('retries and succeeds when the file moves under it', async () => {
    const { path, store: workspace } = store();
    let applied = 0;

    await workspace.mutate(async (data: { marks?: string[] }) => {
      applied += 1;
      // Simulate the other writer landing between this read and its write —
      // deterministically, on the first attempt only.
      if (applied === 1) {
        writeFileSync(path, JSON.stringify({ marks: ['other-writer'] }, null, 2));
      }
      return {
        workspace: { ...data, marks: [...(data.marks ?? []), 'mine'] },
        value: null
      };
    });

    // Two attempts, and the second was computed on top of what actually landed
    // — not a blind overwrite of it.
    expect(applied).toBe(2);
    expect(marksIn(path)).toEqual(['other-writer', 'mine']);
  });

  it('gives up after the configured attempts rather than looping', async () => {
    const { path, store: workspace } = store();
    let applied = 0;

    await expect(
      workspace.mutate(
        async (data: { marks?: string[] }) => {
          applied += 1;
          // Contention that never settles.
          writeFileSync(path, JSON.stringify({ marks: [`churn-${applied}`] }, null, 2));
          return { workspace: { ...data, marks: [...(data.marks ?? []), 'mine'] }, value: null };
        },
        { maxAttempts: 3 }
      )
    ).rejects.toThrow(WorkspaceConflictError);

    expect(applied).toBe(3);
    // Nothing of ours was written. A partial write here would be worse than the
    // failure.
    expect(marksIn(path)).toEqual(['churn-3']);
  });

  it('says how many attempts it made', async () => {
    const { path, store: workspace } = store();
    let interference = 0;

    const failure = await workspace
      .mutate(
        async (data: { marks?: string[] }) => {
          /**
           * Distinct bytes each time, deliberately.
           *
           * A first version wrote the same content on every attempt, and the
           * mutation succeeded — correctly. The compare-and-swap is on content,
           * not on modification time, so an interfering write that changes
           * nothing is not a conflict. That is the right behaviour and the test
           * was the thing at fault.
           */
          interference += 1;
          writeFileSync(path, JSON.stringify({ marks: [`moving-${interference}`] }, null, 2));
          return { workspace: { ...data, marks: ['mine'] }, value: null };
        },
        { maxAttempts: 2 }
      )
      .catch((error: Error) => error);

    // A retry budget the message does not mention is one nobody can reason about
    // when they read the failure.
    expect((failure as Error).message).toContain('2 attempts');
  });
});

describe('what must not change', () => {
  it('still writes nothing for a read-only call', async () => {
    const { path, store: workspace } = store({ marks: ['untouched'] });
    const before = readFileSync(path, 'utf8');

    await workspace.mutate(async (data: unknown) => ({ workspace: data, value: 'read' }));

    // Rewriting on a read would bump the file and make every other process see a
    // spurious conflict — the retry would then amplify it rather than absorb it.
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('applies once when nothing is contending', async () => {
    const { path, store: workspace } = store();
    let applied = 0;

    await workspace.mutate(async (data: { marks?: string[] }) => {
      applied += 1;
      return { workspace: { ...data, marks: [...(data.marks ?? []), 'solo'] }, value: null };
    });

    // The retry must not cost an extra apply in the ordinary case.
    expect(applied).toBe(1);
    expect(marksIn(path)).toEqual(['solo']);
  });

  it('loses nothing when many writers interleave', async () => {
    const { path, store: workspace } = store();

    // Same store, concurrent callers: the in-process serializer plus the
    // compare-and-swap. The count must be exact — a lost update here is silent
    // data loss, which is the failure this whole mechanism exists to prevent.
    await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        workspace.mutate(async (data: { marks?: string[] }) => ({
          workspace: { ...data, marks: [...(data.marks ?? []), `mark-${index}`] },
          value: null
        }))
      )
    );

    expect(marksIn(path)).toHaveLength(25);
    expect(new Set(marksIn(path)).size).toBe(25);
  });
});
