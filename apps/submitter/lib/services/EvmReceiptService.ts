import { HappyMap, type Hash, type UnionFill, promiseWithResolvers, sleep } from "@happy.tech/common"
import type { TransactionReceipt } from "viem"
import { env } from "#lib/env"
import { publicClient } from "#lib/utils/clients"
import type { BlockService } from "./BlockService"

// biome-ignore format: pretty
export type EvmReceiptResult = UnionFill<
    | { /** The requested receipt. */
        receipt: TransactionReceipt }
    | { /** If true, indicates the receipt can't be fetched, even though the transaction was included. */
        cantFetch: true }
    | { /** Indicates a time out while waiting for the receipt. */
        timedOut: true }
>

export class EvmReceiptService {
    // Maps tx hashes to a set of promises waiting on them.
    #hashes = new HappyMap<Hash, Set<PromiseWithResolvers<EvmReceiptResult>>>()

    constructor(blockService: BlockService) {
        blockService.onBlock((block) => {
            console.log("EvmReceiptService: block", block)
            for (const evmTxHash of block.transactions) {
                if (!this.#hashes.has(evmTxHash.toLowerCase() as Hash)) {
                    console.log(("we do not care about: " + evmTxHash).toLowerCase())
                    continue
                }
                console.log("applicable transction found", evmTxHash)
                void this.#resolveReceipt(evmTxHash, "knownAsIncluded")
            }
        })
    }

    /**
     * Returns a promise that waits for the receipt of the given EVM transaction to be available and returns it, or
     * null if we know the transaction was included but didn't manage to fetch the receipt.
     */
    async waitForReceipt(evmTxHash: Hash, timeout: number): Promise<EvmReceiptResult> {
        const pwr = promiseWithResolvers<EvmReceiptResult>()
        const pwrs = this.#hashes.getOrSet(evmTxHash.toLowerCase() as Hash, new Set())
        pwrs.add(pwr)

        const timer = setTimeout(() => {
            pwr.resolve({ timedOut: true })
            // Refetch because it might have been cleared meanwhile if the fetch is close with the timeout.
            const pwrs = this.#hashes.get(evmTxHash)
            if (pwrs) {
                pwrs.delete(pwr)
                if (!pwrs.size) this.#hashes.delete(evmTxHash)
            }
        }, timeout)

        // If someone else is already waiting on the hash, we know we didn't miss it, no need to check,
        // otherwise we need to do an initial check.
        if (pwrs.size === 1) await this.#resolveReceipt(evmTxHash)

        const result = await pwr.promise
        clearTimeout(timer)
        return result
    }

    async #resolveReceipt(evmTxHash: Hash, knownAsIncluded?: "knownAsIncluded"): Promise<void> {
        const receipt = await this.#fetchReceipt(evmTxHash)
        if (!receipt && !knownAsIncluded) return
        const pwrs = this.#hashes.get(evmTxHash)
        if (!pwrs) return
        if (receipt) pwrs.forEach((pwr) => pwr.resolve({ receipt }))
        else pwrs.forEach((pwr) => pwr.resolve({ cantFetch: true }))
        this.#hashes.delete(evmTxHash)
    }

    async #fetchReceipt(evmTxHash: Hash): Promise<TransactionReceipt | null> {
        // Experience has shown we can't assume that eth_getTransactionReceipt will succeed after seeing the tx hash in
        // the block (at least not with Anvil), so we perform three attempts with delays between them before declaring
        // the receipt timed out (even though it is available if the RPC isn't lying). This is also good for the
        // initial attempt, since maybe the block was already emitted but the node doesn't answer with the receipt yet.

        let receipt: TransactionReceipt | null = null
        for (let i = 1; i <= 3; ++i)
            try {
                receipt = await publicClient.getTransactionReceipt({ hash: evmTxHash })
                break
            } catch {
                await sleep(env.RECEIPT_RETRY_DELAY * i)
            }
        return receipt
    }
}
