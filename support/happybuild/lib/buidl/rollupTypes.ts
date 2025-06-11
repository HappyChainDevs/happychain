import { existsSync } from "node:fs"
import { basename, join } from "node:path"
import { Extractor, ExtractorConfig, type ExtractorResult } from "@microsoft/api-extractor"
import { $ } from "bun"
import type { Config } from "../config/types"
import { colors } from "../utils/colors"
import { base } from "../utils/globals"
import { spinner } from "../utils/spinner"
import { tscBuild } from "./typescript"

/**
 * Rolls up the types for every exports in the config.
 *
 * Returns a set of path where .d.ts files should be cleaned up.
 */
export async function rollupTypes(config: Config) {
    if (!config.apiExtractorConfig || !config.tsConfig) return

    spinner.setText(`${config.fullName} — Bundling types (API Extractor)...`)

    const apiExtractorJsonPath = join(base, config.apiExtractorConfig)
    const typesEntrypoint = ExtractorConfig.loadFile(apiExtractorJsonPath).mainEntryPointFilePath
    if (!existsSync(typesEntrypoint)) {
        // Force a full rebuild if the types entrypoint file (from where types are traced) does not
        // exist. This can happen with incremental builds when the types are removed, but the
        // buildinfo file is not updated.
        await tscBuild({ ...config, cleanOutDir: true })
    }

    const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)

    const entryfilename = basename(
        config.exports.find((ex) => ex.entrypoint === config.bunConfig?.entrypoints.find(Boolean))?.entrypoint || "",
    ).replace(/\.ts/, "")
    const typesfilename = basename(extractorConfig.mainEntryPointFilePath).replace(/(.es)?\.d\.ts/, "")
    if (entryfilename !== typesfilename) {
        console.warn(
            `\n[${colors.yellow(config.fullName)}] API-Extractor is configured to process '${colors.red(`${typesfilename}.ts`)}', expecting '${colors.green(`${entryfilename}.ts`)}'.`,
        )
        console.warn(
            `[${colors.yellow(config.fullName)}] Verify the api-extractor "mainEntryPointFilePath" and ensure its pointing to the correct path for this entrypoint.`,
        )
        throw new Error("API-Extractor mainEntryPointFilePath mismatch")
    }

    // TODO: we run this for every export but it most likely doesn't work given the singular api-extractor.json

    for (const ex of config.exports) {
        const result = invokeExtractor(extractorConfig)
        await $`mv ${result.extractorConfig.untrimmedFilePath} ${ex.typesOutputFile}`
    }
}

function invokeExtractor(extractorConfig: ExtractorConfig): ExtractorResult {
    // Patch the console to avoid a lot of useless output from API extractor.
    const ogLog = console.log.bind(console)
    const ogWarn = console.warn.bind(console)
    console.log = () => {}
    console.warn = (...msg) => ogWarn(colors.blue("[@microsoft/api-extractor]"), ...msg)

    const result = Extractor.invoke(extractorConfig, {
        localBuild: true,
        // Use the project's own typescript version.
        typescriptCompilerFolder: require.resolve("typescript").replace("/lib/typescript.js", ""),
        showVerboseMessages: false,
    })

    console.warn = ogWarn
    console.log = ogLog

    return result
}
