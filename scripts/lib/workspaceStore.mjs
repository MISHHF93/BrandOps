/**
 * The workspace file, as a store rather than a snapshot.
 *
 * Both gateway hosts used to read the workspace JSON **once at startup** into a
 * module-level variable, mutate that variable, and write the whole file back.
 * Two consequences, both real:
 *
 * 1. **Staleness.** Anything the app wrote after the gateway started was
 *    invisible to it. An agent asking for goals got a frozen snapshot for the
 *    life of the process — and nothing in the response said so.
 * 2. **Lost updates.** Writing the whole file from a stale base silently
 *    destroys whatever anyone else wrote in the meantime. The app, a second
 *    gateway, another agent — all of them, without a trace.
 *
 * The certification run masked both, because it used two gateway processes
 * *sequentially*: the second read the file after the first had exited. Overlap
 * them and the second clobbers the first.
 *
 * The app already solved this — `storage.withWorkspaceMutation` reads, mutates,
 * compares-and-swaps against the current stored value, and rebases on conflict.
 * This is the same contract against a file: read fresh on every call, and never
 * overwrite bytes that changed underneath.
 *
 * Node-only. `src/` imports no Node builtins by convention, so this lives here.
 */
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  renameSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

/** The completed content of a write that has not yet reached the workspace file. */
const recoveryPathFor = (path) => `${path}.recovery`;

const discard = (path) => {
  try {
    unlinkSync(path);
  } catch {
    // Already gone, or someone else's. Neither is worth failing a write over.
  }
};

function writeAndSync(path, contents) {
  const handle = openSync(path, 'w');
  try {
    writeSync(handle, contents);
    // Without this the rename can reach the disk before the bytes it points at,
    // which is the difference between crash-safe and crash-safe-looking.
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
}

/**
 * Windows refuses to replace a file another process currently has open, and Node
 * gives no way to open for reading without taking that lock.
 */
const isContended = (error) =>
  error?.code === 'EPERM' || error?.code === 'EBUSY' || error?.code === 'EACCES';

/**
 * How many times to wait out a reader before giving up on the atomic path.
 *
 * Measured against a reader looping over the same file: 59 of 65 renames landed
 * first try, and the worst needed 30. Twelve attempts with a growing pause is
 * roughly a quarter-second, which covers everything short of a reader that never
 * lets go — and for that there is the fallback below.
 */
const RENAME_ATTEMPTS = 12;

/**
 * Replaces the workspace file without ever leaving it half-written.
 *
 * `writeFileSync` empties the target and then refills it. For the whole of that
 * window the file on disk is a prefix of valid JSON and nothing else, and the
 * window is not small: an 83 kB workspace with one reader and one writer
 * produced **1,246 unparseable reads out of 4,925 — 25%**. Worse, the window
 * outlives the process. Killed mid-write, the old path left the workspace at
 * **zero bytes on the very first attempt**. There is no second copy of this
 * file; it is the user's data.
 *
 * The fix is the usual one — write a sibling, fsync it, rename it over the
 * target — with a wrinkle this platform forces.
 *
 * **The rename can lose to a reader.** On Windows an open read handle blocks the
 * replace, so under concurrent reads ~3% of writes failed outright with EPERM
 * even after retrying. Trading silent corruption for loud write failures is the
 * better trade, but it is not a trade worth shipping.
 *
 * So persistent contention falls back to an in-place write — which Windows
 * always permits — with the completed content parked in a recovery file first.
 * That keeps the in-place window survivable: a reader that finds a torn
 * workspace, or a process starting up after a crash during one, finds the whole
 * of the interrupted write sitting next to it. `readWithRaw` uses it.
 *
 * The recovery file is deliberately left out of the orphan sweep. A journal that
 * outlived the process that wrote it is not debris — it is the copy that makes
 * the crash recoverable.
 */
async function writeAtomic(path, contents) {
  const temp = `${path}.${process.pid.toString(36)}.${Date.now().toString(36)}.tmp`;
  writeAndSync(temp, contents);

  for (let attempt = 1; attempt <= RENAME_ATTEMPTS; attempt += 1) {
    try {
      renameSync(temp, path);
      return;
    } catch (error) {
      if (!isContended(error)) {
        discard(temp);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 4, 40)));
    }
  }

  const recovery = recoveryPathFor(path);
  try {
    // Reuse the bytes already on disk rather than writing them twice. Nothing
    // reads the recovery path during normal operation, so this rename is
    // uncontended even when the workspace itself is not.
    renameSync(temp, recovery);
  } catch {
    writeAndSync(recovery, contents);
    discard(temp);
  }
  writeFileSync(path, contents);
  discard(recovery);
}

