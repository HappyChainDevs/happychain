import { existsSync } from "node:fs"
import { join } from "node:path"
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor"
import { $ } from "bun"
import byteSize from "byte-size"
import pkgSize from "pkg-size"
import type { cliArgs } from "./cli-args"
import type { Config, DefineConfigParameters } from "./defineConfig"

// silence TS errors as these will be caught and reported by tsc
$.nothrow()

const base = process.cwd()

const configArgs = {
    mode: process.env.NODE_ENV,
}

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
    for (const config of configs) {
        const t0 = performance.now()

        await cleanOutDir(config)

        const t1 = performance.now()

        if (config.tsConfig) {
            await tscBuild(config)

            if (config.apiExtractorConfig) {
                await rollupTypes(config)
            } else {
                await writeTypesEntryStub(config)
            }
        }

        const t2 = performance.now()

        await bunBuild(config.bunConfig)

        const t3 = performance.now()

        const sizeData = await pkgSize(base, {
            sizes: ["size", "gzip", "brotli"],
        })

        await $`bun attw --pack ${base}`

        console.table([
            { Step: "Clean", Time: `${Math.ceil(t1 - t0)} ms` },
            { Step: "Generate Types ", Time: `${Math.ceil(t2 - t1)} ms` },
            { Step: "Bun.build", Time: `${Math.ceil(t3 - t2)} ms` },
        ])
        console.table(
            sizeData.files.map((file) => ({
                file: file.path,
                size: byteSize(file.size, { units: "metric" }).toString(),
                gzip: byteSize(file.sizeGzip, { units: "metric" }).toString(),
                brotli: byteSize(file.sizeBrotli, { units: "metric" }).toString(),
            })),
        )

        console.log(`Total Size: ${byteSize(sizeData.tarballSize, { units: "metric" })}`)
        console.log(`🎉 Finished in ${Math.ceil(t3 - t0)}ms 🎉`)
    }
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
        await $`rm -rf ${outDir}/*`
    }
}

async function rollupTypes(config: Config) {
    if (!config.apiExtractorConfig) return

    const pkg = await import(join(base, "./package.json"))
    const apiExtractorJsonPath: string = join(base, config.apiExtractorConfig)
    const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
        localBuild: true,
        typescriptCompilerFolder: require.resolve("typescript").replace("/lib/typescript.js", ""), // use project's typescript version
        showVerboseMessages: false,
    })

    if (extractorResult.succeeded) {
        // rename output to match package.json
        await $`mv ${extractorResult.extractorConfig.untrimmedFilePath} ${join(base, pkg.types)}`
    } else {
        console.error(
            `API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`,
        )
        throw new Error("Api-Extractor Failed")
    }
}

async function writeTypesEntryStub(config: Config) {
    if (!config.bunConfig) return

    const pkg = await import(join(base, "./package.json"))

    for (const entry of config.bunConfig.entrypoints) {
        // index.d.ts stub to re-export all from main types entry
        await Bun.write(
            join(base, pkg.types),
            `export * from './${join("types", entry).replace(".ts", "")}'\nexport {}`,
        )
    }
}

async function bunBuild(config?: Config["bunConfig"]) {
    if (!config) return
    return await Bun.build(config)
}

async function tscBuild(config: Config) {
    if (!config.tsConfig) return

    const tsconfig = join(base, config.tsConfig)

    const out = await $`bun tsc --build ${tsconfig}`

    if (out.exitCode) {
        console.error(out.text())
        throw new Error("Typescript (tsc) build failed. Aborting")
    }
}
