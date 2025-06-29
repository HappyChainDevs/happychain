import { GetNonce, GetState, Onchain, SubmitterError, computeBoopHash } from "@happy.tech/boop-sdk"
import type {
    Boop,
    BoopReceipt,
    ExecuteOutput,
    GetNonceOutput,
    GetStateOutput,
    SimulateOutput,
    SimulateSuccess,
} from "@happy.tech/boop-sdk"
import { Map2, Mutex, bigIntMax, bigIntMin, getProp, parseBigInt, stringify, tryCatchAsync } from "@happy.tech/common"
import type { Address, Hash, Hex } from "@happy.tech/common"
import {
    EIP1474InternalError,
    EIP1474InvalidInput,
    EIP1474LimitExceeded,
    EIP1474ResourceNotfound,
    EIP1474TransactionRejected,
    HappyRpcError,
    RevertRpcError,
} from "@happy.tech/wallet-common"
import { parseSignature, zeroAddress } from "viem"
import type { Log, TransactionEIP1559, TransactionReceipt } from "viem"
import { entryPoint } from "#src/constants/contracts"
import { type BoopCacheEntry, boopCache } from "#src/requests/utils/boopCache"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import { getBoopClient } from "#src/state/boopClient"
import { addPendingBoop, markBoopAsFailed, markBoopAsSuccess } from "#src/state/boopHistory"
import { getCurrentChain } from "#src/state/chains"
import type { AppURL } from "#src/utils/appURL"
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
async function getOnchainNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    const boopClient = getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")
    const results = await boopClient.getNonce({ address: account, nonceTrack })
    if (results.status !== GetNonce.Success) throw translateBoopError(results)
    return results.nonceValue
}

/**
 * Resets the nonce to the given value, unless the current local nonce is already lower.
 * We call this whenever a boop fails to be included onchain.
 *
 * If the {@link resync} flag is passed, then it will fetch the onchain nonce as well and will assign the nonce to that
 * if it is higher than what the normal result would be. This is used when there was an error and we don't know whether
 * the nonce made it onchain or not.
 */
