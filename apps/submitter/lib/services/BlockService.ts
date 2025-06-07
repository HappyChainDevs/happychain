import { exit } from "node:process"
import { type Hash, Mutex, type RejectType, promiseWithResolvers, sleep, tryCatchAsync } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/wallet-common"
import { type OnBlockParameter, type PublicClient, type RpcBlock, formatBlock } from "viem"
import { http, createPublicClient, webSocket } from "viem"
import { env } from "#lib/env"
import { LruCache } from "#lib/utils/LruCache"
import { chain, publicClient, rpcUrls } from "#lib/utils/clients"
import { blockLogger } from "#lib/utils/logger"

export type Block = OnBlockParameter<typeof chain>

export class BlockService {
    #current?: Block
    #previous?: Block
    #client!: PublicClient
    #backfillMutex = new Mutex()
    #callbacks: Set<(block: Block) => void | Promise<void>> = new Set()

    /** Zero-index attempt number for the current client. */
    #attempt = 0

    /** Current RPC URL (a value from {@link rpcUrls}) */
    #rpcUrl = ""

    /** Set of RPCs that failed in the last minute, we will prioritize selecting a RPC not in this set if possible. */
    #recentlyFailedRpcs = new Set<string>()

    /**
     * Maps block numbers to their hashes, which can be used to discriminate between
     * re-orgs and out-of-order block delivery as long as the block number is in the cache.
     */
    #blockHistory = new LruCache<bigint, Hash>(env.BLOCK_HISTORY_SIZE)

    /** Call this to unwind the current block subscription and skip to the next client. */
    #skipToNextClient!: RejectType

    /** Timeout for receiving a block. Private so it can be disabled in tests. */
    private blockTimeout: Timer | undefined = undefined

    constructor() {
        void this.#startBlockWatcher()
    }

    // =================================================================================================================
    // PUBLIC METHODS

