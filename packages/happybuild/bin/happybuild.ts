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

let building = false
let needsRebuild = true

// runs immediately and then every second
setInterval(
    () =>
        (async function maybeRebuild() {
            if (building || !needsRebuild) return
            building = true
            needsRebuild = false
            await build({ configs, options: cliArgs })
            building = false
            return maybeRebuild
        })(),
    1000,
)

function setNeedsRebuild() {
    needsRebuild = true
}

// watch fs events to know when we need to rebuild
const subscription = await watcher.subscribe(process.cwd(), setNeedsRebuild, { ignore: outDirs })

let sigint = false
process.prependListener("SIGINT", async () => {
    if (sigint) return // run only once (somehow it runs twice otherwise)
    sigint = true
    console.log("cleanup")
    await subscription.unsubscribe()
    process.exit(1)
})
