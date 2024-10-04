import type { BuildConfig } from "bun"
import type { cliArgs } from "./cli-args"

export interface Config {
    cleanOutDir?: boolean
    tsConfig?: string | false | nul
    apiExtractorConfig?: string | false | null
    bunConfig?: BuildConfig | false | null
    /** If true, display a table of exported file sizes. */
    reportSizes?: boolean | null
    /** If true, display a table of time spent in each build step. */
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
