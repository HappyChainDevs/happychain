import { HappyWalletCapability } from "@happy.tech/wallet-common"
import type { WalletSendCallsParameters } from "viem"
import { isAddress, isHex } from "viem/utils"
import { z } from "zod"

const addressSchema = z.string().refine((val) => isAddress(val), { message: "Invalid address" })

const hexSchema = z.string().refine((val) => isHex(val), { message: "Invalid hex string" })

const capabilitySchema = z
    .record(z.string(), z.any())
    .refine((caps) => Object.keys(caps).every((key) => key === HappyWalletCapability.BoopPaymaster), {
        message: "Unsupported capability",
    })

const callSchema = z.object({
    to: addressSchema.optional(),
    data: hexSchema.optional(),
    value: z.union([z.string(), z.bigint()]).optional(),
    capabilities: capabilitySchema.optional(),
})

const mainSchema = z.tuple([
    z.object({
        version: z.literal("2.0.0"),
        id: z.string().max(4096).optional(),
        from: addressSchema.optional(),
        chainId: z.string().refine((val) => /^0x[1-9a-fA-F][0-9a-fA-F]*$/.test(val), {
            message: "Invalid chainId",
        }),
        atomicRequired: z.literal(false), // atomicity not supported yet
        capabilities: capabilitySchema.optional(),
        calls: z.array(callSchema).length(1, { message: "Only one call is supported" }).readonly(),
    }),
])

export function isSendCallsParams(param: unknown): param is WalletSendCallsParameters {
    return mainSchema.safeParse(param).success
}
