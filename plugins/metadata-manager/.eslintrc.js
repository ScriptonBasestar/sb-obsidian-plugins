module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    // Plugin-specific minimal overrides only when absolutely necessary
    // All TypeScript strict rules from root config are now applied
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx'],
      rules: {
        // Relax strict rules for test files that mock external dependencies
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
      },
    },
  ],
};
