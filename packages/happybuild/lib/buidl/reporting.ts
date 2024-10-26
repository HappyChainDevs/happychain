import byteSize from "byte-size"
import chalk from "chalk"
import pkgSize from "pkg-size"
import type { PkgSizeData } from "pkg-size/dist/interfaces"
import type { Context } from "../build"
import type { Config } from "../config/types"
import { base, pkg } from "../utils/globals"
import { spinner } from "../utils/spinner"
import { withOutputsInExportDirs } from "../utils/symlinks"

export async function reporting(configs: Config[], ctx: Context) {
    // Report if any of the configs request it.
    const reportTime = configs.some((c) => c.reportTime)
    const reportSizes = configs.some((c) => c.reportSizes)

    const rootExport = configs.flatMap((c) => c.exports).find((ex) => ex.exportName === ".")

    let sizeData = {} as PkgSizeData
    // npm pack completely ignores symlinks
    await withOutputsInExportDirs(configs, { js: true, types: true }, async () => {
        sizeData = await pkgSize(base, { sizes: ["size", "gzip", "brotli"] })
    })
    const moduleFile = rootExport?.exportedPath?.replace(/^\.\//, "") // remove leading './'
    const bundleFile = sizeData.files.find((f) => f.path === moduleFile)

    let sizeSummary = ""
    if (bundleFile) {
        const bundleFileSize = byteSize(bundleFile.size, { units: "metric" }).toString()
        sizeSummary = ` (JS Bundle Size: ${bundleFileSize})`
    }
    const timeSummary = chalk.green(`${Math.ceil(performance.now() - ctx.start)}ms`)
    spinner.success(`${pkg.name} — Finished in ${timeSummary} 🎉${sizeSummary}`)

    if (reportTime) {
        const report = generateTimeReport(ctx.buildTimes)
        console.table(report)
    }

    if (reportSizes) {
        const report = generateSizeReport(sizeData)
        console.table(report)
        console.log(
            `\n${chalk.green(pkg.name)} Tarball Size: ${chalk.yellow(byteSize(sizeData.tarballSize, { units: "metric" }))}`,
        )
    }
}

function generateSizeReport(sizes: PkgSizeData) {
    const _file = chalk.blue("file")
    const _size = chalk.blue("size")
    const _gzip = chalk.blue("gzip")
    const _brotli = chalk.blue("brotli")
    return sizes.files.map((file) => {
        const size = byteSize(file.size, { units: "metric" })
        const gzip = byteSize(file.sizeGzip, { units: "metric" })
        const brotli = byteSize(file.sizeBrotli, { units: "metric" })
        return {
            [_file]: chalk.green.bold(file.path),
            [_size]: chalk.yellow(size),
            [_gzip]: chalk.yellow(gzip),
            [_brotli]: chalk.yellow(brotli),
        }
    })
}

function generateTimeReport(buildTimes: Map<string, Record<string, string>>) {
    const configs = Array.from(buildTimes.keys())

    const getTimings = (step: string) => {
        // biome-ignore format: terse
        return Object.assign({}, ...configs.map((cfg) => {
            const timing = buildTimes.get(cfg)?.[step]
            return timing ? { [chalk.green.bold(cfg)]: timing } : {}
        }))
    }

    const step = chalk.blue("Step")

    return [
        { [step]: "Typescript", ...getTimings("tsc") },
        { [step]: "Rolling types", ...getTimings("rollup") },
        { [step]: "Bundling", ...getTimings("bundling") },
        { [step]: "Checking exports", ...getTimings("checkExports") },
    ].filter((row) => Object.keys(row).length > 1)
}
