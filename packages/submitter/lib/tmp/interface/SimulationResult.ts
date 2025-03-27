import type { Prettify } from "@happy.tech/common"
import type { Address, Hex } from "./common_chain"
import type { EntryPointStatus, SimulatedValidationStatus } from "./status"

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
} & (SimulationResultSuccess | SimulationResultFailure | SimulationResultRevert
)>
