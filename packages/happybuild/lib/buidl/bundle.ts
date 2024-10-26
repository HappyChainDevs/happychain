import type { Config } from "../config/types"
import { errorExit } from "../utils/misc"
import { spinner } from "../utils/spinner"

/**
 * Creates a JS bundle.
 */
export async function bundle(config: Config) {
    spinner.setText(`${config.fullName} — Bundling JS...`)
    const results = await Bun.build(config.bunConfig)
    if (!results?.success) {
        if (results?.logs) {
            for (const log of results.logs) {
                console.error(log)
                errorExit("Bundling with bun failed.")
            }
        }
        errorExit("Bundling with bun failed without error messages.")
    }
}
