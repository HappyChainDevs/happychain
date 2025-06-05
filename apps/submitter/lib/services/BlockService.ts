import { promiseWithResolvers, sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import type { OnBlockParameter, PublicClient, WatchBlocksReturnType } from "viem"
import { http, createPublicClient, webSocket } from "viem"
import { chain, type publicClient } from "#lib/utils/clients"
import { blockLogger } from "#lib/utils/logger"

export type BlockHeader = OnBlockParameter<typeof publicClient.chain, false, "latest">

export class BlockService {
    #currentBlock?: BlockHeader
    #previousBlock?: BlockHeader
    #publicClient: PublicClient
    #currentRpcUrlIndex = 0

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
        this.#publicClient = this.#getNewPublicClient()
        void this.#startBlockWatcher()
    }

    static #instance: BlockService
    public static get instance(): BlockService {
        BlockService.#instance ??= new BlockService()
        return BlockService.#instance
    }

    onBlock(callback: (block: BlockHeader) => void): () => void {
        blockLogger.trace("New subscription to block updates.")
        this.onBlockCallbacks.add(callback)
        return () => {
            blockLogger.trace("Unsubscribed from block updates.")
            this.onBlockCallbacks.delete(callback)
        }
    }

    #getNextRpcUrl(): string {
        const httpUrls = chain.rpcUrls.default.http || []
        const webSocketUrls = chain.rpcUrls.default.webSocket || []
        const urls = [...httpUrls, ...webSocketUrls]
        if (urls.length === 0) {
            throw new Error("No RPC URLs available in the chain configuration.")
        }
        const url = urls[this.#currentRpcUrlIndex]
        this.#currentRpcUrlIndex = (this.#currentRpcUrlIndex + 1) % urls.length // Cycle through the URLs
        return url
    }

    #getNewPublicClient(): PublicClient {
        const url = this.#getNextRpcUrl()
        console.log("next url is ", url)

        const isWs = url.startsWith("ws")
        const isHttp = url.startsWith("http")

        if (!isWs && !isHttp) {
            throw new Error(`Invalid URL for public client: ${url}. Must start with http(s):// or ws(s)://`)
        }

        blockLogger.trace(`Creating public client with ${isWs ? "WebSocket" : "HTTP"} transport: ${url}`)

        const transport = isWs ? webSocket(url) : http(url)

        // does a health check before returning help?

        return createPublicClient({
            chain,
            name: url,
            transport,
        })
    }

    async #executeOnBlockCallbacks(block: BlockHeader): Promise<void> {
        if (this.onBlockCallbacks.size === 0) return // No subscribers

        blockLogger.trace(
            `Executing ${this.onBlockCallbacks.size} callbacks for block ${block.number} (hash: ${block.hash})`,
        )
        const callbackPromises: Promise<void>[] = []
        this.onBlockCallbacks.forEach((cb) => {
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

    async #startBlockWatcher(): Promise<void> {
        const initialRetryDelay = 1000 // ms
        const maxRetryDelay = 30_000 // ms
        const maxRetriesPerClientConfig = 5

        let retriesForCurrentClient = 0

        while (true) {
            // Loop indefinitely for retries and client switches
            const { promise, reject } = promiseWithResolvers<void>()
            let unwatch: WatchBlocksReturnType | null = null

            try {
                blockLogger.info(
                    `Starting block watcher with ${this.#publicClient.transport.name} (Attempt ${retriesForCurrentClient + 1}/${maxRetriesPerClientConfig}). Transport: ${this.#publicClient.transport.type}`,
                )

                unwatch = this.#publicClient.watchBlocks({
                    pollingInterval: 200,
                    includeTransactions: false,
                    emitOnBegin: true,
                    emitMissed: true,
                    onBlock: async (blockFromViem) => {
                        const newlyArrivedHeader = blockFromViem as BlockHeader

                        if (!newlyArrivedHeader || !newlyArrivedHeader.number || !newlyArrivedHeader.hash) {
                            blockLogger.error(
                                `Received an invalid block from the watcher: ${JSON.stringify(newlyArrivedHeader)}`,
                            )
                            return // Skip processing invalid blocks
                        }

                        if (retriesForCurrentClient > 0) {
                            // client healthy, reset tries
                            blockLogger.info(
                                `Block watcher successfully retrieved block ${newlyArrivedHeader.number} with ${this.#publicClient.name}. Resetting its retry count.`,
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
                        if (newlyArrivedHeader.number > lastInternallyProcessedBlock.number + 1n) {
                            blockLogger.warn(
                                `Gap detected. Last processed block: ${lastInternallyProcessedBlock.number}, newly arrived block: ${newlyArrivedHeader.number}. Attempting to fill.`,
                            )
                            await this.#fetchAndProcessMissedBlocks(
                                lastInternallyProcessedBlock.number + 1n,
                                newlyArrivedHeader.number - 1n,
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
                        blockLogger.error(
                            `Error in block watcher's onError callback with ${this.#publicClient.name}`,
                            e,
                        )
                        reject(e) // Trigger the main catch block for retry/fallback
                    },
                })
                blockLogger.trace(`Block watcher started successfully with ${this.#publicClient.name}.`)
                await promise // Block here until an error occurs or unwatch is called.
            } catch (e) {
                if (unwatch) {
                    unwatch()
                    unwatch = null
                }
                blockLogger.error(`Block watcher main loop caught an error with ${this.#publicClient.name}:`, e)

                retriesForCurrentClient++

                // lets try get a new public client
                if (retriesForCurrentClient >= maxRetriesPerClientConfig) {
                    blockLogger.warn(
                        `Max retries (${maxRetriesPerClientConfig}) reached with the ${this.#publicClient.name}. Attempting to switch to HTTP-only client.`,
                    )
                    try {
                        this.#publicClient = this.#getNewPublicClient()
                        blockLogger.info(
                            "Successfully switched to new public client. Resetting retries for new configuration.",
                        )
                        retriesForCurrentClient = 0
                    } catch (creationError) {
                        blockLogger.error(
                            "Fatal: Failed to create new public client. Block watcher cannot recover.",
                            creationError,
                        )
                        throw new Error(
                            `Failed to create new public client: ${creationError instanceof Error ? creationError.message : String(creationError)}`,
                        )
                    }
                }

                const delay = Math.min(
                    initialRetryDelay * 2 ** (retriesForCurrentClient > 0 ? retriesForCurrentClient - 1 : 0),
                    maxRetryDelay,
                )
                blockLogger.warn(
                    `Retrying block watcher with ${this.#publicClient.name} in ${delay / 1000} seconds (Attempt ${retriesForCurrentClient + 1}/${maxRetriesPerClientConfig} for this client type)`,
                )
                await sleep(delay)
            }
        }
    }
}
