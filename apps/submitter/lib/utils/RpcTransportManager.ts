import { sleep } from "@happy.tech/common"
import { http, webSocket } from "viem"
import type { Chain, RpcBlock, Transport, TransportConfig } from "viem"
import { blockLogger } from "#lib/utils/logger"

interface ViemWebSocketTransportValueWithSubscribe {
    subscribe(args: {
        params: ["newHeads"]
        onData: (data: RpcBlock) => void
        onError?: (error: Error) => void
    }): Promise<{ unsubscribe: () => Promise<boolean> }>
}
type ViemSubscribableWebSocketTransport = Transport<"webSocket"> & {
    value: ViemWebSocketTransportValueWithSubscribe | undefined
    config: TransportConfig<"webSocket">
}

type ViemHttpTransport = Transport<"http"> & {
    config: TransportConfig<"http">
}

type OnBlockCallback = (block: RpcBlock) => void
type OnStreamErrorCallback = (error: unknown, transportUrl?: string) => void
type OnStreamStopCallback = (transportUrl?: string) => void

const WS_INSTANTIATION_RETRY_DELAY_MS = 3000
const HTTP_INSTANTIATION_RETRY_DELAY_MS = 3000
const HTTP_POLLING_INTERVAL_MS = 100 // How often to poll for new blocks via HTTP
const MAX_CONNECTION_ATTEMPTS_PER_URL = 3 // Max attempts for a single URL before cycling

export class RpcTransportManager {
    #wsUrls: readonly string[]
    #httpUrls: readonly string[]
    #chain: Chain

    #currentWsIndex = 0
    #currentHttpIndex = 0

    #activeTransport: ViemSubscribableWebSocketTransport | ViemHttpTransport | null = null
    #activeTransportUrl: string | null = null
    #activeStreamType: "websocket" | "http" | null = null

    #wsSubscription: { unsubscribe: () => Promise<boolean> } | null = null
    #httpPollingIntervalId: NodeJS.Timeout | null = null
    #lastPolledBlockNumber: bigint | null = null
    #isStopped = false

    constructor(wsUrls: readonly string[], httpUrls: readonly string[], chain: Chain) {
        this.#wsUrls = (wsUrls || []).filter((url) => typeof url === "string" && url.trim().startsWith("ws"))
        this.#httpUrls = (httpUrls || []).filter((url) => typeof url === "string" && url.trim().startsWith("http"))
        this.#chain = chain
        blockLogger.info(
            `RpcTransportManager initialized with ${this.#wsUrls.length} WS URLs and ${this.#httpUrls.length} HTTP URLs.`,
        )
    }

    public async startBlockStream(
        onBlock: OnBlockCallback,
        onError: OnStreamErrorCallback,
        onStop?: OnStreamStopCallback,
    ): Promise<{ stop: () => Promise<void> }> {
        this.#isStopped = false
        blockLogger.info("RpcTransportManager: Attempting to start block stream...")

        // Prioritize WebSocket
        if (this.#wsUrls.length > 0) {
            const wsStarted = await this.#tryStartWebSocketStream(onBlock, onError)
            if (wsStarted) {
                return { stop: () => this.stopBlockStream(onStop) }
            }
            blockLogger.warn("RpcTransportManager: Failed to start WebSocket stream, attempting HTTP polling.")
        }

        // Fallback to HTTP Polling
        if (this.#httpUrls.length > 0) {
            const httpStarted = await this.#tryStartHttpPollingStream(onBlock, onError)
            if (httpStarted) {
                return { stop: () => this.stopBlockStream(onStop) }
            }
            blockLogger.warn("RpcTransportManager: Failed to start HTTP polling stream.")
        }

        const err = new Error(
            "RpcTransportManager: Failed to start block stream. No suitable transports (WS or HTTP) available or all attempts failed.",
        )
        onError(err)
        // Return a no-op stop function if stream couldn't start
        return {
            stop: async () => {
                blockLogger.info("RpcTransportManager: stop() called on a stream that failed to start.")
            },
        }
    }

