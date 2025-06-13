import {
    HappyMap,
    type Hash,
    type Result,
    type UnionFill,
    promiseWithResolvers,
    sleep,
    tryCatchAsync,
} from "@happy.tech/common"
import type { TransactionReceipt } from "viem"
import { env } from "#lib/env"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"
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
    #blockService: BlockService

    constructor(blockService: BlockService) {
        this.#blockService = blockService
        this.start()
    }

    start() {
        // Subscribe to block updates, attempt to fetch receipts and resolve pending promises when a tx is included.
        this.#blockService.onBlock(async (block) => {
            for (const evmTxHash of block.transactions) {
                if (!this.#hashes.has(evmTxHash.toLowerCase() as Hash)) continue
                // Experience has shown we can't assume that eth_getTransactionReceipt will succeed after seeing the tx
                // hash in the block (at least not with Anvil), so we perform three attempts with delays between them
                // before declaring the receipt timed out (even though it is available if the RPC isn't lying).

                let receipt: TransactionReceipt | undefined = undefined
                for (let i = 1; i <= 3; ++i) {
                    ;({ value: receipt } = await this.#fetchReceipt(evmTxHash))
                    if (receipt) break
                    else await sleep(env.LINEAR_RETRY_DELAY * i)
                }
                this.#resolve(evmTxHash, receipt ? { receipt } : { cantFetch: true })
            }
        })
    }

    /**
     * Returns a promise that waits for the receipt of the given EVM transaction to be available and returns it, or
     * signals that either we timed out while waiting or that the receipt is available but we couldn't fetch it.
     */
    async waitForReceipt(evmTxHash: Hash, timeout: number): Promise<EvmReceiptResult> {
        const pwr = promiseWithResolvers<EvmReceiptResult>()
        const pwrs = this.#hashes.getOrSet(evmTxHash.toLowerCase() as Hash, new Set())
        pwrs.add(pwr)

        const timer = setTimeout(async () => {
            // Last ditch attempt. This is insurance against subscription failures.
            // It also covers a very unlikely edge case where the receipt was *just* included, and we just missed the
            // `onBlock` notification but the node does not fulfill our initial `getReceipt` request (this can happen).
            const { value: receipt } = await this.#fetchReceipt(evmTxHash)
            if (receipt) logger.info("Retrieved receipt in last ditch attempt", evmTxHash)
            void this.#resolve(evmTxHash, receipt ? { receipt } : { timedOut: true }, pwr)
        }, timeout)

        // If someone else is still waiting on the hash, we know we didn't miss it, no need to check,
        // otherwise we need to do an initial check (with one exception — see `setTimeout` block).
        if (pwrs.size === 1) {
            const { value: receipt } = await this.#fetchReceipt(evmTxHash)
            if (receipt) void this.#resolve(evmTxHash, { receipt }, pwr)
        }

        const result = await pwr.promise
        clearTimeout(timer)
        return result
    }

    /** Helper that attempts fetching a receipt and returns the result as a {@link Result}. */
    async #fetchReceipt(hash: Hash): Promise<Result<TransactionReceipt, unknown>> {
        return await tryCatchAsync(publicClient.getTransactionReceipt({ hash }))
    }

    /**
     * Resolves the receipt result for the given EVM tx hash. If a promise is provided and the result is a timeout, the
     * timeout only applies to that one promise.
     */
    async #resolve(
        evmTxHash: Hash,
        result: EvmReceiptResult,
        pwr?: PromiseWithResolvers<EvmReceiptResult>,
    ): Promise<void> {
        // Assumption: if `pwr` is provided, it is in `pwrs`.
        const pwrs = this.#hashes.get(evmTxHash)
        if (!pwrs) return
        if (result.timedOut) {
            if (!pwr) throw Error("BUG: EvmReceiptService — must only time out specific promises")
            pwr.resolve(result)
            pwrs.delete(pwr)
            if (!pwrs.size) this.#hashes.delete(evmTxHash)
            return
        }
        pwrs.forEach((pwr) => pwr.resolve(result))
        this.#hashes.delete(evmTxHash)
    }
}
