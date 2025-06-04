import { sleep } from "@happy.tech/common"
import { webSocket } from "viem"
import type { Chain, Transport, TransportConfig } from "viem"
import { blockLogger } from "#lib/utils/logger"

const TRANSPORT_INSTANTIATION_RETRY_DELAY_MS = 5000 // Delay if a URL fails to instantiate

// This interface describes the expected structure of the `value` property
// within a Viem WebSocket transport, specifically the `subscribe` method.
interface ViemWebSocketTransportValueWithSubscribe {
    subscribe(args: {
        params: ["newHeads"] // Or other subscription types
        onData: (data: any) => void // Data type depends on subscription
        onError?: (error: Error) => void
    }): Promise<{ unsubscribe: () => Promise<boolean> }>
    // Potentially other methods like getSocket, getRpcClient could be here
}

// This type represents a Viem WebSocket transport that is confirmed to have
// the .value.subscribe structure.
type ViemSubscribableWebSocketTransport = Transport<"webSocket"> & {
    value: ViemWebSocketTransportValueWithSubscribe | undefined // value can be undefined if connection fails
    config: TransportConfig<"webSocket">
}

export class WebSocketTransportManager {
    #wsUrls: readonly string[]
    #chain: Chain
    #currentTransportIndex = 0
    #selectedTransportInstance: ViemSubscribableWebSocketTransport | null = null

    constructor(wsUrls: readonly string[], chain: Chain) {
        if (!wsUrls || wsUrls.length === 0) {
            blockLogger.warn("WebSocketTransportManager: Initialized with no WebSocket URLs.")
            this.#wsUrls = []
        } else {
            // Filter out any potentially empty or invalid URLs early
            this.#wsUrls = wsUrls.filter((url) => typeof url === "string" && url.trim().startsWith("ws"))
            if (this.#wsUrls.length !== wsUrls.length) {
                blockLogger.warn(
                    "WebSocketTransportManager: Some invalid WebSocket URLs were filtered out during initialization.",
                )
            }
        }
        this.#chain = chain
        blockLogger.info(`WebSocketTransportManager initialized with ${this.#wsUrls.length} valid URLs.`)
    }