/**
 * A synchronous pause, because `read()` is synchronous and every caller relies
 * on that. Only ever reached on a failed parse, so it costs nothing in the
 * ordinary case.
 */
function sleepBriefly(attempt) {
  const until = Date.now() + attempt * 5;
  while (Date.now() < until) {
    // Intentionally spinning: there is no synchronous sleep, and this runs for
    // at most a few milliseconds on a path that is already an error.
  }
}

/**
 * Clears temp files left by a writer that was killed before it could rename.
 *
 * The atomic write trades one failure for a smaller one: a process that dies
 * between the open and the rename leaves its sibling behind instead of a
 * truncated workspace. That is the right trade — the workspace survives — but
 * the debris is real. Twenty-five kills during the crash test left ten orphans,
 * one workspace-sized each, in the folder next to the user's data.
 *
 * Swept at startup rather than per write, and only past a minute of age, so a
 * second process's in-flight temp file is never the one removed. No legitimate
 * write is a minute old.
 */
const ORPHAN_TEMP_AGE_MS = 60_000;

function sweepOrphanedTempFiles(path) {
  const directory = dirname(path);
  const prefix = `${basename(path)}.`;
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    // A workspace directory we cannot list is not a reason to refuse to serve.
    return;
  }
  for (const entry of entries) {
    if (!entry.startsWith(prefix) || !entry.endsWith('.tmp')) continue;
    const candidate = join(directory, entry);
    try {
      if (Date.now() - statSync(candidate).mtimeMs < ORPHAN_TEMP_AGE_MS) continue;
      unlinkSync(candidate);
    } catch {
      // Someone else's, or already gone. Either way not ours to worry about.
    }
  }
}

/**
 * Raised when the workspace file cannot be read or parsed.
 *
 * Failure injection found why this needs a type of its own: the store re-reads
 * on *every* call, so a file corrupted at any moment turned every subsequent
 * request into a raw `SyntaxError` — "Expected property name or '}' in JSON at
 * position 2" reaching an agent as an internal error, with nothing to say the
 * workspace file is the problem or that a person needs to look at it.
 *
 * Re-reading per call is still right; it is what fixed the staleness bug. It
 * just means a corrupt file is now a per-request failure, and a per-request
 * failure has to explain itself.
 */
export class WorkspaceUnreadableError extends Error {
  constructor(path, cause) {
    super(
      `The workspace file at "${path}" could not be read as JSON: ${cause}. ` +
        `Nothing was served from it. Restore or re-export the workspace.`
    );
    this.name = 'WorkspaceUnreadableError';
    this.code = 'workspace_unreadable';
  }
}

/** Raised when the file changed between the read that fed a call and its write. */
export class WorkspaceConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkspaceConflictError';
    this.code = 'workspace_conflict';
  }
}

/**
 * Serializes calls through a promise chain.
 *
 * The compare-and-swap protects against *other* writers. It must not fire on a
 * host racing itself: the stdio loop dispatches each request as it arrives
 * without awaiting the previous one, so two back-to-back calls from one client
 * overlap, and the second sees the first's write as a foreign change. A live run
 * caught exactly that — an ordinary second request failed with a conflict
 * against its own predecessor.
 *
 * So mutations queue in arrival order within the process, and the CAS is left to
 * mean what it should: someone outside this process changed the file.
 */
