#!/usr/bin/env node
/**
 * Local inference smoke (Ollama OpenAI-compatible API). Does NOT bundle weights in git —
 * `pull` downloads the pinned model to your machine via Ollama.
 *
 * Prerequisites: https://ollama.com — install and leave Ollama running (tray app on Windows).
 *
 * Commands:
 *   npm run local:model:pull      — ollama pull <pinned model>
 *   npm run local:model:smoke     — POST /v1/chat/completions to localhost
 *   npm run local:model:env       — print BRANDOPS_MONITOR_* lines for monitor-ai-stack.mjs
 *
 * Override model: set BRANDOPS_LOCAL_OLLAMA_MODEL=my-model
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pinPath = path.join(root, 'scripts', 'data', 'local-default-model.json');

function loadPin() {
  const raw = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
  const modelFromEnv = process.env.BRANDOPS_LOCAL_OLLAMA_MODEL?.trim();
  return {
    baseUrl: raw.ollamaOpenAiBaseUrl || 'http://127.0.0.1:11434/v1',
    model: modelFromEnv || raw.model || 'llama3.2:1b'
  };
}

function ollamaOnPath() {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(cmd, ['ollama'], { encoding: 'utf8', shell: process.platform === 'win32' });
  return r.status === 0;
}

function cmdPull() {
  if (!ollamaOnPath()) {
    console.error(
      'Ollama CLI not found. Install from https://ollama.com then open the app so the server runs.'
    );
    process.exit(1);
  }
  const { model } = loadPin();
  console.log(`Pulling model "${model}" (first run may take a few minutes)...\n`);
  const r = spawnSync('ollama', ['pull', model], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  process.exit(r.status ?? 1);
}

async function cmdSmoke() {
  const { baseUrl, model } = loadPin();
  const chatUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  console.log(`POST ${chatUrl}`);
  console.log(`model: ${model}\n`);

  try {
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ollama',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say OK in one word.' }],
        max_tokens: 8,
        temperature: 0,
        stream: false
      }),
      signal: AbortSignal.timeout(120_000)
    });
    const text = await res.text();
    let preview = text;
    try {
      const j = JSON.parse(text);
      const c = j?.choices?.[0]?.message?.content;
      if (typeof c === 'string') preview = c.trim();
    } catch {
      /* raw body */
    }
    console.log(`HTTP ${res.status}`);
    console.log('Response:', preview.length > 600 ? `${preview.slice(0, 600)}…` : preview);
    if (!res.ok) {
      console.error(
        '\nSmoke FAILED. Is Ollama running? Try: ollama serve (or start the Ollama app).'
      );
      process.exit(1);
    }
    console.log('\nSmoke OK — local model responded.');
  } catch (e) {
    console.error('Smoke FAILED:', e instanceof Error ? e.message : e);
    console.error('Tip: install/start Ollama, run npm run local:model:pull, then retry.');
    process.exit(1);
  }
}

function cmdPrintEnv() {
  const { baseUrl, model } = loadPin();
  const key = 'ollama';
  console.log('# Paste into PowerShell:');
  console.log(`$env:BRANDOPS_MONITOR_INFERENCE_URL="${baseUrl}"`);
  console.log(`$env:BRANDOPS_MONITOR_API_KEY="${key}"`);
  console.log(`$env:BRANDOPS_MONITOR_CHAT_MODEL="${model}"`);
  console.log('npm run monitor:ai -- --live-only --chat');
  console.log('');
  console.log('# bash / zsh:');
  console.log(`export BRANDOPS_MONITOR_INFERENCE_URL="${baseUrl}"`);
  console.log(`export BRANDOPS_MONITOR_API_KEY="${key}"`);
  console.log(`export BRANDOPS_MONITOR_CHAT_MODEL="${model}"`);
  console.log('npm run monitor:ai -- --live-only --chat');
}

async function main() {
  const cmd = process.argv[2] || 'help';
  switch (cmd) {
    case 'pull':
      cmdPull();
      break;
    case 'smoke':
      await cmdSmoke();
      break;
    case 'print-env':
      cmdPrintEnv();
      break;
    default:
      console.log(`Usage: node scripts/setup-local-inference.mjs <pull|smoke|print-env>`);
      process.exit(cmd === 'help' ? 0 : 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
