import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // Build-time constants injected by vite.config.js via `define`.
        __APP_VERSION__: 'readonly',
        __APP_SEMVER__: 'readonly',
        __BUILD_TIME__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // These React 19 preview rules are over-cautious for this codebase:
      //
      // - set-state-in-effect: fires on any "load from localStorage / fetch
      //   on mount" pattern, which is normal React. The suggested
      //   alternative (lazy initial state) can't be used when the value
      //   depends on async data. Downgrade to warn so CI still fires on
      //   genuinely bad patterns during dev.
      //
      // - react-hooks/immutability: fires on `let x = 0; arr.map(() => x += …)`
      //   patterns inside render, even when x is declared AFTER any hooks
      //   and used purely as a scratch accumulator. Downgrade to warn.
      //
      // - react-refresh/only-export-components: fires whenever a file
      //   exports both a component and a hook (every Context file in React).
      //   Would require splitting Provider / Hook into separate files —
      //   worth a dedicated refactor, not a blocker. Downgrade to warn.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  // Node-context files: vite.config.js, Vercel API routes, and *.test.js.
  {
    files: ['vite.config.js', 'api/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: 'readonly',
        __APP_SEMVER__: 'readonly',
        __BUILD_TIME__: 'readonly',
      },
    },
  },
])
