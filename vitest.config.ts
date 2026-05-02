import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
