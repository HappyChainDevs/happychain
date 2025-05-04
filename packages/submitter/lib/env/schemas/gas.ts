import { z } from "zod"

/**
 * Schema for all the gas-related configuration options.
 */
export const gasSchema = z.object({
    /**
     * Gas safety margin (in percent) applied to the gas usage values observed during simulation to serve as
     * gas limits during onchain execution. This does not apply to gas limits explicitly supplied by users.
     *
     * This defaults to 120%.
     */
    GAS_SAFETY_MARGIN: z.coerce.number().gt(100).lt(10000).default(120),

    /**
     * Gas reserved for entrypoint execution when validating gas values before simulation.
     *
     * The default value is 70k, which is the approx overhead we see for entrypoint execution on tests.
     * There is not issue if the overhead is higher, we will simply finding out during simulation instead.
     */
    ENTRYPOINT_GAS_BUFFER: z.coerce.number().default(70_000),

    /**
     * Minimum amount of gas for the validate gas limit. An explicitly specified limit lower than this amount will
     * cause a boop to be rejected.
     *
     * Defaults to 20k, which is a bit lower than what we see during tests. There is no issue if this is insufficient,
     * we will simply finding out during simulation instead.
     */
    MINIMUM_VALIDATE_GAS: z.coerce.number().default(20_000),

    /**
     * Minimum amount of gas for the validate gas limit. An explicitly specified limit lower than this amount will
     * cause a boop to be rejected.
     *
     * Defaults to 20k, which is a bit lower than what we see during tests. There is no issue if this is insufficient,
     * we will simply finding out during simulation instead.
     */
    MINIMUM_VALIDATE_PAYMENT_GAS: z.coerce.number().default(20_000),

    /**
     * Minimum amount of gas for the execute gas limit. An explicitly specified limit lower than this amount will
     * cause a boop to be rejected.
     *
     * Defaults to 5.5k, which is approximately what we see during the test if we call to
     * address 0 (immediately revert) instead of the intended target. There is no issue
     * if this is insufficient, we will simply finding out during simulation instead.
     */
    MINIMUM_EXECUTE_GAS: z.coerce.number().default(5_500),

    /**
     * The maximum gas limit this submitter is willing to accept.
     *
     * Default to 10M, which is one third of a full Ethereum block.
     */
    MAX_GAS_LIMIT: z.coerce.number().default(10_000_000),
})
