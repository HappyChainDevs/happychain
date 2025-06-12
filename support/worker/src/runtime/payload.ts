// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface RpcPayload<T = any> {
    isError: boolean
    id: string
    name: string
    args: T
}

type DispatchPayload = { command: "dispatch"; data: unknown }
type BroadcastPayload = { command: "broadcast"; data: unknown }
type RpcResponsePayload = { command: "rpcResponse"; data: RpcPayload }
export type RpcRequestPayload = { command: "rpcRequest"; data: RpcPayload }
type ConsolePayload = { command: "console"; data: unknown[]; key: string }
type PingPayload = { ts: number; command: "ping" }
type PongPayload = { ts: number; command: "pong" }

export type ServerPayload = BroadcastPayload | DispatchPayload | RpcResponsePayload | ConsolePayload | PongPayload
export type ClientPayload = DispatchPayload | RpcRequestPayload | PingPayload

export function makeRpcRequestPayload(id: string, name: string, args: unknown, isError = false): RpcRequestPayload {
    return {
        command: "rpcRequest",
        data: {
            id,
            name,
            args,
            isError,
        },
    }
}
export function makeRpcResponsePayload(id: string, name: string, args: unknown, isError = false): RpcResponsePayload {
    return {
        command: "rpcResponse",
        data: {
            id,
            name,
            args,
            isError,
        },
    }
}

export function makeBroadcastPayload(data: unknown): BroadcastPayload {
    return {
        command: "broadcast",
        data,
    }
}

export function makeDispatchPayload(data: unknown): DispatchPayload {
    return {
        command: "dispatch",
        data,
    }
}

export function makeConsolePayload(key: string, data: unknown[]): ConsolePayload {
    return {
        command: "console",
        key, // info, warn, error, etc
        data,
    }
}

export function makePingPayload(): PingPayload {
    return {
        ts: Date.now(),
        command: "ping",
    }
}

export function parseClientPayload(payload?: ClientPayload): ClientPayload | undefined {
    switch (payload?.command) {
        case "ping":
        case "rpcRequest":
        case "dispatch":
            return payload
        default:
            return
    }
}
export function parseServerPayload(payload?: ServerPayload): ServerPayload | undefined {
    switch (payload?.command) {
        case "pong":
        case "rpcResponse":
        case "broadcast":
        case "dispatch":
        case "console":
            return payload
        default:
            return
    }
}
