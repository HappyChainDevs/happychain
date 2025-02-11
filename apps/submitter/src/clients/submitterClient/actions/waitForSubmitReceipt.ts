import type { Hex } from "viem"
import { waitForTransactionReceipt } from "viem/actions"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { decodeHappyTx } from "#src/utils/decodeHappyTx"
import type { BasicClient } from "../types"

export async function waitForSubmitReceipt(client: BasicClient, { hash, tx }: { hash: Hex; tx: Hex }) {
    const receipt = await waitForTransactionReceipt(client, { hash, pollingInterval: 500 })

    const decoded = decodeHappyTx(tx)

    // TODO: this makes many assumptions (such as it was a success)...
    // TODO: this formats all bigints.toString(16) which isn't ok
    return {
        happyTxHash: hash,

        /** Account that sent the HappyTx. */
        account: decoded.account,

        /** The nonce of the HappyTx. */
        nonceTrack: decoded.nonceTrack.toString(16),
        nonceValue: decoded.nonceValue.toString(16),

        /** EntryPoint to which the HappyTx was submitted onchain. */
        entryPoint: receipt.to,

        /** Result of onchain submission of the HappyTx. */
        status: EntryPointStatus.Success,

        /** Logs emitted by HappyTx. */
        logs: [], //receipt.logs,

        /**
         * The revertData carried by one of our custom error, or the raw deal for
         * "otherReverted". Empty if `!status.endsWith("Reverted")`.
         */
        revertData: "0x",

        /**
         * The selector carried by one of our custom error.
         * Empty if `!status.endsWith("Failed")`
         */
        failureReason: "0x",

        /** Gas used by the HappyTx */
        gasUsed: receipt.gasUsed.toString(16),

        /** Total gas cost for the HappyTx in wei (inclusive submitter fee) */
        gasCost: receipt.effectiveGasPrice.toString(16), // TODO: cost or price?

        /**
         * Receipt for the transaction that carried the HappyTx.
         * Note that this transaction is allowed to do other things besides
         * carrying the happyTx, and could potentially have carried multiple happyTxs.
         */
        txReceipt: {
            blobGasPrice: receipt.blobGasPrice?.toString(16),
            blobGasUsed: receipt.blobGasUsed?.toString(16),
            blockHash: receipt.blockHash,
            blockNumber: receipt.blockNumber?.toString(16),
            contractAddress: receipt.contractAddress,
            cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(16),
            effectiveGasPrice: receipt.effectiveGasPrice?.toString(16),
            from: receipt.from,
            gasUsed: receipt.gasUsed?.toString(16),
            logs: receipt.logs.map((l) => ({ ...l, blockNumber: l.blockNumber.toString(16) })),
            logsBloom: receipt.logsBloom,
            root: receipt.root,
            status: receipt.status,
            to: receipt.to,
            transactionHash: receipt.transactionHash,
            transactionIndex: receipt.transactionIndex,
            type: receipt.type,
        },
    }
}
