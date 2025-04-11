import { z } from "zod"
import { isHexString } from "#lib/utils/zod/refines/isHexString"

const DEFAULT_LOG_LEVEL = "info"
const DEFAULT_NODE_ENV = "development"
const DEFAULT_APP_PORT = 3001

export const appSchema = z.object({
    EXECUTOR_KEYS: z.string().transform((str, ctx) => {
        const keys = str
            .split(",")
            .map((key) => key.trim())
            .filter((key) => key.length === 66 && key.startsWith("0x"))
        if (!keys.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "EXECUTOR_KEYS must be defined and contain at least one valid key",
            })
            return z.NEVER
        }

        return keys as `0x${string}`[]
    }),
    PRIVATE_KEY_ACCOUNT_DEPLOYER: z
        .string()
        .refine(isHexString)
        .default(() => {
            const executorKeys = process.env.EXECUTOR_KEYS?.split(",")
                .map((key) => key.trim())
                .filter((key) => key.length === 66 && key.startsWith("0x"))
            if (!executorKeys || executorKeys.length === 0) {
                throw new Error("EXECUTOR_KEYS must be defined and contain at least one valid key")
            }
            return executorKeys[0] as `0x${string}`
        }),
    APP_PORT: z.coerce.number().default(DEFAULT_APP_PORT),
    NODE_ENV: z.enum(["production", "development", "test", "cli"]).default(DEFAULT_NODE_ENV),
    LOG_LEVEL: z.enum(["off", "trace", "info", "warn", "error"]).default(DEFAULT_LOG_LEVEL),
    DATABASE_URL: z.string(),
})
