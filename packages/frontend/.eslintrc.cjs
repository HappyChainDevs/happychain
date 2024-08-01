/** @type {import("eslint").Linter.Config} */
module.exports = {
    root: true,
    extends: ["@happychain/eslint-config/next.cjs"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
        ecmaVersion: "latest",
    },
}
