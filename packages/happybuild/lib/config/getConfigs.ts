import type { cliArgs } from "../cli-args"
import { applyDefaults } from "./defaults"
import type { DefineConfigParameters, InputConfig } from "./define"
import type { Config } from "./types"

/**
 * If the {@link defineConfig|build config} is a function, this object will get merged with the CLI
 * parameters and will be passed into the config function.
 */
const configArgs = {
    mode: process.env.NODE_ENV,
}

/**
 * Obtains the effective config array by calling function-type configs with the config arguments and
 * CLI options, and applying defaults values & heuristics.
 */
export function getConfigs(configs: DefineConfigParameters, options: typeof cliArgs): Config[] {
    const _configs: DefineConfigParameters =
        typeof configs === "function" //
            ? configs({ ...configArgs, ...options })
            : configs
    return ((Array.isArray(_configs) ? _configs : [_configs]) as InputConfig[]).map(applyDefaults)
}
