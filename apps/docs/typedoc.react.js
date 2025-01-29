import base from "./typedoc.base.js"

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/configuration/
    tsconfig: "./tsconfig.typedoc.sdk-react.json",
    // https://typedoc.org/options/input/
    name: "@happy.tech/react",
    entryPoints: ["../../packages/react/lib/index.ts"],

    // https://typedoc.org/options/output
    out: "src/pages/sdk/react/api",

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: "/sdk/react/api/",
}
