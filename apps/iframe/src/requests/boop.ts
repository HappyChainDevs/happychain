import {
    type Boop,
    type BoopReceipt,
    EntryPointStatus,
    type ExecuteOutput,
    computeBoopHash,
} from "@happy.tech/boop-sdk"
import { Map2, Mutex } from "@happy.tech/common"
import { EIP1474InvalidInput } from "@happy.tech/wallet-common"
import {
    type Address,
    type Hash,
    type Hex,
    type Log,
    type RpcTransactionRequest,
    type Transaction,
    type TransactionEIP1559,
    type TransactionReceipt,
    UserRejectedRequestError,
    zeroAddress,
} from "viem"
import { entryPoint, entryPointAbi, happyPaymaster } from "#src/constants/contracts"
import { addPendingBoop, markBoopAsConfirmed, markBoopAsFailed } from "#src/services/boopsHistory"
import { boopClient } from "#src/state/boopClient"
import { getCurrentChain } from "#src/state/chains"
import { getPublicClient } from "#src/state/publicClient"
import { logger, reqLogger } from "#src/utils/logger"

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
async function getNextNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    try {
        const mutex = nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
        return await mutex.locked(async () => {
            const nonce = await nonces.getOrSetAsync(account, nonceTrack, () => getOnchainNonce(account, nonceTrack))
            nonces.set(account, nonceTrack, nonce + 1n)
            return nonce
        })
    } catch (error) {
        logger.error("Error getting next nonce:", error)
        throw error
    }
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
    if (cachedNonce !== undefined) return cachedNonce

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

async function withValidatorData(boop: Boop, signer: BoopSigner): Promise<Boop> {
    const hash = computeBoopHash(BigInt(getCurrentChain().chainId), boop)
    return {
        ...boop,
        validatorData: await signer(hash),
    }
}

async function createBoopFromTx({ account, tx, signer, isSponsored, nonceTrack = 0n }: SendBoopArgs): Promise<Boop> {
    if (!tx.to) throw new EIP1474InvalidInput("missing 'to' field in transaction parameters")

    const nonceValue = await getNextNonce(account, nonceTrack)
    const boop = (await withValidatorData(
        {
            account,
            dest: tx.to,
            payer: isSponsored ? zeroAddress : happyPaymaster,
            value: tx.value ? BigInt(tx.value) : 0n,
            nonceTrack,
            nonceValue,

            // For sponsored boops, gas & limits will be filled by the submitter.
            // For self-paying boops, we will fill this after calling `simulate`.
            gasLimit: 0n,
            maxFeePerGas: 1200000000n, // TODO: this is incorrect
            submitterFee: 100n, // TODO: this is incorrect
            validateGasLimit: 4000000000n, // TODO: this is incorrect
            validatePaymentGasLimit: 4000000000n, // TODO: this is incorrect
            executeGasLimit: 0n,

            callData: tx.data ?? "0x",
            validatorData: "0x", // we will fill after signing
            extraData: "0x", // TODO
        },
        signer,
    )) satisfies Boop

    if (isSponsored) return boop

    const simulation = (await boopClient.simulate({ entryPoint, tx: boop })).unwrap()

    if (simulation.status !== EntryPointStatus.Success) {
        throw new Error(`Simulation failed with status: ${simulation.status}`)
    }

    // gas values don't affect signature
    boop.gasLimit = BigInt(simulation.gasLimit)
    boop.validateGasLimit = BigInt(simulation.validateGasLimit)
    boop.validatePaymentGasLimit = BigInt(simulation.validatePaymentGasLimit)
    boop.executeGasLimit = BigInt(simulation.executeGasLimit)
    boop.maxFeePerGas = BigInt(simulation.maxFeePerGas)
    boop.submitterFee = BigInt(simulation.submitterFee)

    return boop
}

export async function sendBoop(
    { account, tx, signer, isSponsored, nonceTrack = 0n }: SendBoopArgs,
    retry = 2,
): Promise<`0x${string}`> {
    let boopHash: Hash | undefined = undefined

    try {
        const boop = await createBoopFromTx({ account, tx, signer, isSponsored, nonceTrack })

        boopHash = computeBoopHash(BigInt(getCurrentChain().chainId), boop)
        addPendingBoop(account, boopHash)
        const result = await boopClient.submit({ entryPoint, tx: boop })
        if (result.isErr()) throw result.error
        // console.log({ receipt })
        // markBoopAsConfirmed(account, receipt.state.receipt)
        // TODO: return boopHash or transactionHash?
        return boopHash
    } catch (error) {
        // no retry if intentionally rejected
        if (error instanceof UserRejectedRequestError) throw error
        console.log({ error })
        reqLogger.info(`boop submission failed — ${retry} attempts left`, error)
        deleteNonce(account, nonceTrack)

        if (retry > 0) return await sendBoop({ account, tx, signer, isSponsored }, retry - 1)
        if (boopHash) markBoopAsFailed(account, boopHash)
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
