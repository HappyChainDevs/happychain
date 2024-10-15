import type { Plugin } from "vite"
import pkg from "../../package.json"
import { SharedWorkerServerPlugin } from "./SharedWorkerServerPlugin"
import { clientCodeGen } from "./codegen"
import { filter } from "./utils"

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
        config() {
            return {
                // inject production worker plugin
                worker: {
                    format: "es",
                    plugins: () => [SharedWorkerServerPlugin()],
                    rollupOptions: {
                        output: {
                            manualChunks: (id) => {
                                if (id.includes("node_modules")) {
                                    return "vendor"
                                }
                            },
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
