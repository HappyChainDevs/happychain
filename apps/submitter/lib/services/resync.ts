import { Stream, bigIntMax, bigIntMin, getProp, sleep, tryCatchAsync } from "@happy.tech/common"
import type { Account, Hash } from "viem"
import { env } from "#lib/env"
import { blockService } from "#lib/services"
import { publicClient, walletClient } from "#lib/utils/clients"
import { getMinFee } from "#lib/utils/gas"
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
 * Resyncs the given account so that its "included nonce" matches its "pending nonce". or a specific target nonce.
 * If {@link options} is provided, will re-query the pending nonce after resyncing to check if it didn't move
 * ahead or if the initial pending nonce wasn't outdated, and if so will resync again (just once).
 * @param account The account to resync
 * @param options Optional configuration for the resync operation or "recheck" for backward compatibility
 */
export async function resyncAccount(account: Account, options?: ResyncOptions): Promise<void> {
    let targetNonce: number | undefined = undefined
    let resync = false

    if (options) {
        targetNonce = options.targetNonce
        resync = options.resync ?? false
    }

    return resyncAccountInternal({
        account,
        targetNonce,
        resync,
    })
}

async function resyncAccountInternal({
    account,
    targetNonce,
    resync = false,
}: {
    account: Account
    targetNonce?: number
    resync?: boolean
}): Promise<void> {
    const address = account.address
    const initialDelay = 500
    const maxDelay = 8000
    let attempt = 0

    // === Get initial included and pending nonces ===

    let included: number
    let pending: number

    while (true) {
        try {
            included = await publicClient.getTransactionCount({ address })

            // Get target nonce (either provided or from network)
            if (targetNonce !== undefined) {
                // No need to sync if included nonce already matches or exceeds target
                if (included >= targetNonce) {
                    resyncLogger.info(`Account ${address} already synced to nonce ${targetNonce}`)
                    return
                }
                pending = targetNonce
            } else {
                // Get pending nonce from network
                const pendingCount = await publicClient.getTransactionCount({ address, blockTag: "pending" })

                // No need to sync if included nonce already matches pending
                if (included >= pendingCount) {
                    resyncLogger.info(`Account ${address} already synced (${included} >= ${pendingCount})`)
                    return
                }
                pending = pendingCount
            }
            // Exit the retry loop once we have valid nonces
            break
        } catch (error) {
            const delay = Math.max(maxDelay, initialDelay * 2 ** attempt++)
            resyncLogger.error(`Error during resync routine, waiting ${delay}ms and retrying`, error)
            await sleep(delay)
        }
    }

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

    function updateGasPrice(): void {
        // First increase the priority fee (tip), but don't exceed the maximum
        maxPriorityFeePerGas = bigIntMin(env.MAX_PRIORITY_FEE, maxPriorityFeePerGas * 2n)

        // Calculate a new base fee that's at least sufficient to cover the network fee + our priority fee
        const currentMinimumFee = getMinFee() // current network base fee

        // EIP-1559: maxFeePerGas must be >= (base fee + priority fee)
        // Double the maxFeePerGas, but ensure it's at least covering current network fee + our priority fee
        // and don't exceed our configured maximum
        maxFeePerGas = bigIntMin(
            env.MAX_BASEFEE,
            bigIntMax(currentMinimumFee + maxPriorityFeePerGas, maxFeePerGas * 2n),
        )

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
                    resyncLogger.trace(`Resyncing account (2) ${address}, included: ${included}, pending: ${pending}`)
                included = nonce

                if (included >= pending) {
                    resyncLogger.info("Resync complete", account)
                    unsubscribe()
                    // Verify nonce alignment after syncing if requested
                    if (resync) await resyncAccount(account) // No resync to prevent infinite recursion
                    return
                }
            }

            resyncLogger.trace(`Resyncing account (3) ${address}, included: ${included}, target: ${pending}`)
        } catch (error) {
            const msg = getProp(error, "message", "string")
            const underpriced = msg?.includes("replacement") || msg?.includes("underpriced")
            const alreadyKnown = msg?.includes("transaction already imported")
            const priceMaxedOut = maxFeePerGas >= env.MAX_BASEFEE && maxPriorityFeePerGas >= env.MAX_PRIORITY_FEE

            const delay = Math.max(maxDelay, initialDelay * 2 ** attempt++)
            if (!underpriced && !alreadyKnown)
                resyncLogger.error(`Error during resync routine, waiting ${delay}ms and retrying`, error)

            if (priceMaxedOut) {
                // Check if the network base fee is higher than our configured maximum
                const checkNetworkFees = async () => {
                    try {
                        const block = await publicClient.getBlock()
                        const currentBaseFee = block.baseFeePerGas || 0n

                        if (currentBaseFee > env.MAX_BASEFEE) {
                            return {
                                networkFeeTooHigh: true,
                                currentBaseFee,
                            }
                        }
                        return { networkFeeTooHigh: false }
                    } catch (_e) {
                        // If we can't get the block, assume it's not a network fee issue
                        return { networkFeeTooHigh: false }
                    }
                }

                // Check if this is due to network fees being too high
                void checkNetworkFees().then(({ networkFeeTooHigh, currentBaseFee }) => {
                    const baseMsg =
                        "Reached max gas limits and couldn't close nonce gap. " +
                        `Waiting ${delay}ms and retrying. ` +
                        `Latest nonce: ${included}, Target nonce: ${pending}`

                    if (networkFeeTooHigh && currentBaseFee) {
                        const networkFeeMsg = `${baseMsg}\nCurrent network base fee (${currentBaseFee}) exceeds configured maximum (${env.MAX_BASEFEE})`
                        resyncLogger.warn(networkFeeMsg)

                        // Log a critical alert for network fee exceeding our maximum
                        const alertDetails = {
                            level: "critical",
                            address: address.toString(),
                            includedNonce: included,
                            pendingNonce: pending,
                            message: "Network base fee exceeds configured maximum",
                            details: {
                                currentBaseFee: currentBaseFee.toString(),
                                maxBaseFee: env.MAX_BASEFEE.toString(),
                                maxPriorityFee: env.MAX_PRIORITY_FEE.toString(),
                            },
                        }
                        resyncLogger.error("ALERT: Network base fee exceeds maximum", alertDetails)
                        // TODO: Integrate with your production alerting system
                    } else {
                        // This is likely due to competing transactions with higher fees
                        resyncLogger.warn(baseMsg)

                        // Log a warning alert for stuck transactions
                        const alertDetails = {
                            level: "warning",
                            address: address.toString(),
                            includedNonce: included,
                            pendingNonce: pending,
                            message: "Transactions stuck despite maximum gas price",
                            details: {
                                maxBaseFee: env.MAX_BASEFEE.toString(),
                                maxPriorityFee: env.MAX_PRIORITY_FEE.toString(),
                            },
                        }
                        resyncLogger.error("ALERT: Transactions stuck despite maximum gas price", alertDetails)
                        // TODO: Integrate with your production alerting system
                    }
                })
            } else {
                updateGasPrice()
            }

            // Don't sleep if the transaction is underpriced and we haven't maxed out the gas price yet.
            if (!underpriced || priceMaxedOut) await sleep(delay)
        }
    } // end while loop
}
