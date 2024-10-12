import type { MessageCallback, SharedWorkerServer } from "@happychain/vite-plugin-shared-worker/runtime"
declare module "./hooks/firebaseAuth.sw.ts" {
    declare const worker: SharedWorkerServer // available within the context of the worker
    export declare function addMessageListener<T>(fn: MessageCallback<T>): void
}

declare module "./services/web3auth.sw.ts" {
    declare const worker: SharedWorkerServer // available within the context of the worker
    export declare function addMessageListener<T>(fn: MessageCallback<T>): void
}
