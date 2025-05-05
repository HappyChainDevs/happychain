import type { Address, Hash, Hex, UInt256 } from "@happy.tech/common"
import type { OnchainStatus } from "./Onchain"
import type { Log, Receipt } from "./ethereum"

/**
 * Describes the result of a Boop that has been submitted onchain.
 */
export type BoopReceipt = {
    /** Boop identifying hash. */
    boopHash: Hash

    /** Account that sent the Boop. */
    account: Address

    /** Nonces are ordered within tracks; there is no ordering constraint across tracks. */
    nonceTrack: UInt256

    /** Nonce sequence number within the nonce track. */
    nonceValue: UInt256

    /** EntryPoint to which the Boop was submitted onchain. */
    entryPoint: Address

    /** Result of onchain submission of the Boop. */
    status: OnchainStatus

    /** Logs emitted by Boop. */
    logs: Log[]

    /**
     * The revertData carried by one of our custom error, or the raw deal for {@link Onchain.UnexpectedReverted}.
     */
    revertData: Hex

    /** Gas used by the Boop */
    gasUsed: UInt256

    /** Total gas cost for the Boop in wei (inclusive submitter fee) */
    gasCost: UInt256

    /**
     * Receipt for the transaction that carried the Boop.
     * Note that this transaction is allowed to do other things besides
     * carrying the boop, and could potentially have carried multiple boops.
     */
    txReceipt: Receipt
    // TODO omit stuff from here
}
