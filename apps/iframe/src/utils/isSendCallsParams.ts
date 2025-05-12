import { isAddress, isHex } from "viem/utils"
import { z } from "zod"

const addressSchema = z.string().refine((val) => isAddress(val), { message: "Invalid address" })

const hexSchema = z.string().refine((val) => isHex(val), { message: "Invalid hex string" })

const capabilitySchema = z.record(z.any())

const callSchema = z.object({
    to: addressSchema,
    data: hexSchema.optional(),
    value: z.union([z.string(), z.bigint()]).optional(),
    capabilities: capabilitySchema.optional(),
})

const mainSchema = z.tuple([
    z.object({
        version: z.literal("2.0.0"),
        id: z.string().max(4096).optional(),
        from: addressSchema.optional(),
        chainId: z
            .string()
            .refine((val) => /^0x[0-9a-fA-F]+$/.test(val), { message: "chainId must be 0x-prefixed hex" }),

        atomicRequired: z.boolean(), // atomicity not supported yet
        capabilities: capabilitySchema.optional(),
        calls: z.array(callSchema).nonempty({ message: "At least one call is required" }).readonly(),
    }),
])

export function parseSendCallParams(param: unknown) {
    return mainSchema.safeParse(param)
}
