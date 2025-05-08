import {
    type Boop,
    type BoopReceipt,
    type ExecuteOutput,
    type Log,
    Onchain,
    type Receipt,
    type SimulateOutput,
    type SimulateSuccess,
    type SubmitStatus,
    SubmitterError,
    computeBoopHash,
} from "@happy.tech/boop-sdk"
import { Map2, Mutex } from "@happy.tech/common"
import { type Address, type Hash, type Hex, type TransactionEIP1559, zeroAddress } from "viem"
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
            if (output.status !== Onchain.Success) {
                // TODO which error?
                throw new BoopSimulationError(output)
            }

            boop.gasLimit = output.gas
            boop.validateGasLimit = output.validateGas
            boop.validatePaymentGasLimit = output.validatePaymentGas
            boop.executeGasLimit = output.executeGas
            boop.maxFeePerGas = output.maxFeePerGas
            boop.submitterFee = output.submitterFee
        }

        boopHash = computeBoopHash(BigInt(getCurrentChain().chainId), boop)
        const signedBoop: Boop = { ...boop, validatorData: await signer(boopHash) }
        addPendingBoop({ boopHash, value })
        const output = await boopClient.execute({ entryPoint, boop: signedBoop })
        reqLogger.trace("boop/execute output", output)

        if (output.status !== Onchain.Success) throw new BoopExecutionError(output)
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
        // For sponsored boops, gas & limits will be filled by the submitter.
        // For self-paying boops, we will fill this after calling `simulate`.
        maxFeePerGas: 0n,
        submitterFee: 0n,
        gasLimit: 0,
        validateGasLimit: 0,
        validatePaymentGasLimit: 0,
        executeGasLimit: 0,
    }
}

/**
 * Format a boop receipt in a transaction receipt returned by `eth_getTransactionReceipt`
 */
export function formatTransactionReceipt(hash: Hash, receipt: BoopReceipt): Receipt {
    return {
        blockHash: receipt.txReceipt.blockHash,
        blockNumber: receipt.txReceipt.blockNumber,
        contractAddress: receipt.txReceipt.contractAddress,
        cumulativeGasUsed: receipt.txReceipt.cumulativeGasUsed,
        effectiveGasPrice: receipt.txReceipt.effectiveGasPrice,
        from: receipt.account,
        gasUsed: receipt.gasUsed,
        logs: receipt.logs as Log[], // TODO parse boop logs
        logsBloom: receipt.txReceipt.logsBloom,
        status: receipt.status === Onchain.Success ? "success" : "reverted",
        to: "0x0", // TODO include Boop inside receipt and read from there
        transactionHash: hash,
        transactionIndex: receipt.txReceipt.transactionIndex,
        type: receipt.txReceipt.type,
        boop: receipt,
    } as Receipt
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
        hash,
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
        transactionIndex: receipt?.txReceipt?.transactionIndex || null,
        type: "eip1559", // it's a boop, so we're just putting the most usual thing in here
        typeHex: "0x2",
        chainId: Number(currentChain.chainId),
        accessList: [], // no way to retrieve without access to submitter tx, not important
        // TODO Parse signature values (r, s, v) and extract proper yParity value from validatorData
        //      https://linear.app/happychain/issue/HAPPY-490/
        r: "0x0",
        s: "0x0",
        v: 0n,
        yParity: 0,
        boop: receipt,
    } as TransactionEIP1559
}

// === ERROR HANDLING ==================================================================================================

// TODO: expose these from the submitter

// TODO: needs a better key type
// biome-ignore format: consistency
const boopErrorMessages: Record<SubmitStatus, string> = {
    [SubmitterError.UnexpectedError]:
    "The submitter failed with an unexpected error.",
    [SubmitterError.ClientError]:
        "The submitter could not be accessed due to a client-side error.",
    [SubmitterError.BufferExceeded]:
        "The submitter rejected the request because of its boop buffering policies.",
    [SubmitterError.OverCapacity]:
        "The submitter rejected the request because it is over capacity.",

    // TODO: the following three are not in the ExecuteOutput.status type, but they should be
    [SubmitterError.SimulationTimeout]:
        "The RPC simulation call (or related RPC call) timed out.",
    [SubmitterError.SubmitTimeout]:
        "The RPC submit call (or related RPC call) timed out.",
    [SubmitterError.ReceiptTimeout]:
        "Timed out while waiting for a receipt. This could indicate that the submitter tx is stuck in the mempool or an RPC issue.",

    [SubmitterError.RpcError]: "Error from the submitter node's JSON-RPC server.",
    [SubmitterError.InvalidGasValues]: "Invalid gas values.",

    [Onchain.ValidationReverted]:
        "The account validation of the boop reverted. This indicates either a dysfunctional account or a dysfunctional submitter.",
    [Onchain.ValidationRejected]:
        "The account rejected the boop.",
    [Onchain.ExecuteReverted]:
        "The account's `execute` call reverted. This indicates either a dysfunctional account or a dysfunctional submitter.",
    [Onchain.ExecuteRejected]:
        "The account's `execute` function returned indicate a failure. This is typically caused by an incorrect input from the user.",
    [Onchain.CallReverted]:
        "The call made by the account's `execute` function reverted.",
    [Onchain.PaymentValidationReverted]:
        "The paymaster's `validatePayment` call reverted. This indicates either a dysfunctional paymaster or a dysfunctional submitter.",
    [Onchain.PaymentValidationRejected]:
        "The paymaster rejected the boop.",
    [Onchain.PayoutFailed]:
        "When self-paying and the payment from the account fails, either because IAccount.payout reverts, consumes too much gas, or does not transfer the full cost to the submitter.",
    [Onchain.ExtensionAlreadyRegistered]:
        "The extension has already been registered.",
    [Onchain.ExtensionNotRegistered]:
        "The extension has not been registered.",   
    [Onchain.UnexpectedReverted]:
        "Unexpected revert of the submission, most likely out-of-gas.",

    // not used, there for type completeness
    [Onchain.Success]: "success",


    [Onchain.MissingValidationInformation]: "The boop passes simulation but can't be submitted onchain because either validation or payment validation has indicated that the status is unknown during validation",
    [Onchain.GasPriceTooHigh]: "The boop got rejected because the gas price was above the maxFeePerGas.",
    [Onchain.InvalidNonce]: "The nonce provided was invalid outside of simulation.",
    [Onchain.InsufficientStake]: "The submitter or paymaster has insufficient stake.",
    [Onchain.InvalidSignature]: "The account or the paymaster rejected the boop because of an invalid signature.",
    [Onchain.InvalidExtensionValue]: "The account or the paymaster rejected the boop because an extension value in the extraData is invalid.",

    [Onchain.EntryPointOutOfGas]: "The boop was included onchain but ran out of gas. If the transaction is self-paying, " +
        "this can indicate a `payout` function that consumes more gas during execution than during simulation.",
}

/**
 * Thrown to report to the user the failure of a boop sent to {@link execute} to be successfully executed onchain.
 */
export class BoopExecutionError extends Error {
    constructor(public readonly output: ExecuteOutput) {
        super(boopErrorMessages[output.status])
    }
}

export class BoopSimulationError extends Error {
    constructor(public readonly output: SimulateOutput) {
        super(boopErrorMessages[output.status])
    }
}
