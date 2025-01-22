import { $ } from "bun"
import type { Config } from "../config/types"

/**
 * Calls the provided function after moving the outputs to the exports dir, then moves them back and
 * restore the symlinks.
 */
export async function withOutputsInExportDirs(
    configs: Config[],
    opts: { js: boolean; types: boolean },
    fn: () => Promise<void>,
) {
    await moveOutputsOverToExportDir(configs, opts)
    try {
        await fn()
    } finally {
        await moveOutputsBack(configs, opts)
    }
}

/**
 * Temporarily move over the js & types outputs to the export paths (which are usually symlinked).
 * Later, you can move the files back and restore the symlinks by calling {@link moveOutputsBack}.
 */
export async function moveOutputsOverToExportDir(configs: Config[], opts: { js: boolean; types: boolean }) {
    for (const config of configs) {
        for (const ex of config.exports) {
            if (opts.js && config.bundle) {
                await $`rm -f ${ex.exportedPath}`
                await $`mv ${ex.bunOutputFile} ${ex.exportedPath}`
            }
            if (opts.types && config.emitTypes) {
                await $`rm -f ${ex.exportedTypesPath}`
                await $`mv ${ex.typesOutputFile} ${ex.exportedTypesPath}`
            }
        }
    }
}

/**
 * Moves back the outputs that were temporarily moved over by {@link moveOutputsOverToExportDir}
 * and restores the original symlinks.
 */
export async function moveOutputsBack(configs: Config[], opts: { js: boolean; types: boolean }) {
    for (const config of configs) {
        for (const ex of config.exports) {
            if (opts.js && config.bundle) {
                await $`mv ${ex.exportedPath} ${ex.bunOutputFile}`
                await $`ln -s ../${ex.bunOutputFile} ${ex.exportedPath}`
            }
            if (opts.types && config.emitTypes) {
                await $`mv ${ex.exportedTypesPath} ${ex.typesOutputFile}`
                await $`ln -s ../${ex.typesOutputFile} ${ex.exportedTypesPath}`
            }
        }
    }
}
