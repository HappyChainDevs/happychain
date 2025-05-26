import { promiseWithResolvers, sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import type { OnBlockParameter, WatchBlocksReturnType } from "viem"
import { publicClient } from "#lib/utils/clients"
import { blockLogger } from "#lib/utils/logger"

export type BlockHeader = OnBlockParameter<typeof publicClient.chain, false, "latest">
export class BlockService {
    #currentBlock?: BlockHeader
    #previousBlock?: BlockHeader

    async getCurrentBlock(): Promise<BlockHeader> {
        if (this.#currentBlock) return this.#currentBlock
        await waitForCondition(() => this.#currentBlock !== undefined)
        if (!this.#currentBlock) throw new Error("Current block is not set, this should never happen")
        return this.#currentBlock
    }

    onBlockCallbacks: Set<(block: BlockHeader) => void> = new Set()

    private constructor() {
        void this.#startBlockWatcher()
    }

    static #instance: BlockService
    public static get instance(): BlockService {
        BlockService.#instance ??= new BlockService()
        return BlockService.#instance
    }

    onBlock(callback: (block: BlockHeader) => void): () => void {
        // This is a placeholder implementation. In a real application, this would
        // subscribe to new blocks on the blockchain and call the callback with the block number.
        blockLogger.trace("Subscribed to new blocks")
        this.onBlockCallbacks.add(callback)

        // TODO: do we want this? - If we already have a current block, call the callback immediately
        // if (this.#currentBlock) callback(this.#currentBlock)
        return () => {
            blockLogger.trace("Unsubscribed from new blocks")
            this.onBlockCallbacks.delete(callback)
        }
    }

    async #startBlockWatcher(): Promise<void> {
        const initialRetryDelay = 1000 // ms
        const maxRetryDelay = 30_000 // ms
        const maxRetries = 5
        let currentRetry = 0

        // we actually exit loop in catch clause, if ever
        while (currentRetry < maxRetries) {
            const { promise, reject } = promiseWithResolvers<void>()
            let unwatch: WatchBlocksReturnType | null = null
            try {
                // logger.info("Starting block watcher with transport", publicClient.transport)

                unwatch = publicClient.watchBlocks({
                    // If `poll` is undefined and transport is WebSocket (or fallback with first WebSocket transport),
                    // Viem won't poll but subscribe, even if `pollingInterval` is set.
                    pollingInterval: 200,
                    includeTransactions: false,
                    emitOnBegin: true,
                    emitMissed: true,
                    onBlock: (header: BlockHeader) => {
                        if (currentRetry > 0) {
                            blockLogger.info("Block watcher recovered and processed a block. Resetting retry attempts.")
                            currentRetry = 0
                        }
                        if (
                            this.#currentBlock &&
                            this.#previousBlock &&
                            this.#currentBlock.number !== this.#previousBlock.number + 1n
                        ) {
                            blockLogger.warn(
                                `Detected a gap in block numbers: currentBlock=${this.#currentBlock.number}, previousBlock=${this.#previousBlock.number}. Skipping block ${header.number}.`,
                            )
                            // TODO: handle this! (manually fetch missed blocks, calling callbacks on each sequentially?)
                        }
                        this.#previousBlock = this.#currentBlock
                        this.#currentBlock = header

                        // These may or may not be async callbacks. Calling them like this, allows for async
                        // callbacks. Note: they are run in parallel, so if one of them fails, it won't affect the others.
                        // and we don't await any results here, so we can simply process the next block when its ready
                        this.onBlockCallbacks.forEach(async (onBlockCallbacks) => {
                            try {
                                await onBlockCallbacks(header)
                            } catch (e) {
                                blockLogger.error("Error in onBlockCallback", e)
                            }
                        })
                    },
                    onError: (e) => {
                        // We technically do not need to restart the watcher here, but we have observed cases where
                        // it is in fact necessary to do so, so for now we always restart.
                        blockLogger.error("Error in block watcher", e)
                        reject(e)
                    },
                })
                blockLogger.trace("Block watcher started successfully.")
                await promise // block forever unless an error occurs
            } catch (e) {
                // TODO Can we make this more robust with a fallback to another RPC?
                //      We have Viem fallback enabled, but how does it work with watchblocks and websocket?
                if (unwatch) unwatch()
                else blockLogger.error("Error starting block watcher", e)
                if (currentRetry === maxRetries)
                    throw new Error(`Unable to restart block watch after ${maxRetries} attempts`)
                currentRetry++
                const delay = Math.min(initialRetryDelay * 2 ** (currentRetry - 1), maxRetryDelay) // exponential backoff
                blockLogger.warn(
                    `Retrying block watcher in ${delay / 1000} seconds (Attempt ${currentRetry}/${maxRetries})`,
                )
                await sleep(delay)
            }
        }
    }
}
