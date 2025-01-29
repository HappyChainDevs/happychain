import { existsSync } from "node:fs"
import { join, parse as parsePath } from "node:path"
import { pkgExports } from "../utils/globals"
import { errorExit, normalizePathDot, normalizeRelativePath } from "../utils/misc"
import { NAMING } from "./defaults"
import type { ExportSpecifier } from "./define"
import type { ExportPathInfo } from "./types"

/**
 * Configuration options needed to get all the export's path information.
 * For the meaning of this values, refer to {@link Config}.
 */
export type GetExportPathInfoOpts = {
    exportDir: string
    outDir: string
    defaultSourceRoot: string
    defaultConditions: string[]
}

/**
 * Given an {@link ExportSpecifier} and associated config values, return filled in path information
 * for the export.
 */
export function getExportPathInfo(exportSpec: ExportSpecifier, opts: GetExportPathInfoOpts): ExportPathInfo {
    const { exportName } = parseSpec(exportSpec)

    if (!pkgExports[exportName]) {
        errorExit(`Export "${exportName}" not found in package.json`)
    }

    const exportPath = getExportPath(exportSpec, opts)
    const entrypoint = getEntrypoint(exportSpec, exportPath, opts)
    const exportedTypesPath = getExportedTypesPath(exportName, exportPath, opts.exportDir)
    return {
        exportName,
        exportedPath: exportPath,
        exportedTypesPath,
        entrypoint,
        bunOutputFile: getBunOutputFile(entrypoint.replace(opts.defaultSourceRoot, "."), opts.outDir),
        typesOutputFile: exportedTypesPath.replace(opts.exportDir, opts.outDir),
    }
}

function parseSpec(exportSpec: ExportSpecifier): { exportName: string; condition?: string; entrypoint?: string } {
    if (typeof exportSpec === "string") return { exportName: exportSpec }
    return {
        exportName: exportSpec.name,
        condition: exportSpec.condition,
        entrypoint: exportSpec.entrypoint,
    }
}

/**
 * Return the exported file path for the given export.
 */
function getExportPath(exportSpec: ExportSpecifier, opts: GetExportPathInfoOpts): string {
    const { exportName, condition } = parseSpec(exportSpec)
    const { defaultConditions, exportDir } = opts

    let exportPath: string | undefined
    if (condition) {
        exportPath = pkgExports[exportName][condition]
        if (!exportPath) {
            errorExit(`No "exports/${exportName}/${condition}" field in package.json.`)
        }
    } else {
        const entry = pkgExports[exportName]
        for (const condition of defaultConditions) {
            if (entry[condition]) {
                exportPath = entry[condition]
                break
            }
        }
    }

    if (exportPath) {
        exportPath = normalizeRelativePath(exportPath)
        if (!exportPath.startsWith(exportDir))
            errorExit(`Export path "${exportPath}" is not inside the export dir "${exportDir}".`)
        return exportPath
    }

    // biome-ignore format: +
    errorExit(exportName === "*"
      ? `No export path found for "${exportName}" in package.json with conditions: `
         + defaultConditions.join(", ")
      : 'No "exports"/".", "module", or "main" field in package.json for "." export.')
}

/**
 * Returns the entrypoint for the given export and validates its existence.
 *
 * The entrypoint is either explicitly specified in the export specifier, or inferred from the
 * export path (in which case we assume the entrypoint extension is ".ts").
 */
function getEntrypoint(exportSpec: ExportSpecifier, exportPath: string, opts: GetExportPathInfoOpts): string {
    let { exportName, entrypoint } = parseSpec(exportSpec)
    const { exportDir, defaultSourceRoot } = opts
    if (entrypoint) {
        entrypoint = normalizeRelativePath(entrypoint)
        if (!existsSync(entrypoint))
            errorExit(`Explicitly specified entrypoint for export "${exportName} does not exist: ${entrypoint}"`)
        return entrypoint
    }

    entrypoint = exportPath //
        .replace(getExportJsExtension(exportPath), "ts")
        .replace(exportDir, defaultSourceRoot)
    entrypoint = normalizePathDot(entrypoint)

    if (!existsSync(entrypoint))
        errorExit(`Inferred entrypoint for export "${exportSpec}" does not exist: ${entrypoint}`)

    return entrypoint
}

/**
 * Returns the exported types file path for the given export.
 */
function getExportedTypesPath(exportName: string, exportPath: string, exportDir: string): string {
    const exportedTypesPath = pkgExports[exportName]?.types
        ? normalizeRelativePath(pkgExports[exportName].types)
        : exportPath.replace(getExportJsExtension(exportPath), "d.ts")

    if (!exportedTypesPath.startsWith(exportDir))
        errorExit(`Exported types path "${exportedTypesPath}" is not inside the export dir "${exportDir}".`)

    return exportedTypesPath
}

/**
 * Checks if the export path ends with a known JS extension and returns it, or aborts with an error.
 */
function getExportJsExtension(exportPath: string): string {
    const { base } = parsePath(exportPath)
    const components = base.split(".").slice(1)

    let ext =
        components.length > 2 //
            ? components.slice(-2).join(".")
            : components.join(".")

    let extKnown = KNOWN_JS_EXTENSIONS.has(ext)

    if (!extKnown && components.length >= 2) {
        ext = components[components.length - 1]
        extKnown = KNOWN_JS_EXTENSIONS.has(ext)
    }

    if (!extKnown) {
        errorExit(`Export path "${exportPath}" does not end with a known JS extension.`)
    }

    return ext
}

/**
 * Set of extensions allowed at the end of an exported file path.
 * In the HappyChain monorepo, we always use ".es.js" for exports.
 */
const KNOWN_JS_EXTENSIONS = new Set(["js", "mjs", "cjs", "es.js", "esm.js", "amd.js", "umd.js", "iife.js", "cjs.js"])

/**
 * Returns the output file generated by bun for the given entrypoint, using {@link NAMING}.
 */
function getBunOutputFile(entrypoint: string, outDir: string): string {
    const { dir, name } = parsePath(entrypoint)
    const relative = NAMING.replace("[dir]", dir) //
        .replace("[name]", name)
        .replace("[ext]", "js")
    return normalizeRelativePath(join(outDir, relative))
}
