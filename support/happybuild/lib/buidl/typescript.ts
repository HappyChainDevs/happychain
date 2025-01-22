import { join } from "node:path"
import { $ } from "bun"
import type { Config } from "../config/types"
import { base } from "../utils/globals"
import { errorExit } from "../utils/misc"
import { spinner } from "../utils/spinner"

/**
 * Runs `tsc --build`. This only needs to be run once per `tsconfig.json` file.
 */
export async function tscBuild(config: Config) {
    if (!config.tsConfig) return

    const tsconfigPath = join(base, config.tsConfig)
    const forceOpt = config.cleanOutDir ? "--force" : ""
    const noEmitOpt = `--noEmit ${!config.emitTypes}`

    spinner.setText(`${config.fullName} — Generating types (tsc)...`)

    const out = await $`bun tsc --build ${{ raw: noEmitOpt }} ${tsconfigPath} ${forceOpt}`.nothrow()

    if (out.exitCode) {
        console.error(out.text())
        errorExit("Typescript (tsc) build failed. Aborting.")
    }
}
