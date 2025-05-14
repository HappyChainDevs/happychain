import {
    type Boop,
    type BoopReceipt,
    type EVMReceipt,
    type ExecuteOutput,
    type Log,
    Onchain,
    type SimulateOutput,
    type SimulateSuccess,
    SubmitterError,
    computeBoopHash,
} from "@happy.tech/boop-sdk"
import { Map2, Mutex, parseBigInt } from "@happy.tech/common"
import {
    EIP1474InternalError,
    EIP1474InvalidInput,
    EIP1474LimitExceeded,
    EIP1474TransactionRejected,
    type HappyRpcError,
    RevertRpcError,
} from "@happy.tech/wallet-common"
import { type Address, type Hash, type Hex, type TransactionEIP1559, parseSignature, zeroAddress } from "viem"
import { entryPoint, entryPointAbi } from "#src/constants/contracts"
import type { BoopCacheEntry } from "#src/requests/utils/boopCache"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import { type BlockParam, parseBlockParam } from "#src/requests/utils/eip1474"
import { getBoopClient } from "#src/state/boopClient"
import { addPendingBoop, markBoopAsFailure, markBoopAsSuccess } from "#src/state/boopHistory"
import { getCurrentChain } from "#src/state/chains"
import { getPublicClient } from "#src/state/publicClient"
import { reqLogger } from "#src/utils/logger"
import { createValidatorExtraData } from "./sessionKeys"

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
 * Returns the nonce from the EntryPoint contract for a given account.
 */
