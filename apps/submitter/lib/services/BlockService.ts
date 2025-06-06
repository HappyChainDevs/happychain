import { exit } from "node:process"
import { type Hash, Mutex, type RejectType, promiseWithResolvers, sleep } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import { type OnBlockParameter, type PublicClient, type RpcBlock, formatBlock } from "viem"
import { http, createPublicClient, webSocket } from "viem"
import { LruCache } from "#lib/utils/LruCache.ts"
import { chain, rpcUrls } from "#lib/utils/clients" // Assuming these are correctly imported
import { blockLogger } from "#lib/utils/logger"

const BLOCK_TIME = 2000
const MAX_BACKFILL = 15n

export type Block = OnBlockParameter<typeof chain>

export class BlockService {
    #current?: Block
    #previous?: Block
    #client!: PublicClient
    #backfillMutex = new Mutex()
    #callbacks: Set<(block: Block) => void | Promise<void>> = new Set()

    /** Zero-index attempt number for the current client. */
    #attempt = 0

    /** Index of the current rpc URL in {@link rpcUrls} */
    #rpcUrlIndex = -1

    /** Number of RPCs we attempted to hit up we successfully fetched the last block while monitoring. */
    #rpcAttemptedSinceLastBlock = 0

    /**
     * Maps block numbers to their hashes, which can be used to discriminate between
     * re-orgs and out-of-order block delivery as long as the block number is in the cache.
     */
    #blockHistory = new LruCache<bigint, Hash>(1000)

    /** Call this to unwind the current block subscription and skip to the next client. */
    #skipToNextClient!: RejectType

    /** Timeout for receiving a block. Private so it can be disabled in tests. */
    private blockTimeout: Timer | undefined = undefined

    static #instance: BlockService
    public static get instance(): BlockService {
        BlockService.#instance ??= new BlockService()
        return BlockService.#instance
    }

    private constructor() {
        void this.#startBlockWatcher()
    }

    // =================================================================================================================
    // PUBLIC METHODS

