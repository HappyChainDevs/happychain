import { z } from "zod"

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "staging"]),
    APP_PORT: z.string().transform((s) => Number(s)),
    SETTINGS_DB_URL: z.string().trim(),
    LOG_LEVEL: z.preprocess(
        (level) => level && String(level).toUpperCase(),
        z.enum(["OFF", "TRACE", "INFO", "WARN", "ERROR"]).default("INFO"),
    ),
})

export const env = envSchema.parse(process.env)
