import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.output', '.wxt', 'coverage'] },
  ...tseslint.configs.recommended,
  { rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] } },
);
