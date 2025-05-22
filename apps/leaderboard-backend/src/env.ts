import { z } from "zod"

const envSchema = z.object({
    // Database settings
    LEADERBOARD_DB_URL: z.string().trim(),
    DATABASE_MIGRATE_DIR: z.string().trim().default("migrations"),

    // Server settings
    PORT: z.string().trim().default("4545"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Session settings
    SESSION_EXPIRY: z.string().trim().default("86400"), // Default to 24 hours in seconds
    SESSION_COOKIE_NAME: z.string().trim().default("session_id"),
    SESSION_COOKIE_HTTP_ONLY: z
        .string()
        .trim()
        .transform((val) => val.toLowerCase() === "true")
        .default("true"),
    SESSION_COOKIE_SECURE: z
        .string()
        .trim()
        // In development, secure cookies may not work on localhost unless using HTTPS
        .transform((val) => val.toLowerCase() === "true")
        .default("true"),
    SESSION_COOKIE_DOMAIN: z.string().trim().default(""), // Empty string means browser sets domain to current domain
    SESSION_COOKIE_SAME_SITE: z.enum(["Strict", "Lax", "None"]).default("Lax"),
    SESSION_COOKIE_PATH: z.string().trim().default("/"),

    // External services
    RPC_URL: z.string().trim().default("http://localhost:8545"),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
    const formatted = parsedEnv.error.format()
    throw new Error("❌ Invalid environment variables in leaderboard-backend:\n" + JSON.stringify(formatted, null, 2))
}

export const env = parsedEnv.data

/**
 * Cookie configuration for sessions
 * Uses environment variables with appropriate defaults
 * Centralizes configuration for easier management and security enhancements
 */
export const sessionCookieConfig = {
    name: env.SESSION_COOKIE_NAME,
    httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
    secure: env.SESSION_COOKIE_SECURE,
    domain: env.SESSION_COOKIE_DOMAIN || undefined, // If empty string, set to undefined to use current domain
    sameSite: env.SESSION_COOKIE_SAME_SITE,
    path: env.SESSION_COOKIE_PATH,
    maxAge: Number.parseInt(env.SESSION_EXPIRY, 10),
}
