import { z } from "zod"
// Adds .openapi(...) to zod so that we can document the API as we validate
import "zod-openapi/extend"

import { isHexString } from "./zod/isHexString"

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
    PRIVATE_KEY_LOCAL: z.string().refine(isHexString),
    PRIVATE_KEY_ACCOUNT_DEPLOYER: z
        .string()
        .refine(isHexString)
        .default(process.env.PRIVATE_KEY_LOCAL as `0x${string}`), // risky, but this is validated above
    APP_PORT: z.coerce.number().default(3001),
    NODE_ENV: z.enum(["production", "development", "test", "cli"]).default("development"),
    LOG_LEVEL: z.enum(["off", "trace", "info", "warn", "error"]).default("info"),

    LIMITS_EXECUTE_BUFFER_LIMIT: z.coerce.number().default(50),
    LIMITS_EXECUTE_MAX_CAPACITY: z.coerce.number().default(100),
})

// Validate `process.env` against our schema
// and return the result
const env = envSchema.parse(process.env)

// Export the result so we can use it in the project
export default env

export type Environment = z.infer<typeof envSchema>
