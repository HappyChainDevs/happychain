import base from "./typedoc.base.js"

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/configuration/
    tsconfig: "../../packages/boop-sdk/tsconfig.build.json",
    // https://typedoc.org/options/input/
    name: "@happy.tech/boop-sdk",
    entryPoints: ["../../packages/boop-sdk/lib/index.ts"],

    // https://typedoc.org/options/output
    out: "src/pages/boop/sdk/api",

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: "/boop/sdk/api/",
}