export async function getOnchainNonce(
    account: Address,
    nonceTrack = 0n,
    block: BlockParam = "latest",
): Promise<bigint> {
    const publicClient = getPublicClient()
    return await publicClient.readContract({
        address: entryPoint,
        abi: entryPointAbi,
        functionName: "nonceValues",
        args: [account, nonceTrack],
        ...parseBlockParam(block),
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

export type SendBoopArgs = {
    account: Address
    tx: ValidRpcTransactionRequest
    signer: (data: Hex) => Promise<Hex>
    isSponsored?: boolean
    nonceTrack?: bigint
}

export async function sendBoop(
    { account, tx, signer, isSponsored = true, nonceTrack = 0n }: SendBoopArgs,
    retry = 0, // TODO: temp 0, should be 2
): Promise<Hash> {
    let boopHash: Hash | undefined = undefined
    const value = tx.value ? BigInt(tx.value) : 0n

    try {
        const boop = await boopFromTransaction(account, tx)
        const boopClient = getBoopClient()
        if (!boopClient) throw new Error("Boop client not initialized")

        if (!isSponsored) {
            const output = await boopClient.simulate({ entryPoint, boop })
            reqLogger.trace("boop/simulate output", output)
            if (output.status !== Onchain.Success) throw translateBoopError(output)

            boop.gasLimit = output.gas
            boop.validateGasLimit = output.validateGas
            boop.validatePaymentGasLimit = output.validatePaymentGas
            boop.executeGasLimit = output.executeGas
            boop.maxFeePerGas = output.maxFeePerGas
            boop.submitterFee = output.submitterFee
        }

        boopHash = computeBoopHash(BigInt(getCurrentChain().chainId), boop)
        if (!boopHash) throw new Error("Boop hash not computed") // temp: fix for boopHash being undefined
        const signedBoop: Boop = { ...boop, validatorData: await signer(boopHash) }
        addPendingBoop({ boopHash, value })
        const output = await boopClient.execute({ entryPoint, boop: signedBoop })
        reqLogger.trace("boop/execute output", output)

        if (output.status !== Onchain.Success) throw translateBoopError(output)
        markBoopAsSuccess(output)
        return output.receipt.boopHash
    } catch (error) {
        reqLogger.info(`boop submission failed — ${retry} attempts left`, error)
        deleteNonce(account, nonceTrack)
        if (retry > 0) return sendBoop({ account, tx, signer, isSponsored }, retry - 1)
        if (boopHash) markBoopAsFailure({ boopHash }, serializeError(error))
        throw error
    }
}

function serializeError(err: unknown) {
    if (!err) return
    if (typeof err !== "object") return
    if (!("message" in err) || !err.message) return

    return {
        message: err.message.toString(),
        code:
            "code" in err && ["number", "string"].includes(typeof err.code) ? (err.code as number | string) : undefined,
    }
}

/**
 * Safely parses signature data from validatorData, returning default values if parsing fails
 */
function safeParseSignature(validatorData?: Hex) {
    // Default signature values
    const defaultSignature = {
        r: "0x0" as Hex,
        s: "0x0" as Hex,
        v: 0n,
        yParity: 0,
    }

    // If no validator data or too short, return defaults
    if (!validatorData || validatorData.length < 132) {
        return defaultSignature
    }

    try {
        // Attempt to parse the signature
        const { r, s, yParity } = parseSignature(validatorData)
        return {
            r,
            s,
            v: BigInt(yParity),
            yParity,
        }
    } catch (error) {
        // Log the error but don't fail the transaction formatting
        reqLogger.trace("boop signature parsing failed", { validatorData, error })
        return defaultSignature
    }
}

export async function boopFromTransaction(account: Address, tx: ValidRpcTransactionRequest): Promise<Boop> {
    // TODO bigint casts need validation

    return {
        account: tx.from,
        dest: tx.to,
        payer: zeroAddress, // happyPaymaster, // TODO need to fund paymaster
        value: tx.value ? BigInt(tx.value) : 0n,
        nonceTrack: 0n,
        nonceValue: tx.nonce ? BigInt(tx.nonce) : await getNextNonce(account),
        callData: tx.data ?? "0x",
        validatorData: "0x", // we will fill after signing
        extraData: createValidatorExtraData(account, tx.to),
        // Use gas values from the transaction if they exist, for legacy txs, use gasPrice as maxFeePerGas
        maxFeePerGas: parseBigInt(tx.maxFeePerGas) ?? parseBigInt(tx.gasPrice) ?? 0n,
        submitterFee: 0n,
        gasLimit: tx.gas ? Number(tx.gas) : 0,
        validateGasLimit: 0,
        validatePaymentGasLimit: 0,
        executeGasLimit: 0,
    }
}

/**
 * Format a boop receipt in a transaction receipt returned by `eth_getTransactionReceipt`
 */
export function formatTransactionReceipt(hash: Hash, receipt: BoopReceipt): EVMReceipt {
    return {
        // TODO tmp commenting out while working on submitter
        blockHash: receipt.txReceipt.blockHash,
        blockNumber: receipt.txReceipt.blockNumber,
        // contractAddress: receipt.txReceipt.contractAddress,
        // cumulativeGasUsed: receipt.txReceipt.cumulativeGasUsed,
        effectiveGasPrice: receipt.txReceipt.effectiveGasPrice,
        from: receipt.account,
        gasUsed: receipt.gasUsed,
        logs: receipt.logs as Log[], // TODO parse boop logs
        // logsBloom: receipt.txReceipt.logsBloom,
        status: receipt.status === Onchain.Success ? "success" : "reverted",
        to: "0x0", // TODO include Boop inside receipt and read from there
        transactionHash: hash,
        // transactionIndex: receipt.txReceipt.transactionIndex,
        type: receipt.txReceipt.type,
        boop: receipt,
    } as EVMReceipt
}

/**
 * Given a boop and an optional receipt, returns an EIP1559-style transaction object, which is what is returned
 * for RPC calls to `eth_getTransactionByHash` when it is passed a boop receipt.
 */
export function formatTransaction(
    hash: Hash,
    { boop, receipt }: BoopCacheEntry,
    simulation?: SimulateSuccess,
): TransactionEIP1559 {
    const currentChain = getCurrentChain()

    // NOTES(norswap)
    // - maxPriorityFeePerGas: The submitter might have put some. We can compute this by subtracting the tx receipt's
    //    effectiveGasPrive minus the basefee. But getting the basefee requires an onchain call. Probably not worth it.
    // - maxFeePerGas: incorrect approximation by the effectiveGasPrice if we don't have the tx.
    // - nonce, input, value: incorrect if receipt is missing
    // - null = missing
    return {
        boopHash: hash,
        blockHash: receipt?.txReceipt.blockHash || null,
        blockNumber: receipt?.txReceipt.blockNumber || null,
        from: receipt?.account || boop?.account,
        to: boop?.dest ?? null, // TODO should be in the receipt too!
        gas: boop?.gasLimit ?? receipt?.gasUsed, // TODO boop in receipt
        maxPriorityFeePerGas: 0n,
        maxFeePerGas: boop?.maxFeePerGas ?? receipt?.txReceipt.effectiveGasPrice ?? simulation?.maxFeePerGas,
        nonce: receipt?.nonceValue ? Number(receipt.nonceValue) : -1,
        input: boop?.callData || "0x",
        value: boop?.value ?? 0n,
        transactionIndex: null, // receipt?.txReceipt?.transactionIndex || null, // TODO tmp while working on submitter
        type: "eip1559", // it's a boop, so we're just putting the most usual thing in here
        typeHex: "0x2",
        chainId: Number(currentChain.chainId),
        accessList: [], // no way to retrieve without access to submitter tx, not important
        // Parse signature values from validatorData if available
        ...safeParseSignature(boop?.validatorData),
        boop: receipt,
    } as TransactionEIP1559
}

function translateBoopError(output: ExecuteOutput | SimulateOutput): HappyRpcError {
    switch (output.status) {
        case Onchain.MissingValidationInformation:
        case Onchain.GasPriceTooHigh:
        case Onchain.InvalidNonce:
        case Onchain.ExecuteRejected:
        case Onchain.InvalidExtensionValue:
        case SubmitterError.InvalidValues:
            return new EIP1474InvalidInput(output.description, output)
        case Onchain.ValidationRejected:
        case Onchain.PaymentValidationRejected:
        case Onchain.InsufficientStake:
        case Onchain.InvalidSignature:
        case Onchain.ExtensionAlreadyRegistered:
        case Onchain.ExtensionNotRegistered:
            return new EIP1474TransactionRejected(output.description, output)
        case Onchain.ExecuteReverted:
        case Onchain.CallReverted:
        case Onchain.ValidationReverted:
        case Onchain.PaymentValidationReverted:
        case Onchain.PayoutFailed:
        case Onchain.EntryPointOutOfGas:
        case Onchain.UnexpectedReverted:
        case SubmitterError.UnexpectedError:
            return new RevertRpcError(output.description, output)
        case SubmitterError.BufferExceeded:
        case SubmitterError.OverCapacity:
            return new EIP1474LimitExceeded(output.description, output)
        case SubmitterError.SimulationTimeout:
        case SubmitterError.SubmitTimeout:
        case SubmitterError.ReceiptTimeout:
        case SubmitterError.RpcError:
        case SubmitterError.ClientError:
            return new EIP1474InternalError(output.description, output)
        case Onchain.Success:
            return new EIP1474InternalError("Not an error — implementation bug", output)
        default: {
            // Type check exhaustiveness.
            const _: never = output
        }
    }
    return null as unknown as HappyRpcError
}
