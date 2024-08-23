import type { AddEthereumChainParameter } from "viem"
import { z } from "zod"

export function isAddChainParams(param: unknown): param is AddEthereumChainParameter {
    const schema = z.object({
        chainId: z
            .string()
            .min(3)
            .regex(/^0x[\da-f]+$/),
        chainName: z.string(),
        nativeCurrency: z
            .object({
                name: z.string(),
                symbol: z.string(),
                decimals: z.number(),
            })
            .optional(),
        rpcUrls: z.string().array().min(1),
        blockExplorerUrls: z.string().array().optional(),
        iconUrls: z.string().array().optional(),
    })

    return schema.safeParse(param).success
}
