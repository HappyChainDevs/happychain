#!/usr/bin/env bun
import { join } from "node:path"
import watcher from "@parcel/watcher"
import { build } from "../lib/build"
import { cliArgs } from "../lib/cli-args"
import { getConfigs } from "../lib/config/getConfigs"

// load config
const { default: configs } = await import(join(process.cwd(), cliArgs.config))

if (!cliArgs.watch) {
    await build({ configs, options: cliArgs })
} else {
    const _configs = getConfigs(configs, cliArgs)

    const outDirs = Array.from(new Set(_configs.flatMap((c) => c.bunConfig.outdir))).concat([
        "./node_modules",
        "./*.tgz",
    ])

    const debounceBuild = debounceEvent(async () => build({ configs, options: cliArgs }), 250)

    // Build once at start
    await debounceBuild()

    // rebuild (debounced)
    const subscription = await watcher.subscribe(process.cwd(), (_err, _events) => debounceBuild(), {
        ignore: outDirs,
    })

    process.on("SIGINT", () => {
        void subscription.unsubscribe()
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
