import { z } from "zod"

export const jsonRpcSchema = z.object({
    jsonrpc: z.literal("2.0"),
    id: z.number().nullable(),
    method: z.string(),
    params: z.array(z.any()).optional()
})

export type JSONRPCRequest = z.infer<typeof jsonRpcSchema>

export type JSONRPCResponse = {
    jsonrpc: "2.0"
    id: number | null
    result?: unknown
    error?: {
        code: number
        message: string
        data?: unknown
    }
}

export class RpcError extends Error {
    constructor(
        message: string,
        public code: number,
        public data?: unknown
    ) {
        super(message)
    }
}
