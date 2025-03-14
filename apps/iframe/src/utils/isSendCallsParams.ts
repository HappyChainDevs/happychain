import type { WalletSendCallsParameters } from "viem"
import { z } from "zod"

export function isSendCallsParams(param: unknown): param is WalletSendCallsParameters {
    const callSchema = z.object({
        chainId: z.union([z.string(), z.number()]).optional(),
        to: z.string().optional(),
        data: z.string().optional(),
        value: z.union([z.string(), z.bigint()]).optional(),
    })

    const schema = z.tuple([
        z.object({
            calls: z.array(callSchema).readonly(),
            capabilities: z.record(z.string(), z.any()).optional(),
            chainId: z.union([z.string(), z.number()]).optional(),
            from: z.string(),
            version: z.string(),
        }),
    ])

    return schema.safeParse(param).success
}
