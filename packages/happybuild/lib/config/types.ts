import type { BuildConfig } from "bun"

/**
 * Complete build configuration.
 */
export interface Config {
    // === TASKS SPEC ==============================================================================

    /**
     * Name for the config, while be displayed while reporting the build progress if present.
     * Default: undefined
     */
    name?: string

    /**
     * Full name of the package, constructed from the package name and {@link name}, if present.
     */
    fullName: string

    /**
     * List of exports from package.json to include in the outputs.
     * Default: reads all exports from package.json if specified, "." otherwise.
     */
    exports: ExportPathInfo[]

    /**
     * A list of export conditions (e.g. "import", "require", "default", "browser") to check in
     * order to select the export path. Default: ["import", "default"].
     *
     * Note that when importing *other* packages, Bun itself will use the first condition in the
     * file amongst its supported conditions: https://bun.sh/docs/runtime/modules#importing-packages
     */
    defaultConditions: string[]

    /**
     * Whether to generate a bundle. Default: true if {@link bunConfig} is defined, false otherwise.
     * Note that we never output non-bundled .js files.
     */
    bundle: boolean

    /**
     * Whether to check the types. Default: true if {@link tsConfig} is defined, false otherwise.
     */
    checkTypes: boolean

    /**
     * Whether to emit types. Default: true if {@link tsConfig} is defined, false otherwise.
     * When this is true, {@link checkTypes} must also be true.
     *
     * The types will be emitted to {@link outDir}/types, and the tsconfig.json and api-extractor
     * config must be set up accordingly.
     */
    emitTypes: boolean

    /**
     * Whether to roll up the types into a single consolidated type file. Default: true if {@link
     * emitTypes} is true and {@link apiExtractorConfig} is defined, false otherwise.
     * When this is true, {@link emitTypes} must also be true.
     */
    rollupTypes: boolean

    /**
     * If true, report any package export types issues using AreTheTypesWrong. Default: true on CI,
     * if {@link emitTypes} is true. When this is true, {@link emitTypes} must also be true.
     */
    checkExportedTypes: boolean

    // === PATHS ===================================================================================

    /**
     * The directory where package.json exports point to. Default: "./dist".
     *
     * Not to be confused with {@link outDir}.
     */
    exportDir: string

    /**
     * The directory where build outputs (bundles & types) are put into. Default: "./build".
     *
     * Not to be confused with {@link exportDir}.
     */
    outDir: string

    /**
     * The default source root to assume. This is used to infer entrypoint paths from export paths.
     * Defaults to "./src" or "./lib" if a single one of these directories exists, and "." otherwise.
     *
     * If the source root is "./source" and this is set to ".", entrypoint inference won't work
     * unless the export path is of the form `${exportDir}/source/<exportFileName>.<js_ext>`.
     * It's always possible to specify entrypoint explicitly in an {@link ExportSpecifier}.
     *
     * Similarly, it is possible to have source roots other than the default if the entrypoints
     * under that root are specified explicitly.
     */
    defaultSourceRoot: string

    // === CLEANUP =================================================================================

    /**
     * Remove the output directory before building. Default: true.
     */
    cleanOutDir: boolean

    // === EXTERNAL CONFIGS ========================================================================

    /**
     * Path to the TS config file. Defaults: to "tsconfig.build.json" if it exists, then to
     * "tsconfig.json" if it exists, and to undefined otherwise.
     *
     * If undefined, types will not be checked or emitted.
     */
    tsConfig?: string

    /**
     * Path to the api-extractor config file. Defaults to "api-extractor.json" if it exists.
     * If undefined, types will not be aggregated.
     * Ignored if {@link tsConfig} is undefined.
     */
    apiExtractorConfig?: string

    /**
     * {@link Bun.build}'s options.
     *
     * Default: `{ minify: true, sourcemap: "linked", splitting: false }`. The
     * {@link BunManagedKeys} are managed by HappyBuild based on the rest of the HappyBuild config.
     */
    bunConfig: BunConfig

    // === REPORTING ===============================================================================

    /**
     * If true, display a table of exported file sizes. Default: false
     */
    reportSizes: boolean

    /**
     * If true, display a table of time spent in each build step. Default: false
     */
    reportTime: boolean
}

/**
 * Collects all the path information for a package.json export.
 * All these values are always computed, even though they might go unused.
 */
export type ExportPathInfo = {
    /**
     * The name of the export as appearing in package.json, or "."
     */
    exportName: string
    /**
     * The export path as specified in package.json.
     */
    exportedPath: string
    /**
     * Path to the types file for the export, as specifed in package.json, or as inferred
     * from the {@link exportedPath}.
     */
    exportedTypesPath: string
    /**
     * The path of the entrypoint for the export, as specified in a {@link ExportSpecifier}, or as
     * inferred from the {@link exportedPath}.
     *
     * Note that Node.js calls exports entrypoints, because when not bundling & using vanilla JS
     * these can indeed be the same. We assume they're different.
     */
    entrypoint: string
    /**
     * The ouput file generated by bun for this export/entrypoint.
     */
    bunOutputFile: string
    /**
     * The type output file (either the path of a rollup up type files, or a type stub file).
     */
    typesOutputFile: string
}

/**
 * Constrained version of Bun's {@link BuildConfig} that asserts the presence of certain fields
 * or restricts their types.
 */
export interface BunConfig extends BuildConfig {
    naming: string
    outdir: string
    entrypoints: string[]
}
