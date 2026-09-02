/**
 * The workspace file must survive being written to.
 *
 * `writeFileSync` empties the target and then refills it. For the whole of that
 * window the file on disk is a prefix of valid JSON and nothing else, and the
 * window is not small: an 83 kB workspace with one writer and one reader
 * produced **1,246 unparseable reads out of 4,925 — 25%**.
 *
 * Two things came out of that, and the second is the serious one.
 *
 * A reader that lands in the window gets `WorkspaceUnreadableError`, which tells
 * the person their workspace is corrupt and to restore it. It was intact a
 * millisecond earlier and intact a millisecond later. That is the product's
 * headline scenario — the app open while an agent is connected — reporting data
 * loss that has not happened.
 *
 * But the window also outlives the process. **Killed mid-write, the old path
 * left the workspace at zero bytes on the very first attempt.** Not a coin flip,
 * not eventually: the first one. There is no second copy of this file. It is the
 * user's data, and an ordinary crash, a full disk, or closing a laptop could
 * take all of it.
 *
 * Writing a sibling and renaming it over the target closes both. Twenty-five
 * SIGKILLs mid-write now leave twenty-five readable workspaces.
 *
 * These tests drive the real store against real files, because a mocked
 * filesystem cannot have a window in the first place — it would prove only that
 * the mock is atomic.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkspaceFileStore } from '../../scripts/lib/workspaceStore.mjs';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Big enough that a write is more than one syscall, which is what opens the window. */
const bulky = () => ({
  n: 0,
  filler: Array.from({ length: 900 }, (_, index) => ({ id: `e-${index}`, note: 'x'.repeat(40) }))
});

function workspaceDir(initial: object = bulky()) {
  const dir = mkdtempSync(join(tmpdir(), 'brandops-durable-'));
  dirs.push(dir);
  const path = join(dir, 'workspace.json');
  writeFileSync(path, JSON.stringify(initial, null, 2));
  return { dir, path };
}

const tempFiles = (dir: string) => readdirSync(dir).filter((name) => name.endsWith('.tmp'));

