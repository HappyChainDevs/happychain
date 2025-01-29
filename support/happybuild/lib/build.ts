import { dirname, join } from "node:path"
import { $ } from "bun"
import { bundle } from "./buidl/bundle"
import { checkExportedTypes } from "./buidl/checkExportedTypes"
import { cleanOutDirs, cleanupTypes } from "./buidl/clean"
import { reporting } from "./buidl/reporting"
import { handleTypes } from "./buidl/typing"
import type { cliArgs } from "./cli-args"
import type { DefineConfigParameters } from "./config/define"
import { getConfigs } from "./config/getConfigs"
import type { Config } from "./config/types"
import { pkg } from "./utils/globals"
import { spinner } from "./utils/spinner"

export type Context = {
    usedTsConfigs: Set<string>
    usedApiExtractorConfigs: Set<string>
    buildTimes: Map<string, Record<string, string>>
    start: DOMHighResTimeStamp
}

let ctx = {} as Context

/**
 * Builds all defined configs in the project.
 */
export async function build({
    configs: _configs,
    options,
}: { configs: DefineConfigParameters; options: typeof cliArgs }) {
    spinner.start("Building...")

    const configs = getConfigs(_configs, options)

    ctx = {
        usedTsConfigs: new Set(),
        usedApiExtractorConfigs: new Set(),
        start: performance.now(),
        buildTimes: new Map(),
    }

    cleanOutDirs(configs)

    for (const config of configs) {
        if (config.name) {
            config.fullName = join(pkg.name, config.name)
        } else if (configs.length === 1) {
            config.fullName = pkg.name
        } else if (config.exports) {
            config.fullName =
                config.exports.length === 1
                    ? join(pkg.name, config.exports[0].exportName)
                    : join(pkg.name, `{${config.exports.join(", ")}`)
        }
        await buildConfig(config, ctx)
    }

    await cleanupTypes(configs)

    // The tool (ATTW) checks all exports at once.
    if (configs.some((config) => config.checkExportedTypes)) {
        const t0 = performance.now()
        await checkExportedTypes(configs)
        const t1 = performance.now()
        for (const config of configs) {
            ctx.buildTimes.get(config.fullName)!.checkExports = `${Math.ceil(t1 - t0)} ms`
        }
    }

    await reporting(configs, ctx)
}

/**
 * Builds a single config.
 */
async function buildConfig(config: Config, ctx: Context) {
    const configBuildTimes = {} as Record<string, string>
    ctx.buildTimes.set(config.fullName, configBuildTimes)

    if (config.checkTypes) {
        await handleTypes(config, ctx)
    }

    if (config.bundle) {
        const t0 = performance.now()
        await bundle(config)
        const t1 = performance.now()
        configBuildTimes.bundling = `${Math.ceil(t1 - t0)} ms`
    }

    // Create a symlink in export dir for each export, either to the generated bundle file,
    // or the entrypoint itself (if not bundling).
    for (const ex of config.exports) {
        const symlinkDest = config.bundle ? ex.bunOutputFile : ex.entrypoint
        await $`mkdir -p ./${dirname(ex.exportedPath)}`
        await $`ln -sf ${join("../", symlinkDest)} ${ex.exportedPath}`
    }
}
