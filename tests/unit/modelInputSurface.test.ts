/**
 * Every place that assembles a string for the model, enumerated.
 *
 * Cycle 12 fixed one such site after a probe found it. The obvious question was
 * how many others there are, and the answer could not be "the ones I thought to
 * check" — that is the same reasoning that left the Opportunity Engine unfenced
 * while the ASK attachment path next to it was hardened.
 *
 * Enumerating found three more with the identical defect: `predictiveAskPrompts`
 * interpolating twin memory and profession context, `predictivePlanConversion`
 * interpolating opportunity titles and supporting signals, and
 * `PlanOperationalStudio` interpolating the twin's voice, positioning, verified
 * facts and missing-info list. All workspace-derived, all raw, all in the same
 * `Field: value` shape that a value with a newline can forge.
 *
 * This test matches the *shape* of the problem rather than a list of files, so a
 * new command builder is in scope the day it is written. The `RECORDED` list
 * below is the honest part: entries there are interpolations reviewed and
 * accepted, each with a reason. It should only ever shrink.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

/**
 * Interpolations that are safe by construction, so the guard does not flag them.
 *
 * `quoteContextValue` is the fix. `JSON.stringify` is safe for a different
 * reason worth stating: it escapes quotes and newlines inside string values, so
 * embedded text cannot break out of the JSON structure into the surrounding
 * template — it stays visibly a value inside an object.
 */
const SAFE_EXPRESSION =
  /^(quoteContextValue\(|JSON\.stringify\(|titleCaseKind\(|String\(|Number\(|Math\.|quoted\.)/;

/**
 * Field names whose values come from a closed set the user cannot author —
 * enums, statuses, numbers, timestamps.
 *
 * A vocabulary rather than a list of expressions, so `task.status` and
 * `content.status` are both covered without either being enumerated. It is
 * matched against the final path segment **exactly and case-sensitively**, which
 * is the correction: the codemod that did this work used a case-insensitive
 * suffix match, and `item.whatAiDid` — free text describing what an agent did —
 * was skipped because it ends in the letters "id". A heuristic on names is only
 * as good as the names, so this one is deliberately narrow and anything outside
 * it must be quoted or recorded.
 */
const CLOSED_SET_FIELDS = new Set([
  'kind',
  'type',
  'status',
  'category',
  'state',
  'confidence',
  'count',
  'score',
  'dueAt',
  'createdAt',
  'updatedAt',
  'verb',
  'surface',
  'outcome',
  'actionType',
  'approvalGate'
]);

/** SCREAMING_CASE identifiers are module constants, authored here, not data. */
const MODULE_CONSTANT = /^[A-Z][A-Z0-9_]*$/;

function isClosedSet(expression: string): boolean {
  // Strip a `?? 'fallback'` tail, then take the final property segment.
  const base = expression.split('??')[0].trim();
  if (MODULE_CONSTANT.test(base)) return true;
  if (/^labels\[/.test(base)) return true;
  const segment = base.split('.').pop() ?? '';
  return CLOSED_SET_FIELDS.has(segment);
}

/**
 * Reviewed and accepted, with the reason. Never a place to park a finding.
 */
const RECORDED: Record<string, string> = {
  'expert.professionPath': 'closed set of profession identifiers',
  "expert.workflowType.replace(/_/g, ' ')": 'closed set of workflow identifiers',
  // The engine-authored framing of its own prompt, not workspace content.
  'prefix ? `${prefix}\\n\\n` : ...': 'engine-authored prefix, quoted internally',
  memoryContext: 'quoted at the call site',
  task: 'engine-authored task text',
  planningContext: 'assembled from values quoted above',
  prefix: 'assembled from values quoted above',
  missing: 'assembled from values quoted above',
  verified: 'quoted at the call site',
  askQuestion: "the user's own words, typed in this session",
  questionText: "the user's own words, typed in this session",
  trimmed: "the user's own words, typed in this session",
  action: 'engine-authored action label'
};

interface Finding {
  file: string;
  expression: string;
}

/**
 * Pull the `${...}` expressions out of every template literal that opens an
 * `ask:` command. Nesting is not handled in general — this matches the shape
 * these builders actually use, and a builder complex enough to defeat it is one
 * worth reading by hand anyway.
 */
function interpolationsInAskCommands(source: string): string[] {
  const found: string[] = [];
  const template = /`ask:[\s\S]*?`/g;
  for (const [literal] of source.matchAll(template)) {
    for (const [, expression] of literal.matchAll(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
      found.push(expression.trim());
    }
  }
  return found;
}

describe('the model-input surface', () => {
  const files = [...sourceFiles('src/pages'), ...sourceFiles('src/services')];

  it('finds the command builders at all', () => {
    // A guard that silently matches nothing is worse than no guard: it reads as
    // coverage. This is the check that the pattern still finds real sites.
    const withCommands = files.filter(
      (file) => interpolationsInAskCommands(readFileSync(file, 'utf8')).length > 0
    );
    expect(withCommands.length).toBeGreaterThanOrEqual(4);
  });

  it('quotes every workspace-derived value interpolated into a model command', () => {
    const findings: Finding[] = [];

    for (const file of files) {
      for (const expression of interpolationsInAskCommands(readFileSync(file, 'utf8'))) {
        if (!expression) continue;
        if (SAFE_EXPRESSION.test(expression)) continue;
        if (isClosedSet(expression)) continue;
        if (expression in RECORDED) continue;
        // An expression whose every interpolated part is already quoted.
        if (expression.includes('quoteContextValue(')) continue;
        findings.push({ file, expression });
      }
    }

    expect(
      findings.map((f) => `${f.file}: \${${f.expression}}`),
      'Unquoted interpolation into a model-bound command. Wrap it in ' +
        'quoteContextValue(), or add it to RECORDED with the reason it is safe.'
    ).toEqual([]);
  });

  it('keeps the recorded list from growing', () => {
    // Every entry is an interpolation someone decided not to quote. That list
    // getting longer is the guard being worked around rather than satisfied.
    expect(Object.keys(RECORDED).length).toBeLessThanOrEqual(13);
  });

  it('gives every recorded exemption a reason', () => {
    for (const [expression, reason] of Object.entries(RECORDED)) {
      expect(reason.length, expression).toBeGreaterThan(8);
    }
  });
});
