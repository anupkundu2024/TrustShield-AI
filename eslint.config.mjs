import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ...hooks.configs.flat.recommended, files: ['client/src/**/*.{ts,tsx}'] },
  prettier,
];
