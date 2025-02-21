import { z } from "zod"
// Adds .openapi(...) to zod so that we can document the API as we validate
import "zod-openapi/extend"

import { isHexString } from "./utils/zod/refines/isHexString"

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
    PRIVATE_KEY_LOCAL: z.string().refine(isHexString),
    PRIVATE_KEY_ACCOUNT_DEPLOYER: z.string().refine(isHexString),
    APP_PORT: z.coerce.number().default(3002),
    NODE_ENV: z.enum(["production", "development", "test"]).default("development"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
})

// Validate `process.env` against our schema
// and return the result
const env = envSchema.parse(process.env)

// Export the result so we can use it in the project
export default env

export type Environment = z.infer<typeof envSchema>
