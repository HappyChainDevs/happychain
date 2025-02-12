import { hexSchema } from "@happy.tech/common"
import { z } from "zod"

const envSchema = z.object({
    PRIVATE_KEY: hexSchema,
    RANDOM_CONTRACT_ADDRESS: hexSchema,
    PRECOMMIT_DELAY: z
        .string()
        .trim()
        .transform((s) => BigInt(s)),
    POST_COMMIT_MARGIN: z
        .string()
        .trim()
        .transform((s) => BigInt(s)),
    BLOCK_TIME: z
        .string()
        .trim()
        .transform((s) => BigInt(s)),
    RPC_URL: z.string().trim(),
    CHAIN_ID: z.string().transform((s) => Number(s)),
    RANDOMNESS_DB_PATH: z.string().trim(),
    TXM_DB_PATH: z.string().trim(),
    HAPPY_GENESIS_TIMESTAMP_SECONDS: z.string().transform((s) => BigInt(s)),
    EVM_DRAND_URL: z.string().trim(),
    EVM_DRAND_GENESIS_TIMESTAMP_SECONDS: z.string().transform((s) => BigInt(s)),
    EVM_DRAND_PERIOD_SECONDS: z.string().transform((s) => BigInt(s)),
    EVM_DRAND_MARGIN: z.string().transform((s) => BigInt(s)),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