    /**
     * Attempts to get a Viem WebSocket transport instance that has a .value.subscribe method.
     * It will try to instantiate a transport from the current URL.
     * If instantiation fails or the instance is invalid, it cycles to the next URL.
     * @returns A Viem WebSocket Transport instance (cast to ViemSubscribableWebSocketTransport) or null if all URLs fail.
     */
    public async getTransport(): Promise<ViemSubscribableWebSocketTransport | null> {
        if (this.#wsUrls.length === 0) {
            blockLogger.error("WebSocketTransportManager: No WebSocket URLs configured to get a transport.")
            return null
        }

        // If we have a selected instance and it's considered valid (has .value.subscribe)
        if (
            this.#selectedTransportInstance?.value &&
            typeof this.#selectedTransportInstance.value.subscribe === "function"
        ) {
            // blockLogger.trace(`WebSocketTransportManager: Returning existing valid transport instance for ${this.#getTransportIdentifier(this.#selectedTransportInstance)}`);
            return this.#selectedTransportInstance
        }
        // If instance exists but is invalid, nullify it so we create a new one
        if (this.#selectedTransportInstance) {
            blockLogger.warn(
                `WebSocketTransportManager: Existing transport instance for ${this.#getTransportIdentifier(this.#selectedTransportInstance)} was invalid. Attempting to create a new one.`,
            )
            this.#selectedTransportInstance = null
        }

        const initialIndex = this.#currentTransportIndex
        do {
            const url = this.#wsUrls[this.#currentTransportIndex]
            if (!url) {
                // Should not happen if constructor filters properly
                blockLogger.error(
                    `WebSocketTransportManager: URL at index ${this.#currentTransportIndex} is invalid (should have been filtered).`,
                )
                if (await this.#cycleToNextUrlAndCheckIfLooped(initialIndex)) return null
                continue
            }

            blockLogger.info(
                `WebSocketTransportManager: Attempting to instantiate transport for URL: ${url} (Index ${this.#currentTransportIndex})`,
            )
            try {
                const instanceKey = `transport-manager-ws-${this.#currentTransportIndex}-${Date.now()}`
                const transportFactory = webSocket(url, {
                    key: instanceKey,
                    name: `TransportManager WS ${this.#currentTransportIndex} (${url.substring(0, Math.min(url.length, 30))}...)`,
                    // Viem's default retryCount for WebSocket is 0. Can be set here if needed.
                    // retryCount: 0,
                })

                // The factory returns a function that takes the chain
                const transportInstanceFromFactory = transportFactory({ chain: this.#chain })

                // Check if the instantiated transport has the .value.subscribe structure
                if (
                    transportInstanceFromFactory.value &&
                    typeof transportInstanceFromFactory.value.subscribe === "function"
                ) {
                    this.#selectedTransportInstance = transportInstanceFromFactory as ViemSubscribableWebSocketTransport
                    blockLogger.info(
                        `WebSocketTransportManager: Successfully instantiated valid subscribable transport for ${url}.`,
                    )
                    return this.#selectedTransportInstance
                } else {
                    blockLogger.error(
                        `WebSocketTransportManager: Instantiated transport for ${url} is not valid (missing .value.subscribe). Value: ${JSON.stringify(transportInstanceFromFactory.value)}`,
                    )
                    this.#selectedTransportInstance = null
                }
            } catch (e: any) {
                blockLogger.error(
                    `WebSocketTransportManager: Error instantiating transport for ${url}: ${e.message}`,
                    e,
                )
                this.#selectedTransportInstance = null
            }

            // If instantiation failed or transport was invalid
            if (!this.#selectedTransportInstance) {
                blockLogger.warn(
                    `WebSocketTransportManager: Failed for URL ${url}. Pausing for ${TRANSPORT_INSTANTIATION_RETRY_DELAY_MS / 1000}s before trying next URL.`,
                )
                await sleep(TRANSPORT_INSTANTIATION_RETRY_DELAY_MS)
            }
            if (await this.#cycleToNextUrlAndCheckIfLooped(initialIndex)) return null
        } while (this.#currentTransportIndex !== initialIndex || !this.#selectedTransportInstance) // Loop if we haven't tried all or haven't got an instance

        if (!this.#selectedTransportInstance) {
            blockLogger.error(
                "WebSocketTransportManager: Exhausted all WebSocket URLs without creating a valid transport instance.",
            )
        }
        return this.#selectedTransportInstance
    }

    /**
     * Invalidates the current transport and attempts to get the next available one.
     * @returns The next Viem WebSocket Transport instance or null if all URLs fail.
     */
    public async cycleToNextTransport(): Promise<ViemSubscribableWebSocketTransport | null> {
        const currentId = this.#selectedTransportInstance
            ? this.#getTransportIdentifier(this.#selectedTransportInstance)
            : "current (none)"
        blockLogger.info(
            `WebSocketTransportManager: Cycling from ${currentId} to next transport due to external request.`,
        )

        // Perform any explicit disconnection if the transport supports it
        await this.disconnectCurrentTransport() // This mostly nullifies our reference

        this.#currentTransportIndex = (this.#currentTransportIndex + 1) % this.#wsUrls.length
        return this.getTransport()
    }

    async #cycleToNextUrlAndCheckIfLooped(initialIndex: number): Promise<boolean> {
        this.#currentTransportIndex = (this.#currentTransportIndex + 1) % this.#wsUrls.length
        if (this.#currentTransportIndex === initialIndex) {
            blockLogger.warn(
                "WebSocketTransportManager: Cycled through all available WebSocket URLs in this attempt sequence.",
            )
            return true
        }
        return false
    }

    #getTransportIdentifier(transport: ViemSubscribableWebSocketTransport | null): string {
        if (transport?.config) {
            if (typeof transport.config.name === "string" && transport.config.name.length > 0) {
                return transport.config.name
            }
            if (typeof transport.config.key === "string" && transport.config.key.length > 0) {
                return transport.config.key
            }
        }
        return `transport at index ${this.#currentTransportIndex}`
    }

    public async disconnectCurrentTransport(): Promise<void> {
        if (this.#selectedTransportInstance) {
            const transportId = this.#getTransportIdentifier(this.#selectedTransportInstance)
            blockLogger.trace(
                `WebSocketTransportManager: Clearing reference to transport: ${transportId}. Viem manages actual WebSocket closure.`,
            )
            // Viem's WebSocket transport typically closes the socket when there are no active requests or subscriptions,
            // or when the EIP-1193 provider instance is garbage collected.
            // There isn't a standard public 'disconnect()' method on the transport object itself.
            this.#selectedTransportInstance = null
        }
    }
}
