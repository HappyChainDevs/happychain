import { join } from "node:path"
import { $ } from "bun"
import type { Config } from "../config/types"

/**
 * Cleans the output directories of all configs that have {@link Config.cleanOutDir} set to true.
 */
export async function cleanOutDirs(configs: Config[]) {
    configs
        .filter((config) => config.cleanOutDir)
        .map((config) => config.outDir)
        .filter((config, i, arr) => arr.indexOf(config) === i) // remove duplicates
        .forEach(async (outDir) => await $`rm -rf ${outDir}`)
}

/**
 * Cleans up the individual type files, if safe to do so.
 */
export async function cleanupTypes(configs: Config[]) {
    const configsByOutDir = Object.groupBy(configs, (c) => c.outDir)

    for (const [outDir, configs] of Object.entries(configsByOutDir)) {
        // If every config using the outdir rolls up the types, then we can remove the types directory.
        if (configs!.every((config) => config.rollupTypes)) {
            await $`rm -rf ${join(outDir, "types")}`
        }
    }
}
