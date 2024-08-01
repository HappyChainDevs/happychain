/** @type {import("eslint").Linter.Config} */
module.exports = {
    extends: ['plugin:import/recommended', 'plugin:import/typescript', 'plugin:react-hooks/recommended', './base.cjs'],
    env: { browser: true, es2020: true },
    plugins: ['react-refresh'],
    settings: {
        'import/resolver': {
            alias: {
                map: [
                    ['lib', './lib'],
                    ['src', './src'],
                ],
                extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
            },
        },
    },
    rules: {
        'import/no-unresolved': [2, { ignore: ['.(png|webp|jpg|svg)$'] }],
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
}
