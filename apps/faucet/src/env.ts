import type { Hex } from "@happy.tech/common"
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
    NODE_ENV: z.enum(["development", "production"]),
    APP_PORT: z.string().transform((s) => Number(s)),
    TURNSTILE_SECRET: z.string().trim(),
    TOKEN_AMOUNT: z.string().transform((s) => BigInt(s)),
    FAUCET_DB_PATH: z.string().trim(),
    FAUCET_RATE_LIMIT_WINDOW_SECONDS: z.string().transform((s) => Number(s)),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().trim().optional(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
