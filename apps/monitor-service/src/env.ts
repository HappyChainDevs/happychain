import { type Hex, isHex } from "viem"
import { z } from "zod"

const envSchema = z.object({
    NODE_ENV: z.enum(["production", "development"]).default("development"),
    RPC_URL: z.string().trim(),
    CHAIN_ID: z
        .string()
        .trim()
        .transform((value) => Number(value)),
    PRIVATE_KEY: z
        .string()
        .trim()
        .refine((value) => isHex(value), {
            message: "PRIVATE_KEY must be a valid hex string",
        }),
    BLOCK_TIME: z.string().transform((value) => BigInt(value)),
    MONITOR_ADDRESSES: z
        .string()
        .trim()
        .transform((value) => value.split(","))
        .refine((addresses) => addresses.every((addr) => isHex(addr)), {
            message: "All monitor addresses must be valid hex strings",
        })
        .transform((addresses) => addresses.map((addr) => addr as Hex)),
    FUND_THRESHOLD: z.string().transform((value) => BigInt(value)),
    FUNDS_TO_SEND: z.string().transform((value) => BigInt(value)),
    RPCS_TO_MONITOR: z
        .string()
        .trim()
        .transform((value) => value.split(","))
        .refine((rpcs) => rpcs.every((rpc) => z.string().url().safeParse(rpc).success), {
            message: "All RPCs must be valid URLs",
        })
        .transform((rpcs) => rpcs.map((rpc) => rpc as string)),
    RPC_MONITOR_INTERVAL: z.string().transform((value) => BigInt(value)),
    SLACK_WEBHOOK_URL: z.string().url(),
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
