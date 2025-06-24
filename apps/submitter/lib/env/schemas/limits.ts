import { z } from "zod"

/**
 * Schema for configuration options related to operational limits.
 * These mostly have to do with limiting the submitter's load.
 *
 * Also see the tuning schema for relevant performance settings.
 */
export const limitsSchema = z.object({
    /**
     * Default timeout for waiting for EVM transaction receipts in milliseconds. Defaults to 3 seconds.
     * If you want to enable retries, this should be lower than {@link BOOP_RECEIPT_TIMEOUT}.
     */
    RECEIPT_TIMEOUT: z.coerce.number().positive().default(3000),

    /**
     * Default timeout for waiting for boop receipts in milliseconds. Defaults to 8s.
     */
    BOOP_RECEIPT_TIMEOUT: z.coerce.number().positive().default(8000),

    /**
     * Max timeout that caller can specify for the `boop/receipt` route. Defaults to 8s.
     */
    MAX_BOOP_RECEIPT_TIMEOUT: z.coerce.number().positive().default(8000),

    /**
     * Maximum number of boops that be queued up for a specific (account, nonceTrack) pair while waiting for boops
     * with lower nonces to be submitted. Defaults to 50.
     */
    MAX_BLOCKED_PER_TRACK: z.coerce.number().positive().default(50),

    /**
     * Maximum number of boops that be queued up in the submitter accross all accounts
     * while waiting for boops with lower nonces to be submitted. Defaults to 10_000.
     */
    MAX_TOTAL_BLOCKED: z.coerce.number().positive().default(10_000),

    /**
     * The maximum amount of time in milliseconds a transaction can remain blocked before being submitted (i.e.
     * waiting for previous transactions to be submitted or a nonce gap to close). Defaults to 5 seconds.
     */
    MAX_BLOCKED_TIME: z.coerce.number().positive().default(5_000),

    /**
     * The amount of simulation results cached in memory. This is used to supply a useful
     * answer on the `/api/v1/boop/state` route before the boop is included onchain. Defaults to 20_000.
     */
    SIMULATION_CACHE_SIZE: z.coerce.number().positive().default(20_000),

    /**
     * The time-to-live (time before pruning) for results in the simulation cache, in
     * milliseconds. Defaults to 30 seconds. Set to 0 to disable TTL (then simulations
     * only expires when the cache reaches max size ({@link SIMULATION_CACHE_SIZE}).
     */
    SIMULATION_CACHE_TTL: z.coerce.number().positive().default(30_000),
})
