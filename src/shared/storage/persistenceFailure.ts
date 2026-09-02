/**
 * Turning a failed save into something the user is actually told.
 *
 * The storage layer reports write failures correctly — a full store says the
 * workspace is full and what to do, an unavailable store says so. Nothing above
 * it listens. Two of the workspace-persisting call sites in the mobile shell are
 * not wrapped in a `try`, `persistChatGatewayTrace` awaits its `persist`
 * callback without catching, and there is no `unhandledrejection` handler
 * anywhere. So a save that fails reaches the console, and the person whose work
 * was not saved carries on believing it was.
 *
 * The fix is deliberately *not* a `try` at each call site. This codebase has
 * produced that defect repeatedly — cycle 10's dispatcher, cycle 19's one feed
 * item of eight — and the shape is always the same: a guard that lives in the
 * caller is one the next caller will not have. One listener at the top catches
 * every unwrapped persistence failure, including the ones nobody has written
 * yet.
 *
 * The decision lives here rather than inside a 3,000-line view component,
 * for the same reason the attachment trust boundary was moved out of one: a
 * decision buried in a view is a decision nobody can test.
 */

/** Marks an error as coming from the persistence layer, across a rejection. */
export const PERSISTENCE_FAILURE_MARKER = 'BrandOpsPersistenceError';

/**
 * Tag an error so the shell can recognise it after it has travelled through an
 * unhandled rejection, where the class identity is not reliable.
 */
export function markPersistenceFailure(error: Error): Error {
  error.name = PERSISTENCE_FAILURE_MARKER;
  return error;
}

export function isPersistenceFailure(reason: unknown): boolean {
  return reason instanceof Error && reason.name === PERSISTENCE_FAILURE_MARKER;
}

/**
 * What to show the user, or `null` when this is not ours to explain.
 *
 * Returning `null` for everything else matters: a handler that narrates every
 * rejection as a save failure would be worse than silence, because it would be
 * wrong most of the time and the user would learn to ignore it.
 */
export function describePersistenceFailure(reason: unknown): string | null {
  if (!isPersistenceFailure(reason)) return null;

  const message = (reason as Error).message.trim();
  if (!message) {
    // Something is wrong and we cannot say what. Saying that is still better
    // than letting the user believe the save succeeded.
    return 'Your last change could not be saved. Export the workspace before continuing.';
  }

  /**
   * The storage layer's message already reads as user-facing prose and already
   * carries the actionable case (a full store, and what to do about it), so it
   * is passed through rather than re-worded into something vaguer.
   */
  return message;
}

/**
 * Attach the listener. Returns the teardown, so a component can register it in
 * an effect without leaking one per mount.
 */
export function watchPersistenceFailures(
  onFailure: (message: string) => void,
  target: Pick<Window, 'addEventListener' | 'removeEventListener'> | undefined = typeof window ===
  'undefined'
    ? undefined
    : window
): () => void {
  if (!target) return () => {};

  const handler = (event: Event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const message = describePersistenceFailure(reason);
    if (!message) return;
    /**
     * The rejection is *not* marked handled. This reports the failure to the
     * user; it does not claim to have dealt with it, and swallowing it would
     * hide the same event from error reporting and from the console.
     */
    onFailure(message);
  };

  target.addEventListener('unhandledrejection', handler);
  return () => target.removeEventListener('unhandledrejection', handler);
}
