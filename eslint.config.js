import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'android/**']
  },
  js.configs.recommended,
  {
    /**
     * The service worker runs in a worker scope, not a page: `self`, `caches`,
     * `clients` and `skipWaiting` are globals there and undefined here.
     */
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser
      }
    }
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.es2022,
        chrome: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      /**
       * The base rule cannot see a TypeScript overload.
       *
       * It reads the signatures preceding an implementation as redeclarations
       * and errors on every one, so it rejects the construct outright — giving
       * `evaluateGoalHealth` the overloads its implementation always had was
       * blocked by lint, not by the compiler. The TypeScript-aware version
       * understands them and still catches genuine redeclarations.
       */
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', 'vitest.config.*'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        RequestInfo: 'readonly'
      }
    }
  }
];
