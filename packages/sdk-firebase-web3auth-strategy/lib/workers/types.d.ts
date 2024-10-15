import type { MessageCallback, SharedWorkerServer } from "@happychain/worker/runtime"

declare module "./web3auth.sw.ts" {
    declare const worker: SharedWorkerServer // available within the context of the worker
    export declare function addMessageListener<T>(fn: MessageCallback<T>): void
}
