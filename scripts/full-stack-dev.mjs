import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const frontendArgs = process.argv.slice(2);

const children = [
  {
    name: 'backend',
    args: ['scripts/bridge-proxy-local.mjs']
  },
  {
    name: 'frontend',
    args: ['scripts/dev.mjs', ...frontendArgs]
  }
];

const running = new Set();
let shuttingDown = false;

function stopAll(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of running) {
    if (!child.killed) child.kill(signal);
  }
}

for (const entry of children) {
  const child = spawn(process.execPath, entry.args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });
  running.add(child);

  child.on('exit', (code, signal) => {
    running.delete(child);
    if (shuttingDown) return;
    if (code !== null && code !== 0) {
      console.error(`[full-stack-dev] ${entry.name} exited with code ${code}.`);
      stopAll();
      process.exit(code);
    }
    if (signal) {
      console.error(`[full-stack-dev] ${entry.name} exited via ${signal}.`);
      stopAll();
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => {
  stopAll('SIGINT');
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopAll('SIGTERM');
  process.exit(143);
});
