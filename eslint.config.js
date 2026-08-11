import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/stockfish*.js', 'public/stockfish/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // The repository has an existing dead-code cleanup backlog. Keep lint
      // focused on correctness until that work can be handled separately.
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
    },
  },
];
