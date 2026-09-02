/**
 * @vitest-environment jsdom
 *
 * A save that fails should reach the user, not just the console.
 *
 * Cycle 26 established that the storage layer reports write failures correctly —
 * a full store says the workspace is full and what to do about it. Nothing above
 * it listened. Several workspace writes are awaited without a `try`, including
 * inside `persistChatGatewayTrace`, and there was no `unhandledrejection`
 * handler anywhere. So the failure reached the console and the person whose
 * change was not saved carried on believing it was.
 *
 * That is the worst shape a failure can take in this product. A visible error is
 * recoverable — the user exports, prunes, retries. A silent one is discovered
 * later, when the work is already gone.
 *
 * **The fix is deliberately not a `try` at each call site.** This codebase has
 * had to repair that twice: cycle 10's dispatcher never asked whether the
 * approval it was acting on had been granted, and cycle 19's opportunity card
 * was the one feed item of eight that forgot its gate. A guard in the caller is
 * one the next caller will not have. One listener at the top covers every
 * unwrapped write, including ones nobody has written yet.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  describePersistenceFailure,
  isPersistenceFailure,
  markPersistenceFailure,
  watchPersistenceFailures
} from '../../src/shared/storage/persistenceFailure';
import { getBrowserStorage } from '../../src/shared/storage/browserStorage';

describe('recognising a failed save', () => {
  it('identifies one that has travelled through a rejection', () => {
    const error = markPersistenceFailure(new Error('Storage for this workspace is full'));
    // Class identity does not survive some boundaries; the name does.
    expect(isPersistenceFailure(error)).toBe(true);
    expect(describePersistenceFailure(error)).toContain('full');
  });

  it('stays quiet about everything else', () => {
    // A handler that narrated every rejection as a save failure would be wrong
    // most of the time, and the user would learn to ignore it.
    expect(describePersistenceFailure(new Error('network timeout'))).toBeNull();
    expect(describePersistenceFailure('a string')).toBeNull();
    expect(describePersistenceFailure(undefined)).toBeNull();
    expect(describePersistenceFailure({ name: 'BrandOpsPersistenceError' })).toBeNull();
  });

  it('still says something when the error carries no message', () => {
    const message = describePersistenceFailure(markPersistenceFailure(new Error('')));
    // Unable to explain is not a reason to say nothing: the save still failed.
    expect(message).toContain('could not be saved');
  });
});

describe('the storage layer marks what it throws', () => {
  it('marks a quota failure so the shell can recognise it', async () => {
    delete (globalThis as never as { chrome?: unknown }).chrome;
    const storage = getBrowserStorage('local');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const error = new Error('The quota has been exceeded.');
      error.name = 'QuotaExceededError';
      throw error;
    });

    // The two halves have to agree: a marker the storage layer never applies
    // would leave the listener silent no matter how well it is written.
    const thrown = await storage.set('workspace', { a: 1 }).catch((error: unknown) => error);
    vi.restoreAllMocks();

    expect(isPersistenceFailure(thrown)).toBe(true);
    expect(describePersistenceFailure(thrown)).toContain('Export the workspace');
  });
});

describe('the listener', () => {
  /** A minimal event target, so the test drives real listener registration. */
  function fakeWindow() {
    const listeners: Record<string, Array<(event: Event) => void>> = {};
    return {
      listeners,
      addEventListener: (type: string, handler: (event: Event) => void) => {
        (listeners[type] ??= []).push(handler);
      },
      removeEventListener: (type: string, handler: (event: Event) => void) => {
        listeners[type] = (listeners[type] ?? []).filter((entry) => entry !== handler);
      },
      emit(reason: unknown) {
        const event = new Event('unhandledrejection') as Event & { reason: unknown };
        event.reason = reason;
        for (const handler of listeners.unhandledrejection ?? []) handler(event);
      }
    };
  }

  it('surfaces a persistence failure to the caller', () => {
    const target = fakeWindow();
    const shown: string[] = [];
    watchPersistenceFailures((message) => shown.push(message), target);

    target.emit(markPersistenceFailure(new Error('Storage for this workspace is full.')));
    expect(shown).toEqual(['Storage for this workspace is full.']);
  });

  it('ignores unrelated rejections', () => {
    const target = fakeWindow();
    const shown: string[] = [];
    watchPersistenceFailures((message) => shown.push(message), target);

    target.emit(new Error('fetch failed'));
    target.emit('some string');
    expect(shown).toEqual([]);
  });

  it('unregisters cleanly', () => {
    const target = fakeWindow();
    const shown: string[] = [];
    const stop = watchPersistenceFailures((message) => shown.push(message), target);

    stop();
    target.emit(markPersistenceFailure(new Error('full')));
    // A component that mounts and unmounts repeatedly must not accumulate
    // listeners, each one showing the same message again.
    expect(shown).toEqual([]);
    expect(target.listeners.unhandledrejection).toEqual([]);
  });

  it('does not mark the rejection handled', () => {
    const target = fakeWindow();
    watchPersistenceFailures(() => {}, target);

    const event = new Event('unhandledrejection') as Event & { reason: unknown };
    event.reason = markPersistenceFailure(new Error('full'));
    const preventDefault = vi.spyOn(event, 'preventDefault');
    for (const handler of target.listeners.unhandledrejection ?? []) handler(event);

    // Telling the user is not the same as handling the error. Swallowing it
    // would hide the same event from the console and from error reporting.
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('does nothing when there is no window to listen on', () => {
    // The service worker imports this module too.
    expect(() => watchPersistenceFailures(() => {}, undefined)()).not.toThrow();
  });
});
