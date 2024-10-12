#!/usr/bin/env bun
import { join } from "node:path"
import watcher from "@parcel/watcher"
import type { Config, DefineConfigParameters } from "../lib"
import { build } from "../lib/bundle"
import { cliArgs } from "../lib/cli-args"
import { type BuildContext, getConfigs } from "../lib/defineConfig"

// load config
const { default: configs } = await import(join(process.cwd(), cliArgs.config))

const base = process.cwd()

const makeContext = async () => ({
    base,
    name: base.substring(base.lastIndexOf("/") + 1),
    pkg: await import(join(base, "./package.json")),
})

if (!cliArgs.watch) {
    await build({ configs, options: cliArgs, context: await makeContext() })
} else {
    const context = await makeContext()
    const _configs = getConfigs(configs, cliArgs, context)

    const outDirs = Array.from(new Set(_configs.flatMap((c) => c.bunConfig.outdir))).concat([
        "./node_modules",
        "./*.tgz",
    ])

    const debounceBuild = debounceEvent(
        async () => build({ configs, options: cliArgs, context: await makeContext() }),
        250,
    )

    // Build once at start
    await debounceBuild()

    // rebuild (debounced)
    const subscription = await watcher.subscribe(process.cwd(), (_err, _events) => debounceBuild(), {
        ignore: outDirs,
        backend: "watchman",
    })

    process.on("SIGINT", () => {
        subscription.unsubscribe()
        process.exit()
    })
}

function debounceEvent(callback: (...args: unknown[]) => void, time: number) {
    let interval: Timer | undefined = undefined
    return (...args: unknown[]) => {
        clearTimeout(interval)
        interval = setTimeout(() => {
            interval = undefined
            callback(...args)
        }, time)
    }
}
