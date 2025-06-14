import { Stream, bigIntMax, bigIntMin, getProp, sleep, tryCatchAsync } from "@happy.tech/common"
import type { Account, Hash } from "viem"
import { env } from "#lib/env"
import { blockService } from "#lib/services"
import { publicClient, walletClient } from "#lib/utils/clients"
import { getFees } from "#lib/utils/gas"
import { resyncLogger } from "#lib/utils/logger"
import { accountDeployer, executorAccounts } from "./evmAccounts"

/**
 * Resyncs all accounts so that their "included nonce" matches their "pending nonce".
 */
export async function resyncAllAccounts(): Promise<void> {
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
export async function resyncAccount(account: Account, recheck?: "recheck") {
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
            const delay = Math.max(maxDelay, initialDelay * 2 ** attempt++)
            resyncLogger.error(`Error during resync routine, waiting ${delay}ms and retrying`, error)
            await sleep(delay)
        }
    }
    let included = included_
    const pending = pending_

    // === Setup subscription to nonce, to be fetched every block ===

    const nonceStream = new Stream<number>()
    const unsubscribe = blockService.onBlock(async () => {
        const { value, error } = await tryCatchAsync<number, Error>(publicClient.getTransactionCount({ address }))
        if (error) {
            resyncLogger.error("Error fetching nonce", address, error)
        } else {
            nonceStream.push(value)
        }
    })

    // === Send cancel transactions until included nonce catches up with pending nonce ===

    function getMinFee() {
        // The block did not have fee info. This will probably never happen, pick 1000 wei as an arbitrary starting point
        // for now. TODO fix this in the block service
        const { minBlockFee } = getFees()
        return minBlockFee ?? 1000n
    }

    function updateGasPrice(): void {
        maxPriorityFeePerGas = bigIntMin(env.MAX_PRIORITY_FEE, maxPriorityFeePerGas * 2n)
        const minFee = getMinFee() - env.INITIAL_PRIORITY_FEE + maxPriorityFeePerGas
        maxFeePerGas = bigIntMin(env.MAX_BASEFEE, bigIntMax(minFee, maxFeePerGas * 2n))
        resyncLogger.trace(`Updated fees: maxFeePerGas=${maxFeePerGas}, maxPriorityFeePerGas=${maxPriorityFeePerGas}`)
    }

    // Start with double the current base fee (+ margin) & base priority fee.
    // It's okay to go big on the base fee since the excess is refunded.
    // For the priority fee, at 15% bump rate (the default), it would take 5 retries for it to exceed doubling.
    let maxFeePerGas = bigIntMin(env.MAX_BASEFEE, getMinFee() * 2n)
    let maxPriorityFeePerGas = env.INITIAL_PRIORITY_FEE
    attempt = 0

    while (true) {
        try {
            resyncLogger.info(`Resyncing account ${address}, included: ${included}, pending: ${pending}`)

            // Fire off all the replacement transactions
            const promises: Promise<Hash>[] = []
            for (let nonce = included; nonce < pending; nonce++)
                promises.push(
                    walletClient.sendTransaction({
                        account,
                        to: account.address,
                        value: 0n,
                        gas: 21_000n,
                        nonce,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                    }),
                )
            await Promise.all(promises)

            while (true) {
                // Wait for next nonce or timeout.
                const nonce = await Promise.race([nonceStream.consume(), sleep(env.RECEIPT_TIMEOUT)])
                if (!nonce) break
                if (nonce > included)
                    resyncLogger.trace(`Resyncing account (2) ${address}, included: ${included}, pending: ${pending}`)
                included = nonce
                if (included >= pending) {
                    resyncLogger.info("Resync complete", account)
                    unsubscribe()
                    // Optionally recheck that the pending nonce didn't move forward while we resynced.
                    if (recheck) await resyncAccount(account) // no "recheck", so no infinite recursion
                    return
                }
            }
            resyncLogger.trace(`Resyncing account (3) ${address}, included: ${included}, pending: ${pending}`)
        } catch (error) {
            const msg = getProp(error, "message", "string")
            const underpriced = msg?.includes("replacement") || msg?.includes("underpriced")
            const alreadyKnown = msg?.includes("transaction already imported")
            const priceMaxedOut = maxFeePerGas >= env.MAX_BASEFEE && maxPriorityFeePerGas >= env.MAX_PRIORITY_FEE

            const delay = Math.max(maxDelay, initialDelay * 2 ** attempt++)
            if (!underpriced && !alreadyKnown)
                resyncLogger.error(`Error during resync routine, waiting ${delay}ms and retrying`, error)

            if (priceMaxedOut) {
                // TODO: It's possible that this is due to the current network base fee exceeding our max, rather than
                //       the stuck txs being higher. For now we just keep looping, maybe the base fee will reduce.
                const msg =
                    "Reached max base fee and max priority fee and couldn't close nonce gap. " +
                    `Wating ${delay}ms and retrying. ` +
                    `Latest nonce: ${included}, Pending nonce: ${pending}`
                resyncLogger.warn(msg)
                // TODO alerting
            } else {
                updateGasPrice()
            }

            // Don't sleep if the transaction is underpriced and we haven't maxxed out the gas price yet.
            if (!underpriced || priceMaxedOut) await sleep(delay)
        }
    } // end while loop
}