describe('writing the workspace', () => {
  it('is never observed half-written by another process', async () => {
    const { dir, path } = workspaceDir();
    const store = createWorkspaceFileStore(path, (data: unknown) => data);

    /**
     * A separate process, because the window only exists between syscalls and a
     * same-thread reader cannot be inside it. This is the measurement that found
     * the bug: 1,246 of 4,925 reads came back unparseable.
     *
     * It counts two things, and the difference between them is the point.
     *
     * `raw` is `readFileSync` + `JSON.parse`, the way a backup tool or a curious
     * person would read the file. `viaStore` is the path every reader in this
     * product actually takes. When the atomic rename loses to a reader and the
     * store falls back to an in-place write, a raw read can still land in that
     * window — about 1 in 2,500 here, against 1 in 4 before any of this. The
     * store cannot, because it recovers the interrupted write from the journal.
     *
     * So the raw count is held to a ceiling and the store count to zero. Pinning
     * the raw count at zero would be pinning a race, and the honest number is
     * more useful than a green test that hides one.
     */
    const readerUrl = new URL('../../scripts/lib/workspaceStore.mjs', import.meta.url).href;
    const reader = join(dir, 'reader.mjs');
    writeFileSync(
      reader,
      `import { readFileSync } from 'node:fs';
` +
        `import { createWorkspaceFileStore } from ${JSON.stringify(readerUrl)};
` +
        `const path = ${JSON.stringify(path)};
` +
        `const store = createWorkspaceFileStore(path, (d) => d);
` +
        `let raw = 0, rawTorn = 0, viaStore = 0, storeTorn = 0;
` +
        `const stop = Date.now() + 2000;
` +
        `while (Date.now() < stop) {
` +
        `  raw += 1;
` +
        `  try { JSON.parse(readFileSync(path, 'utf8')); }
` +
        `  catch (error) { if (error.code !== 'ENOENT') rawTorn += 1; }
` +
        `  viaStore += 1;
` +
        `  try { store.read(); } catch { storeTorn += 1; }
` +
        `}
` +
        `process.stdout.write(JSON.stringify({ raw, rawTorn, viaStore, storeTorn }));
`
    );

    const child = spawn(process.execPath, [reader], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8');
    });
    /**
     * Subscribed now, not after the write loop.
     *
     * Attached afterwards, this hung whenever the writer outlasted the reader —
     * `exit` had already fired and would not fire again. It failed 2 runs in 6,
     * as a 30-second timeout rather than as anything resembling its cause.
     */
    const readerExited = new Promise((resolve) => child.on('exit', resolve));

    const stop = Date.now() + 2000;
    let writes = 0;
    while (Date.now() < stop) {
      await store.mutate(async (data: { n: number }) => ({
        workspace: { ...data, n: data.n + 1 },
        value: null
      }));
      writes += 1;
    }
    await readerExited;

    const { raw, rawTorn, viaStore, storeTorn } = JSON.parse(
      out || '{"raw":0,"rawTorn":0,"viaStore":0,"storeTorn":0}'
    );

    // The counter-case: zero torn reads means nothing if neither side ran.
    expect(writes, 'writes performed').toBeGreaterThan(10);
    expect(raw, 'raw reads performed').toBeGreaterThan(100);

    // What the product guarantees: its own readers never see a partial file.
    expect(storeTorn, `${storeTorn} of ${viaStore} reads through the store failed`).toBe(0);

    // What it does not: a rare in-place fallback window remains visible to a
    // reader that bypasses the store. Was 25.3%.
    const rawRate = rawTorn / Math.max(raw, 1);
    expect(rawRate, `${rawTorn} of ${raw} raw reads (${(rawRate * 100).toFixed(3)}%)`).toBeLessThan(
      0.01
    );
  }, 30_000);

  it('leaves the previous workspace intact when the writer is killed mid-write', async () => {
    /**
     * A big workspace on purpose.
     *
     * Five rounds against the old write path passed — a broken implementation
     * with a green test. So the detection rate got measured rather than assumed,
     * and the result was not what scaling suggests:
     *
     * ```
     *   83 kB objects, 200 ms   3/12      1 MB string, 400 ms   1/12
     *   83 kB objects, 400 ms   0/12      3 MB string, 200 ms   0/12
     * ```
     *
     * **Bigger files do not widen the window.** The exposure is between the
     * truncating `open` and the `write` that follows it, and a `write` already
     * under way is not interrupted by a signal — so the window is short and
     * roughly fixed no matter how much data goes through it. Making the payload
     * six megabytes made detection *worse*, because startup then ate the delay.
     *
     * Thirty rounds at the shape that actually catches it leaves a miss
     * probability under a thousandth. This test is still a sampling argument,
     * though, and the deterministic guard is the concurrent-reader test above:
     * that one fails on every single run against the old write path.
     */
    const { path } = workspaceDir();

    // A real process, really killed. The old path lost the whole file on the
    // first kill, so anything less than a real SIGKILL would not have caught it.
    const script = join(dirs[dirs.length - 1], 'writer.mjs');
    const storeUrl = new URL('../../scripts/lib/workspaceStore.mjs', import.meta.url).href;
    writeFileSync(
      script,
      `import { createWorkspaceFileStore } from ${JSON.stringify(storeUrl)};\n` +
        `const store = createWorkspaceFileStore(${JSON.stringify(path)}, (d) => d);\n` +
        `for (;;) { await store.mutate(async (d) => ({ workspace: { ...d, n: (d.n ?? 0) + 1 }, value: null })).catch(() => {}); }\n`
    );

    for (let round = 0; round < 30; round += 1) {
      const child = spawn(process.execPath, [script], { stdio: 'ignore' });
      await new Promise((resolve) => setTimeout(resolve, 200));
      child.kill('SIGKILL');
      await new Promise((resolve) => child.on('exit', resolve));

      // Readable after every single kill. Not "usually", not "eventually".
      const raw = readFileSync(path, 'utf8');
      expect(raw.length, `round ${round}: file is ${raw.length} bytes`).toBeGreaterThan(0);
      expect(() => JSON.parse(raw), `round ${round}`).not.toThrow();
    }
  }, 60_000);

  it('does not lose the increments it reported writing', async () => {
    const { path } = workspaceDir();
    const store = createWorkspaceFileStore(path, (data: unknown) => data);

    for (let index = 0; index < 20; index += 1) {
      await store.mutate(async (data: { n: number }) => ({
        workspace: { ...data, n: data.n + 1 },
        value: null
      }));
    }

    // Durability must not have been bought by dropping writes.
    expect(JSON.parse(readFileSync(path, 'utf8')).n).toBe(20);
  });
});

/**
 * What these tests do not cover.
 *
 * The `fsync` before the rename is not observable here. Removing it leaves all
 * twelve tests green, because its only effect is on a machine that loses power
 * between the rename reaching the disk and the bytes it points at — and nothing
 * short of real power loss distinguishes that. It is kept on the strength of the
 * argument, not of a measurement, and this note exists so that is on the record
 * rather than implied by a passing suite.
 */
