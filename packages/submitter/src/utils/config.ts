import type { Hex } from "viem"
import { z } from "zod"

const envSchema = z.object({
    PRIVATE_KEY: z
        .string()
        .trim()
        .transform((val) => val as Hex),
    RPC_URL: z.string().trim().url(),
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

const { PRIVATE_KEY, RPC_URL } = parsedEnv.data

export const privateKey = PRIVATE_KEY
export const rpcURL = RPC_URL
