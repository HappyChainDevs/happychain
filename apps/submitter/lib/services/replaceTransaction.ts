import { type Optional, Stream, getProp, sleep, tryCatchAsync } from "@happy.tech/common"
import { Logger } from "@happy.tech/common"
import type { Account } from "viem"
import { env } from "#lib/env"
import { blockService } from "#lib/services"
import type { EvmTxInfo } from "#lib/types"
import { publicClient, walletClient } from "#lib/utils/clients"
import { getFees } from "#lib/utils/gas"

const replaceLogger = Logger.create("ReplaceTransaction")

export type ReplaceTxOptions = {
    evmTxInfo: Optional<EvmTxInfo, "evmTxHash">
    // TODO we don't need this
    recheck?: boolean
}

function getMinFee() {
    // TODO tmp get rid of this
    const { minBlockFee } = getFees()
    return minBlockFee ?? 1000n
}

/**
 * Replaces a single stuck transaction for an account by submitting a zero-value self-transaction
 * with incrementally higher gas fees. This is a more focused version of the resync service that
 * only targets a single nonce (useful for account creation or other specific transactions).
 */
export async function replaceTransaction(account: Account, options: ReplaceTxOptions): Promise<void> {
    const { evmTxInfo, recheck = false } = options
    const address = account.address
    const nonce = options.evmTxInfo.nonce
    const initialDelay = 500
    const maxDelay = 8000
    let attempt = 0

    const nonceStream = new Stream<number>()
    const unsubscribe = blockService.onBlock(async () => {
        const { value, error } = await tryCatchAsync<number, Error>(publicClient.getTransactionCount({ address }))
        if (error) {
            replaceLogger.warn("Error fetching nonce", address, error)
        } else {
            nonceStream.push(value)
        }
    })

    try {
        const currentNonce = await publicClient.getTransactionCount({ address })
        if (currentNonce > nonce) {
            replaceLogger.info(`Transaction at nonce ${nonce} already confirmed (current nonce: ${currentNonce})`)
            return
        }

        let maxFeePerGas: bigint
        let maxPriorityFeePerGas: bigint

        if (evmTxInfo?.maxFeePerGas && evmTxInfo?.maxPriorityFeePerGas) {
            maxPriorityFeePerGas =
                (evmTxInfo.maxPriorityFeePerGas * (100n + env.INITIAL_RESYNC_FEE_BUMP_PERCENT)) / 100n

            const minFee = getMinFee() - env.INITIAL_PRIORITY_FEE + maxPriorityFeePerGas
            maxFeePerGas = (evmTxInfo.maxFeePerGas * (100n + env.INITIAL_RESYNC_FEE_BUMP_PERCENT)) / 100n

            maxFeePerGas = maxFeePerGas > minFee ? maxFeePerGas : minFee
        } else {
            maxFeePerGas = getMinFee() * 2n
            maxPriorityFeePerGas = env.INITIAL_PRIORITY_FEE
        }

        maxFeePerGas = maxFeePerGas > env.MAX_BASEFEE ? env.MAX_BASEFEE : maxFeePerGas
        maxPriorityFeePerGas = maxPriorityFeePerGas > env.MAX_PRIORITY_FEE ? env.MAX_PRIORITY_FEE : maxPriorityFeePerGas

        function updateGasPrice(): void {
            maxPriorityFeePerGas = (maxPriorityFeePerGas * (100n + env.FEE_BUMP_PERCENT)) / 100n
            if (maxPriorityFeePerGas > env.MAX_PRIORITY_FEE) {
                maxPriorityFeePerGas = env.MAX_PRIORITY_FEE
            }

            const currentMinFee = getMinFee() - env.INITIAL_PRIORITY_FEE + maxPriorityFeePerGas
            maxFeePerGas = (maxFeePerGas * (100n + env.FEE_BUMP_PERCENT)) / 100n

            if (maxFeePerGas < currentMinFee) {
                maxFeePerGas = currentMinFee
            }

            if (maxFeePerGas > env.MAX_BASEFEE) {
                maxFeePerGas = env.MAX_BASEFEE
            }

            // Extra safety check - if for some reason maxPriorityFeePerGas > maxFeePerGas, adjust maxFeePerGas
            if (maxPriorityFeePerGas > maxFeePerGas) {
                maxFeePerGas = maxPriorityFeePerGas
            }

            replaceLogger.trace(
                `Updated fees: maxFeePerGas=${maxFeePerGas}, maxPriorityFeePerGas=${maxPriorityFeePerGas}`,
            )
        }

        while (true) {
            try {
                replaceLogger.info(`Sending replacement transaction for ${address} at nonce ${nonce}`)
                const hash = await walletClient.sendTransaction({
                    account,
                    to: account.address,
                    value: 0n,
                    gas: 21_000n,
                    nonce,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                })

                replaceLogger.trace(`Sent replacement tx ${hash} for nonce ${nonce}`)

                while (true) {
                    const receivedNonce = await Promise.race([nonceStream.consume(), sleep(env.RECEIPT_TIMEOUT)])
                    if (!receivedNonce) break

                    if (receivedNonce > nonce) {
                        replaceLogger.info(`Transaction replacement successful for ${address} at nonce ${nonce}`)

                        if (recheck) {
                            const currentNonce = await publicClient.getTransactionCount({ address })
                            const pendingNonce = await publicClient.getTransactionCount({
                                address,
                                blockTag: "pending",
                            })

                            if (pendingNonce > currentNonce) {
                                replaceLogger.warn(
                                    `New nonce gap detected: current=${currentNonce}, pending=${pendingNonce}`,
                                )
                            }
                        }
                        return
                    }
                }

                replaceLogger.trace("Timeout waiting for nonce update, retrying with higher fees")
            } catch (error) {
                const msg = getProp(error, "message", "string")
                const underpriced = msg?.includes("replacement") || msg?.includes("underpriced")
                const alreadyKnown = msg?.includes("transaction already imported")
                const priceMaxedOut = maxFeePerGas >= env.MAX_BASEFEE && maxPriorityFeePerGas >= env.MAX_PRIORITY_FEE

                const delay = Math.min(maxDelay, initialDelay * 2 ** attempt++)
                if (!underpriced && !alreadyKnown) {
                    replaceLogger.warn(`Error during replacement, waiting ${delay}ms before retry`, error)
                }

                if (priceMaxedOut) {
                    try {
                        const block = await publicClient.getBlock()
                        const currentBaseFee = block.baseFeePerGas || 0n

                        if (currentBaseFee > env.MAX_BASEFEE) {
                            replaceLogger.error(
                                "Transaction replacement delayed. Network base fee exceeds maximum.",
                                address,
                                nonce,
                                { currentBaseFee, maxBaseFee: env.MAX_BASEFEE, blockNumber: block.number },
                            )
                        }
                    } catch (_blockError) {
                        replaceLogger.warn(`Gas price maxed out, transaction may be delayed. Nonce: ${nonce}`)
                    }
                } else if (underpriced) {
                    updateGasPrice()
                }

                if (!underpriced || priceMaxedOut) {
                    await sleep(delay)
                }
            }
        }
    } finally {
        unsubscribe()
    }
}
