#!/usr/bin/env bun
import { join } from "node:path"
import { promiseWithResolvers } from "@happychain/common"
import watcher from "@parcel/watcher"
import { $ } from "bun"
import { build } from "../lib/build"
import { cliArgs } from "../lib/cli-args"
import { getConfigs } from "../lib/config/getConfigs"

// load config
const { default: configs } = await import(join(process.cwd(), cliArgs.config))

if (!cliArgs.watch) {
    await build({ configs, options: cliArgs })
    process.exit(0)
}

// === watch mode ===

// hacky, but disables the spinner which otherwise prevents ctrl+c from working on some terminals
process.env.CI = "true"

const _configs = getConfigs(configs, cliArgs)
const outDirs = Array.from(new Set(_configs.flatMap((c) => [c.bunConfig.outdir, c.exportDir]))).concat([
    "./node_modules",
    "./*.tgz",
])

let buildLock = promiseWithResolvers<void>()
buildLock.resolve()

const queueBuild = debounceEvent(async () => {
    // wait for lock
    const lock = buildLock
    await buildLock.promise

    if (lock !== buildLock) {
        // another build took the lock
        console.log("returning")
        return
    }

    // take lock
    buildLock = promiseWithResolvers<void>()

    await build({ configs, options: cliArgs })

    // release lock
    buildLock.resolve()
}, 1000)

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

// build once at start
await queueBuild()

// rebuild (debounced)
const subscription = await watcher.subscribe(process.cwd(), (_err, _events) => queueBuild(), {
    ignore: outDirs,
})

let sigint = false
process.prependListener("SIGINT", async () => {
    if (sigint) return // run only once (somehow it runs twice otherwise)
    sigint = true
    console.log("cleanup")
    await subscription.unsubscribe()
    process.exit(1)
})
