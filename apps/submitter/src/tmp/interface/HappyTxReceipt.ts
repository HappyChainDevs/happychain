import type { Address, Hash, Hex, Log, Receipt, UInt256 } from "./common_chain"
import type { EntryPointStatus } from "./status"

/**
 * Describes the result of a HappyTx that has been submitted onchain.
 */
export type HappyTxReceipt = {
    /** HappyTx identifying hash. */
    happyTxHash: Hash

    /** Account that sent the HappyTx. */
    account: Address

    /** The nonce of the HappyTx. */
    nonce: UInt256

    /** EntryPoint to which the HappyTx was submitted onchain. */
    entryPoint: Address

    /** Result of onchain submission of the HappyTx. */
    status: EntryPointStatus

    /** Logs emitted by HappyTx. */
    logs: Log[]

    /**
     * The revertData carried by one of our custom error, or the raw deal for
     * "otherReverted". Empty if `!status.endsWith("Reverted")`.
     */
    revertData: Hex

    /**
     * The selector carried by one of our custom error.
     * Empty if `!status.endsWith("Failed")`
     */
    failureReason: Hex

    /** Gas used by the HappyTx */
    gasUsed: UInt256

    /** Total gas cost for the HappyTx in wei (inclusive submitter fee) */
    gasCost: UInt256

    /**
     * Receipt for the transaction that carried the HappyTx.
     * Note that this transaction is allowed to do other things besides
     * carrying the happyTx, and could potentially have carried multiple happyTxs.
     */
    txReceipt: Receipt
}
