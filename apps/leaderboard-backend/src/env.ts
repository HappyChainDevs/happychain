import { z } from "zod"

const envSchema = z.object({
    LEADERBOARD_DB_URL: z.string().trim(),
    PORT: z.string().trim().default("4545"),
    DATABASE_MIGRATE_DIR: z.string().trim().default("migrations"),
    SESSION_EXPIRY: z.number().default(60 * 60 * 24), // 1 day
    SIGN_MESSAGE_PREFIX: z.string().trim().default("HappyChain Authentication"),
    RPC_URL: z.string().trim().default("http://localhost:8545"),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    const formatted = parsedEnv.error.format()
    throw new Error("❌ Invalid environment variables in leaderboard-backend:\n" + JSON.stringify(formatted, null, 2))
}

export const env = parsedEnv.data
