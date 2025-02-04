import type { Hex } from "viem"
import { z } from "zod"

const envSchema = z.object({
    PRIVATE_KEY_LOCAL: z
        .string()
        .trim()
        .transform((val) => val as Hex),
    BUNDLER_LOCAL: z.string().trim().url(),
    RPC_LOCAL: z.string().trim().url(),
})

const isLocal = process.env.CONFIG === "LOCAL"

const parsedEnv = envSchema.safeParse({
    PRIVATE_KEY_LOCAL: process.env.PRIVATE_KEY_LOCAL,
    BUNDLER_LOCAL: process.env.BUNDLER_LOCAL,
    RPC_LOCAL: isLocal ? process.env.RPC_LOCAL : process.env.RPC_TENDERLY,
})

if (!parsedEnv.success) {
    console.error(parsedEnv.error.issues)
    throw new Error("Missing or invalid environment variables")
}

const { PRIVATE_KEY_LOCAL, BUNDLER_LOCAL, RPC_LOCAL } = parsedEnv.data

export const privateKey = PRIVATE_KEY_LOCAL
export const bundlerRpc = BUNDLER_LOCAL
export const rpcURL = RPC_LOCAL
