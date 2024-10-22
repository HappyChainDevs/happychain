import type { SharedWorkerServer } from "./server"
import type { MessageCallback } from "./types"

export { SharedWorkerClient } from "./client"

export { SharedWorkerServer } from "./server"

export { SharedWorkerShim } from "./shim"

export * from "./types"

export * from "./payload"

type InjectedGlobal = typeof globalThis & {
    __is_shim_worker__?: boolean
    __worker__: SharedWorkerServer
}

/**
 * The currently active SharedWorker.
 *
 * Import from within your .sw.ts file to access the current worker
 *
 * ```ts
 * import { worker } from '@happychain/worker/runtime'
 * worker.broadcast("hello world")
 * ```
 */
export const worker = new Proxy({} as SharedWorkerServer, {
    get: (_target, prop) => Reflect.get((globalThis as InjectedGlobal).__worker__, prop),
}) as SharedWorkerServer

/**
 * Effectively a NOOP when Workers are enabled, however it fixes any type errors that occur when
 * consumers import addMessageListener from a worker, and it makes the code easier to reason about
 * for the developer as from the context of a worker, you can see where the addMessageListener is
 * being imported from. The actual worker implementation is defined in SharedWorkerClient and
 * exported during from codeGen, which is why a NOOP is safe here.
 *
 * This also configures listeners when the local shim is enabled, allowing addMessageListener to
 * continue to operate in the same fashion as when a regular worker is in use.
 *
 * Export from .sw.ts file to enable and fix types when consuming app listens to events
 *
 * ```ts
 * // your-worker.sw.ts
 * export { addMessageListener } from '@happychain/worker/runtime'
 *
 * // your-app.ts
 * import { addMessageListener } from './your-worker.sw'
 * addMessageListener(() => { ... })
 * ```
 */
export function addMessageListener<T>(n: MessageCallback<T>) {
    if ((globalThis as InjectedGlobal).__is_shim_worker__) {
        // @ts-ignore
        globalThis.__worker__.addMessageCallback(n)
    }
}

export function dispatch(data: unknown) {
    if ((globalThis as InjectedGlobal).__is_shim_worker__) {
        // @ts-ignore
        // shim worker does not have a message port available for usage,
        // so we will create a temporary one here
        globalThis.__worker__.clientDispatch(data)
    }
}
