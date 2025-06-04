import { promiseWithResolvers, sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import type { Block, PublicClient, WatchBlocksReturnType } from "viem"
import { http, createPublicClient, fallback } from "viem"
import { chain, config, publicClient } from "#lib/utils/clients"
import { blockLogger } from "#lib/utils/logger"

export type BlockHeader = Block<typeof publicClient.chain, false, "latest">

export class BlockService {
    #currentBlock?: BlockHeader
    #previousBlock?: BlockHeader
    // #publicClient is initialized with the imported (likely WebSocket or fallback) client.
    // It can be reassigned to an HTTP-only client upon repeated watchBlocks failures.
    #publicClient: PublicClient = publicClient

    async getCurrentBlock(): Promise<BlockHeader> {
        if (this.#currentBlock) return this.#currentBlock

        // Wait for the block watcher to set the current block for the first time.
        // This might need a timeout or a more robust way to handle watcher startup failures.
        await waitForCondition(() => this.#currentBlock !== undefined)

        if (!this.#currentBlock) {
            // This state implies the watcher didn't set a block, even after waiting.
            // This could happen if #startBlockWatcher loop exits due to an unrecoverable error before first block.
            blockLogger.error(
                "Current block is not set after waiting. The block watcher may have failed to initialize or start processing blocks.",
            )
            throw new Error(
                "Current block is not available; the block watcher might have encountered a permanent failure during startup.",
            )
        }
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

    /**
     * Subscribes a callback function to new block events.
     * @param callback The function to call with each new block header.
     * @returns A function to unsubscribe the callback.
     */
    onBlock(callback: (block: BlockHeader) => void): () => void {
        blockLogger.trace("New subscription to block updates.")
        this.onBlockCallbacks.add(callback)

        // Optional: Immediately provide the current block to the new subscriber if available.
        // if (this.#currentBlock) {
        //     try {
        //         // Run in a microtask to avoid blocking the subscription call
        //         Promise.resolve().then(() => callback(this.#currentBlock!)).catch(e => {
        //             blockLogger.error("Error in immediate onBlock callback for new subscriber", e);
        //         });
        //     } catch (e) { // Should not happen with Promise.resolve().then()
        //         blockLogger.error("Unexpected error during immediate callback invocation", e);
        //     }
        // }

        return () => {
            blockLogger.trace("Unsubscribed from block updates.")
            this.onBlockCallbacks.delete(callback)
        }
    }

    /**
     * Executes all registered onBlock callbacks for a given block.
     * Callbacks are executed in parallel, but this method waits for all to settle.
     */
    async #executeOnBlockCallbacks(block: BlockHeader): Promise<void> {
        if (this.onBlockCallbacks.size === 0) return // No subscribers

        blockLogger.trace(
            `Executing ${this.onBlockCallbacks.size} callbacks for block ${block.number} (hash: ${block.hash})`,
        )
        const callbackPromises: Promise<void>[] = []
        this.onBlockCallbacks.forEach((cb) => {
            // Renamed parameter for clarity
            const promise = (async () => {
                try {
                    await cb(block)
                } catch (e) {
                    blockLogger.error(`Error in onBlockCallback for block ${block.number} (hash: ${block.hash})`, e)
                }
            })()
            callbackPromises.push(promise)
        })
        await Promise.all(callbackPromises)
    }

    /**
     * Fetches and processes blocks in a given range that might have been missed.
     */
    async #fetchAndProcessMissedBlocks(fromBlockNumber: bigint, toBlockNumber: bigint): Promise<void> {
        blockLogger.info(`Attempting to fetch and process missed blocks from ${fromBlockNumber} to ${toBlockNumber}.`)
        for (let blockNum = fromBlockNumber; blockNum <= toBlockNumber; blockNum++) {
            try {
                blockLogger.trace(`Fetching missed block: ${blockNum}`)
                const missedBlockData = await this.#publicClient.getBlock({
                    blockNumber: blockNum,
                    includeTransactions: false, // Consistent with BlockHeader's includeTransactions: false
                })

                if (!missedBlockData) {
                    blockLogger.error(
                        `Failed to fetch missed block ${blockNum}. It might have been reorged out or an RPC error occurred. Stopping fill for this gap.`,
                    )
                    break
                }

                // Cast here due to TypeScript's misinterpretation of BlockHeader structure for certain fields.
                const missedBlock = missedBlockData as unknown as BlockHeader

                this.#previousBlock = this.#currentBlock
                this.#currentBlock = missedBlock // Update internal state to this missed block

                blockLogger.info(
                    `Processing fetched missed block: ${this.#currentBlock.number} (hash: ${this.#currentBlock.hash})`,
                )
                await this.#executeOnBlockCallbacks(this.#currentBlock)
            } catch (error) {
                blockLogger.error(
                    `Error fetching or processing missed block ${blockNum}. Stopping fill for this gap.`,
                    error,
                )
                break
            }
        }
    }

    /**
     * Starts and manages the block watcher, including retry logic and fallback to HTTP.
     * This method is intended to run indefinitely.
     */
    async #startBlockWatcher(): Promise<void> {
        const initialRetryDelay = 1000 // ms
        const maxRetryDelay = 30_000 // ms
        const maxRetriesPerClientConfig = 5

        let retriesForCurrentClient = 0
        let switchedToHttp = false

        while (true) {
            // Loop indefinitely for retries and client switches
            const { promise, reject } = promiseWithResolvers<void>()
            let unwatch: WatchBlocksReturnType | null = null
            const clientDescription = switchedToHttp ? "HTTP-only client" : "Primary client"

            try {
                blockLogger.info(
                    `Starting block watcher with ${clientDescription} (Attempt ${retriesForCurrentClient + 1}/${maxRetriesPerClientConfig}). Transport: ${this.#publicClient.transport.type}`,
                )

                unwatch = this.#publicClient.watchBlocks({
                    pollingInterval: 200,
                    includeTransactions: false,
                    emitOnBegin: true,
                    emitMissed: true,
                    onBlock: async (blockFromViem) => {
                        // Cast Viem's block to our internal BlockHeader type. This is the workaround
                        // for TypeScript's misinterpretation of BlockHeader's structure.
                        const newlyArrivedHeader = blockFromViem as unknown as BlockHeader

                        if (!newlyArrivedHeader || !newlyArrivedHeader.number || !newlyArrivedHeader.hash) {
                            blockLogger.error(
                                `Received an invalid block from the watcher: ${JSON.stringify(newlyArrivedHeader)}`,
                            )
                            return // Skip processing invalid blocks
                        }

                        if (retriesForCurrentClient > 0 || (switchedToHttp && retriesForCurrentClient === 0)) {
                            blockLogger.info(
                                `Block watcher successfully retrieved block ${newlyArrivedHeader.number} with ${clientDescription}. Resetting its retry count.`,
                            )
                            retriesForCurrentClient = 0
                        }

                        const lastInternallyProcessedBlock: BlockHeader = this.#currentBlock!

                        // Handle the very first block received by this service instance
                        if (!lastInternallyProcessedBlock) {
                            this.#currentBlock = newlyArrivedHeader
                            this.#previousBlock = undefined // Explicitly undefined for the first block
                            blockLogger.info(
                                `Processing initial block from watcher: ${this.#currentBlock.number} (hash: ${this.#currentBlock.hash})`,
                            )
                            await this.#executeOnBlockCallbacks(this.#currentBlock)
                            return // Initial block processed
                        }

                        // Gap Detection & Manual Filling (supplements Viem's emitMissed:true)
                        // absolutely ridiculous type inference issue with BlockHeader
                        if (
                            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                            BigInt(newlyArrivedHeader.number as any) >
                            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                            BigInt(lastInternallyProcessedBlock.number as any) + 1n
                        ) {
                            blockLogger.warn(
                                `Gap detected. Last processed block: ${lastInternallyProcessedBlock.number}, newly arrived block: ${newlyArrivedHeader.number}. Attempting to fill.`,
                            )
                            await this.#fetchAndProcessMissedBlocks(
                                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                                BigInt(lastInternallyProcessedBlock.number as any) + 1n,
                                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                                BigInt(newlyArrivedHeader.number as any) - 1n,
                            )
                            // After #fetchAndProcessMissedBlocks, this.#currentBlock is the last successfully filled missed block,
                            // or it remains `lastInternallyProcessedBlock` if filling failed or no blocks were filled.
                        }
                        // Reorg / Stale / Duplicate Detection.
                        // Compare newlyArrivedHeader with the current state (this.#currentBlock), which might have been updated by gap filling.
                        else if (this.#currentBlock && newlyArrivedHeader.number < this.#currentBlock.number) {
                            blockLogger.warn(
                                `Received block ${newlyArrivedHeader.number} (hash: ${newlyArrivedHeader.hash}) which is OLDER than current internal block ${this.#currentBlock.number} (hash: ${this.#currentBlock.hash}). Significant reorg detected. Processing new chain head.`,
                            )
                        } else if (this.#currentBlock && newlyArrivedHeader.number === this.#currentBlock.number) {
                            if (newlyArrivedHeader.hash !== this.#currentBlock.hash) {
                                blockLogger.warn(
                                    `Received block ${newlyArrivedHeader.number} with DIFFERENT HASH (new watcher: ${newlyArrivedHeader.hash}, internal current: ${this.#currentBlock.hash}). Probable 1-block reorg. Processing new chain head.`,
                                )
                            } else {
                                blockLogger.info(
                                    `Received block ${newlyArrivedHeader.number} (hash: ${newlyArrivedHeader.hash}) which is a DUPLICATE of the current internal block. Skipping redundant callback execution.`,
                                )
                                return // Do not re-process the exact same block
                            }
                        }

                        // Process the newlyArrivedHeader (which is the current head from the watcher)
                        // this.#currentBlock at this stage is the latest block for which callbacks were *previously* run
                        // (either a filled missed block or the one before newlyArrivedHeader if no gap/reorg).
                        this.#previousBlock = this.#currentBlock
                        this.#currentBlock = newlyArrivedHeader

                        blockLogger.info(
                            `Processing block from watcher: ${this.#currentBlock.number} (hash: ${this.#currentBlock.hash})`,
                        )
                        await this.#executeOnBlockCallbacks(this.#currentBlock)
                    },
                    onError: (e) => {
                        blockLogger.error(`Error in block watcher's onError callback with ${clientDescription}`, e)
                        reject(e) // Trigger the main catch block for retry/fallback
                    },
                })
                blockLogger.trace(`Block watcher started successfully with ${clientDescription}.`)
                await promise // Block here until an error occurs or unwatch is called.
            } catch (e) {
                if (unwatch) {
                    unwatch()
                    unwatch = null
                }
                blockLogger.error(`Block watcher main loop caught an error with ${clientDescription}:`, e)

                retriesForCurrentClient++

                if (retriesForCurrentClient >= maxRetriesPerClientConfig) {
                    if (!switchedToHttp) {
                        blockLogger.warn(
                            `Max retries (${maxRetriesPerClientConfig}) reached with the ${clientDescription}. Attempting to switch to HTTP-only client.`,
                        )
                        try {
                            const httpUrls = chain.rpcUrls.default.http
                            if (!httpUrls || httpUrls.length === 0) {
                                blockLogger.error(
                                    "Fatal: No HTTP RPC URLs configured in 'chain' object for fallback. Cannot switch to HTTP-only client.",
                                )
                                throw new Error("No HTTP RPC URLs configured for fallback client.")
                            }
                            const httpOnlyClientConfig = {
                                ...config,
                                chain: chain,
                                transport: fallback(httpUrls.map((url) => http(url))), // HTTP transport with fallback
                            }
                            this.#publicClient = createPublicClient(httpOnlyClientConfig)

                            blockLogger.info(
                                "Successfully switched to HTTP-only public client. Resetting retries for new configuration.",
                            )
                            switchedToHttp = true
                            retriesForCurrentClient = 0
                        } catch (creationError) {
                            blockLogger.error(
                                "Fatal: Failed to create HTTP-only public client. Block watcher cannot recover.",
                                creationError,
                            )
                            throw new Error(
                                `Failed to create HTTP-only public client: ${creationError instanceof Error ? creationError.message : String(creationError)}`,
                            )
                        }
                    } else {
                        blockLogger.error(
                            `Max retries (${maxRetriesPerClientConfig}) reached with HTTP-only client. Block watcher failed permanently.`,
                        )
                        throw new Error(
                            "Block watcher failed permanently after exhausting retries with both primary and HTTP-only clients.",
                        )
                    }
                }

                const delay = Math.min(
                    initialRetryDelay * 2 ** (retriesForCurrentClient > 0 ? retriesForCurrentClient - 1 : 0),
                    maxRetryDelay,
                )
                blockLogger.warn(
                    `Retrying block watcher with ${switchedToHttp ? "HTTP-only client" : "Primary client"} in ${delay / 1000} seconds (Attempt ${retriesForCurrentClient + 1}/${maxRetriesPerClientConfig} for this client type)`,
                )
                await sleep(delay)
            }
        }
    }
}
