/** @type {import("eslint").Linter.Config} */
module.exports = {
    extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
    plugins: ['@typescript-eslint', 'simple-import-sort'],
    ignorePatterns: ['node_modules', '/.next', 'dist', '/src/generated.ts'],
    root: true,
    rules: {
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        'react/no-unescaped-entites': 'off',

        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                // ignore unused args that start with underscore
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            },
        ],

        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
        'simple-import-sort/imports': [
            'error',
            {
                groups: [
                    // protocol imports.
                    ['^(node|bun):'],
                    // Side effect imports.
                    ['^\\u0000'],
                    // React & Next packages related packages come first.
                    ['^react', '^next'],
                    // Other external packages.
                    ['^@?\\w'],
                    // Custom group for src/ prefixed imports
                    ['^src/'],
                    // Parent imports. Put `..` last.
                    ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                    // Other relative imports. Put same-folder imports and `.` last.
                    ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
                    // Style imports.
                    ['^.+\\.s?css$'],
                ],
            },
        ],
    },
}
