/** @type {import('typedoc').TypeDocOptions} */
export default {
    plugin: [
        // https://typedoc-plugin-markdown.org/
        "typedoc-plugin-markdown",
        // https://www.npmjs.com/package/typedoc-plugin-mdn-links
        "typedoc-plugin-mdn-links",
        // https://www.npmjs.com/package/typedoc-plugin-remark
        "typedoc-plugin-remark",
        // https://www.npmjs.com/package/typedoc-plugin-mdn-links
        "typedoc-plugin-zod",
    ],

    // https://typedoc.org/options/input/
    excludePrivate: true,
    excludeProtected: true,
    excludeInternal: true,
    excludeExternals: true,
    includeVersion: true,
    readme: "none",

    // https://typedoc.org/options/output/
    cname: "docs.happy.tech",
    titleLink: "https://docs.happy.tech/",
    customFooterHtml: "Copyright <strong>HappyChain</strong> 2025",
    hideGenerator: true,
    searchInComments: true,
    searchInDocuments: true,
    githubPages: false,
    highlightLanguages: ["html", "javascript", "json", "jsonc", "json5", "jsx", "tsx", "typescript"],
    visibilityFilters: {
        protected: false,
        private: false,
        inherited: true,
        external: false,
        "@alpha": false,
        "@beta": false,
    },

    // https://typedoc.org/options/comments
    // ...

    // https://typedoc.org/options/organization
    groupOrder: ["Functions", "Variables", "*"],
    categoryOrder: ["Core", "Errors", "*"],

    // https://typedoc.org/options/validation/
    // ...

    // https://typedoc-plugin-markdown.org/docs/options/file-options
    mergeReadme: true,
    entryFileName: "index",
    fileExtension: ".mdx",

    // https://typedoc-plugin-markdown.org/docs/options/display-options
    indexFormat: "list",
    parametersFormat: "list",
    interfacePropertiesFormat: "list",
    classPropertiesFormat: "list",
    enumMembersFormat: "list",
    typeDeclarationFormat: "list",
    propertyMembersFormat: "list",
    hidePageHeader: true,
    hideBreadcrumbs: true,
    useCodeBlocks: true,
    useHTMLAnchors: false,
    expandObjects: true,
    expandParameters: true,

    // https://typedoc-plugin-markdown.org/docs/options/utility-options
    navigationModel: {
        excludeGroups: true,
        excludeCategories: true,
        excludeFolders: true,
    },

    // https://typedoc-plugin-markdown.org/plugins/remark/quick-start
    remarkPlugins: [
        [
            "remark-link-rewrite",
            // remove .mdx from generated typedoc links
            {
                replacer: (url) => {
                    if (url === "/docs/glossary/terms#filter") return "https://viem.sh/docs/glossary/terms#filter"
                    return url.replace(/\.mdx$/, "")
                },
            },
        ],
    ],
}
