import { join } from "node:path"

/** Current working directory. */
export const base = process.cwd()

/** Package name, the last component of {@link base}. */
export const pkgName = base.substring(base.lastIndexOf("/") + 1)

// biome-ignore lint/suspicious/noExplicitAny: package.json is untyped
export type PkgType = any

/** Imported package.json for the package. */
export const pkg: PkgType = await import(join(base, "./package.json"))
