import base from "./typedoc.base.js"

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/configuration/
    tsconfig: "../../../packages/txm/tsconfig.build.json",
    // https://typedoc.org/options/input/
    name: "@happy.tech/txm",
    entryPoints: ["../../../packages/txm/lib/index.ts"],

    // https://typedoc.org/options/output
    out: "src/pages/txm/api",

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: "/txm/api/",
}