    async getCurrentBlock(): Promise<Block> {
        if (this.#current) return this.#current
        await waitForCondition(() => this.#current !== undefined, 5000)
        if (!this.#current) {
            const msg = "Current block is not set after waiting 5s."
            blockLogger.error(msg)
            throw Error(msg)
        }
        return this.#current
    }

    /** Register a callback on the current block. */
    onBlock(callback: (block: Block) => void): () => void {
        this.#callbacks.add(callback)
        return () => this.#callbacks.delete(callback)
    }

    // =================================================================================================================
    // RPC SELECTION

    /**
     * Sets {@link this.#publicClient} to the next public client. We try to hit up all RPCs with a short timeout
     * and select the first one in the {@link rpcUrls} list that gives an answer. The current RPC is excluded from
     * the search. If no RPCs answer, we select the next one in the list (with wraparound) and pray for the best.
     */
    async #nextPublicClient(): Promise<PublicClient> {
        if (this.#rpcAttemptedSinceLastBlock++ === rpcUrls.length) {
            // We've cycled through all the RPCs without a successful block
            // fetch. Halt and catch fire, maybe a service restart will help.
            blockLogger.error("Cycled through all RPCs without a successful block fetch. Halting process.")
            // TODO alerting
            exit(1)
        }

        // Request a block from all RPCs with a short timeout.
        const rpcResults = await Promise.allSettled(
            rpcUrls.map((url, i) =>
                i === this.#rpcUrlIndex
                    ? Promise.reject()
                    : this.#createPublicClient(url, 500).getBlock({ includeTransactions: false }),
            ),
        )
        const index = rpcResults.findIndex((it) => it.status === "fulfilled")
        if (index >= 0) this.#rpcUrlIndex = index
        else this.#rpcUrlIndex = (this.#rpcUrlIndex + 1) % rpcUrls.length

        // `rpcUrls` is guaranteed non empty, and urls always start with "http" or "ws"
        const url = rpcUrls[this.#rpcUrlIndex]
        blockLogger.trace("Creating public client", url)
        return this.#createPublicClient(url)
    }

    #createPublicClient(url: string, timeout = 10_000): PublicClient {
        const isWs = url.startsWith("ws")
        const transport = isWs ? webSocket(url, { timeout }) : http(url, { timeout })
        return createPublicClient({ chain, name: url, transport })
    }

    // =================================================================================================================
    // BLOCK MONITORING

    async #startBlockWatcher(): Promise<void> {
        const initialRetryDelay = 1000
        const maxRetryDelay = 8_000
        const maxAttempts = 4 // per client
        const pollingInterval = 200
        let skipToNextClient = false

        // noinspection InfiniteLoopJS
        while (true) {
            // 1. Initialize next client if needed, or wait until next attempt.
            init: try {
                if (!this.#client /* very first init */ || skipToNextClient) {
                    this.#client = await this.#nextPublicClient()
                    break init
                }

                if (this.#attempt >= maxAttempts) {
                    blockLogger.warn(`Max retries (${maxAttempts}) reached for ${this.#client.name}.`)
                    this.#client = await this.#nextPublicClient()
                    this.#attempt = 0
                    break init
                }

                const delay = Math.min(initialRetryDelay * 2 ** this.#attempt, maxRetryDelay)
                blockLogger.info(`Waiting ${delay / 1000} seconds to retry with ${this.#client.name}`)
                await sleep(delay)
                //
            } catch (e) {
                blockLogger.error(`Failed to create new public client for ${rpcUrls[this.#rpcUrlIndex]}}`, e)
                skipToNextClient = true
                continue
            }

            const client = this.#client.name
            blockLogger.info(`Starting block watcher with ${client} (Attempt ${this.#attempt + 1}/${maxAttempts}).`)

            // 2. Setup subscription
            const { promise, reject } = promiseWithResolvers<void>()
            this.#skipToNextClient = reject
            let unsubscribe: (() => void) | null = null
            let pollingTimer: Timer | undefined = undefined
            try {
                this.#startBlockTimeout()
                void this.#handleNewBlock(await this.#client.getBlock())

                if (this.#client.transport.type === "webSocket") {
                    ;({ unsubscribe } = await this.#client.transport.subscribe({
                        params: ["newHeads"],
                        onData: async (data: { result: Partial<RpcBlock> }) =>
                            void this.#handleNewBlock(formatBlock(data.result) as Block),
                        onError: reject,
                    }))
                } else {
                    pollingTimer = setInterval(async () => {
                        void this.#handleNewBlock(await this.#client.getBlock())
                    }, pollingInterval)
                }

                // The above is equivalent to the below Viem watchBlock invocation. However, our version
                // does not incur an extra useless eth_getBlock call when subscribing via WebSocket.
                // Additionally, we duplicate a lot of the bookkeeping logic to be able to support cycling
                // between RPCs in case of failure, so we might as well avoid having two layers doing this.

                // unwatch = this.#client.watchBlocks({
                //     pollingInterval,
                //     includeTransactions: false,
                //     emitOnBegin: true,
                //     emitMissed: true,
                //     onBlock: this.#handleNewBlock.bind(this),
                //     onError: reject,
                // })

                await promise // Waits forever unless these is an error.
            } catch (e) {
                unsubscribe?.()
                clearInterval(pollingTimer)
                clearTimeout(this.blockTimeout)
                blockLogger.error("Block watcher error", client, e)
                ++this.#attempt
            }
        }
    }

    #startBlockTimeout() {
        this.blockTimeout = setTimeout(() => {
            this.#skipToNextClient("Timed out while waiting for block")
        }, BLOCK_TIME + 1000)
    }

    async #handleNewBlock(block: Block, allowBackfill = true): Promise<void> {
        // Validate format
        if (!block?.number || !block.hash) {
            blockLogger.error("Received an invalid block from the watcher, skipping.", block)
            // If this results in a gap or no more blocks come in, we'll notice. Same applies to other skips.
            return
        }

        // Check for duplicates
        if (block.hash === this.#current?.hash) {
            // Don't warn when polling, since this is expected to happen all the time.
            if (this.#client.transport.type === "webSocket")
                blockLogger.warn(`Received duplicate block ${block.number}, skipping.`)
            return
        }

        // otherwise it's the very first block after starting
        if (this.#current) {
            const curNum = this.#current.number
            const curHash = this.#current.hash

            // Check for out-of-order deliveries (block number gap)
            if (block.number > curNum + 1n) {
                clearTimeout(this.blockTimeout)
                // If we can't fill the gap, skip this block and move onto the next RPC.
                if (allowBackfill && !(await this.#backfill(curNum + 1n, block.number - 1n))) {
                    this.#skipToNextClient("Couldn't fill nonce gap.")
                    return
                }
            }

            // Check for re-orgs and out-of-order deliveries (past block numbers)
            if (block.number <= curNum) {
                const cachedHash = this.#blockHistory.get(block.number)
                const blockInfo = `Last block: ${curNum} / ${curHash}, New block: ${block.number} / ${block.hash}`
                if (!cachedHash) {
                    blockLogger.error("Potential long-range re-org.", blockInfo)
                    // Note: Something is very wrong if this happens. There are various things we could
                    // do, but the submitter won't really suffer from this (unless the RPC is downright
                    // malicious, but there are a lot of other problems with that). So we do nothing.
                    // TODO alerting
                }
                if (cachedHash !== block.hash) {
                    blockLogger.error("Detected re-org.", blockInfo, `Replacing: ${block.number} / ${cachedHash}`)
                    // Do nothing, subscribers should deal with this if they need to.
                } else {
                    blockLogger.warn("Out of order block delivery, skipping.", blockInfo)
                    // We don't clear the timeout as we're not making progress.
                    return
                }
            }
        }

        clearTimeout(this.blockTimeout)

        if (this.#attempt > 0) {
            blockLogger.info(`Retrieved block ${block.number} with ${this.#client.name}. Resetting attempt count.`)
            this.#attempt = 0
            this.#rpcAttemptedSinceLastBlock = 0
        }

        // Update block information and run callbacks.

        this.#previous = this.#current
        this.#current = block
        this.#blockHistory.set(block.number, block.hash)
        this.#startBlockTimeout()
        blockLogger.trace(`Processing new block: ${this.#current.number} / ${this.#current.hash}`)
        if (this.#callbacks.size === 0) return

        async function runCallback(cb: (block: Block) => void | Promise<void>) {
            try {
                await cb(block)
            } catch (e) {
                blockLogger.error(`Error in callback for block ${block.number} (hash: ${block.hash})`, e)
            }
        }

        await Promise.all(Array.from(this.#callbacks).map(runCallback))
    }

    /** Backfills blocks with numbers in [from, to] (inclusive). */
    async #backfill(from: bigint, to: bigint): Promise<boolean> {
        // Cap backfill to max allowed, we won't be seeing the other blocks, but given what
        // the submitter uses this for, we don't care, the boops will be long timed out.
        if (to - from > MAX_BACKFILL) from = to - MAX_BACKFILL

        // Use a Mutex to avoid backfilling the same range many times.
        return this.#backfillMutex.locked(async () => {
            // It's possible all or part of the range was backfilled while we were waiting.
            if (this.#current?.number ?? 0n > from) from = this.#current!.number
            if (from >= to) return true

            blockLogger.info(`Backfilling blocks in [${from}, ${to}] (inclusive).`)

            const promises = []
            for (let blockNumber = from; blockNumber <= to; blockNumber++) {
                promises.push(this.#client.getBlock({ blockNumber, includeTransactions: false }))
            }

            for (let blockNumber = from; blockNumber <= to; blockNumber++) {
                try {
                    const block = await promises[Number(blockNumber - from)]
                    if (!block) throw "Block was undefined" // this shouldn't happen
                    // Disallow recursive backfills. This should never happen,
                    // but might be theoretically possible with reorgs.
                    await this.#handleNewBlock(block, false)
                } catch (e) {
                    blockLogger.error(`Error fetching block ${blockNumber}. Stopping fill for this gap.`, e)
                    return false
                }
            }
            return true
        })
    }
}
