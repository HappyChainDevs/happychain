import { z } from "zod"
// Adds .openapi(...) to zod so that we can document the API as we validate
import "zod-openapi/extend"
import { isHexString } from "#lib/utils/zod/refines/isHexString"
import {
    DEFAULT_APP_PORT,
    DEFAULT_BUFFER_LIMIT,
    DEFAULT_CHAIN_ID,
    DEFAULT_LOG_LEVEL,
    DEFAULT_MAX_CAPACITY,
    DEFAULT_NODE_ENV,
    DEPLOYMENT_ACCOUNT_FACTORY,
    DEPLOYMENT_ACCOUNT_IMPLEMENTATION,
    DEPLOYMENT_ENTRYPOINT,
} from "./data/defaults"

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
    PRIVATE_KEY_LOCAL: z.string().refine(isHexString),
    PRIVATE_KEY_ACCOUNT_DEPLOYER: z
        .string()
        .refine(isHexString)
        .default(process.env.PRIVATE_KEY_LOCAL as `0x${string}`),
    APP_PORT: z.coerce.number().default(DEFAULT_APP_PORT),
    NODE_ENV: z.enum(["production", "development", "test", "cli"]).default(DEFAULT_NODE_ENV),
    LOG_LEVEL: z.enum(["off", "trace", "info", "warn", "error"]).default(DEFAULT_LOG_LEVEL),
    DATABASE_URL: z.string(),

    LIMITS_EXECUTE_BUFFER_LIMIT: z.coerce.number().default(DEFAULT_BUFFER_LIMIT),
    LIMITS_EXECUTE_MAX_CAPACITY: z.coerce.number().default(DEFAULT_MAX_CAPACITY),

    CHAIN_ID: z.coerce.number().default(DEFAULT_CHAIN_ID),

    DEPLOYMENT_ENTRYPOINT: z.string().refine(isHexString).default(DEPLOYMENT_ENTRYPOINT),
    DEPLOYMENT_ACCOUNT_FACTORY: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_FACTORY),
    DEPLOYMENT_ACCOUNT_IMPLEMENTATION: z.string().refine(isHexString).default(DEPLOYMENT_ACCOUNT_IMPLEMENTATION),
})

// Validate `process.env` against our schema
// and return the result
const env = envSchema.parse(process.env)

// Export the result so we can use it in the project
export default env

export type Environment = z.infer<typeof envSchema>
