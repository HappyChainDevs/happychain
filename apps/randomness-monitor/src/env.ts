import { z } from "zod"
import { hexSchema } from "./utils/schemas"

const envSchema = z.object({
    MONITORING_DB_PATH: z.string().trim(),
    RPC_URL: z.string().trim(),
    CHAIN_ID: z
        .string()
        .trim()
        .transform((value) => Number(value)),
    RANDOM_CONTRACT_ADDRESS: hexSchema,
    LOG_COLORS: z
        .string()
        .default("true")
        .transform((str) =>
            (() => {
                // biome-ignore format: terse
                try { return Boolean(JSON.parse(str.toLowerCase())) } 
                catch { return false }
            })(),
        ),
    LOG_TIMESTAMPS: z
        .string()
        .default("true")
        .transform((str) =>
            (() => {
                // biome-ignore format: terse
                try { return Boolean(JSON.parse(str.toLowerCase())) } 
                catch { return false }
            })(),
        ),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
