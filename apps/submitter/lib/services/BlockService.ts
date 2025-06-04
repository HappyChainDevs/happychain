import { promiseWithResolvers, sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import type { OnBlockParameter, WatchBlocksReturnType, WebSocketTransport } from "viem"
import { publicClient, webSocketTransports } from "#lib/utils/clients"
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
        console.log("Starting block watcher with maxRetries", maxRetries)

        // we actually exit loop in catch clause, if ever
        while (currentRetry < maxRetries) {
            const { promise, reject } = promiseWithResolvers<void>()
            const unwatch: WatchBlocksReturnType | null = null
            try {
                const transportCandidate = publicClient.transport.transports[0]?.value
                console.log("Using transportCandidate:", transportCandidate)
                if (
                    transportCandidate &&
                    "subscribe" in transportCandidate &&
                    typeof (transportCandidate as any).subscribe === "function"
                ) {
                    type ViemWebSocketTransportLike = {
                        getSocket(): Promise<WebSocket>
                        getRpcClient(): Promise<any>
                        subscribe: (args: {
                            params: string[]
                            onData: (data: any) => void
                            onError?: (error: any) => void
                        }) => Promise<() => Promise<void>>
                    }

                    const webSocketTransport = transportCandidate as unknown as ViemWebSocketTransportLike

                    blockLogger.trace("Attempting direct subscription via transport:", webSocketTransport)
                    const unsubscribeFnPromise = webSocketTransport.subscribe({
                        params: ["newHeads"],
                        // Use an arrow function for onData to preserve 'this' context
                        onData: async (data: any) => {
                            blockLogger.trace("Received new block data via direct subscription", data)

                            if (data.subscription && data.result) {
                                const header = data.result as BlockHeader

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
                                this.#currentBlock = header // Assign the new header

                                this.onBlockCallbacks.forEach(async (callbackFn) => {
                                    try {
                                        await callbackFn(header)
                                    } catch (e) {
                                        blockLogger.error("Error in onBlockCallback", e)
                                    }
                                })
                            }
                        },

                        onError: (error: any) => {
                            blockLogger.error("Error in direct WebSocket subscription", error)
                            reject(error) // This will trigger the catch block and retry logic
                        },
                    })
                    // unwatch = await unsubscribeFnPromise; // Note: this unwatch is different from watchBlocks's unwatch
                } else {
                    blockLogger.warn(
                        "The first transport in the fallback array is not a subscribable WebSocket transport. " +
                            "Falling back to default behavior or erroring. " +
                            "Current transport value:",
                        transportCandidate,
                    )
                    // To ensure retry logic is triggered if this path is an error:
                    throw new Error("Failed to find a subscribable WebSocket transport for direct subscription.")
                }
                blockLogger.trace("Block watcher started successfully.")
                await promise // block forever unless an error occurs
            } catch (e) {
                // TODO Can we make this more robust with a fallback to another RPC?
                //      We have Viem fallback enabled, but how does it work with watchblocks and websocket?
                // if (unwatch) unwatch()
                // else blockLogger.error("Error starting block watcher", e)
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
