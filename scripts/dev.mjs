/**
 * Starts Vite on 5173 with strictPort. On Windows, frees any process already listening on 5173
 * (stale `vite` from a closed terminal, Cursor preview, etc.) so `npm run dev` does not fail.
 */
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function freePort5173() {
  if (process.platform === 'win32') {
    try {
      execSync(
        'powershell -NoProfile -Command "' +
          "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | " +
          'ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }' +
          '"',
        { stdio: 'pipe' }
      );
    } catch {
      /* ignore — nothing listening or access denied */
    }
    return;
  }
  try {
    execSync('lsof -ti:5173 | xargs kill -9', { shell: true, stdio: 'pipe' });
  } catch {
    /* ignore */
  }
}

freePort5173();

const viteCli = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const child = spawn(process.execPath, [viteCli, '--port', '5173', '--strictPort'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
