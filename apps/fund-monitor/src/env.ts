import { z } from "zod"
import { hexSchema } from "@happy.tech/common"
import type { Hex } from "viem"

const envSchema = z.object({
    RPC_URL: z.string().trim(),
    CHAIN_ID: z
        .string()
        .trim()
        .transform((value) => Number(value)),
    PRIVATE_KEY: hexSchema,
    BLOCK_TIME: z.string().transform((value) => BigInt(value)),
    MONITOR_ADDRESSES: z.string().trim().transform((value) => value.split(",")).refine(
        (addresses) => addresses.every((addr) => hexSchema.safeParse(addr).success),
        { message: "All monitor addresses must be valid hex strings" }
    ).transform((addresses) => addresses.map((addr) => addr as Hex)),
    FUND_THRESHOLD: z.string().transform((value) => BigInt(value)),
    FUNDS_TO_SEND: z.string().transform((value) => BigInt(value))
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
