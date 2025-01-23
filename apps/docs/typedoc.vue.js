import base from "./typedoc.base.js"

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/configuration/
    tsconfig: "./tsconfig.typedoc.vue.json",
    // https://typedoc.org/options/input/
    name: "@happy.tech/vue",
    entryPoints: ["../../packages/vue/lib/index.ts"],

    // https://typedoc.org/options/output
    out: "src/pages/sdk/vue/api",

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: "/sdk/vue/api/",
}
