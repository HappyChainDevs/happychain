import type { Address, Hex } from "./common_chain"
import type { EntryPointStatus, SimulatedValidationStatus } from "./status"

/**
 * The result of simulating a HappyTx.
 */
// biome-ignore format: readability
export type SimulationResult = {
    status: EntryPointStatus
    validationStatus: SimulatedValidationStatus
    /**
     * EntryPoint to which the HappyTx was submitted onchain.
     */
    entryPoint: Address
    /**
     * Either the revert data matching an {@link EntryPointIllegalRevert} status, or the the
     * returned encoded error matching an {@link EntryPointRejection} status.
     *
     * Empty if `status === EntryPointStatus.SUCCESS`
     */
    revertData?: never | Hex
}
