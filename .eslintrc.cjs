const { resolve } = require('node:path');

const project = resolve(__dirname, 'tsconfig.json');

module.exports = {
  root: true,
  extends: [
    require.resolve('@vercel/style-guide/eslint/node'),
    require.resolve('@vercel/style-guide/eslint/typescript'),
    require.resolve('@vercel/style-guide/eslint/browser'),
    require.resolve('@vercel/style-guide/eslint/react'),
    require.resolve('@vercel/style-guide/eslint/next'),
  ],
  parserOptions: {
    project,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-empty-interface': [
      'error',
      {
        allowSingleExtends: true,
      },
    ],
    '@typescript-eslint/no-shadow': [
      'error',
      {
        ignoreOnInitialization: true,
      },
    ],
    'import/newline-after-import': 'error',
    'react/jsx-uses-react': 'error',
    // 'react/react-in-jsx-scope': 'error',
    'unicorn/filename-case': [
      'error',
      {
        cases: {
          kebabCase: true, // personal style
          pascalCase: true,
        },
      },
    ],

    // Deactivated
    'eslint-comments/require-description': 'off',
    'react/button-has-type': 'off',
    'react/function-component-definition': 'off', // paths are used with a dot notation
    '@typescript-eslint/dot-notation': 'off', // paths are used with a dot notation
    '@typescript-eslint/consistent-type-definitions': 'off', // paths are used with a dot notation
    '@typescript-eslint/prefer-nullish-coalescing': 'off', // paths are used with a dot notation
    '@typescript-eslint/restrict-template-expressions': 'off', // paths are used with a dot notation
    '@typescript-eslint/no-misused-promises': 'off', // onClick with async fails
    '@typescript-eslint/no-non-null-assertion': 'off', // sometimes compiler is unable to detect
    '@typescript-eslint/no-unnecessary-condition': 'off', // remove when no static data is used
    '@typescript-eslint/require-await': 'off', // Server Actions require async flag always
    'import/no-default-export': 'off', // Next.js components must be exported as default
    'import/no-extraneous-dependencies': 'off', // conflict with sort-imports plugin
    'import/order': 'off', // using custom sort plugin
    'no-nested-ternary': 'off', // personal style
    'no-redeclare': 'off', // conflict with TypeScript function overloads
    'react/jsx-fragments': 'off', // personal style
    'react/prop-types': 'off', // TypeScript is used for type checking
    '@typescript-eslint/no-unsafe-assignment': 'warn', // TypeScript is used for type checking
    'no-unused-vars': 'warn', // TypeScript is used for type checking

    '@next/next/no-img-element': 'off', // Temporary disabled
    'no-console': 'warn', // Temporary disabled
    '@typescript-eslint/ban-types': 'warn', // ban-types
    '@typescript-eslint/no-confusing-void-expression': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-empty-pattern': 'warn', // no-empty-pattern
    // 'no-restricted-imports': [
    //   'error',
    //   {
    //     patterns: ['@mui/*/*/*'],
    //   },
    // ],
  },
};