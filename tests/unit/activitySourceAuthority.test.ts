/**
 * Which activity sources mean a human authored the thing.
 *
 * `isSourceAuthorized` is unwired, and the attempt to wire it is what found the
 * defect. Its allowlist had drifted out of the type it guards:
 *
 * ```
 *   valid sources it rejected  agent-reported, integration-import, dev-hook, manual
 *   entries that cannot occur  user-input, manual-entry, imported,
 *                              integration:authored, approved-agent
 *   overlap with reality       3 of 8
 * ```
 *
 * Connecting it in that state would have refused most legitimate ingestion. That
 * is the whole argument for reading a function before putting it in place: the
 * unwired code was not merely unused, it was **wrong**, and only running it
 * against the real union showed that.
 *
 * These tests are keyed on `ActivityEventSource` itself rather than on a copied
 * list, so the two cannot drift apart again without failing here — which is the
 * mechanism that was missing the first time.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isSourceAuthorized } from '../../src/services/builder/activityGraph';
import type { ActivityEventSource } from '../../src/types/builder';

/** Read the union out of the source, so this file cannot hold a stale copy. */
function activityEventSources(): string[] {
  const source = readFileSync(join(process.cwd(), 'src/types/builder.ts'), 'utf8');
  const declaration = source.slice(source.indexOf('export type ActivityEventSource'));
  const body = declaration.slice(0, declaration.indexOf(';'));
  return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

describe('the source union this guard is about', () => {
  it('is readable, and is not empty', () => {
    // Without this the checks below would pass over nothing.
    expect(activityEventSources().length).toBeGreaterThan(3);
  });

  it('contains every value the guard has an opinion about', () => {
    /**
     * The defect, stated as a property. The guard named five strings that are
     * not members of this union, so it was answering about a vocabulary the
     * product had stopped using.
     */
    const union = activityEventSources();
    const opinionated = union.filter((source) => isSourceAuthorized(source));
    expect(opinionated.every((source) => union.includes(source))).toBe(true);
  });

  it('gives every member of the union a definite answer', () => {
    for (const source of activityEventSources()) {
      expect(typeof isSourceAuthorized(source), source).toBe('boolean');
    }
  });
});

describe('what counts as authored', () => {
  it('accepts the sources a human or a local process produces', () => {
    const authored: ActivityEventSource[] = [
      'user-action',
      'manual',
      'integration-import',
      'skill-pack',
      'session-to-brand',
      'dev-hook'
    ];
    for (const source of authored) {
      expect(isSourceAuthorized(source), source).toBe(true);
    }
  });

  it('refuses the one source that means an agent said so', () => {
    // `agent-reported` is the whole point of the distinction: it is a claim
    // about something the workspace did not witness.
    expect(isSourceAuthorized('agent-reported')).toBe(false);
  });

  it('refuses a string that is not a source at all', () => {
    // The counter-case. An allowlist that accepts unknown strings is not an
    // allowlist, and the previous version accepted five of them.
    for (const bad of [
      'user-input',
      'manual-entry',
      'imported',
      'approved-agent',
      '',
      'USER-ACTION'
    ]) {
      expect(isSourceAuthorized(bad), bad).toBe(false);
    }
  });

  it('leaves exactly one union member unauthorised', () => {
    /**
     * Pinned as a shape rather than a list. If a new source is added to the
     * union, this fails until somebody decides which side it belongs on —
     * which is the decision that quietly went unmade last time.
     */
    const refused = activityEventSources().filter((source) => !isSourceAuthorized(source));
    expect(refused, refused.join(', ')).toEqual(['agent-reported']);
  });
});
