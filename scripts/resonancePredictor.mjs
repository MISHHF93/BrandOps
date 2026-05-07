/**
 * Deterministic "predictive" resonance gate — weighted rule checks, no neural net.
 * @param {object} obs
 * @param {boolean} obs.vitestParsed
 * @param {boolean} obs.vitestSuccess
 * @param {number} obs.passedTests
 * @param {number} obs.failedTests
 * @param {number} obs.minPassedTests
 * @param {number} obs.maxFailedTests
 * @param {boolean} obs.requireVitestSuccess
 * @param {string|null} obs.runSummaryStatus
 * @param {string[]} obs.missingRegistryCategories
 */
export function predictArtifactResonance(obs) {
  /** @type {{ id: string; pass: boolean; detail?: string }[]} */
  const checks = [];

  checks.push({
    id: 'vitest_report_present',
    pass: obs.vitestParsed,
    detail: obs.vitestParsed ? undefined : 'Missing or invalid Vitest JSON'
  });

  checks.push({
    id: 'vitest_success_flag',
    pass: !obs.requireVitestSuccess || obs.vitestSuccess === true,
    detail: obs.vitestSuccess === true ? undefined : `vitest success=${obs.vitestSuccess}`
  });

  checks.push({
    id: 'zero_failed_tests',
    pass: obs.failedTests <= obs.maxFailedTests,
    detail: `failedTests=${obs.failedTests} maxAllowed=${obs.maxFailedTests}`
  });

  checks.push({
    id: 'min_passed_tests',
    pass: obs.passedTests >= obs.minPassedTests,
    detail: `passedTests=${obs.passedTests} minRequired=${obs.minPassedTests}`
  });

  checks.push({
    id: 'run_summary_row_passed',
    pass: obs.runSummaryStatus === 'passed',
    detail: `run_summary status=${obs.runSummaryStatus ?? '(missing)'}`
  });

  checks.push({
    id: 'registry_categories_complete',
    pass: obs.missingRegistryCategories.length === 0,
    detail:
      obs.missingRegistryCategories.length === 0
        ? undefined
        : `missing: ${obs.missingRegistryCategories.join(', ')}`
  });

  const passed = checks.filter((c) => c.pass).length;
  const resonanceScore = checks.length ? passed / checks.length : 0;

  return {
    resonant: resonanceScore === 1,
    resonanceScore,
    checks,
    interpretation:
      resonanceScore === 1
        ? 'All resonance gates passed — artifacts align with locked expectations.'
        : 'One or more gates failed — inspect checks[].detail.'
  };
}
