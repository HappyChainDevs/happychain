import { promiseWithResolvers, sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import type { OnBlockParameter, PublicClient, WatchBlocksReturnType } from "viem"
import { http, createPublicClient, webSocket } from "viem"
import { chain } from "#lib/utils/clients" // Assuming these are correctly imported
import { blockLogger } from "#lib/utils/logger"

export type BlockHeader = OnBlockParameter<typeof chain, false, "latest">

export class BlockService {
    #currentBlock?: BlockHeader
    #previousBlock?: BlockHeader
    #publicClient: PublicClient
    #currentRpcUrlIndex = 0
    #retriesForCurrentClient = 0

    async getCurrentBlock(): Promise<BlockHeader> {
        if (this.#currentBlock) return this.#currentBlock

        await waitForCondition(() => this.#currentBlock !== undefined)

        if (!this.#currentBlock) {
            blockLogger.error(
                "Current block is not set after waiting. The block watcher may have failed to initialize.",
            )
            throw new Error("Current block is not available; the block watcher might have failed during startup.")
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
        this.#currentRpcUrlIndex = (this.#currentRpcUrlIndex + 1) % urls.length
        return url
    }

    #getNewPublicClient(): PublicClient {
        const url = this.#getNextRpcUrl()

        const isWs = url.startsWith("ws")
        const isHttp = url.startsWith("http")

        if (!isWs && !isHttp) {
            throw new Error(`Invalid URL for public client: ${url}. Must start with http(s):// or ws(s)://`)
        }

        blockLogger.trace(`Creating public client with ${isWs ? "WebSocket" : "HTTP"} transport: ${url}`)

        const transport = isWs ? webSocket(url) : http(url)

        return createPublicClient({
            chain,
            name: url,
            transport,
        })
    }

    async #executeOnBlockCallbacks(block: BlockHeader): Promise<void> {
        if (this.onBlockCallbacks.size === 0) return

        blockLogger.trace(
            `Executing ${this.onBlockCallbacks.size} callbacks for block ${block.number} (hash: ${block.hash})`,
        )
        const callbackPromises = Array.from(this.onBlockCallbacks).map((cb) =>
            (async () => {
                try {
                    await cb(block)
                } catch (e) {
                    blockLogger.error(`Error in onBlockCallback for block ${block.number} (hash: ${block.hash})`, e)
                }
            })(),
        )
        await Promise.all(callbackPromises)
    }

    async #fetchAndProcessMissedBlocks(fromBlockNumber: bigint, toBlockNumber: bigint): Promise<void> {
        blockLogger.info(`Attempting to fetch and process missed blocks from ${fromBlockNumber} to ${toBlockNumber}.`)
        for (let blockNum = fromBlockNumber; blockNum <= toBlockNumber; blockNum++) {
            try {
                blockLogger.trace(`Fetching missed block: ${blockNum}`)
                const missedBlockData = await this.#publicClient.getBlock({
                    blockNumber: blockNum,
                    includeTransactions: false,
                })

                if (!missedBlockData) {
                    blockLogger.error(
                        `Failed to fetch missed block ${blockNum}. It might have been reorged out. Stopping fill for this gap.`,
                    )
                    break
                }
                await this.#processNewHead(missedBlockData as BlockHeader)
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
        const initialRetryDelay = 1000
        const maxRetryDelay = 30_000
        const maxRetriesPerClientConfig = 5

        while (true) {
            const { promise, reject } = promiseWithResolvers<void>()
            let unwatch: WatchBlocksReturnType | null = null

            try {
                blockLogger.info(
                    `Starting block watcher with ${this.#publicClient.transport.name} (Attempt ${
                        this.#retriesForCurrentClient + 1
                    }/${maxRetriesPerClientConfig}).`,
                )

                unwatch = this.#publicClient.watchBlocks({
                    pollingInterval: 200,
                    includeTransactions: false,
                    emitOnBegin: true,
                    emitMissed: true,
                    onBlock: this.#handleNewBlock.bind(this),
                    onError: (e) => {
                        blockLogger.error(
                            `Error in block watcher's onError callback with ${this.#publicClient.name}`,
                            e,
                        )
                        reject(e)
                    },
                })
                await promise
            } catch (e) {
                unwatch?.()

                blockLogger.error(`Block watcher main loop caught an error with ${this.#publicClient.name}:`, e)

                this.#retriesForCurrentClient++

                if (this.#retriesForCurrentClient >= maxRetriesPerClientConfig) {
                    blockLogger.warn(
                        `Max retries (${maxRetriesPerClientConfig}) reached for ${
                            this.#publicClient.name
                        }. Switching to a new client.`,
                    )
                    try {
                        this.#publicClient = this.#getNewPublicClient()
                        this.#retriesForCurrentClient = 0
                    } catch (creationError) {
                        blockLogger.error(
                            "Fatal: Failed to create new public client. Block watcher cannot recover.",
                            creationError,
                        )
                        throw creationError
                    }
                }

                const delay = Math.min(
                    initialRetryDelay *
                        2 ** (this.#retriesForCurrentClient > 0 ? this.#retriesForCurrentClient - 1 : 0),
                    maxRetryDelay,
                )
                blockLogger.warn(`Retrying block watcher with ${this.#publicClient.name} in ${delay / 1000} seconds.`)
                await sleep(delay)
            }
        }
    }

    /**
     * Processes a single block received from the watcher, handling validation,
     * initial block setup, gaps, reorgs, and duplicates.
     */
    async #handleNewBlock(blockFromViem: OnBlockParameter<typeof chain, false, "latest">): Promise<void> {
        const newlyArrivedHeader = blockFromViem as BlockHeader
        if (!newlyArrivedHeader?.number || !newlyArrivedHeader.hash) {
            blockLogger.error("Received an invalid block structure from the watcher", newlyArrivedHeader)
            return
        }

        if (this.#retriesForCurrentClient > 0) {
            blockLogger.info(
                `Successfully retrieved block ${newlyArrivedHeader.number} with ${this.#publicClient.name}. Resetting retry count.`,
            )
            this.#retriesForCurrentClient = 0
        }

        if (!this.#currentBlock) {
            await this.#processInitialBlock(newlyArrivedHeader)
            return
        }

        if (newlyArrivedHeader.hash === this.#currentBlock.hash) {
            blockLogger.trace(`Received duplicate block ${newlyArrivedHeader.number}. Skipping.`)
            return
        }

        if (newlyArrivedHeader.number > this.#currentBlock.number + 1n) {
            blockLogger.warn(
                `Gap detected. Last: ${this.#currentBlock.number}, New: ${newlyArrivedHeader.number}. Attempting to fill.`,
            )
            await this.#fetchAndProcessMissedBlocks(this.#currentBlock.number + 1n, newlyArrivedHeader.number - 1n)
        } else if (newlyArrivedHeader.number <= this.#currentBlock.number) {
            blockLogger.warn(
                `Reorg detected. Last processed: ${this.#currentBlock.number} (${this.#currentBlock.hash}), new head: ${newlyArrivedHeader.number} (${newlyArrivedHeader.hash}).`,
            )
        }

        await this.#processNewHead(newlyArrivedHeader)
    }

    async #processInitialBlock(block: BlockHeader): Promise<void> {
        this.#currentBlock = block
        this.#previousBlock = undefined
        blockLogger.info(`Processing initial block: ${block.number} (hash: ${block.hash})`)
        await this.#executeOnBlockCallbacks(block)
    }

    async #processNewHead(block: BlockHeader): Promise<void> {
        this.#previousBlock = this.#currentBlock
        this.#currentBlock = block
        blockLogger.info(`Processing new head: ${this.#currentBlock.number} (hash: ${this.#currentBlock.hash})`)
        await this.#executeOnBlockCallbacks(this.#currentBlock)
    }
}
