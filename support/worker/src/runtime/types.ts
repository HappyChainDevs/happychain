export type MessageCallback<T> = (data: T) => void | Promise<void>
export interface ServerInterface {
    ports(): MessagePort[]
    dispatch(port: MessagePort, data: unknown): void
    addMessageListener<T>(fn: MessageCallback<T>): void
    broadcast(data: unknown): void
}
