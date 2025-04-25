import { boopClient } from "#src/state/boopClient"
import {
    type Boop,
    type BoopReceipt,
    EXECUTE_SUCCESS,
    EntryPointStatus,
    type EstimateGasOutput,
    type ExecuteOutput,
    type Log,
    type Receipt,
    type SimulationOutput,
    type SubmitStatus,
    SubmitterErrorStatus,
    computeBoopHash,
} from "@happy.tech/boop-sdk"
import { Map2, Mutex } from "@happy.tech/common"
import type { Address, Hash, Hex, TransactionEIP1559 } from "viem"
import { entryPoint, entryPointAbi, happyPaymaster } from "#src/constants/contracts"
import { reqLogger } from "#src/logger"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import { type BlockParam, parseBlockParam } from "#src/requests/utils/eip1474"
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
    retry = 2,
): Promise<Hash> {
    let boopHash: Hash | undefined = undefined
    const value = tx.value ? BigInt(tx.value) : 0n

    try {
        const boop = await boopFromTransaction(account, tx)

        if (!isSponsored) {
            const output = (await boopClient.simulate({ entryPoint, tx: boop })).unwrap()

            if (output.status === EntryPointStatus.Success) {
                boop.gasLimit = BigInt(output.gasLimit)
                boop.validateGasLimit = BigInt(output.validateGasLimit)
                boop.validatePaymentGasLimit = BigInt(output.validatePaymentGasLimit)
                boop.executeGasLimit = BigInt(output.executeGasLimit)
                boop.maxFeePerGas = BigInt(output.maxFeePerGas)
                boop.submitterFee = BigInt(output.submitterFee)
            } else {
                // TODO which error?
                throw new BoopSimulationError(output)
            }
        }

        boopHash = computeBoopHash(BigInt(getCurrentChain().chainId), boop)
        const signedBoop: Boop = { ...boop, validatorData: await signer(boopHash) }
        addPendingBoop(account, { boopHash, value })
        const output = (await boopClient.execute({ entryPoint, tx: signedBoop })).unwrap()

        if (output.status === EXECUTE_SUCCESS) {
            markBoopAsConfirmed(account, value, output)
            // TODO better flow typing?
            return output.state.receipt!.boopHash
        } else {
            throw new BoopExecutionError(output)
        }
    } catch (error) {
        reqLogger.info(`boop submission failed — ${retry} attempts left`, error)
        deleteNonce(account, nonceTrack)
        if (retry > 0) return sendBoop({ account, tx, signer, isSponsored }, retry - 1)
        if (boopHash) markBoopAsFailed(account, { value, boopHash })
        throw error
    }
}

export async function boopFromTransaction(account: Address, tx: ValidRpcTransactionRequest): Promise<Boop> {
    // TODO bigint casts need validation
    return {
        account: tx.from,
        dest: tx.to,
        payer: happyPaymaster,
        value: tx.value ? BigInt(tx.value) : 0n,
        nonceTrack: 0n,
        nonceValue: tx.nonce ? BigInt(tx.nonce) : await getNextNonce(account),
        callData: tx.data ?? "0x",
        validatorData: "0x", // we will fill after signing
        extraData: "0x", // TODO

        // For sponsored boops, gas & limits will be filled by the submitter.
        // For self-paying boops, we will fill this after calling `simulate`.
        maxFeePerGas: 0n,
        submitterFee: 0n,
        gasLimit: 0n,
        validateGasLimit: 0n,
        validatePaymentGasLimit: 0n,
        executeGasLimit: 0n,
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
        status: receipt.status === EntryPointStatus.Success ? "success" : "reverted",
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
export function formatTransaction(hash: Hash, boop?: Boop, receipt?: BoopReceipt): TransactionEIP1559 {
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
        maxFeePerGas: boop?.maxFeePerGas ?? receipt?.txReceipt.effectiveGasPrice,
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

// TODO expose these from the submitter

// TODO needs a better key type
// biome-ignore format: consistency
const boopErrorMessages: Record<SubmitStatus | EntryPointStatus | SubmitterErrorStatus, string> = {
    // TODO names should change: s/Failed/Rejected
    [SubmitterErrorStatus.UnexpectedError]:
        "The submitter failed with an unexpected error.",
    [SubmitterErrorStatus.BufferExceeded]:
        "The submitter rejected the request because of its boop buffering policies.",
    [SubmitterErrorStatus.OverCapacity]:
        "The submitter rejected the request because it is over capacity.",

    // TODO the following three are not in the ExecuteOutput.status type, but they should be
    [SubmitterErrorStatus.SimulationTimeout]:
        "The RPC simulation call (or related RPC call) timed out.",
    [SubmitterErrorStatus.SubmitTimeout]:
        "The RPC submit call (or related RPC call) timed out.",
    [SubmitterErrorStatus.ReceiptTimeout]:
        "Timed out while waiting for a receipt. This could indicate that the submitter tx is stuck in the mempool or an RPC issue.",

    [EntryPointStatus.ValidationReverted]:
        "The account validation of the boop reverted. This indicates either a dysfunctional account or a dysfunctional submitter.",
    [EntryPointStatus.ValidationFailed]:
        "The account rejected the boop.",
    [EntryPointStatus.ExecuteReverted]:
        "The account's `execute` call reverted. This indicates either a dysfunctional account or a dysfunctional submitter.",
    [EntryPointStatus.ExecuteFailed]:
        "The account's `execute` function returned indicate a failure. This is typically caused by an incorrect input from the user.",
    [EntryPointStatus.CallReverted]:
        "The call made by the account's `execute` function reverted.",
    [EntryPointStatus.PaymentValidationReverted]:
        "The paymaster's `validatePayment` call reverted. This indicates either a dysfunctional paymaster or a dysfunctional submitter.",
    [EntryPointStatus.PaymentValidationFailed]:
        "The paymaster rejected the boop.",
    [EntryPointStatus.PayoutFailed]:
        "When self-paying and the payment from the account fails, either because IAccount.payout reverts, consumes too much gas, or does not transfer the full cost to the submitter.",
    [EntryPointStatus.UnexpectedReverted]:
        "Unexpected revert of the submission, most likely out-of-gas.",

    // not used, there for type completeness
    [EXECUTE_SUCCESS]: "success",
    [EntryPointStatus.Success]: "success",
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
    constructor(public readonly output: EstimateGasOutput) {
        super(boopErrorMessages[output.status])
    }
}
