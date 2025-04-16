import { LogTag } from "@happy.tech/common"
import { deployment as happyAccAbsDeployment } from "@happy.tech/contracts/happy-aa/anvil"
import {
    EntryPointStatus,
    type HappyTx,
    type HappyTxReceipt,
    computeBoopHash,
    estimateGas,
    execute,
} from "@happy.tech/submitter-client"
import {
    type Address,
    type Hash,
    type Hex,
    type RpcTransactionRequest,
    type Transaction,
    type TransactionEIP1559,
    type TransactionReceipt,
    zeroAddress,
} from "viem"
import { addPendingBoop, markBoopAsConfirmed, markBoopAsFailed } from "#src/services/boopsHistory"
import { getCurrentChain } from "#src/state/chains"
import { getPublicClient } from "#src/state/publicClient"
import { logger } from "#src/utils/logger"

// @todo - rework nonce management system to be similar to previous implementation in userops.ts
//         (getNextNonce, getOnchainNonce, deleteNonce ; getAcountNonce too ?)
export async function getNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    const publicClient = getPublicClient()
    const nonce = await publicClient.readContract({
        address: happyAccAbsDeployment.HappyEntryPoint,
        abi: happyAccAbsAbis.HappyEntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
    return nonce as unknown as bigint
}

export type BoopSigner = (hash: Hash) => Promise<Hex>
export type SendBoopArgs = {
    boopAccount: Address
    tx: RpcTransactionRequest
    signer: BoopSigner
    isSponsored?: boolean
}

export async function sendBoop({ boopAccount, tx, signer, isSponsored }: SendBoopArgs, retry = 2): Promise<Hash> {
    let boopHash: Hash | undefined = undefined

    try {
        const nonceTrack = 0n
        const nonceValue = await getNonce(boopAccount, nonceTrack)

        const processedCallData = tx.data
        const boop: HappyTx = {
            account: boopAccount,
            dest: tx.to as Address,
            nonceTrack,
            nonceValue,
            value: tx.value ? BigInt(tx.value as string) : 0n,
            validateGasLimit: 0n,
            validatePaymentGasLimit: 0n,
            // For sponsored transactions, use default/empty values, submitter will replace them
            paymaster: isSponsored ? zeroAddress : ("0x0" as Address),
            executeGasLimit: 0n,
            gasLimit: 0n,
            // If sponsored : use minimal values
            // otherwise (self paying),  will be overridden by simulation
            maxFeePerGas: isSponsored ? 0n : 1200000000n,
            submitterFee: isSponsored ? 0n : 100n,
            callData: processedCallData as Hex,
            paymasterData: "0x" as Hex,
            validatorData: "0x" as Hex,
            extraData: "0x" as Hex,
        }

        if (!isSponsored) {
            const simulationResult = await estimateGas({
                entryPoint: happyAccAbsDeployment.HappyEntryPoint as Address,
                tx: boop,
            })
            if (simulationResult.isErr()) {
                throw simulationResult.error
            }

            const simulation = simulationResult.value
            if (simulation.status === EntryPointStatus.Success) {
                boop.gasLimit = BigInt(simulation.gasLimit)
                boop.executeGasLimit = BigInt(simulation.executeGasLimit)
                boop.maxFeePerGas = BigInt(simulation.maxFeePerGas)
                boop.submitterFee = BigInt(simulation.submitterFee)
            } else {
                throw new Error(`Simulation failed with status: ${simulation.status}`)
            }
        }

        boopHash = computeBoopHash(boop) as Hash
        const signature = await signer(boopHash)
        const signedBoop: HappyTx = {
            ...boop,
            validatorData: signature as Hex,
        }

        const pendingBoopDetails = {
            boopHash,
            value: tx.value ? BigInt(tx.value as string) : 0n,
        }
        addPendingBoop(boopAccount, pendingBoopDetails)

        const result = await execute({
            entryPoint: happyAccAbsDeployment.HappyEntryPoint as Address,
            tx: signedBoop,
        })

        if (result.isErr()) {
            throw result.error
        }

        markBoopAsConfirmed(boopAccount, pendingBoopDetails.value, result.value)

        return boopHash
    } catch (error) {
        logger.error(LogTag.SUBMITTER, "Boop submission failed: ", error)
        if (retry > 0) {
            console.log(`Retrying Boop submission (${retry} attempts left)...`)
            return sendBoop({ boopAccount, tx, signer, isSponsored }, retry - 1)
        }

        if (boopHash) {
            markBoopAsFailed(boopAccount, {
                value: tx.value ? BigInt(tx.value as string) : 0n,
                boopHash,
            })
        }

        throw error
    }
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
        gasUsed: receipt.gasUsed || "0x0",
        logs: receipt.logs || [],
        logsBloom: receipt.txReceipt.logsBloom || "0x0",
        status: receipt.status === EntryPointStatus.Success ? "0x1" : "0x0",
        to: receipt.dest,
        transactionHash: hash,
        transactionIndex: receipt.txReceipt.transactionIndex || "0x0",
        type: receipt.txReceipt.type || "eip1559",
        boop: receipt,
    } as unknown as TransactionReceipt
}

/**
 * Format a transaction from a boop receipt returned by `eth_getTransactionByHash`.
 */
export function formatTransaction(hash: Hash, receipt: HappyTxReceipt, originalTx?: HappyTx): Transaction {
    const currentChain = getCurrentChain()

    return {
        // Standard transaction fields
        hash,
        blockHash: receipt.txReceipt.blockHash,
        blockNumber: receipt.txReceipt.blockNumber,
        from: receipt.account,
        to: receipt.txReceipt.to,
        gas: originalTx?.gasLimit ?? receipt.gasUsed,
        maxPriorityFeePerGas: "0x0",
        maxFeePerGas: originalTx?.maxFeePerGas ?? receipt.txReceipt.effectiveGasPrice,
        nonce: receipt.nonceValue,
        input: originalTx?.callData || "0x",
        value: originalTx?.value ?? "0x0",
        transactionIndex: receipt.txReceipt.transactionIndex || null,
        type: "0x2",
        typeHex: "0x2",
        chainId: Number(currentChain.chainId),
        accessList: [], // @todo - should this always be empty?
        // Default signature values (Boop doesn't expose these in the same way)
        // @todo - Parse signature values (r, s, v) and extract proper yParity value from validatorData
        r: "0x0", // placeholder
        s: "0x0", // placeholder value
        v: "0x0", // @todo - placeholder value - but is this needed ?
        yParity: "0x0", // placeholder value
        boop: receipt,
    } as unknown as TransactionEIP1559
}
