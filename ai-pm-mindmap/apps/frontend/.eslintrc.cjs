module.exports = {
  extends: ['../../.eslintrc.cjs'],
  env: {
    browser: true,
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
  },
};