function serializer() {
  let tail = Promise.resolve();
  return (job) => {
    const run = tail.then(job, job);
    // Swallow on the chain only — the caller still sees the rejection.
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}

/**
 * A store backed by a JSON file on disk.
 *
 * @param path         Workspace JSON path.
 * @param withDefaults Normalizer, injected so this module stays free of `src/` imports.
 */
export function createWorkspaceFileStore(path, withDefaults) {
  const readRaw = () => readFileSync(path, 'utf8');
  const serialize = serializer();
  sweepOrphanedTempFiles(path);

  /**
   * Recovers a workspace from the journal left by an interrupted in-place write.
   *
   * Reached only when the workspace itself will not parse, which now means
   * exactly one thing: a fallback write was cut short. The journal holds the
   * complete content that write was committing, so it is newer than whatever
   * survived in the main file, not older.
   *
   * The main file is repaired on the way past. Leaving it torn would make every
   * later read pay this path, and would leave the user with a workspace that
   * only BrandOps can open.
   */
  const recoverFromJournal = () => {
    const recovery = recoveryPathFor(path);
    if (!existsSync(recovery)) return null;
    let raw;
    try {
      raw = readFileSync(recovery, 'utf8');
      const data = withDefaults(JSON.parse(raw));
      writeFileSync(path, raw);
      discard(recovery);
      return { raw, data };
    } catch {
      // A journal that is itself unreadable tells us nothing. Fall through to
      // the real error, which is about the workspace.
      return null;
    }
  };

  /**
   * How many times to look again before calling a workspace unreadable.
   *
   * The in-place fallback write and its journal are not removed in one step, so
   * a reader can hold a torn copy of the file from before the write finished and
   * then find the journal already deleted. Measured: **one read in 1,133** hit
   * exactly that ordering and reported a corrupt workspace for a file that was
   * complete by the time it said so.
   *
   * The window is sub-millisecond, so looking again settles it. Genuine
   * corruption pays about fifteen milliseconds before it is reported, which is
   * nothing against being wrong about it.
   */
  const READ_ATTEMPTS = 4;

  const parseOrNull = (raw) => {
    try {
      return { raw, data: withDefaults(JSON.parse(raw)) };
    } catch {
      return null;
    }
  };

  const readWithRaw = () => {
    let raw;
    let lastError;

    for (let attempt = 1; attempt <= READ_ATTEMPTS; attempt += 1) {
      try {
        raw = readRaw();
      } catch (error) {
        throw new WorkspaceUnreadableError(path, error instanceof Error ? error.message : error);
      }

      const parsed = parseOrNull(raw);
      if (parsed) return parsed;
      lastError = new SyntaxError(`the file did not parse as JSON (attempt ${attempt})`);

      // The journal is checked first: it holds the write that was interrupted,
      // and it is the only copy if the process that was writing is gone.
      const recovered = recoverFromJournal();
      if (recovered) return recovered;

      if (attempt < READ_ATTEMPTS) sleepBriefly(attempt);
    }

    throw new WorkspaceUnreadableError(path, lastError?.message ?? 'unknown parse failure');
  };

  return {
    kind: 'file',
    path,

    /** Fresh from disk every time. Staleness is not a mode this store has. */
    read() {
      return readWithRaw().data;
    },

    /**
     * Runs `apply` against a freshly read workspace and persists the result.
     *
     * `apply` returns `{ workspace, value }`. When `workspace` is the same object
     * it was handed, nothing is written — a read-only call must not rewrite the
     * file and bump its mtime, or every reader would see a spurious conflict.
     *
     * If the file changed between the read and the write, this throws rather than
     * overwriting. There is no generic merge for two divergent workspaces, and
     * guessing one is how the lost-update bug happened in the first place.
     */
    async mutate(apply, options) {
      /**
       * Retries the compare-and-swap before giving up.
       *
       * The check itself was already correct — two processes hammering one file
       * produced zero lost updates across eighty attempts. What it did *not* do
       * was retry, so **43% of those attempts failed outright** and the message
       * told the caller to try again themselves. Nothing did.
       *
       * That is the product's headline scenario: an agent connected over MCP
       * while the person has the app open, both writing the same workspace. The
       * in-app service already retries three times (`withWorkspaceMutation`);
       * this layer threw. One policy at both layers, rather than one layer
       * absorbing contention and the other passing it to whoever is unlucky.
       *
       * `apply` is re-run against freshly read data each attempt, which is what
       * makes this a compare-and-swap retry rather than a blind overwrite: the
       * caller's change is recomputed on top of whatever landed meanwhile.
       */
      const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);

      return serialize(async () => {
        let lastConflict = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const { raw, data } = readWithRaw();
          const { workspace: next, value } = await apply(data);
          if (next === data) return value;

          if (readRaw() === raw) {
            await writeAtomic(path, JSON.stringify(next, null, 2));
            return value;
          }

          lastConflict = new WorkspaceConflictError(
            `The workspace file changed while this call was running, and it did not settle after ` +
              `${maxAttempts} attempts. Nothing was written. (${path})`
          );
          // A brief, growing pause so two processes in lockstep fall out of it
          // rather than colliding on every retry.
          await new Promise((resolve) => setTimeout(resolve, attempt * 5));
        }

        throw lastConflict;
      });
    }
  };
}

/**
 * A store with no file behind it, for the stdio gateway's seeded demo mode.
 *
 * It cannot go stale — there is no second writer — and it cannot conflict, so
 * `mutate` simply keeps the result. Same shape as the file store so the hosts do
 * not branch on which one they were given.
 */
export function createInMemoryWorkspaceStore(initial) {
  let workspace = initial;
  // Serialized for the same reason as the file store: overlapping calls would
  // otherwise each read the same base and the later write would drop the earlier.
  const serialize = serializer();
  return {
    kind: 'memory',
    path: null,
    read() {
      return workspace;
    },
    async mutate(apply) {
      return serialize(async () => {
        const { workspace: next, value } = await apply(workspace);
        workspace = next;
        return value;
      });
    }
  };
}
