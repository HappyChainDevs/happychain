import { join } from "node:path"
import { $ } from "bun"
import type { Context } from "../build"
import type { Config } from "../config/types"
import { colors } from "../utils/colors"
import { spinner } from "../utils/spinner"
import { rollupTypes } from "./rollupTypes"
import { tscBuild } from "./typescript"

/**
 * As required by the config: checks the types, emits individual type files, rolls the type files up
 * or writes a type stub.
 */
export async function handleTypes(config: Config, ctx: Context) {
    const configBuildTimes = ctx.buildTimes.get(config.fullName)!

    // Check types & emit individual type files if configured.
    if (!ctx.usedTsConfigs.has(config.tsConfig!)) {
        const t0 = performance.now()
        await tscBuild(config)
        const t1 = performance.now()
        configBuildTimes.tsc = `${Math.ceil(t1 - t0)} ms`
        ctx.usedTsConfigs.add(config.tsConfig!)
    } else {
        configBuildTimes.tsc = "cached"
    }

    if (config.emitTypes && config.rollupTypes) {
        // Don't roll up from the same config more than once per build.
        const t0 = performance.now()
        try {
            await rollupTypes(config)
        } catch (e) {
            console.error(e)
            console.warn(`[${colors.yellow(config.fullName)}] ${colors.red("Failed to rollup types. Creating Stub.")}`)
            throw e
        }
        const t1 = performance.now()
        configBuildTimes.rollup = `${Math.ceil(t1 - t0)} ms`
    } else if (config.emitTypes) {
        await writeTypesStubs(config)
    }

    await $`mkdir -p ${config.exportDir}`

    // Symlink the rolled up type file or the type stub from the export dir.
    for (const ex of config.exports) {
        await $`ln -sf ../${ex.typesOutputFile} ${ex.exportedTypesPath}`
    }
}

/**
 * Write an index type stub at the exported type path.
 */
async function writeTypesStubs(config: Config) {
    for (const ex of config.exports) {
        spinner.setText(`${config.fullName} — Generating index type stub...`)
        // We need the absolute type here, or api-extractor won't be able to read the through the
        // symlink.
        const importPath = join("types", ex.entrypoint).replace(".ts", "")
        await Bun.write(ex.typesOutputFile, `export * from './${importPath}'\n` + "export {}")
    }
}
