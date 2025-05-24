import { existsSync, readFileSync } from "node:fs"
import * as Path from "node:path"
import * as DotEnv from "dotenv"
import type { Config } from "../config/types"
import { errorExit } from "../utils/misc"
import { spinner } from "../utils/spinner"

/**
 * Creates a JS bundle.
 */
export async function bundle(config: Config) {
    spinner.setText(`${config.fullName} — Bundling JS...`)
    const rawEnv = readDotEnv()
    const env = Object.entries(rawEnv).map(([key, val]) => [`import.meta.env.${key}`, val])
    /**
     * - bun: process.env === process.meta.env
     *   - automatically loads cwd .env, .env.local, .env.{production, development, test} (depending on NODE_ENV)
     *   - when building, also goes through happybuild
     *   - also loads entire process env
     *   - can specify .env file on cmd line (--env-file) but not programatically
     *   - env vars are inlined when bundling (this can be disabled or restricted to only a prefix)
     * - node: process.env
     *   - loads entire process env
     *   - can specify .env file on cmd line (--env-file)
     * - vite: import.meta.env
     *   - automatically loads cwd .env, .env.local, .env.<mode>, .env.<mode>.local (depending on MODE)
     *   - only load files with a given prefix (VITE_ by default, HAPPY_ for us)
     *   - env vars are inlined when bundling
     *
     * Constraints:
     * - process.env is only needed for packages that will be run with node without bundling with bun
     *   - this is also needed for packages imported by them, as we don't build in dev mode
     *   - we could ignore this if we never run with node without bundling
     * - import.meta.env is the only thing available on the web
     *   - use import.meta.env everywhere, not a problem in dev or when bundling with bun
     * - we want to load top-level .env file
     *   - vite: can simplify specify this in vite.config.ts
     *   - bun build: must be manually loaded in happybuild — but this is only possible via `define` inlining
     *      - this means we can define e.g. process.meta.env.HAPPY_CHAIN_ID, but it won't exist in `process.meta.env`
     *      - it might be possible to override `import.meta.env` to a JSON.stringify output
     *          - not sure this works
     *          - if it works, it will inline the whole env for all references, which is kinda bad
     *          - if it works, we will lose access to any "ambient" loaded env via `import.meta.env` (probably ok)
     *   - bun dev: must be passed on the command line
     * - types and validation
     *   - we could use zod to parse & transform process.env, but this most likely kills the substitution tree-shaking
     *   - w/out Zod: unclear but Vite does not autocomplete on all vars (https://vite.dev/guide/env-and-mode#intellisense-for-typescript)
     *   - w/out Zod: same for Bun (https://bun.sh/docs/runtime/env#typescript)
     *   - both Bun & Vite only support strings, so not possible to transform in their configs
     *   - see issue above in Bun where `import.meta.env` won't have the values we want
     */
    for (const _export of config.exports) {
        console.log(process.cwd())
        const bunConfig = {
            ...config.bunConfig,
            entrypoints: [_export.entrypoint],
            define: {
                ...config.bunConfig.define,
            },
        }
        const results = await Bun.build(bunConfig)
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
}

function readDotEnv(): Record<string, string> {
    let dir = process.cwd()
    let envPath = ""
    while (true) {
        envPath = Path.join(dir, ".env")
        if (existsSync(envPath)) break
        // Don't search outside of current repo.
        const gitPath = Path.join(dir, ".git")
        if (existsSync(gitPath)) throw new Error("Reach repository root (found .git) without finding .env")
        if (dir === Path.parse(dir).root) throw new Error("Reached filesystem root without finding .env or .git")
        dir = Path.dirname(dir)
    }
    return DotEnv.parse(readFileSync(envPath))
}
