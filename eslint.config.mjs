import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/prisma/**',
      '**/dist/**',
      '**/build/**',
      '*.json',
      '*.md',
      'eslint.config.mjs',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser, // חשוב עבור צד הלקוח (React)
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'prettier/prettier': 'error', // הופך שגיאות פריטייר לשגיאות לינטר
    },
  },
  prettierConfig, // מבטל חוקי ESLINT שמתנגשים עם Prettier
];