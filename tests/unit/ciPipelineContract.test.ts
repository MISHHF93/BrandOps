/**
 * The pipeline has to be able to pass, or none of this gates anything.
 *
 * Twenty-two cycles of verification are worth what CI enforces of them, and CI
 * could not have been green. Two independent reasons, one inherited and one
 * mine.
 *
 * **Prettier failed on 132 files** — 126 of them predating this work. `npm run
 * format` is `prettier --check .`, a hard step in the workflow, so the job was
 * failing before a single test ran. That is what "CI runs an older tree" in the
 * scorecard actually meant.
 *
 * **The steps ran in an order my own tests had broken.** Cycles 14 and 20 added
 * suites that verify the *shipped artifact* — bundle weight, and whether the
 * auth gate survives minification. Both fail rather than skip when `dist/` is
 * absent, deliberately: an unverified build must not pass as a verified one. CI
 * ran tests before the build, so on a clean checkout six of them failed. I
 * introduced that and did not notice for eight cycles, because locally `dist/`
 * always existed.
 *
 * The lesson is the same one this codebase keeps teaching: a check that only
 * runs in an environment where it happens to work is not a check. These tests
 * assert the workflow's shape so the ordering cannot quietly regress.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WORKFLOW = '.github/workflows/ci.yml';

function ciSteps(): string[] {
  const source = readFileSync(WORKFLOW, 'utf8');
  return Array.from(source.matchAll(/^\s*- name: (.+)$/gm)).map((match) => match[1].trim());
}

function commandFor(stepName: string): string {
  const source = readFileSync(WORKFLOW, 'utf8');
  const pattern = new RegExp(
    `- name: ${stepName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,200}?run: (.+)`
  );
  return source.match(pattern)?.[1].trim() ?? '';
}

describe('the CI workflow', () => {
  it('builds before it tests', () => {
    const steps = ciSteps();
    const build = steps.findIndex((step) => /build/i.test(step));
    const test = steps.findIndex((step) => /^run tests/i.test(step));

    expect(build, 'no build step found').toBeGreaterThanOrEqual(0);
    expect(test, 'no test step found').toBeGreaterThanOrEqual(0);
    // `bundleBudget` and `launchGateContract` read `dist/`. They fail rather
    // than skip when it is missing, so this ordering is a hard requirement, not
    // a preference.
    expect(build, 'tests run before the build — artifact tests will fail').toBeLessThan(test);
  });

  it('runs the checks this work has been verified against', () => {
    const commands = ciSteps()
      .map((step) => commandFor(step))
      .join(' ; ');
    // Each of these caught something real in this codebase. A pipeline missing
    // one of them is a pipeline that would not have caught it. Compared as whole
    // commands: `npm run test:integration` contains `npm run test`, so a
    // substring check here would survive deleting the unit-test step.
    const steps = commands.split(' ; ').map((entry) => entry.trim());
    for (const required of [
      'npm run check',
      'npm run format',
      'npm run build',
      'npm run test && npm run test:integration'
    ]) {
      expect(steps, `${required} is not a step in the workflow`).toContain(required);
    }
  });

  it('verifies the artifact it just built', () => {
    const commands = ciSteps()
      .map((step) => commandFor(step))
      .join(' ; ');
    expect(commands).toContain('npm run verify:dist');
  });

  it('keeps formatting enforced rather than advisory', () => {
    // `prettier --check` fails the build; `--write` would silently rewrite and
    // pass. The difference is whether the rule is enforced or merely present.
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
    expect(scripts.format).toContain('--check');
    expect(scripts.format).not.toContain('--write');
  });

  it('gates on the whole suite, not a subset', () => {
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
    // `vitest run` with no path argument. A narrowed pattern here would quietly
    // shrink what CI enforces while every local run still looked complete.
    expect(scripts.test.trim()).toBe('vitest run');
  });
});

/**
 * The release workflow, which is the one that produces what users install.
 *
 * It ran `npm ci`, `npm run build`, `verify:dist`, `package:release` and
 * uploaded a Chrome Web Store tarball. No `check`, no `format`, no tests. The CI
 * workflow triggers on pushes to `main` and on pull requests; this one triggers
 * on any `v*` tag. Nothing connected them, so a tag pushed at a commit that had
 * never been tested would still produce a signed-and-shipped artifact.
 *
 * Twenty-four cycles of verification only mean something if the thing that ships
 * is the thing that was verified.
 */
describe('the release workflow', () => {
  const RELEASE = '.github/workflows/release-artifacts.yml';
  const release = () => readFileSync(RELEASE, 'utf8');

  function jobNames(source: string): string[] {
    const body = source.slice(source.indexOf(String.fromCharCode(10) + 'jobs:'));
    return Array.from(body.matchAll(/^ {2}([a-z][a-z0-9-]*):$/gm)).map((match) => match[1]);
  }

  it('has a quality job that runs the whole suite', () => {
    const source = release();
    expect(jobNames(source)).toContain('quality');
    /**
     * Matched as whole steps, not as substrings.
     *
     * The first version used `toContain('npm run test')`, which
     * `npm run test:integration` satisfies — so deleting the step that runs the
     * unit suite left the guard green. A check a different line can satisfy is
     * not a check on the line it names.
     */
    for (const step of [
      'npm run check',
      'npm run format',
      'npm run test',
      'npm run test:integration',
      'npm run build',
      'npm run verify:dist'
    ]) {
      // No escaping needed: these step names contain no regex metacharacters.
      const wholeStep = new RegExp('- run: ' + step + '\\s*$', 'm');
      expect(wholeStep.test(source), `${step} missing from the release workflow`).toBe(true);
    }
  });

  it('gates every artifact job on it', () => {
    const source = release();
    const artifactJobs = jobNames(source).filter((job) => job !== 'quality');

    // Each job that uploads something users receive.
    expect(artifactJobs.length).toBeGreaterThan(0);
    for (const job of artifactJobs) {
      const block = source.slice(source.indexOf(`  ${job}:`));
      const declaration = block.slice(0, block.indexOf('steps:'));
      expect(declaration, `${job} does not depend on quality`).toContain('needs: quality');
    }
  });

  it('builds before it tests here too', () => {
    const source = release();
    const quality = source.slice(
      source.indexOf('  quality:'),
      source.indexOf('  chrome-extension:')
    );
    // Same requirement as CI, for the same reason: the artifact tests read
    // `dist/` and fail rather than skip without it.
    expect(quality.indexOf('npm run build')).toBeLessThan(quality.indexOf('npm run test'));
  });

  it('verifies the artifact in every job that produces one', () => {
    const source = release();
    for (const job of jobNames(source).filter((name) => name !== 'quality')) {
      const start = source.indexOf(`  ${job}:`);
      const rest = jobNames(source).filter((name) => name !== job);
      const nextStarts = rest
        .map((name) => source.indexOf(`  ${name}:`, start + 1))
        .filter((index) => index > start);
      const block = source.slice(start, nextStarts.length ? Math.min(...nextStarts) : undefined);
      expect(block, `${job} packages without verifying dist/`).toContain('npm run verify:dist');
    }
  });
});
