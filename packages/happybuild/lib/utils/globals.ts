import { join } from "node:path"

/** Current working directory. */
export const base = process.cwd()

type ExportConditions = {
    bun?: string
    worker?: string
    node?: string
    require?: string
    import?: string
    default?: string
    types?: string
    browser?: string
    [key: string]: string | undefined
}

/**
 * Cleaned up type of the object version of the "exports" field in `package.json`.
 */
export type PkgExports = {
    [key: string]: ExportConditions
}

/**
 * Real type of the "exports" field in `package.json`.
 */
type PkgExportsReal = string | string[] | { [key: string]: string | ExportConditions }

/**
 * Type stub for `package.json`.
 */
// biome-ignore lint/suspicious/noExplicitAny: package.json is untyped
export type PkgType = Record<string, any> & {
    main?: string
    module?: string
    types?: string
    exports?: PkgExportsReal
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    peerDependencies: Record<string, string>
    optionalDependencies: Record<string, string>
    peerDependenciesMeta: Record<string, { optional: boolean }>
}

/** Imported package.json for the package. */
export const pkg: PkgType = await import(join(base, "./package.json"))

let _pkgExports: PkgExports

// Convert non-object format package.exports to the object format
// (subpath exports + conditional exports).

if (typeof pkg.exports === "string") {
    _pkgExports = { ".": { default: pkg.exports } }
} else if (Array.isArray(pkg.exports)) {
    // This form ("export": ["dist/index.js", "dist/utils.js"]) is not recommended.
    // At the least, it does not support specifying a top-level import (".").
    _pkgExports = {}
    for (const path of pkg.exports) _pkgExports[path] = { default: path }
} else {
    const _pkgExportsRaw = pkg.exports ?? {}
    for (const [exportName, exportValue] of Object.entries(_pkgExportsRaw)) {
        if (typeof exportValue === "string") {
            _pkgExportsRaw[exportName] = { default: exportValue }
        }
    }
    _pkgExports = _pkgExportsRaw as PkgExports
}

// Convert the main export to the "exports" format if absent.

if (!_pkgExports["."] && (pkg.module || pkg.main || pkg.types)) {
    _pkgExports["."] = {}
}
if (pkg.types && !_pkgExports["."].types) {
    _pkgExports["."].types = pkg.types
}
if (pkg.main && !_pkgExports["."].default) {
    _pkgExports["."].default = pkg.main
}
if (pkg.module && !_pkgExports["."].import) {
    _pkgExports["."].import = pkg.module
}
if (pkg.module && !_pkgExports["."].default) {
    _pkgExports["."].default = pkg.module
}

/** Package exports, defaulting to empty object if absent. */
export const pkgExports: PkgExports = _pkgExports

/** Package export names, defaulting to ["."] if empty. */
export const pkgExportNames = Object.keys(pkgExports) || ["."]
