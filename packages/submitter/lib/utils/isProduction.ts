import { env } from "#lib/env"

export const isProduction = ["staging", "production"].includes(env.NODE_ENV)
