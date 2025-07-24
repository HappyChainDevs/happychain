import { Stream, bigIntMax, bigIntMin, getProp, sleep, tryCatchAsync } from "@happy.tech/common"
import type { Account, Hash } from "viem"
import { env } from "#lib/env"
import { blockService } from "#lib/services"
import { traceFunction } from "#lib/telemetry/traces"
import { getFees, getLatestBaseFee } from "#lib/utils/gas"
import { resyncLogger } from "#lib/utils/logger"
import { publicClient, walletClient } from "./clients"
import { accountDeployer, executorAccounts } from "./evmAccounts"

// TODO Most of this is based upon the incorrect assumption that `getBlock({ block: "pending" }) would return
//      the nonce inclusive all transactions pending in the mempool. In reality, it only returns
//      transactions considered by the node for inclusion in the next block.
//      To achieve the effect we want, we need to leverage the `txpool_contentFrom` special RPC call.
//
//      If not available, things will still work given our replacement logic in `replaceTransaction.ts`.
//      However, transactions with identical nonces will risk failing, either because they don't meet the
//      fee bar for replacement, or because the old transactions did include instead of the new ones.

/**
 * Resyncs all accounts so that their "included nonce" matches their "pending nonce".
 */
async function resyncAllAccounts(): Promise<void> {
    resyncLogger.info("Startup: resyncing all accounts")
    let accounts: Account[] = executorAccounts
    if (!accounts.map((it) => it.address).includes(accountDeployer.address)) accounts = [accountDeployer, ...accounts]
    await Promise.all(accounts.map((account) => resyncAccount(account, "recheck")))
    resyncLogger.info("Completed startup account resync")
}

/**
 * Resyncs the given account so that its "included nonce" matches its "pending nonce". If {@link
 * recheck} is provided, will re-query the pending nonce after resyncing to check if it didn't move
 * ahead or if the initial pending nonce wasn't outdated, and if so will resync again (just once).
 */
async function resyncAccount(account: Account, recheck?: "recheck") {
    const address = account.address
    const initialDelay = 500
    const maxDelay = 8000
    let attempt = 0

    // === Get initial included and pending nonces ===

    let included_: number | null = null
    let pending_: number | null = null
    while (true) {
        try {
            included_ = await publicClient.getTransactionCount({ address })
            pending_ = await publicClient.getTransactionCount({ address, blockTag: "pending" })
            if (included_ >= pending_) return
            break
        } catch (error) {
            const delay = Math.min(maxDelay, initialDelay * 2 ** attempt++)
            resyncLogger.error(`Error during resync routine, waiting ${delay}ms and retrying`, error)
            await sleep(delay)
        }
    }
    // separate so that they can have proper type in the closure below
    let included = included_
    const pending = pending_

    // === Setup subscription to nonce, to be fetched every block ===

    const nonceStream = new Stream<number | undefined>()
    const unsubscribe = blockService.onBlock(async () => {
        const { value, error } = await tryCatchAsync<number, Error>(publicClient.getTransactionCount({ address }))
        if (error) resyncLogger.error("Error fetching nonce", address, error)
        nonceStream.push(value)
    })

    // === Helpers ====

    function updateGasPrice(): void {
        maxPriorityFeePerGas = bigIntMin(env.MAX_PRIORITY_FEE, maxPriorityFeePerGas * 2n)
        const { minBlockFee } = getFees()
        const minFee = minBlockFee - env.INITIAL_PRIORITY_FEE + maxPriorityFeePerGas
        maxFeePerGas = bigIntMin(env.MAX_BASEFEE, bigIntMax(minFee, maxFeePerGas * 2n))
        resyncLogger.trace(`Updated fees: maxFeePerGas=${maxFeePerGas}, maxPriorityFeePerGas=${maxPriorityFeePerGas}`)
    }

    /**
     * Wait for the account nonce, delivered every block.
     * Returns true iff the nonce exceeds or equals the replaced tx nonce.
     */
    async function waitForNonce(): Promise<boolean> {
        const nonce = await nonceStream.consume()
        if (nonce) {
            if (nonce >= included) included = nonce
            else resyncLogger.warn(`Included nonce went down from ${included} to ${nonce}, possible re-org.`)
        }
        if (included >= pending) {
            resyncLogger.info("Resync complete", account)
            unsubscribe()
            // Optionally recheck that the pending nonce didn't move forward while we resynced.
            if (recheck) await resyncAccount(account) // no "recheck", so no infinite recursion
            return true
        }
        return false
    }

    // === Send cancel transactions until included nonce catches up with pending nonce ===

    // Start with double the current base fee (+ margin) & base priority fee.
    // It's okay to go big on the base fee since the excess is refunded.
    // For the priority fee, at 15% bump rate (the default), it would take 5 retries for it to exceed doubling.
    const { minBlockFee } = getFees()
    let maxFeePerGas = bigIntMin(env.MAX_BASEFEE, minBlockFee * 2n)
    let maxPriorityFeePerGas = env.INITIAL_PRIORITY_FEE
    attempt = 0

    while (true) {
        resyncLogger.info(`Resyncing account ${address}, included: ${included}, pending: ${pending}`)

        const block = blockService.getCurrentBlock()
        const gasUsed = block.gasUsed ?? 0n
        const gasLimit = block.gasLimit ?? 2n ** 50n // 1 petagas — implausibly high
        const blockBaseFee = getLatestBaseFee()
        const baseFeeTooHigh = blockBaseFee > env.MAX_BASEFEE
        const blockFull = gasUsed > gasLimit
        const priceMaxedOut = maxFeePerGas >= env.MAX_BASEFEE && maxPriorityFeePerGas >= env.MAX_PRIORITY_FEE

        if (baseFeeTooHigh || blockFull || priceMaxedOut) {
            resyncLogger.trace("Waiting for fees to come down.")
            if (await waitForNonce()) return
            continue
        }

        try {
            // Fire off all the replacement transactions.
            const promises: Promise<Hash>[] = []
            for (let nonce = included; nonce < pending; nonce++)
                // biome-ignore format: terse
                promises.push(walletClient.sendTransaction({
                    account, to: account.address, value: 0n, gas: 21_000n, nonce, maxFeePerGas, maxPriorityFeePerGas,
                }))
            await Promise.all(promises)
            while (true) if (await waitForNonce()) return
        } catch (error) {
            updateGasPrice()
            const msg = getProp(error, "message", "string")
            const underpriced = msg?.includes("replacement") || msg?.includes("underpriced")
            if (underpriced) continue
            const delay = Math.max(maxDelay, initialDelay * 2 ** attempt++)
            resyncLogger.error(`Error during resync routine, waiting ${delay}ms and retrying`, error)
            await sleep(delay)
        }
    }
}

const traceResyncAllAccounts = traceFunction(resyncAllAccounts, "resyncAllAccounts")
export { traceResyncAllAccounts as resyncAllAccounts }

const tracedResyncAccount = traceFunction(resyncAccount, "resyncAccount")
export { tracedResyncAccount as resyncAccount }
