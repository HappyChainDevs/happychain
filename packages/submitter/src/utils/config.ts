import type { Hex } from "viem"
import { z } from "zod"

const envSchema = z.object({
    PRIVATE_KEY: z
        .string()
        .trim()
        .transform((val) => val as Hex),
    RPC_URL: z.string().trim().url(),
    PORT: z.string().transform((val) => Number.parseInt(val, 10)),
})

const parsedEnv = envSchema.safeParse({
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    RPC_URL: process.env.RPC_URL,
    PORT: process.env.PORT,
})

if (!parsedEnv.success) {
    console.error(parsedEnv.error.issues)
    throw new Error("Missing or invalid environment variables")
}

const { PRIVATE_KEY, RPC_URL, PORT } = parsedEnv.data

export const privateKey = PRIVATE_KEY
export const rpcURL = RPC_URL
export const port = PORT
