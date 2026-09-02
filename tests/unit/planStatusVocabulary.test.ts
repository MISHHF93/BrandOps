/**
 * Every state the product can produce has to be a state the page can show.
 *
 * The plan page maps raw status strings onto a small user-facing vocabulary, and
 * renders no chip for anything it does not recognise. That is the right default
 * — inventing a state for an unknown string would be worse — but it means an
 * unmapped value fails **silently and invisibly**.
 *
 * Which is exactly what happened. The first version of the map handled
 * `'approval pending'` and missed `'pending approval'`, and those are two
 * different code paths producing the same condition: `savedPlanStatusLabel`
 * rewrites the first, while an operational plan card reaches the second through
 * `plan.status.replace(/-/g, ' ')`. So a plan sitting in `pending-approval`
 * rendered **no chip at all** — the one state that most needs to be visible,
 * missing, with nothing failing.
 *
 * An SSR assertion caught it by accident, because it happened to search the
 * markup for that exact phrase. This test is the version that catches it on
 * purpose: enumerate the unions the product actually defines, push every value
 * through the same normalisation the view uses, and require each one to be
 * either a known state or explicitly declared not to be one.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  USER_FACING_STATE,
  NON_STATE_STATUSES,
  userFacingState
} from '../../src/pages/mobile/MobileWorkspaceHubView';

/** The closed set a reader is asked to learn. */
const ALLOWED = new Set([
  'Needs you',
  'Ready',
  'Working',
  'Blocked',
  'Verifying',
  'Done',
  'Failed'
]);

/**
 * Every raw status the product can put on a feed row.
 *
 * Drawn from the type unions rather than from the map, so the two cannot agree
 * with each other by construction. `SavedPlanStatus` and `OperationalPlanStatus`
 * are TypeScript unions with no runtime form, so they are restated here — and
 * the restatement is itself checked below against the source file.
 */
const SAVED_PLAN_STATUSES = [
  'draft',
  'active',
  'pending-approval',
  'opportunity',
  'approved',
  'rejected',
  'executing',
  'executed',
  'verified'
];

const OPERATIONAL_PLAN_STATUSES = ['needs-input', 'ready', 'in-progress', 'blocked'];

/** `executionStatus: trace.outcome ?? trace.reviewStatus ?? 'recorded'`. */
const RECEIPT_STATUSES = ['success', 'failure', 'pending', 'approved', 'rejected', 'recorded'];

/** Written as literals at their construction sites. */
const LITERAL_STATUSES = ['waiting', 'suggested', 'needs setup', 'setup needed'];

/** `savedPlanStatusLabel` rewrites two of them before they reach the row. */
const LABELLED = ['approval pending', 'awaiting verification'];

/** An operational card reaches the row through `plan.status.replace(/-/g, ' ')`. */
const dehyphenated = (values: string[]) => values.map((value) => value.replace(/-/g, ' '));

const EVERY_STATUS = [
  ...SAVED_PLAN_STATUSES,
  ...dehyphenated(SAVED_PLAN_STATUSES),
  ...OPERATIONAL_PLAN_STATUSES,
  ...dehyphenated(OPERATIONAL_PLAN_STATUSES),
  ...RECEIPT_STATUSES,
  ...LITERAL_STATUSES,
  ...LABELLED
];

describe('the state vocabulary covers what the product produces', () => {
  it('maps or explicitly excuses every status', () => {
    const unhandled = EVERY_STATUS.filter(
      (status) => userFacingState(status) === null && !NON_STATE_STATUSES.has(status)
    );

    // An unmapped status renders no chip, so this failing means a row somewhere
    // shows no state at all and nothing else notices.
    expect(unhandled, `unmapped: ${[...new Set(unhandled)].join(', ')}`).toEqual([]);
  });

  it('never maps anything outside the closed set', () => {
    const strays = Object.entries(USER_FACING_STATE).filter(([, state]) => !ALLOWED.has(state));
    // The point of a small vocabulary is that it stays small.
    expect(strays.map(([raw, state]) => `${raw} -> ${state}`)).toEqual([]);
  });

  it('handles the hyphenated and spaced spelling of the same condition', () => {
    // The exact defect: two code paths produce one condition in two spellings,
    // and only one of them was mapped.
    for (const status of [...SAVED_PLAN_STATUSES, ...OPERATIONAL_PLAN_STATUSES]) {
      const spaced = status.replace(/-/g, ' ');
      if (status === spaced) continue;
      expect(userFacingState(status), status).toBe(userFacingState(spaced));
    }
  });

  it('routes every way of saying a plan awaits approval to one state', () => {
    for (const spelling of [
      'pending-approval',
      'pending approval',
      'approval pending',
      'pending'
    ]) {
      expect(userFacingState(spelling), spelling).toBe('Needs you');
    }
  });

  it('still refuses to guess at something it has never seen', () => {
    // The counter-case for the first test: mapping everything to a default would
    // satisfy it while destroying the reason the map exists.
    expect(userFacingState('a status nobody defined')).toBeNull();
  });
});

/**
 * The restated unions have to still be the real ones.
 *
 * A list of statuses copied into a test is a snapshot of the day it was written.
 * Adding a tenth `SavedPlanStatus` would leave this file testing nine and
 * passing, which is the failure mode where a guard quietly stops covering the
 * thing it names.
 */
describe('the restated unions match the source', () => {
  const union = (file: string, name: string): string[] => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    const declaration = source.slice(source.indexOf(`export type ${name}`));
    const body = declaration.slice(0, declaration.indexOf(';'));
    return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  };

  it('covers every SavedPlanStatus', () => {
    expect([...SAVED_PLAN_STATUSES].sort()).toEqual(
      union('src/types/domain.ts', 'SavedPlanStatus').sort()
    );
  });

  it('covers every OperationalPlanStatus', () => {
    expect([...OPERATIONAL_PLAN_STATUSES].sort()).toEqual(
      union('src/pages/mobile/PlanOperationalStudio.tsx', 'OperationalPlanStatus').sort()
    );
  });

  it('reads a union at all', () => {
    // Without this, a typo in the file path would return an empty list and both
    // checks above would compare nothing to nothing.
    expect(union('src/types/domain.ts', 'SavedPlanStatus').length).toBeGreaterThan(5);
  });
});
