import type { MessageCallback } from "./types"

export interface ServerInterface {
    ports(): MessagePort[]
    dispatch(port: MessagePort, data: unknown): void
    addMessageListener<T>(fn: MessageCallback<T>): void
    broadcast(data: unknown): void
}
