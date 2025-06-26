import { env } from "../env"

export const isProduction = ["staging", "production"].includes(env.NODE_ENV)
