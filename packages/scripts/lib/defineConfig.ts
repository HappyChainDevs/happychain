import type { BuildConfig } from "bun"
import type { cliArgs } from "./cli-args"

/**
 * Constrained version of {@link BuildConfig}.
 */
export interface BunConfig extends BuildConfig {
    /**
     * String containing "[dir]", "[name]", and "[ext]" placeholders to define the name of the
     * output (".js" and ".d.ts") files. Default: "[dir]/[name].es.[ext]"
     */
    naming: string
    /**
     * Output directory. Default: "./build"
     */
    outdir: string
}

export interface Config {
    /**
     * Name for the config, while be displayed while reporting the build progress if present.
     * Default: undefined
     */
    name?: string
    /**
     * List of exports from package.json to include in the outputs.
     * Default: reads all exports from package.json if specified, "." otherwise.
     */
    exports: string[]
    /**
     * Remove the output directory before building. Default: true.
     */
    cleanOutDir: boolean
    /**
     * Clean type files generated outside of the output directory.
     * This happens when the TS config "outDir" does not match the bun config "outDir".
     * Default: true
     */
    cleanOutsideOutDir: boolean
    /**
     * The directory where package.json exports are read from. Default: "./dist".
     *
     * Not to be confused with {@link BunConfig.outdir}, which is where the build configs are
     * written. Our build system will symlink files in the exportDir to the outDir when building.
     */
    exportDir: string
    /**
     * Path to the TS config file. Default: "tsconfig.build.json"
     * If undefined, types will not be bundled.
     */
    tsConfig?: string
    /**
     * Path to the api-extractor config file. Defaults to "api-extractor.json" if it exists.
     * If undefined, types will not be aggregated.
     * Ignored if {@link tsConfig} is undefined.
     */
    apiExtractorConfig?: string
    /**
     * Whether to generate a bundle. Default: true if {@link bunConfig} is defined, false otherwise.
     * Note that we never output non-bundled .js files.
     */
    bundle: boolean
    /**
     * {@link Bun.build} options {@link BuildConfig}. Default: see {@link defaultConfig}
     */
    bunConfig: BunConfig
    /**
     * If true, display a table of exported file sizes. Default: false
     */
    reportSizes: boolean
    /**
     * If true, display a table of time spent in each build step. Default: false
     */
    reportTime: boolean
    /**
     * If true, report any package export types issues using AreTheTypesWrong. Default: true
     */
    checkExports: boolean
}

/**
 * Default build config — this will get merged with the user-supplied config.
 */
export const defaultConfig = {
    tsConfig: "tsconfig.build.json",
    cleanOutDir: true,
    cleanOutsideOutDir: true,
    checkExports: !!process.env.CI,
    reportSizes: !!process.env.CI,
    reportTime: !!process.env.CI,
    exportDir: "./dist",
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        outdir: "./build",
        minify: true,
        sourcemap: "linked",
        splitting: false,
        naming: "[dir]/[name].es.[ext]",
    },
} as const satisfies Partial<Config>

export type ConfigFactoryArgs = { mode?: "production" | "development" | string } & typeof cliArgs

export type PartialConfig = Partial<Omit<Config, "bunConfig"> & { bunConfig: Partial<BunConfig> }>

export type DefineConfigParameters =
    | PartialConfig
    | PartialConfig[]
    | ((args: ConfigFactoryArgs) => PartialConfig | PartialConfig[])

export function defineConfig(config: DefineConfigParameters): DefineConfigParameters {
    return config
}
