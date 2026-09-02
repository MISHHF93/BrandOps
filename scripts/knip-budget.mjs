/**
 * A ratchet on unreachable source.
 *
 * Knip was already installed and already configured, and the script ran it as
 * `knip --no-exit-code` — permanently in report mode, wired into no pipeline.
 * It had been reporting **120 unused exports** to nobody. That is the same
 * defect as the test suite's 211 unseen type errors: a detector that cannot
 * fail is a detector nobody reads.
 *
 * Two categories are held at zero rather than budgeted, because neither is the
 * slow accumulation that "debt" describes:
 *
 * - **unused files** — a whole module nothing reaches. There are none today,
 *   and one appearing means something was orphaned rather than deleted.
 * - **unlisted and unresolved dependencies** — an import that resolves only by
 *   luck of hoisting, or not at all. The test-suite ratchet found exactly this
 *   kind of thing: an import of a module that does not exist.
 *
 * Unused *exports* are budgeted, because they cannot honestly be cleared
 * in one pass and pretending otherwise produces mass deletion rather than
 * repair. The budget only moves down, and it must be lowered in the same commit
 * that lowers the count.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Lower this whenever the count drops. Never raise it.
 *
 * Counts unused exports **and** unused exported types together, since both are
 * surface nothing reaches.
 *
 * 133 when first gated (120 exports + 13 types). 128 after consolidating four
 * functions in `candidateMemory.ts` that `memoryFirewall.ts` re-declares under
 * the same names, and un-exporting one used only inside its own file.
 *
 * **What this number means changed at 118, and it is worth being precise about.**
 * Nine `featureRegistry.ts` functions were deleted for being unreferenced and
 * then restored, because an unlinked function is work that has not been
 * connected yet rather than work nobody wanted. Restoring them should have put
 * the count back to 128. It did not — it went to 118, because the test file that
 * now exercises them imports them, and Knip counts an import as a use.
 *
 * So this is no longer a count of *dead* exports. It is a count of exports that
 * are **neither wired nor exercised** — which is the more useful question
 * anyway. Unwired code with tests is a capability waiting for a caller. Unwired
 * code with nothing exercising it is code that will fail on the day someone
 * finally calls it.
 *
 * 107 after covering the agent-input validators, which is what the number is
 * for: every drop since 118 has come from exercising unwired code rather than
 * deleting it, and each pass has found a real defect in what it covered.
 */
const BUDGET = 107;

/**
 * Knip's `exports` map blocks `require.resolve` for both `bin/knip.js` and its
 * own `package.json`, so the path is built from this script's location instead.
 * That still pins the repository's installed copy — no shell, no `npx`, no
 * chance of picking up a different version than `npm ci` put there.
 */
const knipBin = fileURLToPath(new URL('../node_modules/knip/bin/knip.js', import.meta.url));

function runKnip() {
  try {
    return execFileSync(
      process.execPath,
      [knipBin, '--no-exit-code', '--no-config-hints', '--reporter', 'json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }
    );
  } catch (error) {
    console.error('knip failed to run:');
    console.error(`${error.stdout ?? ''}${error.stderr ?? ''}`.slice(0, 2000));
    process.exit(1);
  }
}

const raw = runKnip();
let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error('knip did not produce parseable JSON. First 500 characters:');
  console.error(raw.slice(0, 500));
  process.exit(1);
}

const issues = report.issues ?? [];
const count = (kind) => issues.reduce((total, entry) => total + (entry[kind]?.length ?? 0), 0);

const exportsUnused = count('exports') + count('types');
const files = (report.files ?? []).length;
const unlisted = count('unlisted') + count('unresolved');

console.log(`Unused exports and types: ${exportsUnused} (budget ${BUDGET})`);
console.log(`Unused files: ${files} (must be 0)`);
console.log(`Unlisted or unresolved imports: ${unlisted} (must be 0)`);

let failed = false;

if (files > 0) {
  console.error('');
  console.error(`FAIL: ${files} file(s) nothing reaches:`);
  for (const file of report.files ?? []) console.error(`     ${file}`);
  failed = true;
}

if (unlisted > 0) {
  console.error('');
  console.error('FAIL: an import that does not resolve, or a dependency nothing declares:');
  for (const entry of issues) {
    for (const kind of ['unlisted', 'unresolved']) {
      for (const item of entry[kind] ?? []) {
        console.error(`     ${entry.file}: ${item.name ?? item}`);
      }
    }
  }
  failed = true;
}

if (exportsUnused > BUDGET) {
  console.error('');
  console.error(
    `FAIL: ${exportsUnused} unused exports and types, budget is ${BUDGET}. ` +
      `Wire the new one up or remove it — the budget only moves down.`
  );
  failed = true;
} else if (exportsUnused < BUDGET) {
  console.error('');
  console.error(
    `FAIL: ${exportsUnused} unused exports and types, below the budget of ${BUDGET}. ` +
      `Lower BUDGET in scripts/knip-budget.mjs to ${exportsUnused} in this commit, ` +
      `so the ratchet keeps its grip.`
  );
  failed = true;
}

if (failed) process.exit(1);
console.log('At budget.');
