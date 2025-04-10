import base from "./typedoc.base.js"

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/configuration/
    tsconfig: "./tsconfig.typedoc.submitter-client.json",
    // https://typedoc.org/options/input/
    name: "@happy.tech/submitter-client",
    entryPoints: ["../../packages/submitter-client/lib/index.ts"],

    // https://typedoc.org/options/output
    out: "src/pages/submitter/client/api",

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: "/submitter/client/api/",
}
