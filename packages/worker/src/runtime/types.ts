export type MessageCallback<T> = (this: Event, data: T) => void | Promise<void>
