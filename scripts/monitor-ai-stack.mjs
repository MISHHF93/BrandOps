#!/usr/bin/env node
/**
 * Visible terminal monitor for AI-related code paths (Vitest + optional live HTTP probes).
 *
 * Files / commands:
 *   npm run monitor:ai
 *       → runs Vitest only (mocked HTTP; validates gateway code paths).
 *
 *   npm run monitor:ai -- --live-only
 *       → skips Vitest; hits your real OpenAI-compatible API (fast local smoke).
 *
 *   npm run monitor:ai -- --live
 *       → Vitest + GET /v1/models
 *
 *   npm run monitor:ai -- --live-only --chat
 *       → GET /v1/models + POST /v1/chat/completions (needs BRANDOPS_MONITOR_CHAT_MODEL).
 *
 * Env (never commit keys):
 *   BRANDOPS_MONITOR_INFERENCE_URL   e.g. https://api.openai.com/v1
 *   BRANDOPS_MONITOR_API_KEY         Bearer token
 *   BRANDOPS_MONITOR_CHAT_MODEL      e.g. gpt-4o-mini (required when using --chat)
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

function joinOpenAiCompatibleUrl(base, segment) {
  const b = base.trim().replace(/\/+$/, '');
  const s = segment.replace(/^\/+/, '');
  return `${b}/${s}`;
}

const root = process.cwd();
const vitestMjs = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');

/** Focused suite: gateway, embeddings, traces, LLM parsing, hosted turn, settings planner, policy */
const AI_TEST_FILES = [
  'tests/unit/nlpInferenceGateway.test.ts',
  'tests/unit/contentEmbeddingsPipeline.test.ts',
  'tests/unit/aiGatewayTracing.test.ts',
  'tests/unit/llmStructuredApply.test.ts',
  'tests/unit/hostedAskTurn.test.ts',
  'tests/unit/aiSettingsMode.test.ts',
  'tests/unit/aiRuntimePolicy.test.ts'
];

async function liveModelsProbe(base, key) {
  const url = joinOpenAiCompatibleUrl(base, 'models');
  console.log(`GET ${url}`);
  console.log('Timeout 15s …\n');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000)
  });
  const text = await res.text();
  const preview = text.length > 400 ? `${text.slice(0, 400)}…` : text;
  console.log(`HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) {
    console.log('Body preview:', preview);
    return false;
  }
  console.log('Body preview:', preview);
  console.log('\n[v1/models] OK — auth and base URL look usable.\n');
  return true;
}

async function liveChatProbe(base, key, model) {
  const url = joinOpenAiCompatibleUrl(base, 'chat/completions');
  console.log(`POST ${url}`);
  console.log(`model: ${model}`);
  console.log('Timeout 60s …\n');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly one word: OK' }],
      max_tokens: 16,
      temperature: 0
    }),
    signal: AbortSignal.timeout(60_000)
  });

  const text = await res.text();
  let assistantPreview = text;
  try {
    const parsed = JSON.parse(text);
    const choice = parsed?.choices?.[0]?.message?.content;
    if (typeof choice === 'string') assistantPreview = choice.trim();
  } catch {
    assistantPreview = text.length > 500 ? `${text.slice(0, 500)}…` : text;
  }

  console.log(`HTTP ${res.status} ${res.statusText}`);
  if (!res.ok) {
    console.log('Body preview:', assistantPreview);
    return false;
  }
  console.log('Assistant output:', assistantPreview);
  console.log('\n[v1/chat/completions] OK — model responded.\n');
  return true;
}

async function liveProbe(opts) {
  const { wantChat } = opts;
  const base = process.env.BRANDOPS_MONITOR_INFERENCE_URL?.trim();
  const key = process.env.BRANDOPS_MONITOR_API_KEY?.trim();
  const chatModel = process.env.BRANDOPS_MONITOR_CHAT_MODEL?.trim();

  console.log('\n── Live HTTP probes (OpenAI-compatible API) ──\n');

  if (!base || !key) {
    console.log('Skipped (no credentials in env).\n');
    console.log('  PowerShell:');
    console.log('    $env:BRANDOPS_MONITOR_INFERENCE_URL="https://api.example.com/v1"');
    console.log('    $env:BRANDOPS_MONITOR_API_KEY="your-key"');
    console.log('    npm run monitor:ai -- --live-only\n');
    console.log('  Optional chat smoke (real completion):');
    console.log('    $env:BRANDOPS_MONITOR_CHAT_MODEL="gpt-4o-mini"');
    console.log('    npm run monitor:ai -- --live-only --chat\n');
    return;
  }

  let ok = true;

  try {
    ok = (await liveModelsProbe(base, key)) && ok;
  } catch (e) {
    console.error('GET /v1/models failed:', e instanceof Error ? e.message : e);
    ok = false;
  }

  if (wantChat) {
    if (!chatModel) {
      console.error('[FAIL] --chat requires BRANDOPS_MONITOR_CHAT_MODEL (e.g. gpt-4o-mini).');
      ok = false;
    } else {
      try {
        ok = (await liveChatProbe(base, key, chatModel)) && ok;
      } catch (e) {
        console.error('POST /v1/chat/completions failed:', e instanceof Error ? e.message : e);
        ok = false;
      }
    }
  } else if (chatModel) {
    console.log(`Tip: add --chat to also POST /v1/chat/completions using BRANDOPS_MONITOR_CHAT_MODEL=${chatModel}\n`);
  }

  if (!ok) process.exitCode = 1;
}

async function main() {
  const liveOnly = process.argv.includes('--live-only');
  const live = process.argv.includes('--live') || liveOnly;
  const wantChat = process.argv.includes('--chat');

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║ BrandOps AI monitor                                               ║
║ • Vitest = code paths (mock HTTP).                                ║
║ • --live-only = your real API (/v1/models [+ optional --chat]).   ║
╚══════════════════════════════════════════════════════════════════╝
`);

  if (!liveOnly) {
    console.log('Packages under test (Vitest files):\n ', AI_TEST_FILES.join('\n  '), '\n');

    const run = spawnSync(process.execPath, [vitestMjs, 'run', ...AI_TEST_FILES, '--reporter=verbose'], {
      stdio: 'inherit',
      cwd: root
    });

    if (run.status !== 0) {
      process.exit(run.status ?? 1);
    }

    console.log('\n── Summary ──');
    console.log('Vitest AI-focused suite: PASSED');
    console.log('CSV artifact map (full workspace): npm run report:resonance\n');
  } else {
    console.log('(--live-only: skipping Vitest)\n');
  }

  if (live) {
    await liveProbe({ wantChat });
  } else {
    console.log(
      'Tip: npm run monitor:ai -- --live-only  (with BRANDOPS_MONITOR_* env) for real API smoke.\n'
    );
  }
}

main();
