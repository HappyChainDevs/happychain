import { existsSync, lstatSync } from "node:fs"
import { basename } from "node:path"
import { join } from "node:path"
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor"
import { $ } from "bun"
import byteSize from "byte-size"
import chalk from "chalk"
import pkgSize from "pkg-size"
import type { PkgSizeData } from "pkg-size/dist/interfaces"
import type { cliArgs } from "./cli-args"
import { type Config, type DefineConfigParameters, defaultConfig } from "./defineConfig"
import { spinner } from "./spinner"

spinner.start("Building...")

const base = process.cwd()
const pkgName = base.substring(base.lastIndexOf("/") + 1)
let pkgConfigName = pkgName

const configArgs = {
    mode: process.env.NODE_ENV,
}

const pkg = await import(join(base, "./package.json"))

// global instance run counter
let run = 0

function applyDefaults(config: Config): Config {
    return {
        ...defaultConfig,
        ...config,
        // Types are afraid we're missing the entrypoints, but we have a default value for them
        bunConfig: { ...defaultConfig.bunConfig, ...config.bunConfig },
    }
}

function getConfigArray(configs: DefineConfigParameters, options: typeof cliArgs): Config[] {
    const _configs: DefineConfigParameters =
        typeof configs === "function" //
            ? configs({ ...configArgs, ...options, run })
            : configs
    return ((Array.isArray(configs) ? configs : [configs]) as Config[]).map(applyDefaults)
}

