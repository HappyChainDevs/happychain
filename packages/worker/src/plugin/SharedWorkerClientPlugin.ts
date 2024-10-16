import type { Plugin } from "vite"
import pkg from "../../package.json"
import { SharedWorkerServerPlugin } from "./SharedWorkerServerPlugin"
import { clientCodeGen } from "./codegen"
import { filter } from "./utils"

/**
 * CodeSplits out the web3 dependencies and common happychain/worker runtime
 * to allow for independent dependency caching
 */
function vendor() {
    return (id: string) => {
        // must be vendor if web3 is vendored so that
        // it can be loaded first, _always_
        if (id.includes("web3auth.polyfill.ts")) {
            return "worker-web3auth-polyfill"
        }

        if (id.includes("@web3auth") || id.includes("@toruslabs")) {
            return "worker-web3auth-vendor"
        }

        if (id.includes("worker/dist/runtime.js")) {
            return "worker-happychain-vendor"
        }
    }
}

/**
 * Plugin runs during the 'build' command, i.e. 'bun vite build'
 *
 * This generates the client-side code, and injects the 'worker' plugin
 * for the server.
 *
 * When the generated code imports the worker file via new SharedWorker(...)
 * vite will follow that import as a [Worker](https://vite.dev/config/worker-options)
 * and the worker plugin will be executed handling the worker-side generation
 */
export function SharedWorkerClientPlugin(): Plugin {
    return {
        name: `${pkg.name}:client`,
        apply: "build",
        enforce: "pre",
        config(_config) {
            return {
                // inject production worker plugin
                worker: {
                    format: "es",
                    plugins: () => [SharedWorkerServerPlugin()],
                    rollupOptions: {
                        output: {
                            // optional, but extracts common runtime into a shared resource
                            // also allows us to cache web3auth independently of app updates
                            // in service worker
                            manualChunks: vendor(),
                        },
                    },
                },
            }
        },
        transform(code: string, id: string) {
            if (!filter(id)) return
            return { code: clientCodeGen(code, id) }
        },
    }
}
