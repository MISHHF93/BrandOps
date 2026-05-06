#!/usr/bin/env node
/**
 * Runs Vitest for integration tests. With no extra args: all of tests/integration.
 * Scoped: npm run test:integration -- tests/integration/foo.test.ts
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const vitestMjs = path.join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs');
const passthrough = process.argv.slice(2);
const targets = passthrough.length > 0 ? passthrough : ['tests/integration'];

const result = spawnSync(process.execPath, [vitestMjs, 'run', ...targets], {
  stdio: 'inherit',
  cwd: process.cwd()
});

process.exit(result.status ?? 1);
