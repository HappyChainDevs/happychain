import { Map2, Mutex } from "@happy.tech/common"
import {
    type Boop,
    type BoopReceipt,
    EntryPointStatus,
    type ExecuteOutput,
    computeBoopHash,
    estimateGas,
    execute,
} from "@happy.tech/submitter-client"
import { EIP1474InvalidInput } from "@happy.tech/wallet-common"
import type {
    Address,
    Hash,
    Hex,
    Log,
    RpcTransactionRequest,
    Transaction,
    TransactionEIP1559,
    TransactionReceipt,
} from "viem"
import { entryPoint, entryPointAbi, happyPaymaster } from "#src/constants/contracts"
import { reqLogger } from "#src/logger"
import { addPendingBoop, markBoopAsConfirmed, markBoopAsFailed } from "#src/services/boopsHistory"
import { getCurrentChain } from "#src/state/chains"
import { getPublicClient } from "#src/state/publicClient"

/**
 * Local cache of nonces to avoid repeated
 */
const nonces = new Map2<Address, bigint, bigint>()
const nonceMutexes = new Map2<Address, bigint, Mutex>()

/**
 * Deletes cached nonce
 */
export function deleteNonce(account: Address, nonceTrack = 0n): void {
    nonces.delete(account, nonceTrack)
}

/**
 * Returns the next nonce for the given account.
 * Uses cached values when available and only fetches from chain when needed.
 */
export async function getNextNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    const mutex = nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
    return mutex.locked(async () => {
        const nonce = await nonces.getOrSetAsync(account, nonceTrack, () => getOnchainNonce(account, nonceTrack))

        nonces.set(account, nonceTrack, nonce + 1n)
        return nonce
    })
}

/**
 * Returns the nonce from the EntryPoint contract for a given account
 */
export async function getOnchainNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    const publicClient = getPublicClient()
    return await publicClient.readContract({
        address: entryPoint,
        abi: entryPointAbi,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

/**
 * Returns cached nonce.
 * Fallback to fetching nonce from the EntryPoint contract.
 */
export async function getCurrentNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    const cachedNonce = nonces.get(account, nonceTrack)
    if (cachedNonce !== undefined) {
        return cachedNonce
    }

    const onchainNonce = await getOnchainNonce(account, nonceTrack)
    nonces.set(account, nonceTrack, onchainNonce)
    return onchainNonce
}

export type BoopSigner = (hash: Hash) => Promise<Hex>
export type SendBoopArgs = {
    account: Address
    tx: RpcTransactionRequest
    signer: BoopSigner
    isSponsored?: boolean
    nonceTrack?: bigint
}

export async function sendBoop(
    { account, tx, signer, isSponsored = true, nonceTrack = 0n }: SendBoopArgs,
    retry = 2,
): Promise<ExecuteOutput> {
    let boopHash: Hash | undefined = undefined
    const value = tx.value ? BigInt(tx.value) : 0n

    try {
        const nonceValue = await getNextNonce(account, nonceTrack)

        if (!tx.to) throw new EIP1474InvalidInput("missing 'to' field in transaction parameters")

        const boop: Boop = {
            account,
            dest: tx.to,
            payer: happyPaymaster,
            value,
            nonceTrack,
            nonceValue,

            // For sponsored boops, gas & limits will be filled by the submitter.
            // For self-paying boops, we will fill this after calling `simulate`.
            maxFeePerGas: 0n,
            submitterFee: 0n,
            gasLimit: 0n,
            validateGasLimit: 0n,
            validatePaymentGasLimit: 0n,
            executeGasLimit: 0n,
            callData: tx.data ?? "0x",
            validatorData: "0x", // we will fill after signing
            extraData: "0x", // TODO
        }

        if (!isSponsored) {
            const simulation = (
                await estimateGas({
                    entryPoint,
                    tx: boop,
                })
            ).unwrap()

            if (simulation.status === EntryPointStatus.Success) {
                boop.gasLimit = BigInt(simulation.gasLimit)
                boop.validateGasLimit = BigInt(simulation.validateGasLimit)
                boop.validatePaymentGasLimit = BigInt(simulation.validatePaymentGasLimit)
                boop.executeGasLimit = BigInt(simulation.executeGasLimit)
                boop.maxFeePerGas = BigInt(simulation.maxFeePerGas)
                boop.submitterFee = BigInt(simulation.submitterFee)
            } else {
                throw new Error(`Simulation failed with status: ${simulation.status}`)
            }
        }

        boopHash = computeBoopHash(BigInt(getCurrentChain().chainId), boop)
        const signedBoop: Boop = {
            ...boop,
            validatorData: await signer(boopHash),
        }

        addPendingBoop(account, {
            boopHash,
            value,
        })

        const result = (
            await execute({
                entryPoint,
                tx: signedBoop,
            })
        ).unwrap()

        markBoopAsConfirmed(account, value, result)

        return result
    } catch (error) {
        reqLogger.info(`boop submission failed — ${retry} attempts left`, error)
        deleteNonce(account, nonceTrack)

        if (retry > 0) return sendBoop({ account, tx, signer, isSponsored }, retry - 1)

        if (boopHash)
            markBoopAsFailed(account, {
                value: tx.value ? BigInt(tx.value as string) : 0n,
                boopHash,
            })

        throw error
    }
}

/**
 * Format a boop receipt in a transaction receipt returned by `eth_getTransactionReceipt`
 */
export function formatBoopReceiptToTransactionReceipt(hash: Hash, receipt: BoopReceipt): TransactionReceipt {
    return {
        blockHash: receipt.txReceipt.blockHash,
        blockNumber: receipt.txReceipt.blockNumber,
        contractAddress: receipt.txReceipt.contractAddress,
        cumulativeGasUsed: receipt.txReceipt.cumulativeGasUsed,
        effectiveGasPrice: receipt.txReceipt.effectiveGasPrice,
        from: receipt.account,
        gasUsed: receipt.gasUsed,
        logs: receipt.logs as Log[],
        logsBloom: receipt.txReceipt.logsBloom,
        status: receipt.status === EntryPointStatus.Success ? "success" : "reverted",
        to: "0x0", // TODO include Boop inside receipt and read from there
        transactionHash: hash,
        transactionIndex: receipt.txReceipt.transactionIndex,
        type: receipt.txReceipt.type,
        boop: receipt,
    } as TransactionReceipt
}

/**
 * Format a transaction from a boop receipt returned by `eth_getTransactionByHash`.
 */
export function formatTransaction(hash: Hash, receipt: BoopReceipt, originalTx?: Boop): Transaction {
    const currentChain = getCurrentChain()

    return {
        hash,
        blockHash: receipt.txReceipt.blockHash,
        blockNumber: receipt.txReceipt.blockNumber,
        from: receipt.account,
        to: receipt.txReceipt.to,
        gas: originalTx?.gasLimit ?? receipt.gasUsed,
        maxPriorityFeePerGas: 0n,
        maxFeePerGas: originalTx?.maxFeePerGas ?? receipt.txReceipt.effectiveGasPrice,
        nonce: Number(receipt.nonceValue),
        input: originalTx?.callData || "0x",
        value: originalTx?.value ?? 0n,
        transactionIndex: receipt.txReceipt.transactionIndex || null,
        type: "eip1559",
        typeHex: "0x2",
        chainId: Number(currentChain.chainId),
        accessList: [],
        // TODO Parse signature values (r, s, v) and extract proper yParity value from validatorData
        //      https://linear.app/happychain/issue/HAPPY-490/
        r: "0x0",
        s: "0x0",
        v: 0n,
        yParity: 0,
        boop: receipt,
    } as TransactionEIP1559
}
