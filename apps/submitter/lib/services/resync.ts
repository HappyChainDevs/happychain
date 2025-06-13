import { Stream, bigIntMax, bigIntMin, getProp, sleep, tryCatchAsync } from "@happy.tech/common"
import type { Account, Hash } from "viem"
import { env } from "#lib/env"
import { blockService } from "#lib/services"
import { publicClient, walletClient } from "#lib/utils/clients"
import { getLastBaseFee, getMinFee } from "#lib/utils/gas"
import { resyncLogger } from "#lib/utils/logger"
import { accountDeployer, executorAccounts } from "./evmAccounts"

type ResyncOptions = {
    /** Target nonce to sync up to. If not provided, will use pending nonce from the network */
    targetNonce?: number
    /** Whether to verify nonce alignment after completing sync */
    resync?: boolean
}

/**
 * Resyncs all accounts so that their "included nonce" matches their "pending nonce".
 */
export async function resyncAllAccounts(): Promise<void> {
    resyncLogger.info("Startup: resyncing all accounts")
    let accounts: Account[] = executorAccounts
    if (!accounts.map((it) => it.address).includes(accountDeployer.address)) accounts = [accountDeployer, ...accounts]
    await Promise.all(accounts.map((account) => resyncAccount(account, { resync: true })))
    resyncLogger.info("Completed startup account resync")
}

/**
 * Resyncs the given account so that its "included nonce" matches its "pending nonce",
 * or a specific target nonce provided in {@link targetNonce}.
 *
 * If {@link resync} is true, will re-query the pending nonce after resyncing to check if it didn't move
 * ahead or if the initial pending nonce wasn't outdated, and if so will resync again (just once).
 */
export async function resyncAccount(account: Account, { targetNonce, resync }: ResyncOptions): Promise<void> {
    const address = account.address
    const initialDelay = 500
    const maxDelay = 8000

    let attempt = 0
    let included: number
    let pending: number

    while (true) {
        try {
            included = await publicClient.getTransactionCount({ address })
            pending = targetNonce ?? (await publicClient.getTransactionCount({ address, blockTag: "pending" }))
            if (included >= pending) {
                resyncLogger.trace(`Account ${address} already synced (${included} >= ${pending})`)
                return
            }
            break
        } catch (error) {
            const delay = Math.min(maxDelay, initialDelay * 2 ** attempt++)
            resyncLogger.trace(`Error during resync routine, waiting ${delay}ms and retrying`, error)
            await sleep(delay)
        }
    }

    // === Setup subscription to nonce, to be fetched every block ===

    const nonceStream = new Stream<number>()
    const unsubscribe = blockService.onBlock(async () => {
        const { value, error } = await tryCatchAsync<number, Error>(publicClient.getTransactionCount({ address }))
        if (error) {
            resyncLogger.warn("Error fetching nonce", address, error)
        } else {
            nonceStream.push(value)
        }
    })

    // === Send cancel transactions until included nonce catches up with pending nonce ===

    function updateGasPrice(): void {
        maxPriorityFeePerGas = bigIntMin(env.MAX_PRIORITY_FEE, maxPriorityFeePerGas * 2n)

        const currentMinFee = getMinFee() - env.INITIAL_PRIORITY_FEE

        // EIP-1559: maxFeePerGas must be >= (base fee + priority fee)
        // Double the maxFeePerGas, but ensure it's at least covering current network fee + our priority fee
        // and don't exceed our configured maximum
        maxFeePerGas = bigIntMin(env.MAX_BASEFEE, bigIntMax(currentMinFee + maxPriorityFeePerGas, maxFeePerGas * 2n))

        // Extra safety check - if for some reason maxPriorityFeePerGas > maxFeePerGas, adjust maxFeePerGas
        if (maxPriorityFeePerGas > maxFeePerGas) {
            maxFeePerGas = maxPriorityFeePerGas
        }

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
            resyncLogger.info(`Resyncing account ${address}, included: ${included}, target: ${pending}`)

            // Fire off all the replacement transactions
            const promises: Promise<Hash>[] = []
            for (let nonce = included; nonce < pending; nonce++) {
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
            }
            await Promise.all(promises)

            while (true) {
                // Wait for next nonce or timeout.
                const nonce = await Promise.race([nonceStream.consume(), sleep(env.RECEIPT_TIMEOUT)])
                if (!nonce) break
                if (nonce > included)
                    resyncLogger.trace(`Resyncing account (2) ${address}, included: ${nonce}, pending: ${pending}`)
                included = nonce

                if (included >= pending) {
                    resyncLogger.info("Resync complete", account)
                    unsubscribe()
                    // Optionally recheck that the pending nonce didn't move forward while we resynced.
                    if (resync) await resyncAccount(account, { resync: false }) // To prevent infinite recursion
                    return
                }
            }

            resyncLogger.trace(`Resyncing account (3) ${address}, included: ${included}, target: ${pending}`)
        } catch (error) {
            const msg = getProp(error, "message", "string")
            const underpriced = msg?.includes("replacement") || msg?.includes("underpriced")
            const alreadyKnown = msg?.includes("transaction already imported")
            const priceMaxedOut = maxFeePerGas >= env.MAX_BASEFEE && maxPriorityFeePerGas >= env.MAX_PRIORITY_FEE

            const delay = Math.min(maxDelay, initialDelay * 2 ** attempt++)
            if (!underpriced && !alreadyKnown)
                resyncLogger.warn(`Error during resync routine, waiting ${delay}ms and retrying`, error)

            if (priceMaxedOut) {
                // We now detect if the network base fee exceeds our maximum
                // In either case, we continue looping as the base fee might reduce in future blocks
                const checkNetworkFeeExceedsMax = () => {
                    try {
                        const currentBaseFee = getLastBaseFee()
                        return currentBaseFee > env.MAX_BASEFEE ? currentBaseFee : false
                    } catch (_e) {
                        // If we can't get the fee, assume it's not a network fee issue
                        return false
                    }
                }

                // Check if this is due to network fees being too high
                const currentBaseFee = checkNetworkFeeExceedsMax()
                const block = blockService.getCurrentBlock()
                if (currentBaseFee) {
                    resyncLogger.error(
                        "Failed to close nonce gap. Network base fee exceeds maximum.",
                        address,
                        included,
                        pending,
                        { currentBaseFee, maxBaseFee: env.MAX_BASEFEE, blockNumber: block?.number },
                    )
                } else {
                    // This is likely due to competing transactions with higher fees
                    resyncLogger.error(
                        "Failed to close nonce gap despite maximum gas price.",
                        address,
                        included,
                        pending,
                        { blockNumber: block?.number },
                    )
                }
            } else {
                updateGasPrice()
            }

            // Don't sleep if the transaction is underpriced and we haven't maxed out the gas price yet.
            if (!underpriced || priceMaxedOut) await sleep(delay)
        }
    }
}
