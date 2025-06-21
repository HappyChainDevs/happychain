import z from "zod"

/**
 * Performance tuning settings — for controlling things like timeouts, delays and retries.
 *
 * See also the limits schema for limiting load, and the gas schema for gas limits
 * and fee margins. Some of these settings interplay with the tuning settings.
 *
 * Settings are ordering roughly in order of how much you should pay attention to them.
 */
export const tuningSchema = z.object({
    /**
     * The amount of time to wait before a submitted EVM transaction (carrying a boop or cancelling a previous
     * transaction) is considered stuck and a replacement transaction is sent. Defaults to 3 seconds.
     *
     * This setting will limit the effective range of {@link MAX_RECEIPT_TIMEOUT} for the `execute` route.
     */
    STUCK_TX_WAIT_TIME: z.coerce.number().positive().default(3_000),

    /**
     * The default timeout passed to the Viem client for RPC requests. Defaults to 3 seconds.
     */
    RPC_REQUEST_TIMEOUT: z.coerce.number().positive().default(3_000),

    /**
     * Whether to use JSON-RPC batching. Defaults to true.
     *
     * Your JSON-RPC provider may limit calldata or returned data size, in which
     * case you may want to tweak {@link RPC_BATCH_SIZE} or disable this.
     */
    USE_RPC_BATCHING: z.coerce.boolean().default(true),

    /**
     * If {@link USE_RPC_BATCHING} is true, the maximum allowed batch size. Ignored otherwise. Defaults to 100.
     */
    RPC_BATCH_SIZE: z.coerce.number().positive().default(100),

    /**
     * The maximum time in milliseconds to wait to collect RPC requests to add in a batch. Defaults to 0, which means
     * that only rpc calls made before the execution is handed off to the request sender will be batched together.
     */
    RPC_BATCH_WAIT: z.coerce.number().nonnegative().default(0),

    // NOTE: We don't make multicall batching available as an option, as it breaks the
    // results of simulation by sharing a single EVM context between multiple boops, which
    // means the gas estimates & nonce validation results won't be reliable, for instance.

    /**
     * When monitoring block using an HTTP RPC address, the period in milliseconds at which to poll. Defaults to 200ms.
     */
    BLOCK_MONITORING_POLLING_INTERVAL: z.coerce.number().positive().default(200),

    /**
     * The time in milliseconds after which to consider a block timed out for the purpose of block monitoring, and
     * re-attempting to setup the block subscription or switching to another RPC. Defaults to 5s.
     */
    BLOCK_MONITORING_TIMEOUT: z.coerce.number().positive().default(5000),

    /**
     * The time in milliseconds to wait before successive attempts to fetch a block
     * or receipt from the RPC provider. The time for the attempt itself is not included (and could take up to {@link
     * RPC_REQUEST_TIMEOUT}. Note: in the case of the receipt, this will eat into receipt timeouts ({@link RECEIPT_TIMEOUT}).
     * Defaults to 100 ms.
     */
    LINEAR_RETRY_DELAY: z.coerce.number().positive().default(100),

    /**
     * The maximum number of blocks to backfill if block monitoring runs into a block
     * gap. If a gap bigger than this is encoutered, only the most recent {@link
     * MAX_BLOCK_BACKFILL} will be backfilled, and the previous ones will be skipped.
     *
     * Defaults to 15.
     */
    MAX_BLOCK_BACKFILL: z.coerce.bigint().nonnegative().default(15n),

    /**
     * Timeout in millisecond for querying RPC for the purpose of RPC selection for block monitoring. If no RPC can
     * reply within that timeout we fall back to {@link RPC_REQUEST_TIMEOUT}. Defaults to 500ms.
     */
    RPC_SHORT_REQUEST_TIMEOUT: z.coerce.number().positive().default(500),

    /**
     * Time in milliseconds during which we stop considering a RPC URL (from {@link RPC_URLS})
     * after it encountering a failure, for the purpose of block monitoring. Defaults to one minute.
     */
    RPC_TIMED_OUT_PERIOD: z.coerce.number().positive().default(60_000),

    // === It's probably really safe to ignore the settings below. ===

    /**
     * When retrying a RPC for the purpose of block monitoring, the base delay in milliseconds,
     * applied to the second retry. Subsequent delays get scaled via exponential backoff
     * (doubling each time) up to a cap {@link BLOCK_MONITORING_MAX_DELAY}. There are
     * at most {@link BLOCK_MONITORING_MAX_ATTEMPTS} consecutive attempts for each RPC.
     *
     * Defaults to 1s.
     */
    BLOCK_MONITORING_BASE_DELAY: z.coerce.number().nonnegative().default(1000),

    /**
     * cf. {@link BLOCK_MONITORING_BASE_DELAY}. Time in milliseconds. Defaults to 8s.
     */
    BLOCK_MONITORING_MAX_DELAY: z.coerce.number().positive().default(8000),

    /**
     * cf. {@link BLOCK_MONITORING_BASE_DELAY}. This is the total number of attempts, not
     * only retries. Exceeding the number of attempts causes block monitoring to go into RPC
     * selection, but does not prevent the RPC to be reused later (with a reset number of
     * attempts). Successfully fetching a block resets the number of attemts to 0.
     *
     * Defauts to 2.
     */
    BLOCK_MONITORING_MAX_ATTEMPTS: z.coerce.number().positive().default(2),

    /**
     * Period in milliseconds at which to poll RPCs if block production seems to be halted. Default to 1s.
     */
    BLOCK_MONITORING_HALTED_POLL_TIMEOUT: z.coerce.number().positive().default(1000),

    /**
     * The amount of block hashes to keep in memory — this is used to detect re-orgs
     * vs out-of-order block delivery. This can generally be low: Ethereum has
     * never had a > 7 blocks re-org and L2 don't normally re-org. Defaults to 100.
     */
    BLOCK_HISTORY_SIZE: z.coerce.number().nonnegative().default(100),
})
