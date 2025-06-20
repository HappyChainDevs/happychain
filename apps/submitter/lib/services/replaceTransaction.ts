import { Stream, getProp, sleep, tryCatchAsync } from "@happy.tech/common"
import type { Account } from "viem/accounts"
import { env } from "#lib/env"
import { blockService, evmNonceManager } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces"
import type { EvmTxInfo } from "#lib/types"
import { isNonceTooLowError, publicClient, walletClient } from "#lib/utils/clients"
import { getFees } from "#lib/utils/gas"
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
    const MAX_ATTEMPTS = 15 // Limit total attempts to avoid infinite loops
    let attempt = 0

    // Immediately check the current nonce before proceeding, and start with the current confirmed nonce
    let included = await publicClient.getTransactionCount({ address, blockTag: "latest" })
    if (included >= nonce) {
        logger.info(`Nonce ${nonce} for ${address} is already confirmed`)
        return
    }

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
        if (attempt >= MAX_ATTEMPTS) {
            logger.error(`Failed to replace transaction for ${address} at nonce ${nonce}`)
            return
        }

        const latestNonce = await publicClient.getTransactionCount({ address, blockTag: "latest" })
        if (latestNonce > included) included = latestNonce

        if (included >= nonce) {
            logger.info(`Nonce ${nonce} for ${address} is now confirmed`)
            return
        }

        const block = blockService.getCurrentBlock()
        const gasUsed = block.gasUsed ?? 0n
        const gasLimit = block.gasLimit ?? 2n ** 50n // 1 petagas — implausibly high
        const blockFull = gasUsed > gasLimit

        // Use original tx gas values directly and apply more aggressive bumping based on attempt number
        const feeMultiplier = Math.min(3.0, 1.2 + attempt * 0.3)

        // Use the original transaction's fees directly as a starting point
        const basePriorityFee = evmTxInfo.maxPriorityFeePerGas
        const baseFee = evmTxInfo.maxFeePerGas - basePriorityFee

        const newPriorityFee = BigInt(Math.floor(Number(basePriorityFee) * feeMultiplier))
        const newBaseFee = BigInt(Math.floor(Number(baseFee) * feeMultiplier))

        let fees = {
            maxPriorityFeePerGas: newPriorityFee,
            maxFeePerGas: newBaseFee + newPriorityFee,
        }

        // If our calculated fees exceed maximum configured fee, fall back to getFees
        if (fees.maxFeePerGas > env.MAX_BASEFEE) {
            const feeResult = getFees(undefined, evmTxInfo)
            fees = feeResult.fees
            if (feeResult.error) {
                logger.warn(`Fee calculation error during replacement attempt ${attempt}:`, feeResult.error)
            }
        }

        logger.trace(
            `Replacement attempt ${attempt} for nonce ${nonce}: using fee multiplier ${feeMultiplier.toFixed(2)}`,
        )
        if (blockFull) {
            // Wait for blocks to stop being full then recheck.
            if (await waitForNonce()) return
            continue
        }

        try {
            const hash = await walletClient.sendTransaction({
                account,
                to: account.address,
                value: 0n,
                gas: 22_000n,
                nonce,
                ...fees,
            })
            evmTxInfo = { nonce, ...fees }
            logger.info(`Sent replacement tx ${hash} for ${account.address} at nonce ${nonce}`)
            while (true) if (await waitForNonce()) return
        } catch (error) {
            if (isNonceTooLowError(error)) {
                // Immediately check the current nonce
                const confirmedNonce = await publicClient.getTransactionCount({ address, blockTag: "latest" })
                included = Math.max(included, confirmedNonce)

                if (confirmedNonce >= nonce) {
                    logger.trace(
                        `Nonce ${nonce} for ${address} is already confirmed (detected from nonce too low error)`,
                    )
                    return
                }

                // Also try the nonce manager's resync
                const newNonce = await evmNonceManager.resyncIfTooLow(account.address)
                if (newNonce && newNonce >= evmTxInfo.nonce) {
                    logger.trace(`Nonce ${nonce} for ${address} is confirmed after resync (new nonce: ${newNonce})`)
                    return
                }
            }
            const msg = getProp(error, "message", "string")
            const underpriced = msg?.includes("replacement") || msg?.includes("underpriced")
            if (underpriced) continue // don't wait
            attempt++

            const delay = Math.min(maxDelay, initialDelay * 2 ** attempt)
            logger.warn(`Error during replacement (attempt ${attempt}/${MAX_ATTEMPTS}), waiting ${delay}ms`)
            await sleep(delay)
        }
    }
}

const tracedReplaceTransaction = traceFunction(replaceTransaction, "replaceTransaction")
export { tracedReplaceTransaction as replaceTransaction }
