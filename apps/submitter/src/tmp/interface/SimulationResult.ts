import type { Address, Hex } from "./common_chain"
import type { EntryPointStatus, SimulatedValidationStatus } from "./status"
type Prettify<T> = { [K in keyof T]: T[K] } & {}
/**
 * The result of simulating a HappyTx.
 */
// biome-ignore format: readability
export type SimulationResult = Prettify<{
    status: EntryPointStatus
    validationStatus: SimulatedValidationStatus

    /** EntryPoint to which the HappyTx was submitted onchain. */
    entryPoint: Address
} & ({
        status: EntryPointStatus.Success
        failureReason?: never
        revertData?: never
    } | {
        // check with `isFailure(status)`
        status:
            | EntryPointStatus.ValidationFailed
            | EntryPointStatus.ExecuteFailed
            | EntryPointStatus.PaymentFailed

        /** The selector of the returned custom error. */
        failureReason: Hex

        /** The revert data *carried* by the returned custom error. */
        revertData: Hex
    } | {
        // check with `isRevert(status)`
        status:
            | EntryPointStatus.ValidationReverted
            | EntryPointStatus.ExecuteReverted
            | EntryPointStatus.PaymentReverted
            | EntryPointStatus.UnexpectedReverted

        /** The revertData of the revert error. */
        revertData: Hex
        failureReason?: never
    }
)>
