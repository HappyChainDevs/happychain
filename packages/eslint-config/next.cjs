/** @type {import("eslint").Linter.Config} */
module.exports = {
    extends: ['next/core-web-vitals', './base.cjs'],
    rules: {
        '@typescript-eslint/no-restricted-imports': ['error', { patterns: ['./*', '../*'] }],
    },
}
