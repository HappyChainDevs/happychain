import type { Prettify } from "@happy.tech/common"
import type { Address, Hex } from "./common_chain"
import { EntryPointStatus, SimulatedValidationStatus } from "./status"

/**
 * The result of simulating a HappyTx.
 */
// biome-ignore format: readability
export type SimulationResult = Prettify<{
    status: EntryPointStatus
    validationStatus: SimulatedValidationStatus
    /** EntryPoint to which the HappyTx was submitted onchain. */
    entryPoint: Address
    /** The selector of the returned custom error. */
    failureReason?: never | Hex
    /** The revert data *carried* by the returned custom error. */
    revertData?: never | Hex
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
        failureReason: Hex
        revertData: Hex
    } | {
        // check with `isRevert(status)`
        status:
            | EntryPointStatus.ValidationReverted
            | EntryPointStatus.ExecuteReverted
            | EntryPointStatus.PaymentReverted
            | EntryPointStatus.UnexpectedReverted
        revertData: Hex
        failureReason?: never
    }
)>

export interface Base {
    status: EntryPointStatus
    validationStatus: SimulatedValidationStatus
    /** EntryPoint to which the HappyTx was submitted onchain. */
    entryPoint: Address
    /** The selector of the returned custom error. */
    failureReason?: never | Hex
    /** The revert data *carried* by the returned custom error. */
    revertData?: never | Hex
}

export interface Success extends Base {
    status: EntryPointStatus.Success
    failureReason?: never
    revertData?: never
}
export interface Failure extends Base {
    status: EntryPointStatus.ValidationFailed | EntryPointStatus.ExecuteFailed | EntryPointStatus.PaymentFailed
    failureReason: Hex
    revertData: Hex
}
export interface Revert extends Base {
    status:
        | EntryPointStatus.ValidationReverted
        | EntryPointStatus.ExecuteReverted
        | EntryPointStatus.PaymentReverted
        | EntryPointStatus.UnexpectedReverted
    revertData: Hex
    failureReason?: never
}

type SimulationResult2 = Success | Failure | Revert

const what: SimulationResult2 = {
    status: EntryPointStatus.Success,
    validationStatus: SimulatedValidationStatus.Success,
    entryPoint: "0x",
}

if (what.status === EntryPointStatus.Success) {
    console.log("Success", what)
}
