// ESLint flat config for Next.js + TypeScript
import nextPlugin from 'eslint-config-next';

export default [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  // Reuse Next.js recommended configuration
  ...nextPlugin(),
];

