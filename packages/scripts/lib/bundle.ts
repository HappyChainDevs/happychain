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
import type { Config, DefineConfigParameters } from "./defineConfig"
import { getConfigs, getEntrypointPath } from "./utils/config"
import { base, pkg } from "./utils/globals"
import { spinner } from "./utils/spinner"

/**
 * Display name for the config being built. This will be `${pkgName}/${config.name}` if
 * `config.name` is set, otherwise only the package name.
 */
let pkgConfigName = base.substring(base.lastIndexOf("/") + 1)

export async function build({
    configs: _configs,
    options,
}: { configs: DefineConfigParameters; options: typeof cliArgs }) {
    spinner.start("Building...")

    const configs = getConfigs(_configs, options)

    const buildTimes = new Map<string, Record<string, string>>()
    const usedTsConfigs = new Set<string>()
    const usedApiExtractorConfigs = new Set<string>()
    const cleanupPaths: string[][] = []

    const start = performance.now()

    for (const [i, config] of configs.entries()) {
        if (config.name) {
            pkgConfigName = join(pkg.name, config.name)
        } else if (configs.length === 1) {
            pkgConfigName = pkg.name
        } else if (config.exports) {
            pkgConfigName =
                config.exports.length === 1
                    ? join(pkg.name, config.exports[0])
                    : join(pkg.name, `{${config.exports.join(", ")}`)
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

        const buildResults = await bunBuild(config)
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
            const Package = config.bunConfig.entrypoints.join("', '") as string
            buildTimes.set(Package, {
                clean: (config.bunConfig.outdir && config.cleanOutDir && `${Math.ceil(t1 - t0)} ms`) || "",
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

    // we can check any of the configs, as we can presume
    // all configs will belong to the same package
    const reportTime = configs.some((c) => c.reportTime)
    const reportSizes = configs.some((c) => c.reportSizes)

    const sizeData = await pkgSize(base, { sizes: ["size", "gzip", "brotli"] })

    const moduleFile = getEntrypointPath(".")?.replace(/^\.\//, "") // remove leading './' if present
    const bundleFile = sizeData.files.find((f) => f.path === moduleFile)
    const bundleFileSize = byteSize(bundleFile?.size ?? 0, { units: "metric" }).toString()
    spinner.success(
        `${pkgConfigName} — Finished in ${chalk.green(`${Math.ceil(performance.now() - start)}ms`)} 🎉` +
            ` (JS Bundle Size: ${bundleFileSize})`,
    )

    if (reportTime) {
        const report = generateTimeReport(buildTimes)
        console.table(report)
    }

    if (reportSizes) {
        const report = generateSizeReport(sizeData)
        console.table(report)
        console.log(
            `\n${chalk.green(pkg.name)} Total Size: ${chalk.yellow(byteSize(sizeData.tarballSize, { units: "metric" }))}`,
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
    const entries = Array.from(buildTimes.keys())

    type Entry = { [key: string]: string | undefined }

    const reducer = (name: string) => (acc: Entry, entry: string) => ({
        ...acc,
        [chalk.green.bold(entry)]: buildTimes.get(entry)?.[name],
    })

    const step = chalk.blue("Step")

    return [
        {
            [step]: "Clean",
            ...entries.reduce(reducer("clean"), {}),
        },
        {
            [step]: "Types",
            ...entries.reduce(reducer("types"), {}),
        },
        {
            [step]: "Build",
            ...entries.reduce(reducer("build"), {}),
        },
        {
            [step]: "Check exports",
            ...entries.reduce(reducer("checkExports"), {}),
        },
    ]
}

async function areTheTypesWrong(config: Config) {
    if (!config?.checkExports) return
    spinner.setText(`${pkgConfigName} — Checking for packaging issues...`)

    let output: string
    if (config) {
        const keys = Object.keys(pkg.exports ?? {})
        const exports = config.exports ?? (keys.length ? keys : ["."])
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

    if (process.env.CI) {
        // strip out the intro comments and display the warnings & table
        console.log(output.split("(ignoring rules: 'cjs-resolves-to-esm')")[1])
        return
    }

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
    const {
        cleanOutDir,
        bunConfig: { outdir, entrypoints },
    } = config

    const fullOutDir = join(base, outdir)
    if (!outdir || cleanedOutDirs.has(fullOutDir)) return

    // Must be here, not after: dir might be empty, but will be populated by one of the configs.
    cleanedOutDirs.add(fullOutDir)

    const hasSymlinks = entrypoints.some((entrypoint) => {
        const outPath = outputFileForEntrypoint(config, entrypoint, "js")
        return existsSync(outPath) && lstatSync(outPath).isSymbolicLink()
    })

    if (!hasSymlinks && !cleanOutDir) {
        return
    }

    if (existsSync(fullOutDir)) {
        spinner.setText(`emptying: ${fullOutDir}`)
        await $`rm -rf ${fullOutDir}`
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
    if (config.exports?.length === 1) {
        // If there's only one export, we look up the name of the types output file if it exists.
        // We can't do this if there is more than one export, as we don't know about how entrypoints
        // map to exports.
        const exportName = config.exports[0]
        if (pkg.exports?.[exportName]?.types) {
            outputFile = pkg.exports[exportName].types
            if (outputFile) return outputFile
        }
    }
    if (entrypoint) {
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

    spinner.setText(`${pkgConfigName} — Bundling types (API Extractor)...`)
    const cleanUpPaths = new Set<string>()

    // temp fix to disable a lot of useless output from api extractor
    const ogLog = console.log.bind(console)
    const ogWarn = console.warn.bind(console)
    console.log = () => {}
    console.warn = (...msg) => ogWarn(chalk.blue("[@microsoft/api-extractor]"), ...msg)

    const tsconfig = await $`tsc --project ${config.tsConfig} --showConfig`.nothrow().json()

    const apiExtractorJsonPath: string = join(base, config.apiExtractorConfig)

    if (!(await Bun.file(ExtractorConfig.loadFile(apiExtractorJsonPath).mainEntryPointFilePath).exists())) {
        // Force a full rebuild if main entry point (dist/types folder doesn't exist).
        // This can happen with incremental builds when the types are removed,
        // but the buildinfo file is not updated.
        await tscBuild({ ...config, cleanOutDir: true })
    }

    const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
        localBuild: true,
        typescriptCompilerFolder: require.resolve("typescript").replace("/lib/typescript.js", ""), // use project's typescript version
        showVerboseMessages: false,
    })

    console.warn = ogWarn
    console.log = ogLog

    const entrypoint = config.bunConfig.entrypoints?.[0]
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
    if (config.bunConfig.entrypoints?.length) {
        spinner.setText(`${pkgConfigName} — API Extractor config file not specified, generating index type stub...`)
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

async function bunBuild(config: Config) {
    if (!config) return
    spinner.setText(`${pkgConfigName} — Bundling JS...`)
    return await Bun.build(config.bunConfig)
}

async function tscBuild(config: Config) {
    if (!config.tsConfig) return

    const tsconfigPath = join(base, config.tsConfig)
    spinner.setText(`${pkgConfigName} — Generating types (tsc)...`)
    const out = await $`bun tsc --build ${tsconfigPath} ${config.cleanOutDir ? "--force" : ""}`.nothrow()

    if (out.exitCode) {
        console.error(out.text())
        throw new Error("Typescript (tsc) build failed. Aborting")
    }
}
