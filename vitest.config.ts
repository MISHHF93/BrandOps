import { defineConfig } from 'vitest/config';
import os from 'node:os';

function cappedMaxWorkers(): number {
  const n = os.cpus().length;
  // Vitest 4 thread pools can hit "Timeout waiting for worker to respond" when many
  // workers start at once (seen on Windows under load). Cap parallelism for stability.
  return Math.max(1, Math.min(4, n));
}

export default defineConfig({
  test: {
    // Fork workers occasionally hit startup timeouts on Windows; threads stay responsive.
    pool: 'threads',
    maxWorkers: cappedMaxWorkers(),
    environment: 'node',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/'
      }
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    passWithNoTests: false
  }
});
