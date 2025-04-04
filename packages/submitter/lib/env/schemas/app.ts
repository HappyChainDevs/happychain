import { z } from "zod"
import { isHexString } from "#lib/utils/zod/refines/isHexString"

const DEFAULT_LOG_LEVEL = "info"
const DEFAULT_NODE_ENV = "development"
const DEFAULT_APP_PORT = 3001

export const appSchema = z.object({
    PRIVATE_KEY_LOCAL: z.string().refine(isHexString),
    PRIVATE_KEY_ACCOUNT_DEPLOYER: z
        .string()
        .refine(isHexString)
        .default(process.env.PRIVATE_KEY_LOCAL as `0x${string}`),
    APP_PORT: z.coerce.number().default(DEFAULT_APP_PORT),
    NODE_ENV: z.enum(["production", "development", "test", "cli"]).default(DEFAULT_NODE_ENV),
    LOG_LEVEL: z.enum(["off", "trace", "info", "warn", "error"]).default(DEFAULT_LOG_LEVEL),
    DATABASE_URL: z.string(),
})
