import { z } from "zod"

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
    APP_PORT: z.coerce.number().default(3002),
    NODE_ENV: z.enum(["production", "development", "test"]),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
})

// Validate `process.env` against our schema
// and return the result
const env = envSchema.parse(process.env)

// Export the result so we can use it in the project
export default env

export type Environment = z.infer<typeof envSchema>
