import base from "./typedoc.base.js"

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/configuration/
    tsconfig: "./tsconfig.typedoc.sdk-js.json",
    // https://typedoc.org/options/input/
    name: "@happy.tech/core",
    entryPoints: ["../../packages/core/lib/index.ts"],

    // https://typedoc.org/options/output
    out: "docs/pages/sdk/js/api",

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: "/sdk/js/api/",
}
