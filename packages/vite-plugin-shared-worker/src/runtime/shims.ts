/// <reference lib="WebWorker" />

import type { MessageCallback, SharedWorkerServer } from "./types"

export function defineShimWorker(): SharedWorkerServer {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const messageCallbacks = new Set<MessageCallback<any>>()

    return {
        ports() {
            return []
        },
        dispatch(_, data) {
            for (const cb of messageCallbacks) {
                cb(data)
            }
        },
        addMessageListener(fn) {
            messageCallbacks.add(fn)
        },
        broadcast(data) {
            for (const cb of messageCallbacks) {
                cb(data)
            }
        },
    }
}
