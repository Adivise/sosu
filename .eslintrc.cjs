module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  plugins: ['react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['out/', 'dist/'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'react-hooks/exhaustive-deps': 'off'
  },
  overrides: [
    {
      files: ['src/renderer/**/*.{js,jsx}'],
      rules: {
        'no-unused-vars': [
          'warn',
          {
            args: 'after-used',
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_'
          }
        ],
        'no-unused-expressions': 'warn'
      }
    }
  ]
};

