// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface RpcPayload<T = any> {
    isError: boolean
    id: string
    name: string
    args: T
}

export type Payload =
    // biome-ignore lint/suspicious/noExplicitAny: TODO: generics
    | { command: "broadcast"; data: any }
    | { command: "rpc"; data: RpcPayload }
    | { command: "ping" }
    | { command: "console"; data: unknown[]; key: string }

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function makeRpcPayload(id: string, name: string, args: any, isError = false): Payload {
    return {
        command: "rpc",
        data: {
            id,
            name,
            args,
            isError,
        },
    }
}

export function makeBroadcastPayload(data: unknown): Payload {
    return {
        command: "broadcast",
        data,
    }
}

export function makeConsolePayload(key: string, data: unknown[]): Payload {
    return {
        command: "console",
        key, // info, warn, error, etc
        data,
    }
}

export function makePingPayload(): Payload {
    return {
        command: "ping",
    }
}

export function parsePayload(payload?: Payload): Payload | undefined {
    switch (payload?.command) {
        case "ping":
        case "rpc":
        case "broadcast":
        case "console":
            return payload
        default:
            return
    }
}
