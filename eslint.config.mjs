import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react'; // הוסיפי את זה

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'eslint.config.mjs'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // זה השורה הקריטית שתפתור את השגיאה
        },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      prettier: prettierPlugin,
      react: reactPlugin, // הוסיפי את הפלאגין
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules, // הוסיפי חוקי בסיס לריאקט
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off', // בגרסאות חדשות לא חייבים import React בכל קובץ
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  prettierConfig,
];