import { existsSync } from "node:fs"
import type { cliArgs } from "../cli-args"
import { type PartialConfig, defaultConfig } from "../defineConfig"
import type { Config, DefineConfigParameters } from "../defineConfig"
import { pkg } from "./globals"

/**
 * Constructs the effective config by merging the user-provided config with the default values
 * and applying other default heuristics.
 */
function applyDefaults(config: PartialConfig): Config {
    // bundle iff `bunConfig` is set or `bundle` is true
    const bundle = config.bundle === undefined ? !!config.bunConfig : config.bundle

    // Read exports from package.json if unspecified.
    let exports = config.exports || []
    if (!config.exports) {
        const exportNames = Object.keys(pkg.exports ?? {})
        exports = exportNames.length > 0 ? exportNames : ["."]
    }

    const newConfig: Config = {
        ...defaultConfig,
        ...config,
        bundle,
        exports,
        bunConfig: {
            ...defaultConfig.bunConfig,
            ...config.bunConfig,
        },
    }

    // Default to `api-extractor.json` if it exists.
    if (config.apiExtractorConfig === undefined && existsSync("api-extractor.json")) {
        newConfig.apiExtractorConfig = "api-extractor.json"
    }

    detectNaming(config?.bunConfig?.naming, newConfig)
    return newConfig
}

/**
 * Attempt to detect the Bun naming scheme if not explicitly specified, and only if the config
 * has exactly one entry point and one export specified.
 */
function detectNaming(userNaming: string | undefined, config: Config) {
    const bunConfig = config.bunConfig

    if (!userNaming && config.exports.length === 1 && bunConfig.entrypoints.length === 1) {
        const exportedPath = getExportedPath(config.exports[0])

        // TODO This is extremely brittle.
        //  - dependent on relative paths being similarly prefix with "./" or not
        //  - dependent on the path ending with `.js`
        const naming = exportedPath //
            ?.replace(config.exportDir, "[dir]")
            ?.replace(".js", ".[ext]")

        bunConfig.naming = naming || defaultConfig.bunConfig.naming
    }
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
export function getConfigs(configs: DefineConfigParameters, options: typeof cliArgs): Config[] {
    const _configs: DefineConfigParameters =
        typeof configs === "function" //
            ? configs({ ...configArgs, ...options })
            : configs
    return ((Array.isArray(_configs) ? _configs : [_configs]) as Config[]).map(applyDefaults)
}

/**
 * Reads the output path for the given export name in package.json.
 *
 * The lookup order is as follows:
 * 1. `pkg.main` (only for `entrypoint === "."`)
 * 2. `pkg.module` (only for `entrypoint === "."`)
 * 3. `pkg.exports[entrypoint].default`
 * 4. `pkg.exports[entrypoint].import`
 * 5. `pkg.exports[entrypoint].require`
 * 6. `undefined`
 */
export function getExportedPath(exportName = "."): string | undefined {
    if (exportName === ".") {
        if (pkg.module) return pkg.module
        if (pkg.main) return pkg.main
    }
    const entry = pkg.exports?.[exportName]
    return entry?.default || entry?.import || entry?.require || undefined
}
