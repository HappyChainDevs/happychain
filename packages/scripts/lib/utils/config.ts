import { existsSync } from "node:fs"
import type { cliArgs } from "../cli-args"
import { defaultConfig } from "../defineConfig"
import type { Config, DefineConfigParameters } from "../defineConfig"
import { pkg } from "./globals"

/**
 * Constructs the effective config by merging the user-provided config with the default values
 * and applying other default heuristics.
 */
function applyDefaults(config: Config): Config {
    const newConfig = {
        ...defaultConfig,
        ...config,
        bunConfig: {
            ...defaultConfig.bunConfig,
            ...config.bunConfig,
        },
    }
    if (!config.exports) {
        // Read exports from package.json if unspecified.
        const exportNames = Object.keys(pkg.exports ?? {})
        newConfig.exports = exportNames.length > 0 ? exportNames : ["."]
    }

    if (config.apiExtractorConfig === undefined && existsSync("api-extractor.json")) {
        newConfig.apiExtractorConfig = "api-extractor.json"
    }

    detectNaming(newConfig)

    return newConfig
}

/**
 * Attempts to detect the naming scheme for exports if not specified explicitly and applicable.
 * This edits the passed config object in-place.
 *
 * This is only applicable if not code-splitting and we have one export matching a single entrypoint.
 */
function detectNaming(config: Config) {
    // cf. docstring on applicability
    const defaultName = defaultConfig.bunConfig.naming

    // explicitly named different from default
    if (config.bunConfig.naming !== defaultConfig.bunConfig.naming) {
        return
    }

    if (!config.exports || !(config.bunConfig.entrypoints.length === 1 && config.exports.length === 1)) {
        return defaultName
    }

    config.bunConfig.naming = getEntrypointPath(config.exports[0]) //
        .replace(config.bunConfig.outdir, "[dir]")
        .replace(".js", ".[ext]")
}

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
export function getConfigArray(configs: DefineConfigParameters, options: typeof cliArgs): Config[] {
    const _configs: DefineConfigParameters =
        typeof configs === "function" //
            ? configs({ ...configArgs, ...options })
            : configs
    return ((Array.isArray(_configs) ? _configs : [_configs]) as Config[]).map(applyDefaults)
}

/**
 * Reads the output path for the given entrypoint in package.json.
 *
 * The lookup order is as follows:
 * 1. `pkg.main` (only for `entrypoint === "."`)
 * 2. `pkg.module` (only for `entrypoint === "."`)
 * 3. `pkg.exports[entrypoint].default`
 * 4. `pkg.exports[entrypoint].import`
 * 5. `pkg.exports[entrypoint].require`
 * 6. `undefined`
 */
export function getEntrypointPath(entrypoint = "."): string {
    if (entrypoint === ".") {
        if (pkg.module) return pkg.module
        if (pkg.main) return pkg.main
    }
    const entry = pkg.exports?.[entrypoint]
    return entry?.default || entry?.import || entry?.require || undefined
}
