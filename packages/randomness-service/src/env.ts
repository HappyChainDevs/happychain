import { hexSchema } from "@happychain/common"
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
    TIME_BLOCK: z
        .string()
        .trim()
        .transform((s) => BigInt(s)),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
