import { z } from "zod"

/**
 * Schema for all the gas-related configuration options.
 */
export const gasSchema = z.object({
    /**
     * Gas safety margin (in percent) added to the gas usage values observed during simulation to serve as
     * gas limits during onchain execution. This does not apply to gas limits explicitly supplied by users.
     *
     * Defaults to 20%.
     */
    GAS_SAFETY_MARGIN: z.coerce.number().positive().default(20),

    /**
     * How much to bump the base fee (in percent) compared to that of the previous block. Defaults to 20%.
     *
     * On Ethereum (~12s block time), the basefee may increase at most by 12.5% from block to
     * block. On stock OP Stack (2s block time), it's 2.5%. Higher numbers are often desirable,
     * as they enable the transactions to be included in later blocks if the fee keeps rising.
     * Since the excess base fee gets refunded, it's usually not very productive to skimp here.
     *
     * See also {@link MIN_BASEFEE_MARGIN}.
     *
     * Not to be confused with {@link FEE_BUMP_PERCENT} which is applied when
     * replacing a transaction, if the base fee margin would not rise its price enough.
     */
    BASEFEE_MARGIN: z.coerce.bigint().min(10n).default(20n),

    /**
     * The minimum increase (in percent) to the base fee of the previous block
     * that the submitter will accept as `maxFeePerGas`. Defaults to 5%.
     *
     * When the submitter sets this value itself, it uses {@link BASEFEE_MARGIN}, but when
     * `maxFeePerGas` is specified by the user, or when using {@link BASEFEE_MARGIN} and the fee
     * exceeds {@link MAX_BASEFEE}, it will lower its threshold to use thing minimum margin instead.
     */
    MIN_BASEFEE_MARGIN: z.coerce.bigint().positive().lte(10_000n).default(5n),

    /**
     * How much (in percent) to bump the fees by when replacing a transaction.
     * Must be at least 10 or the nodes won't accept replacements. Defaults to 15.
     */
    FEE_BUMP_PERCENT: z.coerce.bigint().min(10n).default(15n),

    /**
     * The maximum base fee per gas (in wei) that the submitter is willing to pay for his EVM transactions.
     * Defaults to 100 gwei.
     *
     * TODO: Make this conditional to whether the boop is self-paying, sponsored or submitter-sponsored.
     */
    MAX_BASEFEE: z.coerce.bigint().positive().default(100_000_000_000n),

    /**
     * The initial priority fee per gas (in wei) for the submitter to pay on his EVM transactions. Defaults to 1.
     */
    INITIAL_PRIORITY_FEE: z.coerce.bigint().nonnegative().default(1n),

    /**
     * The maximum priority fee per gas (in wei) that the submitter is willing to pay for his EVM transactions.
     * Defaults to 1000 wei.
     */
    MAX_PRIORITY_FEE: z.coerce.bigint().nonnegative().default(1000n),

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

    /**
     * Gas limit for the account creation call, avoiding a chain roundtrip for simulation.
     * Defaults to 300k.
     *
     * Our last measurement (14 Jun 2025, Prague hard fork) is 246_493 gas used.
     */
    ACCOUNT_CREATION_GAS_LIMIT: z.coerce.bigint().positive().default(300_000n),
})
