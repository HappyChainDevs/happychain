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

const parsedEnv = envSchema.safeParse({
    PRIVATE_KEY_LOCAL: process.env.PRIVATE_KEY_LOCAL,
    BUNDLER_LOCAL: process.env.BUNDLER_LOCAL,
    RPC_LOCAL: process.env.RPC_LOCAL,
})

if (!parsedEnv.success) {
    console.error(parsedEnv.error.issues)
    throw new Error("Missing or invalid environment variables")
}

export const { PRIVATE_KEY_LOCAL: privateKey, BUNDLER_LOCAL: bundlerRpc, RPC_LOCAL: rpcURL } = parsedEnv.data
