#!/usr/bin/env node
/**
 * Runs Vitest for unit tests. With no extra args: all of tests/unit.
 * Scoped: npm run test:unit -- tests/unit/foo.test.ts
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const vitestMjs = path.join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs');
const passthrough = process.argv.slice(2);
const targets = passthrough.length > 0 ? passthrough : ['tests/unit'];

const result = spawnSync(process.execPath, [vitestMjs, 'run', ...targets], {
  stdio: 'inherit',
  cwd: process.cwd()
});

process.exit(result.status ?? 1);