async function downgradeNonce(
    account: Address,
    nonceTrack: bigint,
    nonceValue: bigint,
    resync?: "resync",
): Promise<void> {
    const mutex = nonceMutexes.getOrSet(account, nonceTrack, () => new Mutex())
    await mutex.locked(async () => {
        if (!resync) {
            const localNonce = nonces.get(account, nonceTrack)
            const newNonce = bigIntMin(nonceValue, localNonce ?? nonceValue)
            nonces.set(account, nonceTrack, newNonce)
        } else {
            const { value: onchainNonce, error } = await tryCatchAsync(getOnchainNonce(account, nonceTrack))
            if (error) {
                reqLogger.error("Error while fetching onchainNonce in resetNonce:", error)
                // Fallback to deleting the nonce entirely.
                deleteNonce(account, nonceTrack)
            } else {
                const localNonce = nonces.get(account, nonceTrack)
                const localNewNonce = bigIntMin(nonceValue, localNonce ?? nonceValue)
                nonces.set(account, nonceTrack, bigIntMax(localNewNonce, onchainNonce))
            }
        }
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
    simulation?: SimulateSuccess
    isSponsored?: boolean
    nonceTrack?: bigint
}

export async function sendBoop(
    { account, tx, simulation: sim, signer, isSponsored = true, nonceTrack = 0n }: SendBoopArgs,
    app: AppURL,
    retry = 0,
): Promise<Hash> {
    let boopHash: Hash | undefined = undefined
    let nonceNeedsReset = false
    let nonceNotConsumed = false
    let nonceValue = -1n

    try {
        const boopClient = getBoopClient()
        let boop = await boopFromTransaction(account, tx, app)
        nonceValue = boop.nonceValue

        let simulation = sim
        if (!isSponsored) {
            const output = simulation ?? (await boopClient.simulate({ entryPoint, boop }))
            reqLogger.trace("boop/simulate output", output)
            if (output.status !== Onchain.Success) throw translateBoopError(output)
            simulation = output

            boop = boopClient.updateBoopFromSimulation(boop, output)
        }

        if (simulation?.feeTooLowDuringSimulation && boop.maxFeePerGas)
            throw new EIP1474InvalidInput(
                `Specified gas price (${boop.maxFeePerGas} wei/gas) was too low at simulation time.`,
            )
        if (simulation?.feeTooHighDuringSimulation)
            throw new EIP1474InvalidInput(
                boop.maxFeePerGas
                    ? `Specified gas price (${boop.maxFeePerGas}) is higher than what the submitter is willing to accept.`
                    : "The network gas price is higher than what the submitter is willing to accept.",
            )

        boopHash = computeBoopHash(BigInt(getCurrentChain().chainId), boop)
        boopCache.putBoop(boopHash, boop)

        const signedBoop: Boop = { ...boop, validatorData: await signer(boopHash) }
        addPendingBoop(boopHash, signedBoop)
        const output = await boopClient.execute({ entryPoint, boop: signedBoop })
        reqLogger.trace("boop/execute output", output)

        // If the nonce is too low and the wallet is assigning it, we'll need a resync.
        nonceNeedsReset = !tx.nonce && output.status === Onchain.InvalidNonce

        if (output.status !== Onchain.Success) {
            nonceNotConsumed = true
            throw translateBoopError(output)
        }
        if (output.receipt.status !== Onchain.Success) {
            const status = output.receipt.status
            const error = output.receipt.description
            throw translateBoopError({ status, error })
        }
        markBoopAsSuccess(boopHash, output.receipt)
        boopCache.putReceipt(boopHash, output.receipt)
        return output.receipt.boopHash
    } catch (err) {
        reqLogger.trace(`boop submission failed — ${retry} attempts left`, err)

        // Reset nonce to an appropriate state.
        if (nonceValue === -1n) {
            // No nonce was consumed. Most likely `getOnchainNonce` failed. No need to do anything.
        } else if (!(err instanceof HappyRpcError)) {
            // This is not one of our errors. We don't know whether the boop is making it onchain or not, so we use
            // downgrade+resync (see comment string over there).
            void downgradeNonce(account, nonceTrack, nonceValue, "resync")
        } else if (nonceNeedsReset) {
            reqLogger.trace("boop nonce reset needed, deleting cached nonce")
            deleteNonce(account, nonceTrack)
        } else if (nonceNotConsumed) {
            downgradeNonce(account, nonceTrack, nonceValue)
        }

        // Try one more time if the last attempt failed due to a boop set by the wallet being too low.
        if (retry > 0 || (retry === 0 && nonceNeedsReset))
            return sendBoop({ account, tx, signer, isSponsored, nonceTrack }, app, retry - 1)

        if (boopHash) {
            // If the error is a translated boop error, extract its status & description.
            const isHappyRpcError = err instanceof HappyRpcError
            const status = (isHappyRpcError && getProp(err.cause, "status", "string")) || "nonBoopError"
            const error = (isHappyRpcError && getProp(err.cause, "description", "string")) || stringify(err)
            markBoopAsFailed(boopHash, status, error)
        }
        throw err
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

/**
 * Translates an Ethereum transaction that has been checked with {@link
 * checkedTx} into a boop. Supports both EIP1559 and legacy transactions.
 */
export async function boopFromTransaction(
    account: Address,
    tx: ValidRpcTransactionRequest,
    app: AppURL,
): Promise<Boop> {
    return {
        account: tx.from ?? account,
        dest: tx.to,
        payer: zeroAddress, // happyPaymaster, // TODO switch to paymaster
        value: parseBigInt(tx.value) ?? 0n,
        nonceTrack: 0n,
        nonceValue: parseBigInt(tx.nonce) ?? (await getNextNonce(account)),
        callData: tx.data ?? "0x",
        validatorData: "0x", // we will fill after signing
        extraData: createValidatorExtraData(account, tx.to, app),
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
export function formatTransactionReceipt(hash: Hash, receipt: BoopReceipt): TransactionReceipt & { boop: BoopReceipt } {
    return {
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        contractAddress: null,
        effectiveGasPrice: receipt.gasPrice,
        from: receipt.boop.account,
        gasUsed: BigInt(receipt.boop.gasLimit), // TODO incorrect, but ok enough approximation for now
        logs: receipt.logs as Log<bigint, number, false>[],
        status: receipt.status === Onchain.Success ? "success" : "reverted",
        to: receipt.boop.dest,
        transactionHash: hash,
        type: "eip1559",

        boop: receipt,

        // skipped fields
        cumulativeGasUsed: undefined as unknown as bigint,
        logsBloom: undefined as unknown as Hex,
        transactionIndex: 0,
    } satisfies TransactionReceipt & { boop: BoopReceipt }
}

/**
 * Given a boop and an optional receipt, returns an EIP1559-style transaction object, which is what is returned
 * for RPC calls to `eth_getTransactionByHash` when it is passed a boop hash.
 *
 * An optional simulation can also be passed, which can provide an estimation of `maxFeePerGas`.
 */
export function formatTransaction(
    hash: Hash,
    { boop: cachedBoop, receipt }: BoopCacheEntry,
    simulation?: SimulateSuccess,
): (TransactionEIP1559 & { boop?: BoopReceipt }) | null {
    const currentChain = getCurrentChain()
    const boop = receipt ? receipt.boop : cachedBoop

    // This is what eth_getTransactionByHash returns when a transaction is not found.
    if (!boop) return null

    return {
        hash,
        blockHash: receipt?.blockHash || null,
        blockNumber: receipt?.blockNumber || null,
        from: boop.account,
        to: boop.dest ?? null,
        gas: BigInt(boop.gasLimit ?? 0n),
        // The submitter might have specified one on the EVM tx, but that is not the user's concern.
        maxPriorityFeePerGas: 0n,
        maxFeePerGas: (boop.maxFeePerGas || simulation?.maxFeePerGas) ?? 0n,
        nonce: Number(boop.nonceValue ?? 0),
        input: boop.callData || "0x",
        value: boop.value ?? 0n,
        transactionIndex: null,
        type: "eip1559", // it's a boop, so we're just putting the most usual thing in here
        typeHex: "0x2",
        chainId: Number(currentChain.chainId),
        accessList: [], // no way to retrieve without access to submitter tx, not important
        // Parse signature values from validatorData if available
        ...safeParseSignature(boop?.validatorData),
        boop: receipt,
    } satisfies TransactionEIP1559 & { boop?: BoopReceipt }
}

type Outputs = ExecuteOutput | SimulateOutput | GetStateOutput | GetNonceOutput
function translateBoopError(output: Outputs): HappyRpcError {
    switch (output.status) {
        case Onchain.MissingValidationInformation:
        case Onchain.MissingGasValues:
        case Onchain.InvalidNonce:
        case Onchain.ExecuteRejected:
        case Onchain.InvalidExtensionValue:
        case Onchain.GasPriceTooLow:
        case SubmitterError.GasPriceTooHigh:
        case SubmitterError.InvalidValues:
        case SubmitterError.SubmitterFeeTooLow:
            return new EIP1474InvalidInput(output.error, output)
        case Onchain.ValidationRejected:
        case Onchain.PaymentValidationRejected:
        case Onchain.InsufficientStake:
        case Onchain.InvalidSignature:
        case Onchain.ExtensionAlreadyRegistered:
        case Onchain.ExtensionNotRegistered:
            return new EIP1474TransactionRejected(output.error, output)
        case Onchain.ExecuteReverted:
        case Onchain.CallReverted:
        case Onchain.ValidationReverted:
        case Onchain.PaymentValidationReverted:
        case Onchain.PayoutFailed:
        case Onchain.EntryPointOutOfGas:
        case Onchain.UnexpectedReverted:
        case SubmitterError.UnexpectedError:
            return new RevertRpcError(output.error, output)
        case SubmitterError.BufferExceeded:
        case SubmitterError.OverCapacity:
        case SubmitterError.NonceTooFarAhead:
            return new EIP1474LimitExceeded(output.error, output)
        case SubmitterError.SubmitTimeout:
        case SubmitterError.ReceiptTimeout:
        case SubmitterError.RpcError:
        case SubmitterError.ClientError:
        case SubmitterError.BoopReplaced:
        case SubmitterError.ExternalSubmit:
        case SubmitterError.AlreadyProcessing:
        case SubmitterError.TransactionManagementError:
        case GetNonce.Error:
            return new EIP1474InternalError(output.error, output)
        case GetState.UnknownState:
        case GetState.UnknownBoop:
            return new EIP1474ResourceNotfound(output.error, output)
        case GetNonce.Success:
        case Onchain.Success:
        case GetState.Receipt:
        case GetState.Simulated:
            return new EIP1474InternalError("Not an error — implementation bug", output)
        default: {
            const _: never = output // exhaustiveness check
            return null as unknown as HappyRpcError
        }
    }
}
