/**
 * One workspace write at a time.
 *
 * Recording an event is a read-modify-write, and the product issues several
 * within a single tick: `install_offered` then `install_accepted`,
 * `restore_started` then `restore_completed`, and `app_open` alongside the
 * entitlement lookup on start. Interleaved, they lose events:
 *
 * ```
 *   A: read  -> w0
 *   B: read  -> w0          (A has not written yet)
 *   A: write -> w0 + eventA
 *   B: write -> w0 + eventB  <- A's event is gone
 * ```
 *
 * Nothing errors when this happens. The funnel is simply short, and every rate
 * computed from it is wrong in the flattering direction — which is what makes
 * it worse than a crash, because nobody is prompted to look.
 *
 * A queue rather than a lock: callers await their own turn and cannot deadlock
 * each other, and the order requested is the order applied, which matters when
 * the events form a sequence someone will later read as one.
 */

/** The tail of the queue. Each new write chains onto it. */
let tail: Promise<unknown> = Promise.resolve();

/**
 * Run `work` after every write queued before it.
 *
 * The returned promise settles with `work`'s own result, so a caller still sees
 * its own failure. The chain itself absorbs that rejection separately — one
 * failed write must not wedge everything queued behind it, which would turn a
 * transient storage error into a permanently stuck app.
 */
export function serializeWorkspaceWrite<T>(work: () => Promise<T>): Promise<T> {
  const run = tail.then(work, work);
  // Swallowed on the chain only. `run` still rejects for the caller.
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Resolves once everything currently queued has finished. For tests and shutdown. */
export function whenWorkspaceWritesSettle(): Promise<void> {
  return tail.then(
    () => undefined,
    () => undefined
  );
}
