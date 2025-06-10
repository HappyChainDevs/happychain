import type { Address, Hash, Hex, UInt256 } from "@happy.tech/common"
import type { Boop } from "./Boop"
import type { OnchainStatus } from "./Onchain"

/**
 * Describes the result of a Boop that has been submitted onchain.
 */
export type BoopReceipt = {
    /** Boop identifying hash. */
    boopHash: Hash

    /** The boop that this receipt is for. */
    boop: Boop

    /** Result of onchain submission of the Boop. */
    status: OnchainStatus

    /** Description of the status, potentially including finer-grained details. */
    error: string

    /** EntryPoint to which the Boop was submitted onchain. */
    entryPoint: Address

    /** Logs (events) that were emitted during the call made by the boop. */
    logs: BoopLog[]

    /**
     * The revertData carried by one of our custom error, or the raw deal for {@link Onchain.UnexpectedReverted}.
     */
    revertData: Hex

    // TODO try to reintroduce these (and upddate docs to explain cost structure)

    // /** Gas used by the boop */
    // gasUsed: UInt256

    // /** Total gas cost for the Boop in wei (inclusive submitter fee) */
    // gasCost: UInt256

    /** Hash of the EVM transaction that landed the boop onchain. */
    evmTxHash: Hash

    /** Hash of block on which this boop landed. */
    blockHash: Hash

    /** Number of block on which this boop landed. */
    blockNumber: UInt256

    /**
     * The gas price paid by the submitter, on the basis of which the cost to the payer is computed.
     * (Post EIP-1559, this is baseFee per gas + tip per gas.)
     */
    gasPrice: UInt256
}

/**
 * Log (event) that was emitted during the call made by a boop.
 */
export type BoopLog = {
    // This is a simplification of the equivalent Viem type, with the following change:
    // - hardcode `index` and `quantity` type params to `number` and `bigint` (defaults)
    // - remove ABI inference for log topics

    /** The address from which this log originated */
    address: Address

    /** Ordered list of topics. */
    topics: Hex[]

    /** Contains the non-indexed arguments of the log */
    data: Hex
}