export async function build({
    configs: _configs,
    options,
}: { configs: DefineConfigParameters; options: typeof cliArgs }) {
    const configs = getConfigArray(_configs, options)
    run++

    const buildTimes = new Map()
    const usedTsConfigs = new Set()
    const usedApiExtractorConfigs = new Set()
    const cleanupPaths: string[][] = []

    const start = performance.now()
    for (const [i, config] of configs.entries()) {
        if (config.name) {
            pkgConfigName = `${pkgName}/${config.name}`
        }
        const t0 = performance.now()

        await cleanOutDir(config)
        const t1 = performance.now()

        if (config.tsConfig) {
            // don't regenerate the same config more than once per build...
            if (!usedTsConfigs.has(config.tsConfig)) {
                await tscBuild(config)
                usedTsConfigs.add(config.tsConfig)
            }

            if (config.apiExtractorConfig) {
                // don't regenerate the same config more than once per build...
                if (!usedApiExtractorConfigs.has(config.apiExtractorConfig)) {
                    const rollupResults = await rollupTypes(config)
                    usedApiExtractorConfigs.add(config.apiExtractorConfig)
                    cleanupPaths.push([])
                    rollupResults?.cleanUpPaths?.forEach((path) => cleanupPaths[i].push(path))
                }
            } else {
                await writeTypesEntryStub(config)
            }
        } else {
            console.log(`${pkgConfigName} — TS config file not specified, skipping types generation`)
        }

        const t2 = performance.now()

        const buildResults = await bunBuild(config.bunConfig)
        if (!buildResults?.success) {
            if (buildResults?.logs) {
                for (const log of buildResults.logs) {
                    console.warn(log)
                }
            } else {
                console.log("Build Failed")
            }
            break
        }

        const t3 = performance.now()

        await areTheTypesWrong(config)

        const t4 = performance.now()

        if (config.bunConfig) {
            const Package = config.bunConfig?.entrypoints.join("', '") as string
            buildTimes.set(Package, {
                clean: (config.bunConfig?.outdir && config.cleanOutDir && `${Math.ceil(t1 - t0)} ms`) || "",
                types: (config.tsConfig && `${Math.ceil(t2 - t1)} ms`) || "",
                build: `${Math.ceil(t3 - t2)} ms`,
                checkExports: `${Math.ceil(t4 - t3)} ms`,
            })
        }
    }

    const pathsToClean = new Set(
        configs
            .map((c, i) => (c.cleanOutsideOutDir ? cleanupPaths[i] : undefined))
            .filter(Boolean)
            .flat() as string[],
    )

    // TODO this can actually cleans paths inside the output dir (e.g. `dist/types`)
    for (const path of pathsToClean) {
        await $`rm -rf ${path}`
    }

    const entries = Array.from(buildTimes.keys())
    const buildTable = [
        {
            [chalk.blue("Step")]: "Clean",
            // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
            ...entries.reduce((acc, entry) => ({ ...acc, [chalk.green.bold(entry)]: buildTimes.get(entry).clean }), {}),
        },
        {
            [chalk.blue("Step")]: "Types",
            // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
            ...entries.reduce((acc, entry) => ({ ...acc, [chalk.green.bold(entry)]: buildTimes.get(entry).types }), {}),
        },
        {
            [chalk.blue("Step")]: "Build",
            // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
            ...entries.reduce((acc, entry) => ({ ...acc, [chalk.green.bold(entry)]: buildTimes.get(entry).build }), {}),
        },
        {
            [chalk.blue("Step")]: "Check exports",
            ...entries.reduce(
                // biome-ignore lint/performance/noAccumulatingSpread: <explanation>
                (acc, entry) => ({ ...acc, [chalk.green.bold(entry)]: buildTimes.get(entry).checkExports }),
                {},
            ),
        },
    ]
    if (configs[0].reportTime) console.table(buildTable)

    let sizeData: PkgSizeData | undefined = undefined
    if (configs[0].reportSizes) {
        sizeData = await pkgSize(base, {
            sizes: ["size", "gzip", "brotli"],
        })
        console.table(
            sizeData.files.map((file) => {
                const size = byteSize(file.size, { units: "metric" })
                const gzip = byteSize(file.sizeGzip, { units: "metric" })
                const brotli = byteSize(file.sizeBrotli, { units: "metric" }).toString()
                return {
                    [chalk.blue("file")]: chalk.green.bold(file.path),
                    [chalk.blue("size")]: chalk.yellow(size),
                    [chalk.blue("gzip")]: chalk.yellow(gzip),
                    [chalk.blue("brotli")]: chalk.yellow(brotli),
                }
            }),
        )
        console.log(`\n\tTotal Size: ${chalk.yellow(byteSize(sizeData.tarballSize, { units: "metric" }))}`)
    }

    const sizeData2 = sizeData ?? (await pkgSize(base, { sizes: ["size"] }))
    const moduleFile = pkg.module.replace(/^\.\//, "") // remove leading './' if present
    const bundleFile = sizeData2.files.find((f) => f.path === moduleFile)
    const bundleFileSize = byteSize(bundleFile?.size ?? 0, { units: "metric" }).toString()
    spinner.success(
        `${pkgName} — Finished in ${chalk.green(`${Math.ceil(performance.now() - start)}ms`)} 🎉` +
            ` (JS Bundle Size: ${bundleFileSize})`,
    )
}

async function areTheTypesWrong(config: Config | undefined) {
    spinner.text = `${pkgConfigName} — Checking for packaging issues...`

    let output: string
    if (config) {
        const exports = config.exports ?? (pkg.exports?.length > 0 ? Object.keys(pkg.exports) : ["."])
        // biome-ignore format: +
        const attwCommand = "bun attw"
          + " --pack"
          + " --ignore-rules cjs-resolves-to-esm"
          + ` --entrypoints ${exports.join(" ")}`

        output = await $`${{ raw: attwCommand }}`.nothrow().text()
    } else {
        // auto-detect exports
        output = await $`bun attw --pack --ignore-rules cjs-resolves-to-esm`.nothrow().text()
    }

    if (output.includes("No problems found")) return

    // Prettify the table to make its display more compact.
    // Map the existing rows to a new array of row.
    // The first row is a list of packages being bundled.
    // Each subsequent row is a bundling target, followed by the results for every package.
    const rows = output
        .split("\n")
        .filter((a) => a.startsWith("\u001b[90m│"))
        .map((row) =>
            row
                .replaceAll("\u001b[90m", "") // grey color marker
                .replaceAll("\u001b[39m", "") // reset color marker
                .replaceAll("\u001b[31m", "") // red color marker
                .replaceAll('"', "")
                .trim()
                .split("│")
                .map((n) => n.trim())
                .filter(Boolean),
        )

    const headers = rows.shift() as string[]
    const table: Record<string, string>[] = []
    for (const row of rows) {
        const tableRow: Record<string, string> = {}
        tableRow[chalk.blue("target")] = row.shift()!
        for (const [i, result] of row.entries()) {
            tableRow[chalk.green(headers[i])] = result
        }
        table.push(tableRow)
    }
    console.table(table)
}

const cleanedOutDirs = new Set<string>()

async function cleanOutDir(config: Config) {
    if (!config.bunConfig) return

    const {
        cleanOutDir,
        bunConfig: { outdir, entrypoints },
    } = config

    if (!outdir || cleanedOutDirs.has(outdir)) return

    // Must be here, not after: dir might be empty, but will be populated by one of the configs.
    cleanedOutDirs.add(outdir)

    const hasSymlinks = entrypoints.some((entrypoint) => {
        const outPath = outputFileForEntrypoint(config, entrypoint, "js")
        return existsSync(outPath) && lstatSync(outPath).isSymbolicLink()
    })

    if (!hasSymlinks && !cleanOutDir) {
        return
    }

    if (existsSync(outdir)) {
        spinner.text = `emptying: ${outdir}`
        await $`rm -rf ${outdir}`
    }
}

/**
 * Returns the output path for a given entrypoint and extension, using {@link BunConfig.naming}.
 */
function outputFileForEntrypoint(config: Config, entrypoint: string, ext: string): string {
    const bunConfig = config.bunConfig
    return bunConfig.naming
        .replace("[dir]", bunConfig.outdir)
        .replace("[name]", basename(entrypoint).split(".")[0])
        .replace("[ext]", ext)
}

function typeOutputFileForEntrypoint(config: Config, entrypoint: string): string {
    let outputFile = ""
    // TODO can we gen multiple files?
    const exportName = config.exports?.[0]
    if (exportName && pkg.exports?.[exportName]?.types) {
        outputFile = pkg.exports[exportName].types
    } else if (entrypoint) {
        outputFile = outputFileForEntrypoint(config, entrypoint, "d.ts")
    } else if (pkg.exports?.["."]?.types) {
        outputFile = pkg.exports["."].types
    } else {
        // biome-ignore format: +
        throw new Error(
            "Unable to determine type output file: no entrypoint in build config, "
            + "no 'types' properties in package.json.")
    }
    return outputFile
}

async function rollupTypes(config: Config) {
    if (!config.apiExtractorConfig || !config.tsConfig) return

    spinner.text = `${pkgConfigName} — Bundling types (API Extractor)...`
    const cleanUpPaths = new Set<string>()

    // temp path to disable a lot of useless output from api extractor
    const ogLog = console.log.bind(console)
    const ogWarn = console.warn.bind(console)
    console.log = () => {}
    console.warn = (...msg) => ogWarn(chalk.blue("[@microsoft/api-extractor]"), ...msg)

    const tsconfig = await $`tsc --project ${config.tsConfig} --showConfig`.nothrow().json()

    const apiExtractorJsonPath: string = join(base, config.apiExtractorConfig)
    const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
        localBuild: true,
        typescriptCompilerFolder: require.resolve("typescript").replace("/lib/typescript.js", ""), // use project's typescript version
        showVerboseMessages: false,
    })

    console.warn = ogWarn
    console.log = ogLog

    const entrypoint = config.bunConfig?.entrypoints?.[0]
    const outputFile = typeOutputFileForEntrypoint(config, entrypoint)
    await $`mv ${extractorResult.extractorConfig.untrimmedFilePath} ${join(base, outputFile)}`

    // clean out individual .d.ts files if its not the main output dir
    if (
        tsconfig.compilerOptions.outDir &&
        tsconfig.compilerOptions.declarationDir &&
        tsconfig.compilerOptions.declarationDir !== tsconfig.compilerOptions.outDir
    ) {
        cleanUpPaths.add(join(base, tsconfig.compilerOptions.declarationDir))
    }
    return { cleanUpPaths }
}

async function writeTypesEntryStub(config: Config) {
    if (!config.bunConfig) return

    if (config.bunConfig?.entrypoints?.length) {
        spinner.text = `${pkgConfigName} — API Extractor config file not specified, generating index type stub...`
        for (const entry of config.bunConfig.entrypoints) {
            // index.d.ts stub to re-export all from main types entry
            const outputFile = typeOutputFileForEntrypoint(config, entry)
            await Bun.write(
                join(base, outputFile),
                `export * from './${join("types", entry).replace(".ts", "")}'\nexport {}`,
            )
        }
    }
}

async function bunBuild(config?: Config["bunConfig"]) {
    if (!config) return
    spinner.text = `${pkgConfigName} — Bundling JS...`
    return await Bun.build(config)
}

async function tscBuild(config: Config) {
    if (!config.tsConfig) return

    const tsconfigPath = join(base, config.tsConfig)
    spinner.text = `${pkgConfigName} — Generating types (tsc)...`
    const out = await $`bun tsc --build ${tsconfigPath} ${config.cleanOutDir ? "--force" : ""}`.nothrow()

    if (out.exitCode) {
        console.error(out.text())
        throw new Error("Typescript (tsc) build failed. Aborting")
    }
}
