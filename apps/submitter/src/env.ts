// env.ts
import { z } from "zod"
import "zod-openapi/extend"

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
    PRIVATE_KEY_LOCAL: z.string().refine((str): str is `0x${string}` => str.startsWith("0x")),
    APP_PORT: z.coerce.number().default(3001),
})

// Validate `process.env` against our schema
// and return the result
const env = envSchema.parse(process.env)

// Export the result so we can use it in the project
export default env

export type Environment = z.infer<typeof envSchema>
