import base from './typedoc.base.js'

/** @type {import('typedoc').TypeDocOptions} */
export default {
    ...base,
    // https://typedoc.org/options/input/
    name: '@happychain/js',
    entryPoints: ['../sdk-vanillajs/lib/main.ts'],

    // https://typedoc.org/options/output
    out: 'docs/pages/js/api',

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    publicPath: '/js/api/',
}
