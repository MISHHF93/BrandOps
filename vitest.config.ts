import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Fork workers occasionally hit startup timeouts on Windows; threads stay responsive.
    pool: 'threads',
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