    async #tryStartWebSocketStream(onBlock: OnBlockCallback, onError: OnStreamErrorCallback): Promise<boolean> {
        if (this.#isStopped) return false
        const initialWsIndex = this.#currentWsIndex

        do {
            if (this.#wsUrls.length === 0) return false
            const url = this.#wsUrls[this.#currentWsIndex]
            let attempts = 0

            while (attempts < MAX_CONNECTION_ATTEMPTS_PER_URL) {
                if (this.#isStopped) return false
                attempts++
                blockLogger.info(
                    `RpcTransportManager: Attempting WS connection to ${url} (Attempt ${attempts}/${MAX_CONNECTION_ATTEMPTS_PER_URL}, Index ${this.#currentWsIndex})`,
                )
                try {
                    const instanceKey = `rpc-manager-ws-${this.#currentWsIndex}-${attempts}-${Date.now()}`
                    const transportFactory = webSocket(url, {
                        key: instanceKey,
                        name: `RpcManager WS ${this.#currentWsIndex}`,
                    })
                    const transportInstance = transportFactory({
                        chain: this.#chain,
                    }) as ViemSubscribableWebSocketTransport

                    if (transportInstance.value && typeof transportInstance.value.subscribe === "function") {
                        this.#wsSubscription = await transportInstance.value.subscribe({
                            params: ["newHeads"],
                            onData: (data: RpcBlock) => {
                                if (this.#isStopped) return
                                // blockLogger.trace(`RpcTransportManager: WS data received from ${url}`, data);
                                onBlock(data)
                            },
                            onError: (streamError: Error) => {
                                if (this.#isStopped) return
                                blockLogger.error(
                                    `RpcTransportManager: WS subscription error from ${url}: ${streamError.message}`,
                                    streamError,
                                )
                                this.#cleanupCurrentStream() // Cleanup before notifying error
                                onError(streamError, url) // This signals BlockService to potentially retry startBlockStream
                            },
                        })
                        this.#activeTransport = transportInstance
                        this.#activeTransportUrl = url
                        this.#activeStreamType = "websocket"
                        blockLogger.info(`RpcTransportManager: Successfully subscribed to newHeads via WS: ${url}`)
                        return true
                    } else {
                        blockLogger.error(
                            `RpcTransportManager: Instantiated WS transport for ${url} is not valid (missing .value.subscribe).`,
                        )
                    }
                } catch (e: unknown) {
                    blockLogger.error(
                        `RpcTransportManager: Error instantiating/subscribing WS transport for ${url}: ${e}`,
                        e,
                    )
                }
                if (attempts < MAX_CONNECTION_ATTEMPTS_PER_URL && !this.#isStopped)
                    await sleep(WS_INSTANTIATION_RETRY_DELAY_MS)
            }
            // Failed all attempts for this URL, cycle to next
            this.#currentWsIndex = (this.#currentWsIndex + 1) % this.#wsUrls.length
        } while (this.#currentWsIndex !== initialWsIndex && !this.#isStopped)

        return false // All WS URLs failed
    }

    async #tryStartHttpPollingStream(onBlock: OnBlockCallback, onError: OnStreamErrorCallback): Promise<boolean> {
        if (this.#isStopped) return false
        const initialHttpIndex = this.#currentHttpIndex
        this.#lastPolledBlockNumber = null // Reset for new polling attempt

        do {
            if (this.#httpUrls.length === 0) return false
            const url = this.#httpUrls[this.#currentHttpIndex]
            let attempts = 0

            while (attempts < MAX_CONNECTION_ATTEMPTS_PER_URL) {
                if (this.#isStopped) return false
                attempts++
                blockLogger.info(
                    `RpcTransportManager: Attempting HTTP connection to ${url} (Attempt ${attempts}/${MAX_CONNECTION_ATTEMPTS_PER_URL}, Index ${this.#currentHttpIndex})`,
                )
                try {
                    const instanceKey = `rpc-manager-http-${this.#currentHttpIndex}-${attempts}-${Date.now()}`
                    const transportFactory = http(url, {
                        key: instanceKey,
                        name: `RpcManager HTTP ${this.#currentHttpIndex}`,
                    })
                    const transportInstance = transportFactory({ chain: this.#chain }) as ViemHttpTransport

                    // Perform a quick test request to validate the HTTP transport
                    const testBlock = (await transportInstance.request({ method: "eth_blockNumber" })) as string
                    if (!testBlock)
                        throw new Error("HTTP transport validation failed (eth_blockNumber returned null/empty).")

                    this.#activeTransport = transportInstance
                    this.#activeTransportUrl = url
                    this.#activeStreamType = "http"

                    // Fetch initial block to set baseline
                    try {
                        const initialRpcBlock = (await this.#activeTransport.request({
                            method: "eth_getBlockByNumber",
                            params: ["latest", false],
                        })) as RpcBlock
                        if (initialRpcBlock?.number) {
                            this.#lastPolledBlockNumber = BigInt(initialRpcBlock.number)
                            blockLogger.info(
                                `RpcTransportManager: HTTP polling baseline block: #${this.#lastPolledBlockNumber} from ${url}`,
                            )
                            // Optionally call onBlock for the very first block if desired by BlockService
                            // onBlock(initialRpcBlock);
                        } else {
                            blockLogger.warn(
                                `RpcTransportManager: Could not get initial block for HTTP polling from ${url}.`,
                            )
                        }
                    } catch (initBlockError: unknown) {
                        blockLogger.warn(
                            `RpcTransportManager: Error fetching initial block for HTTP polling from ${url}: ${initBlockError}`,
                        )
                        // Don't fail the stream start for this, polling will try to recover
                    }

                    this.#httpPollingIntervalId = setInterval(async () => {
                        if (this.#isStopped || !this.#activeTransport || this.#activeStreamType !== "http") {
                            if (this.#httpPollingIntervalId) clearInterval(this.#httpPollingIntervalId)
                            this.#httpPollingIntervalId = null
                            return
                        }
                        try {
                            // blockLogger.trace(`RpcTransportManager: HTTP polling ${url} for new blocks...`);
                            const latestBlock = (await this.#activeTransport.request({
                                method: "eth_getBlockByNumber",
                                params: ["latest", false],
                            })) as RpcBlock
                            if (latestBlock?.number) {
                                const latestBlockNumber = BigInt(latestBlock.number)
                                if (
                                    this.#lastPolledBlockNumber === null ||
                                    latestBlockNumber > this.#lastPolledBlockNumber
                                ) {
                                    // blockLogger.trace(`RpcTransportManager: HTTP new block detected #${latestBlockNumber} from ${url}`);
                                    if (
                                        this.#lastPolledBlockNumber !== null &&
                                        latestBlockNumber > this.#lastPolledBlockNumber + 1n
                                    ) {
                                        blockLogger.warn(
                                            `RpcTransportManager: HTTP polling gap detected. From ${this.#lastPolledBlockNumber} to ${latestBlockNumber}. Processing latest only.`,
                                        )
                                        // TODO: Optionally fetch missing blocks in a range if strict sequential processing is needed.
                                    }
                                    this.#lastPolledBlockNumber = latestBlockNumber
                                    onBlock(latestBlock)
                                }
                            }
                        } catch (pollError: unknown) {
                            blockLogger.error(
                                `RpcTransportManager: HTTP polling error from ${url}: ${pollError}`,
                                pollError,
                            )
                            // If polling fails consistently, we might want to trigger the main onError
                            // This could lead to cycling the HTTP transport.
                            if (this.#httpPollingIntervalId) clearInterval(this.#httpPollingIntervalId)
                            this.#httpPollingIntervalId = null
                            this.#cleanupCurrentStream()
                            onError(pollError, url) // Signals BlockService to potentially retry startBlockStream
                        }
                    }, HTTP_POLLING_INTERVAL_MS)

                    blockLogger.info(`RpcTransportManager: Successfully started HTTP polling via: ${url}`)
                    return true
                } catch (e: unknown) {
                    blockLogger.error(
                        `RpcTransportManager: Error instantiating/validating HTTP transport for ${url}: ${e.message}`,
                        e,
                    )
                }
                if (attempts < MAX_CONNECTION_ATTEMPTS_PER_URL && !this.#isStopped)
                    await sleep(HTTP_INSTANTIATION_RETRY_DELAY_MS)
            }
            this.#currentHttpIndex = (this.#currentHttpIndex + 1) % this.#httpUrls.length
        } while (this.#currentHttpIndex !== initialHttpIndex && !this.#isStopped)

        return false // All HTTP URLs failed
    }

    #cleanupCurrentStream(): void {
        blockLogger.trace(`RpcTransportManager: Cleaning up current stream (type: ${this.#activeStreamType}).`)
        if (this.#wsSubscription) {
            this.#wsSubscription
                .unsubscribe()
                .catch((err) => blockLogger.warn("RpcTransportManager: Error during WS unsubscribe", err))
            this.#wsSubscription = null
        }
        if (this.#httpPollingIntervalId) {
            clearInterval(this.#httpPollingIntervalId)
            this.#httpPollingIntervalId = null
        }
        this.#activeTransport = null
        this.#activeTransportUrl = null
        this.#activeStreamType = null
    }

    public async stopBlockStream(onStop?: OnStreamStopCallback): Promise<void> {
        if (this.#isStopped) {
            blockLogger.trace("RpcTransportManager: stopBlockStream called, but stream already marked as stopped.")
            return
        }
        this.#isStopped = true
        const stoppedUrl = this.#activeTransportUrl
        blockLogger.info(
            `RpcTransportManager: Stopping block stream (was type: ${this.#activeStreamType}, URL: ${stoppedUrl || "N/A"}).`,
        )

        this.#cleanupCurrentStream()

        if (onStop) {
            onStop(stoppedUrl || undefined)
        }
        blockLogger.info("RpcTransportManager: Block stream stopped.")
    }
}
