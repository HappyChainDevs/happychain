import type { HappyTx } from "./HappyTx"
import type { HappyTxReceipt } from "./HappyTxReceipt"
import type { HappyTxState } from "./HappyTxState"
import type { Address, Hash } from "./common_chain"
import type { SubmitterErrorStatus } from "./status"

export type ExecuteInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** HappyTx to execute. */
    tx: HappyTx
}

// TODO: improve
export type ExecuteOutput = {
    status: string
    state: HappyTxState
}

/**
 * POST /submitter_execute
 *
 * Given a happyTx, submits it onchain to be executed, waits for and returns the result of
 * execution.
 *
 * Unless `input.account === input.paymaster`, the `gasLimit`, `executeGasLimit`, `maxFeePerGas` and
 * `submitterFee` fields can be omitted and will be filled by the submitter.
 *
 * If the gas limits are provided, the submitter is free to perform or not perform simulation before
 * submitting.
 *
 * The submitter is nonce-aware and will buffer up to a certain amount of happyTx per nonce track,
 * depending on its configuration. It will submit happyTxs whenever their nonces becomes eligible.
 */
export declare function submitter_execute(input: ExecuteInput): ExecuteOutput

export enum ExecuteCancelStatus {
    /** The cancellation was successful. */
    Success = "executeCancelSuccess",

    /** The cancellation failed because the original was included onchain. */
    OriginalIncluded = "executeCancelFailure",
}

// biome-ignore format: readability
export type ExecuteCancelOutput = {
    status: ExecuteCancelStatus.Success
    receipt?: never
} | {
    status: ExecuteCancelStatus.OriginalIncluded

    /** Receipt for the original transaction that was included onchain. */
    receipt: HappyTxReceipt
} | {
    status: Exclude<SubmitterErrorStatus, SubmitterErrorStatus.SimulationTimeout>
    receipt?: never
}

/**
 * (Not an entrypoint.)
 *
 * This helper function cancels a pending HappyTx, and waits for the cancellation to get through or
 * fail. Under the hood, calls {@link submitter_execute} with an empty replacement transaction.
 */
export declare function submitter_executeCancel(input: Hash): ExecuteCancelOutput
