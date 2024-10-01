import type { BuildConfig } from "bun"
import type { cliArgs } from "./cli-args"

export interface Config {
    cleanOutDir?: boolean
    tsConfig?: string | false | null | undefined
    apiExtractorConfig?: string | false | null | undefined
    bunConfig?: BuildConfig | false | null | undefined
}

export type ConfigFactoryArgs = {
    mode?: "production" | "development" | string
    run: number
} & typeof cliArgs

export type DefineConfigParameters = Config | Config[] | ((args: ConfigFactoryArgs) => Config | Config[])

export function defineConfig(config: DefineConfigParameters) {
    return config
}
