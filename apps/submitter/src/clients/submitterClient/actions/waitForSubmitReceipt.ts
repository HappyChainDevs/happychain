import type { happyChainSepolia } from "@happy.tech/wallet-common"
import { type Account, type Client, type Hex, type HttpTransport, keccak256 } from "viem"
import { waitForTransactionReceipt } from "viem/actions"
import { EntryPointStatus } from "#src/tmp/interface/status"
import { decodeHappyTx } from "#src/utils/decodeHappyTx"

export async function waitForSubmitReceipt<account extends Account | undefined = undefined>(
    client: Client<HttpTransport, typeof happyChainSepolia, account>,
    { hash, tx }: { hash: Hex; tx: Hex },
) {
    const receipt = await waitForTransactionReceipt(client, { hash, pollingInterval: 500 })

    const decoded = decodeHappyTx(tx)

    const happyTxHash = keccak256(tx)
    // TODO: this makes many assumptions (such as it was a success)...
    // TODO: this formats all bigints.toString(16) which isn't ok
    return {
        happyTxHash: happyTxHash,

        /** Account that sent the HappyTx. */
        account: decoded.account,

        /** The nonce of the HappyTx. */
        nonceTrack: decoded.nonceTrack,
        nonceValue: decoded.nonceValue,

        /** EntryPoint to which the HappyTx was submitted onchain. */
        entryPoint: receipt.to,

        /** Result of onchain submission of the HappyTx. */
        status: EntryPointStatus.Success,

        /** Logs emitted by HappyTx. */
        // logs: [], //receipt.logs, // TODO:

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
        gasUsed: receipt.gasUsed,

        /** Total gas cost for the HappyTx in wei (inclusive submitter fee) */
        gasCost: receipt.gasUsed * receipt.effectiveGasPrice,

        /**
         * Receipt for the transaction that carried the HappyTx.
         * Note that this transaction is allowed to do other things besides
         * carrying the happyTx, and could potentially have carried multiple happyTxs.
         */
        txReceipt: {
            blobGasPrice: receipt.blobGasPrice,
            blobGasUsed: receipt.blobGasUsed,
            blockHash: receipt.blockHash,
            blockNumber: receipt.blockNumber,
            contractAddress: receipt.contractAddress,
            cumulativeGasUsed: receipt.cumulativeGasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
            from: receipt.from,
            gasUsed: receipt.gasUsed,
            logs: receipt.logs.map((l) => ({ ...l, blockNumber: l.blockNumber })),
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
