import type { Address } from "@happy.tech/common"
import type { Boop } from "./Boop"
import type { BoopState } from "./BoopState"
import { type SubmitStatus, SubmitSuccess } from "./boop_submit"
import type { EntryPointStatus } from "./status"

export type ExecuteSuccess = SubmitSuccess
export const ExecuteSuccess = SubmitSuccess

export type ExecuteInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop to execute. */
    tx: Boop
}

export type ExecuteOutput =
    | {
          status: ExecuteSuccess
          state: BoopState
      }
    | {
          status: Exclude<SubmitStatus, SubmitSuccess> | EntryPointStatus
          revertData?: string
          hash?: never
      }

/**
 * POST `/api/v1/boop/execute`
 *
 * Given a boop, submits it onchain to be executed, waits for and returns the result of
 * execution.
 *
 * Unless `input.account === input.payer`, the `gasLimit`, `executeGasLimit`, `maxFeePerGas` and
 * `submitterFee` fields can be omitted and will be filled by the submitter.
 *
 * If the gas limits are provided, the submitter is free to perform or not perform simulation before
 * submitting.
 *
 * The submitter is nonce-aware and will buffer up to a certain amount of boop per nonce track,
 * depending on its configuration. It will submit boop whenever their nonces becomes eligible.
 *
 * To cancel a pending Boop, simply call with an empty replacement transaction.
 */
export declare function submitter_execute(input: ExecuteInput): ExecuteOutput
