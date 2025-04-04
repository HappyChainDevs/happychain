import { z } from "zod"

// Submit Limits
const DEFAULT_BUFFER_LIMIT = 50
const DEFAULT_MAX_CAPACITY = 100

// Simulation Cache
const DEFAULT_SIMULATION_CACHE_SIZE = 100_000
const DEFAULT_SIMULATION_CACHE_TTL = 30_000

export const limitsSchema = z.object({
    LIMITS_EXECUTE_BUFFER_LIMIT: z.coerce.number().default(DEFAULT_BUFFER_LIMIT),
    LIMITS_EXECUTE_MAX_CAPACITY: z.coerce.number().default(DEFAULT_MAX_CAPACITY),
    SIMULATION_CACHE_SIZE: z.coerce.number().default(DEFAULT_SIMULATION_CACHE_SIZE),
    SIMULATION_CACHE_TTL: z.coerce.number().default(DEFAULT_SIMULATION_CACHE_TTL),
})
