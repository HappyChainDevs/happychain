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
     * Output directory. Default: "./dist"
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
     * Remove the output directory before building. Default: "dist"
     */
    cleanOutDir: boolean
    /**
     * Clean type files generated outside of the output directory. Default: true
     */
    cleanOutsideOutDir: boolean
    /**
     * Path to the TS config file. Default: "tsconfig.build.json"
     * If undefined, types will not be bundled.
     */
    tsConfig?: string
    /**
     * Name of rolled up types output (string, or dictionary mapping entrypoint to output file).
     * Default: undefined, uses the "types" or "exports/.../types" properties in package.json.
     */
    types?: string | { [key: string]: string }
    /**
     * Path to the api-extractor config file. Default: "api-extractor.json"
     * If undefined, types will not be aggregated.
     * Ignored if {@link tsConfig} is undefined.
     */
    apiExtractorConfig?: string
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
}

/**
 * Default build config — this will get merged with the user-supplied config.
 */
export const defaultConfig = {
    tsConfig: "tsconfig.build.json",
    apiExtractorConfig: "api-extractor.json",
    cleanOutDir: true,
    cleanOutsideOutDir: true,
    reportSizes: false,
    reportTime: false,
    bunConfig: {
        entrypoints: ["./lib/index.ts"],
        outdir: "./dist",
        minify: true,
        sourcemap: "linked",
        splitting: false,
        naming: "[dir]/[name].es.[ext]",
    },
} as const satisfies Config

export type ConfigFactoryArgs = {
    mode?: "production" | "development" | string
    run: number
} & typeof cliArgs

export type DefineConfigParameters = Config | Config[] | ((args: ConfigFactoryArgs) => Config | Config[])

export function defineConfig(config: Partial<DefineConfigParameters>): DefineConfigParameters {
    return config as DefineConfigParameters
}
