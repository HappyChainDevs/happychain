export type MessageCallback<T> = (data: T) => void | Promise<void>

/**
 * The SharedWorker script
 */
export interface SharedWorkerServer {
    ports(): MessagePort[]

    addMessageListener<T>(fn: MessageCallback<T>): void

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    dispatch(port: MessagePort, data: any): void

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    broadcast(data: any): void
}

/**
 * App-Facing Code
 */
export interface SharedWorkerClient {
    addMessageListener<T>(fn: MessageCallback<T>): void

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    dispatch(data: any): void
}
