import { promiseWithResolvers, sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import type { OnBlockParameter, Transport, TransportConfig } from "viem"
import type { RpcBlock } from "viem"
import { env } from "#lib/env"
import { formatBlock } from "viem/utils"
import { WebSocketTransportManager } from "#lib/utils/WebSocketTransportManager" 
import { chain, type publicClient } from "#lib/utils/clients"
import { blockLogger } from "#lib/utils/logger"

export type BlockHeader = OnBlockParameter<typeof publicClient.chain, false, "latest">
interface ViemWebSocketTransportValue {
    subscribe(args: {
        params: ["newHeads"]
        onData: (data: RpcBlock) => void
        onError?: (error: Error) => void
    }): Promise<{ unsubscribe: () => Promise<boolean> }>
}


type SpecificSubscribeTransport = Transport<"webSocket"> & {
    value: ViemWebSocketTransportValue | undefined // value can be undefined if connection fails
    config: TransportConfig<"webSocket">
}

// Timeout for detecting a stale subscription if no new blocks are received.
const STALE_SUBSCRIPTION_TIMEOUT_MS = 60_000 // 60 seconds
// Pause duration if the transport manager cannot provide a transport (e.g., all URLs failed)
const NO_TRANSPORT_PAUSE_MS = 60_000

export class BlockService {
    #currentBlock?: BlockHeader
    #previousBlock?: BlockHeader

    #activeSubscription: { unsubscribe: () => Promise<boolean> } | null = null
    #watchdogTimeout: NodeJS.Timeout | null = null

    #transportManager: WebSocketTransportManager
    #selectedTransportInstance: SpecificSubscribeTransport | null = null

    async getCurrentBlock(): Promise<BlockHeader> {
        if (this.#currentBlock) return this.#currentBlock
        await waitForCondition(() => this.#currentBlock !== undefined, 100, 30_000)
        if (!this.#currentBlock)
            throw new Error("Current block is not set after waiting. Watcher might be unhealthy or no blocks produced.")
        return this.#currentBlock
    }

    onBlockCallbacks: Set<(block: BlockHeader) => void> = new Set()

    private constructor() {
        const wsUrls = env.RPC_WS_URLS && Array.isArray(env.RPC_WS_URLS) ? env.RPC_WS_URLS : []
        if (wsUrls.length === 0) {
            blockLogger.warn(
                "BlockService: No WebSocket URLs found in env.RPC_WS_URLS. Real-time block watching via direct transport will be disabled.",
            )
        }
        this.#transportManager = new WebSocketTransportManager(wsUrls, chain)
        void this.#startBlockWatcher()
    }

    static #instance: BlockService
    public static get instance(): BlockService {
        BlockService.#instance ??= new BlockService()
        return BlockService.#instance
    }

    onBlock(callback: (block: BlockHeader) => void): () => void {
        blockLogger.trace("New subscription registered for block updates.")
        this.onBlockCallbacks.add(callback)

        if (this.#currentBlock) {
            blockLogger.trace("Invoking callback immediately with current block for new subscriber.")
            Promise.resolve()
                .then(() => callback(this.#currentBlock!))
                .catch((e) => {
                    blockLogger.error("Error in immediate onBlock callback invocation", e)
                })
        }

        return () => {
            blockLogger.trace("Unsubscribed from block updates.")
            this.onBlockCallbacks.delete(callback)
        }
    }

    #getTransportUrlForLogging(transport: SpecificSubscribeTransport | null): string {
        if (transport?.config) {
            if (typeof transport.config.name === "string" && transport.config.name.length > 0) {
                return transport.config.name
            }
            if (typeof transport.config.key === "string" && transport.config.key.length > 0) {
                return transport.config.key
            }
        }
        return "unknown transport"
    }

    #resetWatchdog(rejectPromiseOnTimeout: (reason?: any) => void): void {
        if (this.#watchdogTimeout) {
            clearTimeout(this.#watchdogTimeout)
        }
        this.#watchdogTimeout = setTimeout(() => {
            const transportUrl = this.#getTransportUrlForLogging(this.#selectedTransportInstance)
            blockLogger.warn(
                `Block watcher watchdog: No block received from ${transportUrl} for ${STALE_SUBSCRIPTION_TIMEOUT_MS / 1000}s. Assuming stale subscription.`,
            )
            rejectPromiseOnTimeout(new Error(`Watchdog: Stale subscription on ${transportUrl}.`))
        }, STALE_SUBSCRIPTION_TIMEOUT_MS)
    }

    #clearWatchdog(): void {
        if (this.#watchdogTimeout) {
            clearTimeout(this.#watchdogTimeout)
            this.#watchdogTimeout = null
        }
    }

    async #cleanupSubscription(): Promise<void> {
        blockLogger.trace("Cleaning up existing block subscription...")
        this.#clearWatchdog()

        if (this.#activeSubscription) {
            try {
                const transportUrl = this.#getTransportUrlForLogging(this.#selectedTransportInstance)
                blockLogger.info(`Attempting to unsubscribe from newHeads via ${transportUrl}.`)
                const unsubscribed = await this.#activeSubscription.unsubscribe()
                if (unsubscribed) {
                    blockLogger.info(`Successfully unsubscribed from newHeads via ${transportUrl}.`)
                } else {
                    blockLogger.warn(`Failed to unsubscribe from newHeads via ${transportUrl} or already unsubscribed.`)
                }
            } catch (e) {
                blockLogger.error("Error unsubscribing from newHeads via transport", e)
            }
            this.#activeSubscription = null
        }
        this.#selectedTransportInstance = null
        blockLogger.trace("Subscription cleanup finished.")
    }

    async #startBlockWatcher(): Promise<void> {
        const initialRetryDelay = 1000
        const maxRetryDelay = 30_000
        const maxRetriesPerTransportInstance = 3

        while (true) {
            const genericTransport = await this.#transportManager.getTransport()

            if (!genericTransport) {
                blockLogger.error("BlockService: Transport manager could not provide a WebSocket transport. Pausing.")
                await this.#cleanupSubscription()
                await sleep(NO_TRANSPORT_PAUSE_MS)
                continue
            }

            this.#selectedTransportInstance = genericTransport as SpecificSubscribeTransport

            // make ts happy with the type
            if (
                !this.#selectedTransportInstance.value ||
                typeof this.#selectedTransportInstance.value.subscribe !== "function"
            ) {
                blockLogger.error(
                    `BlockService: Selected transport instance from manager (key: ${this.#selectedTransportInstance.config.key}) is missing 'value.subscribe'. Cycling.`,
                )
                await this.#cleanupSubscription()
                const nextGenericTransport = await this.#transportManager.cycleToNextTransport()
                if (!nextGenericTransport) {
                    blockLogger.warn(
                        "BlockService: Transport manager could not provide a new transport after cycling. Outer loop will pause and retry.",
                    )
                } // else the next iteration will pick it up
                continue
            }

            const currentTransportUrl = this.#getTransportUrlForLogging(this.#selectedTransportInstance)
            blockLogger.info(`BlockService attempting to use WebSocket transport: ${currentTransportUrl}`)

            let retriesOnCurrentInstance = 0
            while (retriesOnCurrentInstance < maxRetriesPerTransportInstance) {
                const { promise, reject } = promiseWithResolvers<void>()
                try {
                    blockLogger.info(
                        `Attempt ${retriesOnCurrentInstance + 1}/${maxRetriesPerTransportInstance} to subscribe via ${currentTransportUrl}.`,
                    )

                    const subscription = await this.#selectedTransportInstance.value.subscribe({
                        params: ["newHeads"],
                        onData: (data: any) => {
                            try {
                                this.#resetWatchdog(reject)
                                const header = formatBlock(data.result) as BlockHeader
                                blockLogger.trace(
                                    `Received new block #${header.number?.toString()} via ${currentTransportUrl} `,
                                )
                                console.log(header)

                                retriesOnCurrentInstance = 0

                                if (
                                    this.#currentBlock &&
                                    this.#previousBlock &&
                                    this.#currentBlock.number &&
                                    header.number &&
                                    this.#currentBlock.number + 1n !== header.number
                                ) {
                                    blockLogger.warn(
                                        `Gap in block numbers on ${currentTransportUrl}: new=${header.number}, current=${this.#currentBlock.number}, prev=${this.#previousBlock.number}.`,
                                    )
                                }
                                this.#previousBlock = this.#currentBlock
                                this.#currentBlock = header
                                this.onBlockCallbacks.forEach(async (cb) => {
                                    try {
                                        blockLogger.trace(`Invoking onBlock callback for block #${header.number}.`)
                                        await cb(header)
                                    } catch (e) {
                                        blockLogger.error("Error in onBlockCallback", e)
                                    }
                                })
                            } catch (e) {
                                blockLogger.error(`Error processing data from ${currentTransportUrl}:`, e)
                            }
                        },
                        onError: (error: Error) => {
                            blockLogger.error(`Subscription error from ${currentTransportUrl}:`, error)
                            reject(error)
                        },
                    })

                    this.#activeSubscription = { unsubscribe: subscription.unsubscribe }
                    blockLogger.info(`Successfully subscribed to newHeads via ${currentTransportUrl}.`)
                    this.#resetWatchdog(reject)

                    await promise
                    blockLogger.warn(
                        `Subscription promise resolved unexpectedly for ${currentTransportUrl}. Re-establishing.`,
                    )
                    reject(new Error("Subscription promise resolved unexpectedly"))
                } catch (error: any) {
                    blockLogger.error(
                        `Failed attempt ${retriesOnCurrentInstance + 1} for ${currentTransportUrl}: ${error.message}`,
                    )
                    await this.#cleanupSubscription()

                    retriesOnCurrentInstance++
                    if (retriesOnCurrentInstance < maxRetriesPerTransportInstance) {
                        const delay = Math.min(initialRetryDelay * 2 ** (retriesOnCurrentInstance - 1), maxRetryDelay)
                        blockLogger.warn(`Retrying connection to ${currentTransportUrl} in ${delay / 1000}s.`)
                        await sleep(delay)

                        const newGenericTransport = await this.#transportManager.getTransport()
                        if (!newGenericTransport) {
                            blockLogger.error(
                                "BlockService: Lost transport from manager during retry. Will try to get a new one in outer loop.",
                            )
                            this.#selectedTransportInstance = null
                            break
                        }
                        this.#selectedTransportInstance = newGenericTransport as SpecificSubscribeTransport
                        if (
                            !this.#selectedTransportInstance.value ||
                            typeof this.#selectedTransportInstance.value.subscribe !== "function"
                        ) {
                            blockLogger.error(
                                `BlockService: Re-acquired transport (key: ${this.#selectedTransportInstance.config.key}) is missing 'value.subscribe'. Breaking inner retry loop.`,
                            )
                            this.#selectedTransportInstance = null
                            break
                        }
                    } else {
                        blockLogger.error(
                            `All ${maxRetriesPerTransportInstance} attempts failed for ${currentTransportUrl}. Requesting manager to cycle.`,
                        )
                        const nextGenericTransport = await this.#transportManager.cycleToNextTransport()
                        // No need to assign to this.#selectedTransportInstance here,
                        // the outer loop will call getTransport() which handles assignment.
                        if (!nextGenericTransport) {
                            blockLogger.warn(
                                "BlockService: Transport manager could not provide a new transport after cycling. Outer loop will pause and retry.",
                            )
                        }
                        break
                    }
                }
            }

            await this.#cleanupSubscription()
        }
    }
}
