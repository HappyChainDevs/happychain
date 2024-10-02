import type { BuildConfig } from "bun"
import type { cliArgs } from "./cli-args"

type Falsy = false | null | undefined

export interface Config {
    /**
     * Remove 'dist' before building
     */
    cleanOutDir?: boolean
    /**
     * path to ts config
     */
    tsConfig?: string | Falsy
    /**
     * name of rolled up types output
     */
    types?: string | { [key: string]: string }
    /**
     * path to api-extractor config
     */
    apiExtractorConfig?: string | Falsy
    /**
     * Bun.build(...) options
     */
    bunConfig?: BuildConfig | Falsy
    /**
     * If true, display a table of exported file sizes.
     */
    reportSizes?: boolean | null
    /**
     * If true, display a table of time spent in each build step.
     */
    reportTime?: boolean | null
}

export type ConfigFactoryArgs = {
    mode?: "production" | "development" | string
    run: number
} & typeof cliArgs

export type DefineConfigParameters = Config | Config[] | ((args: ConfigFactoryArgs) => Config | Config[])

export function defineConfig(config: DefineConfigParameters) {
    return config
}
