import base from './typedoc.base.js'

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/input/
    name: '@happychain/react',
    entryPoints: ['../sdk-react/lib/index.ts'],

    // https://typedoc.org/options/output
    out: 'docs/pages/react/api',

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: '/react/api/',
}
