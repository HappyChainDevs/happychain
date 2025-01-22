import { existsSync } from "node:fs"
import { pkgExportNames } from "../utils/globals"
import { errorExit, normalizeRelativePath } from "../utils/misc"
import type { InputConfig } from "./define"
import { type GetExportPathInfoOpts, getExportPathInfo } from "./getExportPathInfo"
import type { Config } from "./types"

/**
 * Constructs the effective config by merging the user-provided config with the default values
 * and applying other default heuristics.
 */
export function applyDefaults(config: InputConfig): Config {
    //
    const exportDir = normalizeRelativePath(config.exportDir) ?? "./dist"
    const outDir = normalizeRelativePath(config.outDir) ?? "./build"

    let defaultSourceRoot = normalizeRelativePath(config.defaultSourceRoot) ?? ""
    if (defaultSourceRoot === "") {
        const libExists = existsSync("lib")
        const srcExists = existsSync("src")
        if (libExists && !srcExists) defaultSourceRoot = "./lib"
        else if (!libExists && srcExists) defaultSourceRoot = "./src"
        else defaultSourceRoot = "."
    }

    const defaultConditions = config.defaultConditions || ["import", "default"]

    const options: GetExportPathInfoOpts = {
        exportDir,
        outDir,
        defaultSourceRoot,
        defaultConditions,
    }

    const exportSpecs = config.exports ?? pkgExportNames
    const exports = exportSpecs.map((exportSpec) => getExportPathInfo(exportSpec, options))

    let apiExtractorConfig = config.apiExtractorConfig
    if (apiExtractorConfig) {
        if (!existsSync(apiExtractorConfig)) {
            errorExit(`api-extractor config file not found: ${apiExtractorConfig}`)
        }
    } else if (existsSync("api-extractor.json")) {
        apiExtractorConfig = "api-extractor.json"
    }

    let tsConfig = config.tsConfig
    if (tsConfig) {
        if (!existsSync(tsConfig)) {
            errorExit(`TS config file not found: ${tsConfig}`)
        }
    } else if (existsSync("tsconfig.build.json")) {
        tsConfig = "tsconfig.build.json"
    } else if (existsSync("tsconfig.json")) {
        tsConfig = "tsconfig.json"
    }

    const bundle =
        config.bundle !== undefined //
            ? config.bundle
            : !!config.bunConfig
    const checkTypes =
        config.checkTypes !== undefined //
            ? config.checkTypes
            : !!tsConfig
    const emitTypes =
        config.emitTypes !== undefined //
            ? config.emitTypes
            : !!tsConfig
    const rollupTypes =
        config.rollupTypes !== undefined //
            ? config.rollupTypes
            : !!apiExtractorConfig
    const checkExportedTypes =
        config.checkExportedTypes !== undefined //
            ? config.checkExportedTypes
            : emitTypes && !!process.env.CI

    if (config.checkTypes && !tsConfig) {
        errorExit("`tsConfig` must be defined when `checkTypes` is true")
    }
    if (config.emitTypes && !tsConfig) {
        errorExit("`tsConfig` must be defined when `emitTypes` is true")
    }
    if (config.emitTypes && !checkTypes) {
        errorExit("`checkTypes` must be true when `emitTypes` is true")
    }
    if (config.rollupTypes && !emitTypes) {
        errorExit("`emitTypes` must be true when `rollupTypes` is true")
    }
    if (config.checkExportedTypes && !emitTypes) {
        errorExit("`emitTypes` must be true when `checkExportedTypes` is true")
    }

    return {
        ...defaultConfig,
        ...config,
        fullName: "", // set in build
        exports,
        defaultConditions,
        bundle,
        checkTypes,
        emitTypes,
        rollupTypes,
        checkExportedTypes,
        exportDir,
        outDir,
        defaultSourceRoot,
        tsConfig,
        apiExtractorConfig,
        bunConfig: {
            ...defaultConfig.bunConfig,
            ...config.bunConfig,
            naming: NAMING,
            entrypoints: exports.map((info) => info.entrypoint),
            outdir: outDir,
            root: ".",
        },
    }
}

/**
 * Default build config — this will get merged with the user-supplied config.
 */
const defaultConfig = {
    cleanOutDir: true,
    cleanOutsideOutDir: true,
    reportSizes: !!process.env.CI,
    reportTime: !!process.env.CI,
    bunConfig: {
        minify: true,
        sourcemap: "linked",
        splitting: false,
    },
} as const satisfies InputConfig

/**
 * A naming string for Bun's {@link BuildConfig.naming}.
 * This uses the default value of "[dir]/[name].[ext]".
 */
export const NAMING = "[dir]/[name].[ext]"
