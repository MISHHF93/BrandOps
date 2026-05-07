#!/usr/bin/env node
/**
 * Runs unit + performance Vitest suites (unless --skip-tests), writes JSON to reports/,
 * and emits reports/artifact-resonance-report.csv mapping code artifacts ↔ verification.
 *
 * There is no in-repo neural training/runtime; ML-adjacent rows label gateways, embeddings,
 * and rule packs exercised by deterministic tests.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const vitestMjs = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
const jsonPath = path.join(reportsDir, 'vitest-unit-perf-last.json');
const csvPath = path.join(reportsDir, 'artifact-resonance-report.csv');

function csvEscape(s) {
  if (s === undefined || s === null) return '';
  const t = String(s);
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function row(cells) {
  return cells.map(csvEscape).join(',');
}

/** Repo-relative posix path */
function relPosix(absPath) {
  let rel = path.relative(root, absPath).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) return absPath.split(path.sep).join('/');
  return rel;
}

const ARTIFACT_REGISTRY = [
  {
    tier: 'data_plane',
    category: 'workspace_json',
    name: 'BrandOps workspace persistence',
    key_path: 'src/services/storage/storage.ts',
    resonates_with: 'exportData/importData; normalizeWorkspaceSettings',
    verification: 'tests/unit/storageService.test.ts',
    notes: 'Full workspace JSON is canonical persistence boundary.'
  },
  {
    tier: 'observability',
    category: 'operator_traces',
    name: 'Sanitized operator trace ring buffer + JSONL export',
    key_path: 'src/services/dataset/operatorTraces.ts',
    resonates_with: 'storage.exportOperatorTracesJsonl; agent + gateway tracing hooks',
    verification: 'tests/unit/operatorTraces.test.ts',
    notes: 'Caps,sanitizes details; metadata line on JSONL export.'
  },
  {
    tier: 'ai_adjacent',
    category: 'nlp_gateway',
    name: 'OpenAI-compatible HTTP inference/embeddings adapter',
    key_path: 'src/services/ai/nlpInferenceGateway.ts',
    resonates_with: 'Chat completions; embedding batches when adapter enabled',
    verification: 'tests/unit/nlpInferenceGateway.test.ts',
    notes: 'Mocked fetch in tests; no bundled model weights.'
  },
  {
    tier: 'ai_adjacent',
    category: 'embeddings',
    name: 'Content embedding pipeline helpers',
    key_path: 'src/services/ai/contentEmbeddingsPipeline.ts',
    resonates_with: 'embeddingIndex on BrandOpsData; sync routes',
    verification: 'tests/unit/contentEmbeddingsPipeline.test.ts',
    notes: 'Deterministic text merge / vector bookkeeping helpers.'
  },
  {
    tier: 'ai_adjacent',
    category: 'llm_structure',
    name: 'LLM structured command extraction',
    key_path: 'src/services/ai/llmStructuredApply.ts',
    resonates_with: 'hostedAskTurn; agent command guardrails',
    verification: 'tests/unit/llmStructuredApply.test.ts',
    notes: 'Parses fenced JSON / fingerprints; allow-list enforcement.'
  },
  {
    tier: 'ai_adjacent',
    category: 'gateway_trace',
    name: 'Post-gateway trace persistence (no raw prompts)',
    key_path: 'src/services/ai/aiGatewayTracing.ts',
    resonates_with: 'prependOperatorTrace on chat/embeddings outcomes',
    verification: 'tests/unit/aiGatewayTracing.test.ts',
    notes: 'Character-count telemetry only in traced payload.'
  },
  {
    tier: 'rules_pack',
    category: 'intelligence_rules',
    name: 'Bundled / fetched intelligence rules runtime',
    key_path: 'src/rules/intelligenceRulesRuntime.ts',
    resonates_with: 'Today digest heat signals; optional remote JSON pack',
    verification: 'tests/unit/intelligenceRulesRuntime.test.ts',
    notes: 'Rule weights JSON — not a neural network checkpoint.'
  },
  {
    tier: 'compute',
    category: 'local_intelligence',
    name: 'Heuristic ranking (content, outreach, pipeline)',
    key_path: 'src/services/intelligence/localIntelligence.ts',
    resonates_with: 'Cockpit snapshot; performance smoke imports same module',
    verification: 'tests/unit/localIntelligence.test.ts; tests/performance/core-smoke.test.ts',
    notes: 'Deterministic scoring — exercised under perf budgets.'
  },
  {
    tier: 'unified_ops',
    category: 'operating_profile',
    name: 'Operating profile presets + planner expansion',
    key_path: 'src/shared/workspace/operatingProfileCatalog.ts; src/services/ai/aiSettingsMode.ts',
    resonates_with: 'Settings configure:apply; lastAppliedPresetId persistence',
    verification: 'tests/unit/aiSettingsMode.test.ts; tests/unit/settingsNormalizationContract.test.ts',
    notes: 'Phase A–C unified modes.'
  },
  {
    tier: 'native_ml',
    category: 'native_tiny_mlp',
    name: 'Committed toy MLP (hash segments → scaled-dot attention pool → ReLU MLP → softmax)',
    key_path:
      'scripts/lib/nativeTinyMlp.mjs; scripts/lib/nativeWorkContext.mjs; scripts/lib/nativeStructuredArtifacts.mjs; scripts/data/native-mlp-weights.json',
    resonates_with:
      'npm run native:model:run — offline intent probe; workspace exports fuse operator profile + live work slots + resume; optional --structured-json graph mirrors BrandOpsData; no vendor APIs',
    verification:
      'tests/unit/nativeTinyModel.test.ts; tests/unit/nativeStructuredArtifacts.test.ts; scripts/train-native-model.mjs; scripts/lib/nativeResumeArtifacts.mjs; scripts/lib/nativeArtifactUtils.mjs',
    notes:
      'Dual rail: pipe-separated fusion segments + parallel JSON (`buildNativeStructuredArtifactPackage`) + `graphEdges` for annotation; resume facets via `extractResumeArtifactRecord`.'
  }
];

