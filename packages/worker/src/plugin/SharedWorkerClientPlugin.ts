import type { Plugin } from "vite"
import { SharedWorkerServerPlugin } from "./SharedWorkerServerPlugin.ts"
import { clientCodeGen } from "./codegen.ts"
import { createPlugin } from "./common.ts"
import { filter } from "./utils.ts"

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
export function SharedWorkerClientPlugin({ chunks }: { chunks?: (id: string) => string | undefined }): Plugin {
    return {
        ...createPlugin("client", "build", clientTransform),
        config: () => clientConfig(chunks),
    }
}

function clientTransform(code: string, id: string): string {
    if (!filter(id)) return code
    return clientCodeGen(code, id)
}

function clientConfig(chunks?: (id: string) => string | undefined) {
    return {
        // inject production worker plugin
        worker: {
            format: "es",
            plugins: () => [SharedWorkerServerPlugin()],
            rollupOptions: {
                output: {
                    manualChunks: chunks,
                },
            },
        },
    } as const
}
