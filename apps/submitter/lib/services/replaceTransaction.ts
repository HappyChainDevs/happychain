import { Stream, getProp, sleep, tryCatchAsync } from "@happy.tech/common"
import type { Account } from "viem/accounts"
import { env } from "#lib/env"
import { blockService, evmNonceManager } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces"
import type { EvmTxInfo } from "#lib/types"
import { isNonceTooLowError, publicClient, walletClient } from "#lib/utils/clients"
import { getFees, getLatestBaseFee } from "#lib/utils/gas"
import { logger } from "#lib/utils/logger"

// TODO: use this in BoopReceiptService
// TODO: can we unify this with resync, with a function that operates on [low, high] nonce range?
//       could we then also attempt to coalesce adjacent nonce transaction cancellations?

/**
 * Replaces a single stuck transaction for an account by submitting a zero-value self-transaction
 * with incrementally higher gas fees. This is a more focused version of the resync service that
 * only targets a single nonce (useful for account creation or other specific transactions).
 */
async function replaceTransaction(account: Account, evmTxInfo: Omit<EvmTxInfo, "evmTxHash">): Promise<void> {
    const address = account.address
    const nonceStream = new Stream<number | undefined>()
    const unsubscribe = blockService.onBlock(async () => {
        const { value, error } = await tryCatchAsync<number, Error>(publicClient.getTransactionCount({ address }))
        if (error) logger.warn("Error fetching nonce", address, error)
        nonceStream.push(value)
    })

    try {
        // This shouldn't throw, but safety first.
        replaceInternal(account, evmTxInfo, nonceStream)
    } finally {
        unsubscribe()
    }
}

async function replaceInternal(
    account: Account,
    evmTxInfo: Omit<EvmTxInfo, "evmTxHash">,
    nonceStream: Stream<number | undefined>,
): Promise<void> {
    const address = account.address
    const nonce = evmTxInfo.nonce
    const initialDelay = 500
    const maxDelay = 8000
    let attempt = 0
    let included = 0 // current included nonce — okay to start at 0

    // TODO We don't really handle re-orgs here and might end up spinning forever.
    //      Not an urgent problem: OP stacks don't re-org unless there is a catastrophe.
    //      Possible mitigations:
    //      - bail if the nonce of the transaction to replace is no longer pending
    //      - global re-org detection and `resync`, cancelling any stale `replaceTransaction`

    /**
     * Wait for the account nonce, delivered every block.
     * Returns true iff the nonce exceeds or equals the replaced tx nonce.
     */
    async function waitForNonce(): Promise<boolean | undefined> {
        const receivedNonce = await nonceStream.consume()
        if (receivedNonce) {
            if (receivedNonce >= included) included = receivedNonce
            else logger.error(`Included nonce went down from ${included} to ${receivedNonce}, possible re-org.`)
        }
        if (included >= nonce) {
            logger.info(`Transaction replacement successful for ${address} at nonce ${receivedNonce}`)
            return true
        }
        return false
    }

    while (true) {
        const block = blockService.getCurrentBlock()
        const gasUsed = block.gasUsed ?? 0n
        const gasLimit = block.gasLimit ?? 2n ** 50n // 1 petagas — implausibly high
        const blockBaseFee = getLatestBaseFee()
        const baseFeeTooHigh = blockBaseFee > env.MAX_BASEFEE
        const blockFull = gasUsed > gasLimit
        const { fees, error } = getFees({ cancellingFor: address }, evmTxInfo)
        if (baseFeeTooHigh || blockFull || error) {
            // Wait for basefee to come down or blocks to stop being full then recheck.
            if (await waitForNonce()) return
            continue
            // NOTE: `error` signifies we've exceeded some max, and we know here that if it triggers the `if`,
            // then the replacement bump is the cause and we can't bump enough to replace the tx.
        }

        try {
            const hash = await walletClient.sendTransaction({
                account,
                to: account.address,
                value: 0n,
                gas: 21_000n,
                nonce,
                ...fees,
            })
            evmTxInfo = { nonce, ...fees }
            logger.info(`Sent replacement tx ${hash} for ${account} at nonce ${nonce}`)
            while (true) if (await waitForNonce()) return
        } catch (error) {
            if (isNonceTooLowError(error)) {
                const newNonce = await evmNonceManager.resyncIfTooLow(account.address)
                if (newNonce && newNonce >= evmTxInfo.nonce) return
            }
            const msg = getProp(error, "message", "string")
            const underpriced = msg?.includes("replacement") || msg?.includes("underpriced")
            if (underpriced) continue // don't wait
            const delay = Math.min(maxDelay, initialDelay * 2 ** attempt++)
            logger.warn(`Error during replacement, waiting ${delay}ms before retry`, address, nonce, error)
            await sleep(delay)
        }
    }
}

const tracedReplaceTransaction = traceFunction(replaceTransaction, "replaceTransaction")
export { tracedReplaceTransaction as replaceTransaction }
