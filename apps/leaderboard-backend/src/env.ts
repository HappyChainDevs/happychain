import { z } from "zod"

const envSchema = z.object({
    LEADERBOARD_DB_URL: z.string().trim().optional(),
    PORT: z.string().trim().optional(),
    DATABASE_MIGRATE_DIR: z.string().trim().optional(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    const formatted = parsedEnv.error.format()
    throw new Error("❌ Invalid environment variables in leaderboard-backend:\n" + JSON.stringify(formatted, null, 2))
}

export const env = parsedEnv.data
