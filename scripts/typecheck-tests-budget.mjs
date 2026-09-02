/**
 * A ratchet on the test suite's type errors.
 *
 * `tsconfig.tests.json` and the `typecheck:tests` script both existed, and
 * **nothing ran either of them** — not `check`, not `verify`, not `release`, not
 * CI. So the tests had accumulated **211 type errors** unseen, including an
 * import of `src/pages/mobile/mobileShellTabs`, a module that does not exist.
 * `vitest` transpiles without checking types, so the suite went green over a
 * broken reference.
 *
 * Fixing all 211 in one go is not the point and would not stick. What stops the
 * number growing back is a gate, so this is a budget: the count may fall freely
 * and may never rise. When it falls, the budget is lowered here in the same
 * commit, which is the only way a ratchet stays tight.
 *
 * Two errors are held at zero rather than budgeted, because neither is debt:
 *
 * - **TS2307**, a module that cannot be resolved. That is a broken import, and
 *   the reason this script exists.
 * - **TS2820**, a value not assignable where the compiler can name the intended
 *   one. It is nearly always a typo in a literal union.
 *
 * Everything else — implicit `any`, loose casts in fixtures — is real debt worth
 * paying down deliberately rather than in a rush.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * The compiler binary, resolved rather than shelled to.
 *
 * `npx tsc` needs `shell: true` on Windows, and Node warns that arguments are
 * then concatenated rather than escaped. Resolving TypeScript's own entry point
 * and running it under this Node avoids the shell entirely and picks the
 * repository's pinned compiler rather than whatever `npx` finds.
 */
const tscBin = createRequire(import.meta.url).resolve('typescript/bin/tsc');

/**
 * Lower this whenever the count drops. Never raise it.
 *
 * 211 when first measured. 210 after repairing the broken import, 209 after the
 * phantom `evidence.search` capability, 177 after giving `evaluateGoalHealth`
 * the overloads its implementation always had, and 157 after typing the
 * evidence-ledger fixture — which turned up three `{ type: 'repository' }`
 * entity refs, a type that does not exist.
 *
 * 129 after adding `@types/jsdom`. `jsdom` was already a dependency and its
 * types were simply absent, so nine files imported it as `any` and every value
 * derived from it became `unknown` — thirty-two errors from one missing package.
 * Types-only, MIT, no runtime code, and `npm audit` reports nothing.
 */
const BUDGET = 129;

/** Errors that are breakage rather than debt, and are therefore not budgeted. */
const NEVER = {
  TS2307: 'unresolved module — a broken import',
  TS2820: 'value not assignable, compiler can name the intended one — usually a typo'
};

function typecheck() {
  try {
    execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.tests.json', '--noEmit'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return '';
  } catch (error) {
    // A non-zero exit is the expected path while a budget remains.
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

const output = typecheck();
const lines = output.split('\n').filter((line) => / error TS\d+: /.test(line));
const count = lines.length;

const byCode = new Map();
for (const line of lines) {
  const code = line.match(/ error (TS\d+): /)?.[1];
  if (code) byCode.set(code, (byCode.get(code) ?? 0) + 1);
}

const byFile = new Map();
for (const line of lines) {
  const file = line.match(/^([^(]+)\(/)?.[1];
  if (file) byFile.set(file, (byFile.get(file) ?? 0) + 1);
}

const forbidden = Object.keys(NEVER)
  .map((code) => ({ code, count: byCode.get(code) ?? 0 }))
  .filter((entry) => entry.count > 0);

console.log(`Test type errors: ${count} (budget ${BUDGET})`);
if (count > 0) {
  const worst = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [file, n] of worst) console.log(`  ${String(n).padStart(3)}  ${file}`);
}

if (forbidden.length) {
  console.error('');
  for (const entry of forbidden) {
    console.error(`FAIL ${entry.code} x${entry.count} — ${NEVER[entry.code]}`);
    for (const line of lines.filter((l) => l.includes(` ${entry.code}: `))) {
      console.error(`     ${line.trim()}`);
    }
  }
  process.exit(1);
}

if (count > BUDGET) {
  console.error('');
  console.error(
    `FAIL: ${count} type errors in tests, budget is ${BUDGET}. ` +
      `Fix the new ones — the budget only moves down.`
  );
  process.exit(1);
}

if (count < BUDGET) {
  console.error('');
  console.error(
    `FAIL: ${count} type errors, below the budget of ${BUDGET}. ` +
      `Lower BUDGET in scripts/typecheck-tests-budget.mjs to ${count} in this commit, ` +
      `so the ratchet keeps its grip.`
  );
  process.exit(1);
}

console.log('At budget.');
