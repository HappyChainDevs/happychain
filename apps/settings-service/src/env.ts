import { z } from "zod"

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production"]),
    APP_PORT: z.string().transform((s) => Number(s)),
    SETTINGS_DB_URL: z.string().trim(),
    LOG_LEVEL: z.preprocess(
        (level) => level && String(level).toUpperCase(),
        z.enum(["OFF", "TRACE", "INFO", "WARN", "ERROR"]).default("INFO"),
    ),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    console.log(parsedEnv.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const env = parsedEnv.data
