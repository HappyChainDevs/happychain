import type { Hex } from "viem"
import { z } from "zod"

const hexSchema = z
    .string()
    .trim()
    .refine((s) => s.startsWith("0x"), {
        message: "Hex string must start with 0x",
    })
    .transform((hex) => hex as Hex)

const envSchema = z.object({
    PRIVATE_KEY: hexSchema,
    BLOCK_TIME: z
        .string()
        .trim()
        .transform((s) => BigInt(s)),
    RPC_URL: z.string().trim(),
    CHAIN_ID: z.string().transform((s) => Number(s)),
    TXM_DB_PATH: z.string().trim(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
