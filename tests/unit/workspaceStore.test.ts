/**
 * The gateway's workspace store.
 *
 * Both gateway hosts used to read the workspace JSON once at startup, mutate
 * that in-memory copy, and write the whole file back. Two defects fell out, and
 * each test below is one of them:
 *
 *   - the gateway never saw a write made after it started;
 *   - the gateway's own write destroyed anyone else's, silently.
 *
 * The certification run did not catch either, because it used two gateway
 * processes *sequentially*. Overlap them and the second clobbers the first.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createInMemoryWorkspaceStore,
  createWorkspaceFileStore,
  WorkspaceConflictError
} from '../../scripts/lib/workspaceStore.mjs';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A file store over a throwaway workspace file. `withDefaults` is stubbed as identity. */
function fileStore(initial: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), 'brandops-store-'));
  dirs.push(dir);
  const path = join(dir, 'workspace.json');
  writeFileSync(path, JSON.stringify(initial, null, 2));
  const store = createWorkspaceFileStore(path, (raw: unknown) => raw);
  return { store, path };
}

describe('gateway workspace store', () => {
  it('sees a write made after the store was created', () => {
    const { store, path } = fileStore({ goals: ['first'] });
    expect(store.read().goals).toEqual(['first']);

    // The app saves. Under the old snapshot model this was invisible forever.
    writeFileSync(path, JSON.stringify({ goals: ['second'] }, null, 2));
    expect(store.read().goals).toEqual(['second']);
  });

  it('persists a mutation', async () => {
    const { store, path } = fileStore({ goals: ['first'] });
    const value = await store.mutate(async (current) => ({
      workspace: { ...current, goals: ['first', 'second'] },
      value: 'ok'
    }));
    expect(value).toBe('ok');
    expect(JSON.parse(readFileSync(path, 'utf8')).goals).toEqual(['first', 'second']);
  });

  /**
   * Rewritten when the store gained a bounded retry, and the change of contract
   * is worth stating plainly.
   *
   * This used to assert that a mid-call external write *always* rejects. That
   * was safe and it was also why 43% of writes failed when two processes shared
   * a workspace — the product's normal case, an agent connected while the app is
   * open. The store now re-runs the caller's `apply` against the file as it
   * actually is, up to three times.
   *
   * That is not the store guessing a merge, which it still refuses to do. It is
   * the caller recomputing on the real base. A caller that builds on `current`
   * keeps the other writer's work; a caller that ignores `current` and replaces
   * wholesale replaces it — which is what that caller asked for, on either
   * contract.
   */
  it('retries against the file as it actually is', async () => {
    const { store, path } = fileStore({ goals: ['first'] });
    const seen: string[][] = [];

    const value = await store.mutate(async (current) => {
      seen.push([...((current as { goals?: string[] }).goals ?? [])]);
      // Someone else — the app, another gateway — saves mid-call, once.
      if (seen.length === 1) {
        writeFileSync(path, JSON.stringify({ goals: ['written by someone else'] }, null, 2));
      }
      return {
        workspace: {
          ...current,
          goals: [...((current as { goals?: string[] }).goals ?? []), 'mine']
        },
        value: 'ok'
      };
    });

    expect(value).toBe('ok');
    // The second attempt saw the other writer's state, not the stale one.
    expect(seen).toEqual([['first'], ['written by someone else']]);
    // And because this caller builds on `current`, both survive.
    expect(JSON.parse(readFileSync(path, 'utf8')).goals).toEqual([
      'written by someone else',
      'mine'
    ]);
  });

  it('still refuses when contention never settles', async () => {
    const { store, path } = fileStore({ goals: ['first'] });
    let churn = 0;

    await expect(
      store.mutate(async (current) => {
        churn += 1;
        writeFileSync(path, JSON.stringify({ goals: [`churn-${churn}`] }, null, 2));
        return { workspace: { ...current, goals: ['mine'] }, value: 'ok' };
      })
    ).rejects.toBeInstanceOf(WorkspaceConflictError);

    // Nothing of ours landed. Failing is still the answer when the file will not
    // hold still — the retry is bounded, not a loop.
    expect(JSON.parse(readFileSync(path, 'utf8')).goals).toEqual(['churn-3']);
  });

  it('names itself so a caller can tell a conflict from a failure', async () => {
    const { store, path } = fileStore({ goals: [] });
    await store
      .mutate(async (current) => {
        writeFileSync(path, JSON.stringify({ goals: ['x'] }, null, 2));
        return { workspace: { ...current, goals: ['y'] }, value: null };
      })
      .catch((error: WorkspaceConflictError) => {
        expect(error.code).toBe('workspace_conflict');
        expect(error.message).toContain('retry');
      });
  });

  it('a read-only call writes nothing at all', async () => {
    const { store, path } = fileStore({ goals: ['first'] });
    const before = readFileSync(path, 'utf8');
    // Handing back the same object means "nothing changed". Rewriting the file
    // anyway would bump its mtime and make every other reader see a conflict.
    const value = await store.mutate(async (current) => ({ workspace: current, value: 42 }));
    expect(value).toBe(42);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('a read-only call does not conflict even when the file changed', async () => {
    const { store, path } = fileStore({ goals: ['first'] });
    const value = await store.mutate(async (current) => {
      writeFileSync(path, JSON.stringify({ goals: ['changed'] }, null, 2));
      return { workspace: current, value: 'read' };
    });
    // Nothing was written, so there was nothing to conflict with.
    expect(value).toBe('read');
    expect(JSON.parse(readFileSync(path, 'utf8')).goals).toEqual(['changed']);
  });

  it('normalizes on every read, not only at startup', () => {
    const dir = mkdtempSync(join(tmpdir(), 'brandops-store-'));
    dirs.push(dir);
    const path = join(dir, 'workspace.json');
    writeFileSync(path, JSON.stringify({ goals: [] }));
    const store = createWorkspaceFileStore(path, (raw: Record<string, unknown>) => ({
      ...raw,
      normalized: true
    }));
    expect(store.read().normalized).toBe(true);
    writeFileSync(path, JSON.stringify({ goals: ['later'] }));
    expect(store.read().normalized).toBe(true);
  });

  it('back-to-back calls from one host do not conflict with each other', async () => {
    const { store, path } = fileStore({ goals: [] });
    // The stdio loop dispatches each request as it arrives without awaiting the
    // previous one, so a client's two calls overlap. A live run caught the second
    // failing with a conflict against its own predecessor's write.
    const append = (goal: string) =>
      store.mutate(async (current: { goals: string[] }) => ({
        workspace: { ...current, goals: [...current.goals, goal] },
        value: goal
      }));
    const results = await Promise.all([append('a'), append('b'), append('c')]);
    expect(results).toEqual(['a', 'b', 'c']);
    // Serialized, so every write landed — none was lost to a stale base.
    expect(JSON.parse(readFileSync(path, 'utf8')).goals.sort()).toEqual(['a', 'b', 'c']);
  });

  it('an external write is still noticed — serializing is not the same as ignoring', async () => {
    const { store, path } = fileStore({ goals: [] });
    let attempts = 0;

    await store.mutate(async (current: { goals: string[] }) => {
      attempts += 1;
      // Interfere once, then let it settle.
      if (attempts === 1) {
        writeFileSync(path, JSON.stringify({ goals: ['someone else'] }, null, 2));
      }
      return { workspace: { ...current, goals: [...current.goals, 'mine'] }, value: null };
    });

    // The in-process serializer does not make external writes invisible: the
    // compare-and-swap saw this one and the call was recomputed on top of it.
    expect(attempts).toBe(2);
    expect(JSON.parse(readFileSync(path, 'utf8')).goals).toEqual(['someone else', 'mine']);
  });

  it('overlapping in-memory mutations all apply', async () => {
    const store = createInMemoryWorkspaceStore({ goals: [] as string[] });
    await Promise.all(
      ['a', 'b', 'c'].map((goal) =>
        store.mutate(async (current: { goals: string[] }) => ({
          workspace: { ...current, goals: [...current.goals, goal] },
          value: null
        }))
      )
    );
    expect(store.read().goals.sort()).toEqual(['a', 'b', 'c']);
  });

  it('the in-memory store keeps mutations and never conflicts', async () => {
    const store = createInMemoryWorkspaceStore({ goals: ['seed'] });
    await store.mutate(async (current: Record<string, unknown>) => ({
      workspace: { ...current, goals: ['seed', 'added'] },
      value: null
    }));
    expect(store.read().goals).toEqual(['seed', 'added']);
    expect(store.path).toBeNull();
  });
});
