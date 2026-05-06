#!/usr/bin/env node
/**
 * Locks in artifact resonance: runs unit+perf → Vitest JSON + CSV (unless --skip-tests),
 * then applies deterministic predictor vs scripts/data/artifact-lock.json.
 *
 * Usage:
 *   npm run verify:artifacts
 *   node scripts/verify-artifact-lock.mjs --skip-tests   # uses existing reports/*.json + CSV
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { predictArtifactResonance } from './resonancePredictor.mjs';

const root = process.cwd();
const lockPath = path.join(root, 'scripts', 'data', 'artifact-lock.json');
const reportsDir = path.join(root, 'reports');
const jsonPath = path.join(reportsDir, 'vitest-unit-perf-last.json');
const csvPath = path.join(reportsDir, 'artifact-resonance-report.csv');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && c === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseRunSummaryStatus(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return null;
  const header = parseCsvLine(lines[0]);
  const tierIx = header.indexOf('tier');
  const catIx = header.indexOf('category');
  const statusIx = header.indexOf('status');
  if (tierIx < 0 || catIx < 0 || statusIx < 0) return null;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells[tierIx] === 'run_summary' && cells[catIx] === 'vitest_json') {
      return cells[statusIx] || null;
    }
  }
  return null;
}

function categoriesPresentInCsv(csvText, required) {
  /** @type {Set<string>} */
  const found = new Set();
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { found, missing: [...required] };
  const header = parseCsvLine(lines[0]);
  const catIx = header.indexOf('category');
  if (catIx < 0) return { found, missing: [...required] };
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const cat = cells[catIx];
    if (cat) found.add(cat.trim());
  }
  const missing = required.filter((c) => !found.has(c));
  return { found, missing };
}

const skipTests = process.argv.includes('--skip-tests');

if (!skipTests) {
  const gen = spawnSync(process.execPath, [path.join(root, 'scripts', 'generate-artifact-resonance-report.mjs')], {
    stdio: 'inherit',
    cwd: root
  });
  if (gen.status !== 0) process.exit(gen.status ?? 1);
}

if (!fs.existsSync(lockPath)) {
  console.error('Missing lock file:', lockPath);
  process.exit(1);
}
if (!fs.existsSync(jsonPath) || !fs.existsSync(csvPath)) {
  console.error('Missing reports. Run without --skip-tests or run: npm run report:resonance');
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const vitestRaw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const csvText = fs.readFileSync(csvPath, 'utf8');

const { missing } = categoriesPresentInCsv(csvText, lock.registryCategoriesRequired || []);

const obs = {
  vitestParsed: Boolean(vitestRaw && typeof vitestRaw.numPassedTests === 'number'),
  vitestSuccess: vitestRaw.success === true,
  passedTests: Number(vitestRaw.numPassedTests) || 0,
  failedTests: Number(vitestRaw.numFailedTests) || 0,
  minPassedTests: lock.vitestUnitPerf?.minPassedTests ?? 0,
  maxFailedTests: lock.vitestUnitPerf?.maxFailedTests ?? 0,
  requireVitestSuccess: lock.vitestUnitPerf?.requireVitestSuccess !== false,
  runSummaryStatus: parseRunSummaryStatus(csvText),
  missingRegistryCategories: missing
};

const result = predictArtifactResonance(obs);

console.log('\n── Resonance predictor (deterministic rules) ──\n');
console.log(`resonanceScore: ${result.resonanceScore.toFixed(4)}`);
console.log(`resonant: ${result.resonant}`);
console.log(`\n${result.interpretation}\n`);
for (const c of result.checks) {
  console.log(`${c.pass ? '[OK]' : '[FAIL]'} ${c.id}${c.detail ? ` — ${c.detail}` : ''}`);
}

process.exit(result.resonant ? 0 : 1);
