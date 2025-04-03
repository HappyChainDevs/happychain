import { hexSchema } from "@happy.tech/common"
import { z } from "zod"

const envSchema = z.object({
    MONITORING_DB_PATH: z.string().trim(),
    RPC_URL: z.string().trim(),
    CHAIN_ID: z.string().trim().transform((value) => Number(value)),
    RANDOM_CONTRACT_ADDRESS: hexSchema,
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
