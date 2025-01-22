/// <reference lib="WebWorker" />

import type { MessageCallback, ServerInterface } from "./types"

/**
 * SharedWorkerShim
 *
 * This file prepares a locally imported file (no worker) to expose the same API
 * as SharedWorkerServer. This allows for easier debugging in some situations
 * (i.e. console.log always works) without any user-land code modifications.
 *
 * methods such as worker.broadcast(...) will continue to function as expected
 * as if they where executing in a shared worker context
 */
export class SharedWorkerShim implements ServerInterface {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    private _messageCallbacks: MessageCallback<any>[] = []
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    private _messageListeners: MessageCallback<any>[] = []

    ports() {
        return [new MessageChannel().port1]
    }

    clientDispatch(data: unknown) {
        for (const cb of this._messageListeners) {
            cb(data)
        }
    }

    addMessageCallback<T>(fn: MessageCallback<T>) {
        this._messageCallbacks.push(fn)
    }

    clientBroadcast(data: unknown) {
        for (const cb of this._messageListeners) {
            cb(data)
        }
    }

    dispatch(_: MessagePort, data: unknown) {
        for (const cb of this._messageCallbacks) {
            cb(data)
        }
    }

    addMessageListener<T>(fn: MessageCallback<T>) {
        this._messageListeners.push(fn)
    }

    broadcast(data: unknown) {
        for (const cb of this._messageCallbacks) {
            cb(data)
        }
    }
}
