import type { Plugin } from "vite"
import { DevelopmentPlugin } from "./plugin/DevelopmentPlugin.ts"
import { SharedWorkerClientPlugin } from "./plugin/SharedWorkerClientPlugin.ts"
import { SharedWorkerShimPlugin } from "./plugin/SharedWorkerShimPlugin.ts"

type Options = {
    /**
     * When true, uses the SharedWorkerShimPlugin & SharedWorkerShim
     * instead of true SharedWorker or WebWorkers. This can be helpful for
     * debugging misbehaving workers, as it simply injects the expected Worker API
     * into the worker module, but runs the file locally instead so that things such
     * as console.log will work as they do when not in a shared worker context.
     */
    disabled?: boolean

    /**
     * This gets passed directly to rollups manualChunk strategy during production builds
     *
     * {@link https://rollupjs.org/configuration-options/#output-manualchunks}
     */
    prodChunks?: (id: string) => string | undefined
}

/**
 * SharedWorkerPlugin
 *
 * Converts .ws.ts modules into an RPC based SharedWorker for easier use.
 */
export function SharedWorkerPlugin({ disabled = false, prodChunks }: Options = {}): Plugin[] {
    return disabled //
        ? [
              // injects 'worker' interface to server,
              // and exposes compatible exports to client
              SharedWorkerShimPlugin(),
          ]
        : [
              // only impacts 'serve' command, i.e. 'vite'
              DevelopmentPlugin(),
              // only impacts 'build' command i.e. 'vite build'
              SharedWorkerClientPlugin({ chunks: prodChunks }),
          ]
}