    async waitForInitialization(): Promise<void> {
        if (this.#current) return

        // Otherwise we're still waiting for the first block. Do an explicit request to maybe
        // speed things up. This also helps not getting deadlocked when testing and automining.
        void tryCatchAsync(async () => {
            // `publicClient`, not `this.#client` is intentional, we want fallback behaviour.
            const block = await publicClient.getBlock()
            if (!this.#current) this.#current = block
        })

        blockLogger.trace("Waiting for initialization...")
        // Not configurable, this is only on boot, and if your RPCs cannot get you this under 5s, you're toast anyway.
        await waitForCondition(() => this.#current !== undefined, 5000)
        if (!this.#current) {
            const msg = "Current block is not set after waiting 5s."
            blockLogger.error(msg)
            throw Error(msg)
        }
    }

    getCurrentBlock(): Block {
        if (!this.#current) throw Error("BlockService not initialized!")
        return this.#current
    }

    /** Register a callback on the current block. */
    onBlock(callback: (block: Block) => void, skipInitial?: "skipInitial"): () => void {
        this.#callbacks.add(callback)
        if (!skipInitial && this.#current) callback(this.#current)
        return () => this.#callbacks.delete(callback)
    }

    // =================================================================================================================
    // RPC SELECTION

    /**
     * Select a new RPC service and sets {@link this.#client} to a client for it.
     *
     * Sketch of the process:
     * - Ping all RPCs for latest block to determine who is alive.
     * - If none are, halt the process (the idea being to trigger an auto restart)
     * - If the returned blocks are not current, we wait until block production resumes.
     * - We select the most prioritary RPC that is live and did not fail in the last configurable period.
     * - If there are none, we drop the "no recent failures" requirement.
     */
    async #nextRPC(): Promise<void> {
        // === Helper function ===

        function createClient(url: string, timeout = env.RPC_REQUEST_TIMEOUT): PublicClient {
            const isWs = url.startsWith("ws")
            const transport = isWs ? webSocket(url, { timeout }) : http(url, { timeout })
            return createPublicClient({ chain, name: url, transport })
        }

        /** Get latest block from all RPCs. */
        async function pingRpcsForBlock(timeout: number): Promise<PromiseSettledResult<Block>[]> {
            const promises = rpcUrls.map((url) => createClient(url, timeout).getBlock({ includeTransactions: false }))
            return await Promise.allSettled(promises)
        }

        /** Can be applied to {@link pingRpcsForBlock} result to select successful calls. */
        function isSuccess(result: PromiseSettledResult<Block>): result is PromiseFulfilledResult<Block> {
            return result.status === "fulfilled"
        }

        // === Find live RPCs ===

        if (this.#rpcUrl) {
            this.#recentlyFailedRpcs.add(this.#rpcUrl)
            // Don't need to clear. The worse that can happen is it will be removed a bit early
            // if re-added after the failed set was cleared following a block production stall.
            // Extremely rare scenario that doesn't break anything. Not worth the extra bookkeeping.
            setTimeout(() => this.#recentlyFailedRpcs.delete(this.#rpcUrl), env.RPC_TIMED_OUT_PERIOD)
        }

        let rpcResults = await pingRpcsForBlock(env.RPC_SHORT_REQUEST_TIMEOUT)
        let anyAlive = rpcResults.some(isSuccess)

        if (!anyAlive) {
            // Nothing alive, retry with standard timeout.
            rpcResults = await pingRpcsForBlock(env.RPC_REQUEST_TIMEOUT)
            anyAlive = rpcResults.some(isSuccess)
        }

        if (!anyAlive) {
            // Everything's dead. Halt and catch fire, maybe a service restart will help.
            blockLogger.error("All RPCs are down. Halting process.")
            // TODO alerting
            exit(1)
        }

        // === Check to see if block production has halted ===

        // If production is halted and we detect a re-org while monitoring, we'll need to re-emit the base block
        let reorgBaseBlock: Block | null = null

        if (!rpcResults.some((it) => isSuccess(it) && it.value.number > (this.#current?.number ?? 0n))) {
            // This might trigger at the start of testing and is benign, it just means the RPC isn't spun up yet.
            blockLogger.error("Block production has halted, waiting for it to resume.")
            // TODO alerting
            const { promise, resolve } = promiseWithResolvers()
            let current = this.#current ?? { number: 0n, hash: "0x" as Hash }
            const pollingTimer = setInterval(async () => {
                rpcResults = await pingRpcsForBlock(env.RPC_REQUEST_TIMEOUT)
                // The block amongst the result with the higher number.
                let localMax = { number: 0n, hash: "0x" as Hash }
                for (const r of rpcResults) {
                    if (!isSuccess(r)) continue
                    if (r.value.number > current.number /* we're moving again! */) {
                        clearInterval(pollingTimer)
                        return resolve(null)
                    } else if (r.value.number > localMax.number) {
                        localMax = r.value
                    }
                }
                if (localMax.number && this.#blockHistory.get(localMax.number) !== localMax.hash) {
                    // A re-org might have occured — reset block number and check for forward movement from there.
                    current = localMax
                }
            }, env.BLOCK_MONITORING_HALTED_POLL_TIMEOUT)
            await promise
            if (current !== this.#current) {
                // A re-org occurred, save the new base.
                reorgBaseBlock = formatBlock(current as unknown as RpcBlock) as Block
            }
            // The issue was a block production stall — it should be safe to retry the previous RPCs.
            this.#recentlyFailedRpcs.clear()
        }

        // === Select RPC ===

        // Get most prioritary alive RPC, excluding recently failed ones.
        let index = rpcResults.findIndex((it, i) => isSuccess(it) && !this.#recentlyFailedRpcs.has(rpcUrls[i]))
        if (index < 0) blockLogger.error("Every alive RPC has failed within the last minute, but some RPCs are live.")
        index = rpcResults.findIndex(isSuccess) // we know this must be > 0

        this.#rpcUrl = rpcUrls[index]
        this.#client = createClient(this.#rpcUrl)
        this.#attempt = 0

        if (reorgBaseBlock) this.#handleNewBlock(reorgBaseBlock)
    }

    // =================================================================================================================
    // BLOCK MONITORING

    async #startBlockWatcher(): Promise<void> {
        // Generic logic — first retry is instant, then `initialRetryDelay` with exponential backoff up
        // to `maxRetryDelay` with a max of `maxAttempts` attempts.
        // However, default values only retries once without delay, otherwise we'd rather move on to another RPC than
        // waste time waiting.
        const baseDelay = env.BLOCK_MONITORING_BASE_DELAY
        const maxDelay = env.BLOCK_MONITORING_MAX_DELAY
        const maxAttempts = env.BLOCK_MONITORING_MAX_ATTEMPTS // per client
        const pollingInterval = env.BLOCK_MONITORING_POLLING_INTERVAL
        let skipToNextClient = false

        // noinspection InfiniteLoopJS
        while (true) {
            // 1. Initialize next client if needed, or wait until next attempt.
            init: try {
                if (!this.#client /* very first init */ || skipToNextClient) {
                    await this.#nextRPC()
                    break init
                }

                if (this.#attempt >= maxAttempts) {
                    blockLogger.warn(`Max retries (${maxAttempts}) reached for ${this.#client.name}.`)
                    await this.#nextRPC()
                    break init
                }

                if (this.#attempt > 1) {
                    // We want first retry (attempt = 1) to be instant.
                    // Note that `this.#attempt` is guaranteed >= 1 here.
                    const delay = Math.min(baseDelay * 2 ** (this.#attempt - 2), maxDelay)
                    blockLogger.info(`Waiting ${delay / 1000} seconds to retry with ${this.#client.name}`)
                    await sleep(delay)
                }
            } catch (e) {
                blockLogger.error(`Failed to create new public client for ${this.#rpcUrl}`, e)
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

                // The above is equivalent to the below Viem watchBlock invocation (minus emitOnBegin
                // for the very first subscription). However, our version does not incur an extra
                // useless eth_getBlock call when subscribing via WebSocket. Additionally, we
                // duplicate a lot of the bookkeeping logic to be able to support cycling between
                // RPCs in case of failure, so we might as well avoid having two layers doing this.

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
        clearTimeout(this.blockTimeout)
        this.blockTimeout = setTimeout(() => {
            this.#skipToNextClient("Timed out while waiting for block")
        }, env.BLOCK_MONITORING_TIMEOUT)
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
                    this.#skipToNextClient("Couldn't fill block gap.")
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
                } else if (cachedHash !== block.hash) {
                    blockLogger.error("Detected re-org.", blockInfo, `Replacing: ${block.number} / ${cachedHash}`)
                    // Do nothing, subscribers should deal with this if they need to.
                    // TODO alerting
                } else {
                    blockLogger.warn("Out of order block delivery, skipping.", blockInfo)
                    // We don't clear the block timeout as we're not making progress.
                    return
                }
            }
        }

        if (this.#attempt > 0) {
            blockLogger.info(`Retrieved block ${block.number} with ${this.#client.name}. Resetting attempt count.`)
            this.#attempt = 0
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
        if (to - from > env.MAX_BLOCK_BACKFILL) from = to - env.MAX_BLOCK_BACKFILL

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