describe('the debris an interrupted write leaves', () => {
  it('clears temp files a dead writer abandoned', () => {
    const { dir, path } = workspaceDir();
    const orphan = join(dir, `${'workspace.json'}.abc.def.tmp`);
    writeFileSync(orphan, '{"partial":');
    // Backdated past the age gate: this is what a killed process leaves behind.
    const old = new Date(Date.now() - 10 * 60_000);
    utimesSync(orphan, old, old);

    createWorkspaceFileStore(path, (data: unknown) => data);

    expect(tempFiles(dir)).toEqual([]);
  });

  it('leaves another live writer’s temp file alone', () => {
    const { dir, path } = workspaceDir();
    const inFlight = join(dir, `${'workspace.json'}.xyz.123.tmp`);
    writeFileSync(inFlight, '{"someone else is mid-write":true}');

    createWorkspaceFileStore(path, (data: unknown) => data);

    // Deleting this would corrupt the *other* process's write — trading one
    // data-loss bug for a subtler one.
    expect(tempFiles(dir)).toHaveLength(1);
    expect(statSync(inFlight).size).toBeGreaterThan(0);
  });

  it('leaves files that are not ours alone', () => {
    const { dir, path } = workspaceDir();
    const unrelated = join(dir, 'something-else.json.tmp');
    writeFileSync(unrelated, 'not the workspace');
    const old = new Date(Date.now() - 10 * 60_000);
    utimesSync(unrelated, old, old);

    createWorkspaceFileStore(path, (data: unknown) => data);

    // The sweep is scoped by the workspace filename, not by the extension.
    expect(readFileSync(unrelated, 'utf8')).toBe('not the workspace');
  });
});

/**
 * The fallback path, driven directly.
 *
 * On Windows the atomic rename can lose to a reader that has the workspace open,
 * and under concurrent reads ~3% of writes failed outright that way. The store
 * falls back to an in-place write with the finished content parked in a journal
 * first, so the in-place window stays survivable.
 *
 * That journal is the kind of code that is easy to write and never exercise —
 * it only runs after a crash. These tests put the file system in the state a
 * crash leaves and check that a reader gets the workspace back.
 */
describe('recovering a write that was interrupted', () => {
  const journalOf = (path: string) => `${path}.recovery`;

  it('returns the interrupted write rather than the torn file', () => {
    const { path } = workspaceDir();
    // Exactly what a crash during the in-place window leaves: a truncated
    // workspace beside a complete journal.
    writeFileSync(path, '{"n": 41, "fill');
    writeFileSync(journalOf(path), JSON.stringify({ ...bulky(), n: 42 }, null, 2));

    const store = createWorkspaceFileStore(path, (data: unknown) => data);

    expect((store.read() as { n: number }).n).toBe(42);
  });

  it('repairs the workspace instead of recovering it again every time', () => {
    const { dir, path } = workspaceDir();
    writeFileSync(path, '{"n": 41, "fill');
    writeFileSync(journalOf(path), JSON.stringify({ ...bulky(), n: 42 }, null, 2));

    const store = createWorkspaceFileStore(path, (data: unknown) => data);
    store.read();

    // Left unrepaired, the user has a workspace only BrandOps can open — and
    // every later read pays the recovery path.
    expect(JSON.parse(readFileSync(path, 'utf8')).n).toBe(42);
    expect(readdirSync(dir).filter((name) => name.endsWith('.recovery'))).toEqual([]);
  });

  it('still refuses when there is nothing to recover from', () => {
    const { path } = workspaceDir();
    writeFileSync(path, '{"n": 41, "fill');

    const store = createWorkspaceFileStore(path, (data: unknown) => data);

    // Recovery must not become a way to paper over a genuinely lost workspace.
    expect(() => store.read()).toThrow(/could not be read as JSON/);
  });

  it('refuses when the journal is itself unreadable', () => {
    const { path } = workspaceDir();
    writeFileSync(path, '{"n": 41, "fill');
    writeFileSync(journalOf(path), '{"also tor');

    const store = createWorkspaceFileStore(path, (data: unknown) => data);

    expect(() => store.read()).toThrow(/could not be read as JSON/);
  });

  it('ignores the journal while the workspace is fine', () => {
    const { path } = workspaceDir();
    // A journal that outlived its write, next to a healthy workspace. Preferring
    // it would hand back content nobody asked for.
    writeFileSync(journalOf(path), JSON.stringify({ ...bulky(), n: 999 }, null, 2));

    const store = createWorkspaceFileStore(path, (data: unknown) => data);

    expect((store.read() as { n: number }).n).toBe(0);
  });

  it('keeps the journal out of the orphan sweep', () => {
    const { dir, path } = workspaceDir();
    const journal = journalOf(path);
    writeFileSync(journal, JSON.stringify({ ...bulky(), n: 42 }, null, 2));
    const old = new Date(Date.now() - 10 * 60_000);
    utimesSync(journal, old, old);
    writeFileSync(path, '{"n": 41, "fill');

    createWorkspaceFileStore(path, (data: unknown) => data);

    // An old journal is not debris. It is the only copy of an interrupted write,
    // and a crash is precisely how it comes to be old.
    expect(readdirSync(dir)).toContain(`${'workspace.json'}.recovery`);
  });
});
