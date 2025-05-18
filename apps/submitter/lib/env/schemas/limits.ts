import { z } from "zod"

/**
 * Schema for configuration options related to operational limits.
 */
export const limitsSchema = z.object({
    /**
     * Maximum number of boops that be queued up for a specific (account, nonceTrack) pair. Defaults to 50.
     */
    LIMITS_EXECUTE_BUFFER_LIMIT: z.coerce.number().positive().default(50),

    /**
     * Maximum number of boops that be queued up in the submitter accross all accounts. Defaults to 10_000.
     */
    LIMITS_EXECUTE_MAX_CAPACITY: z.coerce.number().positive().default(10_000),

    /**
     * The amount of simulation results cached in memory. This is used to supply a useful
     * answer on the `/api/v1/boop/state` route before the boop is included onchain. Defaults to 20_000.
     */
    SIMULATION_CACHE_SIZE: z.coerce.number().positive().default(20_000),

    /**
     * The time-to-live (time before pruning) for results in the
     * simulation cache, in milliseconds. Defaults to 30 seconds.
     */
    SIMULATION_CACHE_TTL: z.coerce.number().positive().default(30_000),

    /**
     * The maximum amount of time in milliseconds a transaction can remain pending before before being
     * submitted (i.e. waiting for previous transactions to be submitted or a nonce gap to close).
     */
    MAX_SUBMIT_PENDING_TIME: z.coerce.number().positive().default(30_000),

    /**
     * Default timeout for waiting for receipts in milliseconds. Defaults to 8 seconds.
     */
    RECEIPT_TIMEOUT: z.coerce.number().positive().default(8000),

    /**
     * Max timeout that caller can specify for the `boop/receipt` route.
     */
    MAX_RECEIPT_TIMEOUT: z.coerce.number().positive().default(8000),
})