fs.mkdirSync(reportsDir, { recursive: true });

const skipTests = process.argv.includes('--skip-tests');
if (!skipTests) {
  const result = spawnSync(
    process.execPath,
    [
      vitestMjs,
      'run',
      'tests/unit',
      'tests/performance',
      '--reporter=json',
      `--outputFile=${jsonPath}`
    ],
    { stdio: 'inherit', cwd: root }
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const reportIso = new Date(raw.startTime).toISOString();

const lines = [];

lines.push(
  row([
    'tier',
    'category',
    'name',
    'key_path',
    'resonates_with',
    'verification',
    'status',
    'duration_ms',
    'test_count',
    'report_iso',
    'notes'
  ])
);

lines.push(
  row([
    'run_summary',
    'vitest_json',
    'unit_plus_performance',
    relPosix(jsonPath),
    'Vitest JSON reporter output',
    relPosix(jsonPath),
    raw.success ? 'passed' : 'failed',
    '',
    String(raw.numTotalTests),
    reportIso,
    `passed_tests=${raw.numPassedTests} failed_tests=${raw.numFailedTests} suites_pass=${raw.numPassedTestSuites}`
  ])
);

for (const entry of ARTIFACT_REGISTRY) {
  lines.push(
    row([
      entry.tier,
      entry.category,
      entry.name,
      entry.key_path,
      entry.resonates_with,
      entry.verification,
      'registry',
      '',
      '',
      reportIso,
      entry.notes
    ])
  );
}

for (const tr of raw.testResults ?? []) {
  const filePath = relPosix(tr.name);
  const perfLayer = filePath.includes('performance/') ? 'performance' : 'unit';
  const assertions = tr.assertionResults ?? [];
  const durationMs = assertions.reduce((acc, a) => acc + (Number(a.duration) || 0), 0);
  const status = tr.status === 'passed' ? 'passed' : tr.status === 'failed' ? 'failed' : String(tr.status ?? '');
  lines.push(
    row([
      perfLayer,
      'vitest_file',
      path.basename(filePath),
      filePath,
      'Vitest assertion suite',
      filePath,
      status,
      durationMs.toFixed(2),
      String(assertions.length),
      reportIso,
      assertions.length ? assertions.map((a) => a.title).slice(0, 3).join(' | ') : ''
    ])
  );
}

fs.writeFileSync(csvPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${relPosix(csvPath)} (${lines.length - 1} data rows + header)`);
