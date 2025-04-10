import { computeBoopHash } from "@happy.tech/submitter-client"
import type { HappyUser } from "@happy.tech/wallet-common"
import type { Address, Hash, RpcTransactionRequest, Transaction, TransactionReceipt } from "viem"
import { addPendingBoop, markBoopAsConfirmed, markBoopAsFailed } from "#src/services/boopsHistory"
import { getBoopClient } from "#src/state/boopClient"
import { getCurrentChain } from "#src/state/chains"

import type { Result } from "../../../../packages/submitter-client/lib/utils/neverthrow"
// @todo - cleanup imports
import type { HappyTx } from "../../../../packages/submitter/lib/tmp/interface/HappyTx"
import type { HappyTxReceipt } from "../../../../packages/submitter/lib/tmp/interface/HappyTxReceipt"
import type { StateRequestOutput } from "../../../../packages/submitter/lib/tmp/interface/HappyTxState"
import { EntryPointStatus } from "../../../../packages/submitter/lib/tmp/interface/status"
import type { SubmitOutput } from "../../../../packages/submitter/lib/tmp/interface/submitter_submit"

export type BoopSigner = (boop: HappyTx) => Promise<HappyTx>

export type SendBoopArgs = {
    user: HappyUser
    tx: RpcTransactionRequest
    signer: BoopSigner
}

/**
 * Format a boop receipt in a transaction receipt returned by `eth_getTransactionReceipt`
 */
export function formatBoopReceiptToTransactionReceipt(hash: Hash, receipt: HappyTxReceipt): TransactionReceipt {
    return {
        blockHash: receipt.txReceipt.blockHash,
        blockNumber: receipt.txReceipt.blockNumber,
        contractAddress: receipt.txReceipt.contractAddress || null,
        cumulativeGasUsed: receipt.txReceipt.cumulativeGasUsed || "0x0",
        effectiveGasPrice: receipt.txReceipt.effectiveGasPrice || "0x0",
        from: receipt.account,
        // Ensure proper hex formatting for gasUsed
        gasUsed: receipt.gasUsed || "0x0",
        logs: receipt.logs || [],
        logsBloom: receipt.txReceipt.logsBloom || "0x0",
        status: receipt.status === EntryPointStatus.Success ? "0x1" : "0x0",
        to: receipt.txReceipt.to,
        transactionHash: hash,
        transactionIndex: receipt.txReceipt.transactionIndex || "0x0",
        type: receipt.txReceipt.type || "eip1559",
        // Include the original receipt for consumers that want it
        boop: receipt,
    } as unknown as TransactionReceipt
}

/**
 * Format a transaction from a boop receipt returned by `eth_getTransactionByHash`.
 */
export function formatTransactionFromBoopReceipt(
    hash: Hash,
    receipt: HappyTxReceipt,
    originalTx?: HappyTx,
): Transaction {
    const currentChain = getCurrentChain()

    return {
        // Standard transaction fields
        hash,
        blockHash: receipt.txReceipt.blockHash,
        blockNumber: receipt.txReceipt.blockNumber,
        from: receipt.account,
        // Use destination from receipt.txReceipt or from originalTx if available
        to: receipt.txReceipt.to,
        gas: receipt.gasUsed.toString(16).startsWith("0x")
            ? receipt.gasUsed.toString(16)
            : "0x" + receipt.gasUsed.toString(16),
        gasPrice: receipt.txReceipt.effectiveGasPrice,
        // Use maxFeePerGas from originalTx if available
        maxFeePerGas: originalTx?.maxFeePerGas
            ? originalTx.maxFeePerGas.toString(16).startsWith("0x")
                ? originalTx.maxFeePerGas.toString(16)
                : "0x" + originalTx.maxFeePerGas.toString(16)
            : receipt.txReceipt.effectiveGasPrice, // Fallback to effectiveGasPrice
        nonce: receipt.nonceValue.toString(16).startsWith("0x")
            ? receipt.nonceValue.toString(16)
            : "0x" + receipt.nonceValue.toString(16),
        // Use callData from originalTx if available, otherwise use default empty value
        input: originalTx?.callData || "0x",
        // Use value from originalTx if available
        value: originalTx?.value
            ? originalTx.value.toString(16).startsWith("0x")
                ? originalTx.value.toString(16)
                : "0x" + originalTx.value.toString(16)
            : "0x0",
        transactionIndex: receipt.txReceipt.transactionIndex || null,
        type: "0x2", // EIP-1559 transaction type
        chainId: Number(currentChain.chainId),
        // Default signature values (Boop doesn't expose these in the same way)
        r: "0x0",
        s: "0x0",
        v: "0x0",
        // Add the original Boop object for HappyWallet-aware applications
        boop: receipt,
    } as unknown as Transaction
}

/**
 * Sends a Boop transaction through the submitter
 */
export async function sendBoop({ user, tx, signer }: SendBoopArgs, retry = 2): Promise<Hash> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    let boopHash: Hash | undefined = undefined

    try {
        const boop = await boopClient.boop.prepareTransaction({
            dest: tx.to as Address,
            callData: tx.data || "0x",
            value: tx.value ? BigInt(tx.value as string) : 0n,
        })

        const signedBoop = await signer(boop)
        boopHash = computeBoopHash(signedBoop) as Hash

        const pendingBoopDetails = {
            boopHash,
            value: tx.value ? BigInt(tx.value as string) : 0n,
        }
        addPendingBoop(user.address, pendingBoopDetails)

        const result = await boopClient.boop.execute(signedBoop)

        if (result.isErr()) {
            throw result.error
        }

        markBoopAsConfirmed(user.address, pendingBoopDetails.value, result.value)

        return boopHash
    } catch (error) {
        console.error("Error sending Boop:", error)

        if (retry > 0) {
            console.log(`Retrying Boop submission (${retry} attempts left)...`)
            return sendBoop({ user, tx, signer }, retry - 1)
        }

        if (boopHash) {
            markBoopAsFailed(user.address, {
                value: tx.value ? BigInt(tx.value as string) : 0n,
                boopHash,
            })
        }

        throw error
    }
}

export async function getBoopStatus(hash: Hash): Promise<Result<StateRequestOutput, Error>> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    return await boopClient.boop.getStatus(hash)
}

export async function submitBoop(signedBoop: HappyTx): Promise<Result<SubmitOutput, Error>> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    return await boopClient.boop.submit(signedBoop)
}
