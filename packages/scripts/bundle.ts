import { existsSync } from "node:fs"
import { join } from "node:path"
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor"
import { $ } from "bun"
import byteSize from "byte-size"
import chalk from "chalk"
import pkgSize from "pkg-size"
import type { PkgSizeData } from "pkg-size/dist/interfaces"
import type { cliArgs } from "./cli-args"
import type { Config, DefineConfigParameters } from "./defineConfig"
import { spinner } from "./spinner"

// silence TS errors as these will be caught and reported by tsc
$.nothrow()

spinner.start("Building...")

const base = process.cwd()
const pkgName = base.substring(base.lastIndexOf("/") + 1)

const configArgs = {
    mode: process.env.NODE_ENV,
}

const pkg = await import(join(base, "./package.json"))

// global instance run counter
let run = 0

function getConfigArray(configs: DefineConfigParameters, options: typeof cliArgs): Config[] {
    if (typeof configs === "object") {
        return Array.isArray(configs) ? configs : [configs]
    }

    const _result = configs({ ...configArgs, ...options, run })
    return Array.isArray(_result) ? _result : [_result]
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
    const cleanupPaths = new Set<string>()

    const start = performance.now()
    for (const config of configs) {
        const t0 = performance.now()

        await cleanOutDir(config)
        const t1 = performance.now()

        // TODO needs to build dependent packages before

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

                    if (config.cleanOutDir) {
                        for (const path of rollupResults?.cleanUpPaths ?? []) {
                            cleanupPaths.add(path)
                        }
                    }
                }
            } else {
                await writeTypesEntryStub(config)
            }
        } else {
            console.log(`${pkgName} — TS config file not specified, skipping types generation`)
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

        if (config.bunConfig) {
            const Package = config.bunConfig?.entrypoints.join("', '") as string
            buildTimes.set(Package, {
                clean: (config.bunConfig?.outdir && config.cleanOutDir && `${Math.ceil(t1 - t0)} ms`) || "",
                types: (config.tsConfig && `${Math.ceil(t2 - t1)} ms`) || "",
                build: `${Math.ceil(t3 - t2)} ms`,
            })
        }
    }

    // remove types files generated outside of the main output dir
    for (const path of cleanupPaths) {
        await $`rm -rf ${path}`
    }

    // TODO time this
    await areTheTypesWrong()

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

async function areTheTypesWrong() {
    // TODO must actually bundle CJS
    spinner.text = `${pkgName} — Checking for packaging issues...`
    const output = await $`bun attw --pack ${base} --ignore-rules cjs-resolves-to-esm`.text()
    if (output.includes("No problems found")) return

    console.log(output)

    const stripFormatting = output
        .split("\n")
        .filter((a) => a.startsWith("\u001b[90m│"))
        .map((a) =>
            a
                .replaceAll("\u001b[90m", "")
                .replaceAll("\u001b[39m", "")
                .replaceAll("\u001b[31m", "")
                .replaceAll('"', "")
                .trim()
                .split("│")
                .map((n) => n.trim())
                .filter(Boolean),
        )
    const headers = stripFormatting.shift() as string[]
    console.table(
        stripFormatting.map(([target, ...rest]) => ({
            ...rest.reduce(
                (acc, result, idx) => {
                    acc[chalk.green.bold(headers[idx])] = result
                    return acc
                },
                { [chalk.blue("target")]: target } as { [key: string]: string },
            ),
        })),
    )
}

async function cleanOutDir(config: Config) {
    if (!config.bunConfig) return

    const {
        cleanOutDir,
        bunConfig: { outdir: outDir },
    } = config

    if (!outDir || !cleanOutDir) {
        return
    }

    if (existsSync(outDir)) {
        spinner.text = `emptying: ${outDir}`
        await $`rm -rf ${outDir}`
    }
}

async function rollupTypes(config: Config) {
    if (!config.apiExtractorConfig || !config.tsConfig) return

    spinner.text = `${pkgName} — Bundling types (API Extractor)...`
    const cleanUpPaths = new Set<string>()

    // temp path to disable a lot of useless output from api extractor
    const ogLog = console.log.bind(console)
    const ogWarn = console.warn.bind(console)
    console.log = () => {}
    console.warn = (...msg) => ogWarn(chalk.blue("[@microsoft/api-extractor]"), ...msg)

    const tsconfig = await $`tsc --project ${config.tsConfig} --showConfig`.json()

    const apiExtractorJsonPath: string = join(base, config.apiExtractorConfig)
    const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
        localBuild: true,
        typescriptCompilerFolder: require.resolve("typescript").replace("/lib/typescript.js", ""), // use project's typescript version
        showVerboseMessages: false,
    })
    console.warn = ogWarn
    console.log = ogLog

    const output =
        typeof config.types === "string"
            ? config.types
            : typeof config.types === "object" && config.bunConfig && config.bunConfig?.entrypoints
              ? config.types[config.bunConfig.entrypoints[0]]
              : pkg.types

    // rename output to match package.json
    await $`mv ${extractorResult.extractorConfig.untrimmedFilePath} ${join(base, output)}`

    // clean out raw tsconfig types if its not the main output dir
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

    const pkg = await import(join(base, "./package.json"))

    if (config.bunConfig?.entrypoints?.length) {
        spinner.text = `${pkgName} — API Extractor config file not specified, generating index type stub...`
        for (const entry of config.bunConfig.entrypoints) {
            // index.d.ts stub to re-export all from main types entry
            const output =
                typeof config.types === "string"
                    ? config.types
                    : typeof config.types === "object"
                      ? config.types[entry]
                      : pkg.types

            await Bun.write(
                join(base, output),
                `export * from './${join("types", entry).replace(".ts", "")}'\nexport {}`,
            )
        }
    }
}

async function bunBuild(config?: Config["bunConfig"]) {
    if (!config) return
    spinner.text = `${pkgName} — Bundling JS...`
    return await Bun.build(config)
}

async function tscBuild(config: Config) {
    if (!config.tsConfig) return

    const tsconfigPath = join(base, config.tsConfig)
    spinner.text = `${pkgName} — Generating types (tsc)...`
    const out = await $`bun tsc --build ${tsconfigPath} ${config.cleanOutDir ? "--force" : ""}`

    if (out.exitCode) {
        console.error(out.text())
        throw new Error("Typescript (tsc) build failed. Aborting")
    }
}
