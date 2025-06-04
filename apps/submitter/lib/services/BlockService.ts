import { sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import type { OnBlockParameter } from "viem"
import { formatBlock } from "viem/utils"
import { env } from "#lib/env"
import { RpcTransportManager } from "#lib/utils/RpcTransportManager.ts"
import { chain, type publicClient } from "#lib/utils/clients"
import { blockLogger } from "#lib/utils/logger"

export type BlockHeader = OnBlockParameter<typeof publicClient.chain, false, "latest">

// Timeout for detecting a stale block stream if no new blocks are received by BlockService
const STALE_BLOCK_STREAM_TIMEOUT_MS = 75_000 // A bit longer than RpcTransportManager's internal timeouts
// Pause duration if RpcTransportManager signals a persistent error and stops the stream
const STREAM_ERROR_RETRY_PAUSE_MS = 30_000
// Maximum timeout for a 32-bit signed integer (approx 24.8 days)
const MAX_INT32_TIMEOUT = 2147483647

export class BlockService {
    #currentBlock?: BlockHeader
    #previousBlock?: BlockHeader

    #watchdogTimeout: NodeJS.Timeout | null = null // Watchdog for the BlockService's own view of the stream
    #rpcTransportManager: RpcTransportManager
    #stopCurrentStream: (() => Promise<void>) | null = null // Function to stop the stream from RpcTransportManager
    #isWatcherActive = false // To prevent multiple concurrent watcher loops

    async getCurrentBlock(): Promise<BlockHeader> {
        if (this.#currentBlock) return this.#currentBlock
        // Wait for the first block to be processed by the watcher
        await waitForCondition(() => this.#currentBlock !== undefined, 100, 30_000)
        if (!this.#currentBlock) {
            throw new Error(
                "Current block is not set after waiting. Block stream might not be active or producing blocks.",
            )
        }
        return this.#currentBlock
    }

    onBlockCallbacks: Set<(block: BlockHeader) => void> = new Set()

    private constructor() {
        const wsUrls = env.RPC_WS_URLS && Array.isArray(env.RPC_WS_URLS) ? env.RPC_WS_URLS : []
        const httpUrls = env.RPC_HTTP_URLS && Array.isArray(env.RPC_HTTP_URLS) ? env.RPC_HTTP_URLS : []

        if (wsUrls.length === 0 && httpUrls.length === 0) {
            blockLogger.error(
                "BlockService: No WebSocket or HTTP URLs found in environment config. Block watching will be disabled.",
            )
            throw new Error("No RPC URLs provided for BlockService. Cannot initialize watcher.")
        }
        this.#rpcTransportManager = new RpcTransportManager(wsUrls, httpUrls, chain)
        void this.#startBlockWatcherLoop() // Start the persistent watcher loop
    }

    static #instance: BlockService
    public static get instance(): BlockService {
        BlockService.#instance ??= new BlockService()
        return BlockService.#instance
    }

    onBlock(callback: (block: BlockHeader) => void): () => void {
        blockLogger.trace("New subscription registered for BlockService updates.")
        this.onBlockCallbacks.add(callback)
        return () => {
            blockLogger.trace("Unsubscribed from BlockService updates.")
            this.onBlockCallbacks.delete(callback)
        }
    }

    #resetWatchdog(): void {
        if (this.#watchdogTimeout) {
            clearTimeout(this.#watchdogTimeout)
        }
        this.#watchdogTimeout = setTimeout(() => {
            blockLogger.warn(
                `BlockService Watchdog: No new block processed for ${STALE_BLOCK_STREAM_TIMEOUT_MS / 1000}s. Assuming stream is stale. Attempting to restart.`,
            )
            // Trigger a restart of the watcher loop by stopping the current stream (if any)
            // and letting the loop re-initiate.
            if (this.#stopCurrentStream) {
                this.#stopCurrentStream().catch((err) =>
                    blockLogger.error("BlockService Watchdog: Error stopping stream for restart:", err),
                )
                // #startBlockWatcherLoop's error handling or completion will trigger a new attempt.
            } else {
                // If no stop function, means stream wasn't even established. Loop should retry.
                // This state might indicate a deeper issue if #startBlockWatcherLoop isn't retrying.
                blockLogger.warn("BlockService Watchdog: No active stream to stop for restart. Loop should retry.")
            }
            // The loop itself will handle restarting. Clearing the watchdog here.
            this.#clearWatchdog()
        }, STALE_BLOCK_STREAM_TIMEOUT_MS)
    }

    #clearWatchdog(): void {
        if (this.#watchdogTimeout) {
            clearTimeout(this.#watchdogTimeout)
            this.#watchdogTimeout = null
        }
    }

    // biome-ignore lint/suspicious/noExplicitAny: viem uses this
    #handleNewRpcBlock = (rpcBlock: any): void => {
        if (!this.#isWatcherActive) return // Should not happen if stopCurrentStream was called correctly

        this.#resetWatchdog() // We received a block, so reset our own watchdog

        try {
            const block = rpcBlock.result || rpcBlock // handle both http and websocket responses
            const header = formatBlock(block) as BlockHeader
            blockLogger.trace(
                `BlockService: Received new block #${header.number?.toString()} from RpcTransportManager.`,
            )

            if (
                this.#currentBlock &&
                this.#previousBlock &&
                this.#currentBlock.number &&
                header.number &&
                this.#currentBlock.number + 1n !== header.number
            ) {
                // todo: fetch missing blocks
                blockLogger.warn(
                    `BlockService: Gap detected. New: ${header.number}, Current: ${this.#currentBlock.number}, Prev: ${this.#previousBlock.number}.`,
                )
            }
            this.#previousBlock = this.#currentBlock
            this.#currentBlock = header

            this.onBlockCallbacks.forEach(async (cb) => {
                try {
                    // blockLogger.trace(`BlockService: Invoking onBlock callback for block #${header.number}.`);
                    await cb(header)
                } catch (e) {
                    blockLogger.error("BlockService: Error in onBlockCallback", e)
                }
            })
        } catch (e) {
            blockLogger.error("BlockService: Error processing RpcBlock from manager:", e)
        }
    }

    #handleStreamError = (error: unknown, transportUrl?: string): void => {
        blockLogger.error(
            `BlockService: RpcTransportManager reported an error for ${transportUrl || "unknown transport"}: ${error}. Watcher loop will attempt to restart stream.`,
            error,
        )
        // The current stream is considered dead. #startBlockWatcherLoop will try to re-establish.
        // Ensure any active resources tied to the failed stream are cleaned up.
        if (this.#stopCurrentStream) {
            this.#stopCurrentStream().catch((e) =>
                blockLogger.warn("BlockService: Error stopping stream after manager error:", e),
            )
            this.#stopCurrentStream = null // Important: nullify so loop knows to get a new one
        }
        this.#clearWatchdog() // Stop watchdog as the stream is effectively dead
        // The #startBlockWatcherLoop will eventually re-enter its loop and try again.
    }

    #handleStreamStop = (transportUrl?: string): void => {
        blockLogger.info(
            `BlockService: RpcTransportManager confirmed stream stop for ${transportUrl || "unknown transport"}.`,
        )
        this.#clearWatchdog()
        this.#stopCurrentStream = null // Stream is stopped, clear the stop function.
        // The #startBlockWatcherLoop should continue and attempt to restart.
    }

    async #startBlockWatcherLoop(): Promise<void> {
        if (this.#isWatcherActive) {
            blockLogger.warn("BlockService: #startBlockWatcherLoop called while already active. Ignoring.")
            return
        }
        this.#isWatcherActive = true
        blockLogger.info("BlockService: Watcher loop started.")

        while (this.#isWatcherActive) {
            try {
                blockLogger.info("BlockService: Attempting to start block stream via RpcTransportManager.")
                // Ensure previous stream's stop function is cleared if it wasn't already
                if (this.#stopCurrentStream) {
                    blockLogger.warn("BlockService: Previous stream stop function was not cleared. Clearing now.")
                    await this.#stopCurrentStream() // Ensure it's stopped before starting a new one
                    this.#stopCurrentStream = null
                }

                const streamControls = await this.#rpcTransportManager.startBlockStream(
                    this.#handleNewRpcBlock,
                    this.#handleStreamError,
                    this.#handleStreamStop,
                )
                this.#stopCurrentStream = streamControls.stop

                blockLogger.info("BlockService: Block stream initiated via RpcTransportManager. Monitoring...")
                this.#resetWatchdog() // Start/reset watchdog once stream is supposedly active

                // Keep the loop "alive" by waiting for #stopCurrentStream to become null
                // This happens if #handleStreamError or #handleStreamStop is called, or if stop() is called,
                // or if the watchdog fires and calls stopCurrentStream.
                await waitForCondition(
                    () => !this.#isWatcherActive || this.#stopCurrentStream === null,
                    500, // Poll interval
                    MAX_INT32_TIMEOUT, // Use a very large number instead of Infinity
                )

                if (!this.#isWatcherActive) {
                    // If service itself was stopped
                    blockLogger.info("BlockService: Watcher loop detected service stop. Exiting.")
                    await this.#stopCurrentStream()
                    break
                }

                // If we are here, it means stopCurrentStream became null, likely due to an error or explicit stop.
                // The loop will now re-attempt to start the stream.
                blockLogger.info(
                    "BlockService: Stream ended or errored. Attempting to restart watcher loop after a pause.",
                )
            } catch (error: unknown) {
                // This catch is for unexpected errors in the #startBlockWatcherLoop itself,
                // not for errors from the RpcTransportManager's stream (those go to #handleStreamError).
                blockLogger.error(
                    `BlockService: Critical error in #startBlockWatcherLoop: ${error}. Retrying after pause.`,
                    error,
                )
                if (this.#stopCurrentStream) {
                    await this.#stopCurrentStream().catch((e) =>
                        blockLogger.error("BlockService: Error stopping stream during critical loop error:", e),
                    )
                    this.#stopCurrentStream = null
                }
            }

            if (!this.#isWatcherActive) break // Check again before sleeping

            blockLogger.info(
                `BlockService: Pausing for ${STREAM_ERROR_RETRY_PAUSE_MS / 1000}s before restarting stream attempt.`,
            )
            await sleep(STREAM_ERROR_RETRY_PAUSE_MS)
        }

        this.#isWatcherActive = false
        this.#clearWatchdog()
        blockLogger.info("BlockService: Watcher loop has fully stopped.")
    }

    /**
     * Call this method to gracefully shut down the BlockService.
     */
    public async stopService(): Promise<void> {
        blockLogger.info("BlockService: stopService called.")
        this.#isWatcherActive = false // Signal the loop to stop
        if (this.#stopCurrentStream) {
            await this.#stopCurrentStream().catch((e) =>
                blockLogger.error("BlockService: Error stopping stream during service shutdown:", e),
            )
            this.#stopCurrentStream = null
        }
        this.#clearWatchdog()
        this.onBlockCallbacks.clear() // Clear subscribers
        blockLogger.info("BlockService: Service stopped.")
    }
}
