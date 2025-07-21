import { exit } from "node:process"
import {
    type Hash,
    Mutex,
    type RejectType,
    filterMap,
    parseBigInt,
    promiseWithResolvers,
    sleep,
    tryCatchAsync,
    waitForCondition,
} from "@happy.tech/common"
import { ArkErrors, type } from "arktype"
import { type PublicClient, type RpcBlock, type RpcTransaction, formatBlock } from "viem"
import { http, createPublicClient, webSocket } from "viem"
import { env } from "#lib/env"
import { AlertType } from "#lib/policies/alerting"
import { currentBlockGauge } from "#lib/telemetry/metrics"
import { LruCache } from "#lib/utils/LruCache"
import { recoverAlert, sendAlert } from "#lib/utils/alert"
import { chain, publicClient, rpcUrls, stringify } from "#lib/utils/clients"
import { blockLogger } from "#lib/utils/logger"
import { Bytes } from "#lib/utils/validation/ark"

/**
 * Type of block we get from Viem's `getBlock` — made extra permissive for safety,
 * and picking only the properties we care about to avoid type shenanigans.
 */
type InputBlock = {
    number: bigint | null | undefined
    hash: Hash | null | undefined
    transactions: Hash[]
    baseFeePerGas?: bigint | null | undefined
    gasPrice?: bigint | null | undefined
}

// biome-ignore format: pretty
const checkBlock = type({
        number: "bigint",
        hash: Bytes,
        transactions: Bytes.array(),
        // These fields should be present, but they're not crucial to good operation, so optional.
        "gasUsed?": "bigint",
        "gasLimit?": "bigint",
    },
    "&", type(
        { baseFeePerGas: "bigint", "gasPrice?": "undefined" }, "|",
        { "baseFeePerGas?": "undefined", gasPrice: "bigint" }),
)

/**
 * Type of block that we expose to subscribers via {@link BlockService.onBlock}.
 */
export type Block = typeof checkBlock.infer

// Note there is an extra block type: `RpcBlock` from Viem representing an raw block from RPC, which we get on
// our WebSocket subscription. We normalize those to `InputBlock`.

const TIMEOUT_MSG = "Timed out while waiting for block"

/**
 * This service is represonsible for fetching block information (via subscription or polling depending on the RPC),
 * and allows other services to subscribe to blocks via {@link #onBlock}.
 */
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

    /** Timeout for receiving a block. Uses the `private` keyword so it can be disabled in tests. */
    private blockTimeout: Timer | undefined = undefined

    // =================================================================================================================
    // PUBLIC METHODS

    /**
     * Blocks until the block service is properly initialized (after calling {@link #start}.
     */
    async waitForInitialization(): Promise<void> {
        if (this.#current) return

        // In automined tests, no new block will come in, but RPC selection will give us a block via `getBlock`.
        blockLogger.trace("Waiting for initialization...")

        // Get initial block from publicClient, useful for chains with long block times.
        void publicClient
            .getBlock()
            .then((block) => this.#handleNewBlock(block))
            .catch((e) => blockLogger.warn("Failure of initial block fetch", e))

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

    /**
     * Register a callback to be invoked on new blocks.
     * The callback is immediately invoked on the current block, unless {@link skipInitial} is provided.
     * Returns an unsubscribe function.
     */
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
        // === Helper functions ===

        function createClient(url: string, timeout = env.RPC_REQUEST_TIMEOUT): PublicClient {
            const isWs = url.startsWith("ws")
            const transport = isWs ? webSocket(url, { timeout }) : http(url, { timeout })
            return createPublicClient({ chain, name: url, transport })
        }

        /** Get latest block from all RPCs. */
        async function pingRpcsForBlock(timeout: number): Promise<PromiseSettledResult<InputBlock>[]> {
            const promises = rpcUrls.map((url) => createClient(url, timeout).getBlock({ includeTransactions: false }))
            // Note that if a WebSocket RPC is down, some exceptions can escape to the console here.
            // Nothing we can do about it, Viem doesn't catch them and we can't either (they're in promises), but
            // it's benign as they are simply logged and do not terminate the process.
            return await Promise.allSettled(promises)
        }

        /** Can be applied to items of the {@link pingRpcsForBlock} result to select successful calls. */
        function isSuccess(result: PromiseSettledResult<InputBlock>): result is PromiseFulfilledResult<Block> {
            if (result.status !== "fulfilled") return false
            return !(checkBlock(result.value) instanceof ArkErrors)
        }

        // === Find live RPCs ===

        if (this.#rpcUrl) {
            // We had a RPC but we're entering RPC selection, meaning the RPC failed.
            this.#recentlyFailedRpcs.add(this.#rpcUrl)
            // No need to clear the timeout. The worse that can happen is it will be removed a bit early
            // if re-added after the failed set was cleared following a block production stall.
            // Extremely rare scenario that doesn't jeopardize correctness. Not worth the extra bookkeeping.
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
            const message = "All RPCs are down. Halting process."
            blockLogger.error(message)
            sendAlert(message)
            exit(1)
        }

        // === Check to see if block production has halted ===

        const halted = !rpcResults.some((it) => isSuccess(it) && it.value.number > (this.#current?.number ?? 0n))
        // TODO Is the this.#client check actually necessary?
        // Check `this.#client` to avoid waiting & logging an error on initial RPC selection.
        if (this.#client && halted) {
            // This might trigger at the start of testing and is benign, it just means the RPC isn't spun up yet.
            const message = "Block production has halted, waiting for it to resume."
            blockLogger.error(message)
            sendAlert(message, AlertType.BLOCK_PRODUCTION_HALTED)
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
                // TODO: I don't think we need to check .number, and we should only reset if the history does have
                //       the block!
                //       This probably does not explain the issues with one correct RPC and a stalled/lagging RPC:
                //       the current RPC should win the race... unless it flakes on getBlock (which would be unlucky).
                if (localMax.number && this.#blockHistory.get(localMax.number) !== localMax.hash) {
                    // A re-org might have occured — reset block number and check for forward movement from there.
                    current = localMax
                }
            }, env.BLOCK_MONITORING_HALTED_POLL_TIMEOUT)
            await promise
            recoverAlert("Block production has resumed.", AlertType.BLOCK_PRODUCTION_HALTED)
            // The issue was a block production stall — it should be safe to retry the previous RPCs.
            this.#recentlyFailedRpcs.clear()
        }

        // === Select RPC ===

        // TODO: oops: when selecting the RPC here, we do not ensure that we actually selected a RPC that has made
        //       forward block progress. This probably explains why in the correct+lagged scenario we were going
        //       back to the lagged RPC.

        // Get most prioritary alive RPC, excluding recently failed ones.
        let index = rpcResults.findIndex((it, i) => isSuccess(it) && !this.#recentlyFailedRpcs.has(rpcUrls[i]))
        if (index < 0) {
            blockLogger.error("Every alive RPC has failed within the last minute, but some RPCs are live.")
            index = rpcResults.findIndex(isSuccess) // we know this must be > 0
        }

        this.#rpcUrl = rpcUrls[index]
        this.#client = createClient(this.#rpcUrl)
        this.#attempt = 0

        // We got a new block in the whole affair, handle it.
        // This is always ok: this is either a more recent block or a re-org occured.
        const newBlock = (rpcResults[index] as PromiseFulfilledResult<Block>).value
        // TODO: The condition here contradict the comment above: if a re-org occured and the block number went down,
        //        we do not call handle. Need to check that #handleNewBlock can handle this correctly + that this
        //        doesn't lead to a duplicate handleNewBlock call (the progress check above should in theory ensure that
        //        it doesn't, but let's also verify that we can't handle #handleNewBlock form a stray handler).
        if (!this.#current || this.#current.number < newBlock.number) this.#handleNewBlock(newBlock)
    }

    // TODO Verify and update this comment to account for the fact we don't rely on the Viem nonce manager anymore,
    //      but on our own.

    // Note that in the case of re-orgs, we will be missing blocks compared to the "most re-orged"
    // block that we saw. We should handle that but don't sweat too much about it right now. We
    // haven't really audited the code for re-orgs. In theory, the Viem nonce manager should handle
    // EVM tx nonces. Boop nonces get a resync via `InvalidNonce`, and the nonce cache expires fast
    // anyway. We might suffer from stuck transactions in the future (meant for pre-re-org chain).
    //
    // The most immediate to-do item is to call out the resync system to cancel submit and
    // createAccount transactions, which we need for robustness.
    //
    // The other big issue with re-orgs is that some receipts in the database will now be bogus but their boopHash
    // could recur.

    // =================================================================================================================
    // BLOCK MONITORING

    async start(): Promise<void> {
        // Generic logic: first retry is instant, then `initialRetryDelay` with exponential backoff up
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
                    const delay = Math.min(baseDelay * 2 ** (this.#attempt - 2), maxDelay)
                    blockLogger.info(`Waiting ${delay / 1000} seconds to retry with ${this.#client.name}`)
                    await sleep(delay)
                }
            } catch (e) {
                blockLogger.error(`Failed to create new public client for ${this.#rpcUrl}`, stringify(e))
                skipToNextClient = true
                continue
            }

            const client = this.#client.name
            blockLogger.info(`Starting block watcher with ${client} (Attempt ${this.#attempt + 1}/${maxAttempts}).`)

            // 2. Setup subscription
            const { promise, reject } = promiseWithResolvers<void>()
            this.#skipToNextClient = reject
            let unsubscribe: (() => Promise<void>) | null = null
            let pollingTimer: Timer | undefined = undefined

            // Protection against race conditions where `reject` would be called before it's awaited below.
            // It will always eventually get awaited below, so this is safe.
            promise.catch(() => {})

            this.#startBlockTimeout()

            if (this.#client.transport.type === "webSocket") {
                try {
                    ;({ unsubscribe } = await this.#client.transport.subscribe({
                        params: ["newHeads"],
                        // Type is unchecked, we're being conservative with what we receive.
                        onData: (data?: { result?: Partial<RpcBlock> }) => {
                            try {
                                this.#handleNewRpcBlock(data?.result)
                            } catch (e) {
                                // This will never be called before `subscribe` returns.
                                reject(e)
                            }
                        },
                        onError: reject,
                    }))
                } catch (e) {
                    // This `try` block is necessary because `subscribe` can throw AND call
                    // `onError` which rejects `promise`, which if throwing here would not be
                    // awaited, leading the exception to escape. We however do need the `onError`
                    // as it is also called if there is an error later with the subscription.

                    // This is safe because of the `promise.catch` above.
                    reject(e)
                }
            } else {
                pollingTimer = setInterval(async () => {
                    // biome-ignore format: terse
                    try { void this.#handleNewBlock(await this.#client.getBlock({ includeTransactions: false })) }
                    catch (e) { reject(e) }
                }, pollingInterval)
            }

            // The above if/else is equivalent to the below Viem watchBlock invocation. We unbundle
            // it because we need to control the retry logic ourselves to implement RPC fallback
            // for subscriptions, as well as resubscriptions — two things Viem doesn't handle.

            // unwatch = this.#client.watchBlocks({
            //     pollingInterval,
            //     includeTransactions: false,
            //     emitOnBegin: false,
            //     emitMissed: true,
            //     onBlock: this.#handleNewBlock.bind(this),
            //     onError: reject,
            // })

            try {
                await promise // Waits forever unless these is an error.
            } catch (e) {
                unsubscribe && tryCatchAsync(unsubscribe)
                clearInterval(pollingTimer)
                clearTimeout(this.blockTimeout)
                // This happens more than the rest, and if the timeout persist, there will be plenty of other logs
                // for us to notice as the RPC will rotate.
                if (e === TIMEOUT_MSG) blockLogger.info(TIMEOUT_MSG, client)
                else blockLogger.error("Block watcher error", client, stringify(e))
                ++this.#attempt
            }
        }
    }

    #startBlockTimeout() {
        clearTimeout(this.blockTimeout)
        this.blockTimeout = setTimeout(() => {
            this.#skipToNextClient?.(TIMEOUT_MSG)
        }, env.BLOCK_MONITORING_TIMEOUT)
    }

    /**
     * An {@link RpcBlock} is raw block from JSON-RPC API, whereas {@link Block} is such a block formatted by Viem.
     *
     * This function is called with RpcBlocks retrieves from a websocket subscription, as those might not include
     * the transaction hash list, depending on the implementation (Anvil and Nethermind include it, Geth doesn't).
     */
    async #handleNewRpcBlock(rpcBlock: Partial<RpcBlock> | null | undefined): Promise<void> {
        // If we skip the block in this function and this results in a gap or no more blocks come
        // in, we'll notice via further checks in `#handleNewBlock`, or via our block timeout, respectively.

        const blockNumber = parseBigInt(rpcBlock?.number ?? undefined)
        if (!blockNumber) {
            blockLogger.error("Received malformed block data, skipping.", rpcBlock)
            return
        }

        if (Array.isArray(rpcBlock?.transactions)) {
            // RPC block has transactions: normalize to a list of hashes
            const txHashes = filterMap(rpcBlock.transactions, (tx: Hash | RpcTransaction) => {
                if (typeof tx === "string") return tx
                if (typeof tx.hash === "string") return tx.hash
                return undefined
            })
            if (txHashes.length > 0) {
                rpcBlock.transactions = txHashes
                // Note that #handleNewBlock cannot throw if its input is and object.
                // cast: allows `number` to be null
                await this.#handleNewBlock(formatBlock(rpcBlock) as Block)
                return
            }
            // It may be that the block simply has no transactions, but out of an abundance of caution, we'll try
            // fetching the block anyway. If there's truly no transactions here, there will be no harm.
        }

        let block: InputBlock | null = null
        for (let i = 1; i <= 3; ++i) {
            try {
                // `includeTransactions: false` still gives us a list of transaction hashes
                block = await this.#client.getBlock({ blockNumber, includeTransactions: false })
                break
            } catch {
                await sleep(env.LINEAR_RETRY_DELAY * i)
            }
        }
        await this.#handleNewBlock(block)
    }

    /**
     * Called upon getting a new block. Returns true if the block was successfully handled, false if it gets skipped.
     * This never throws.
     */
    async #handleNewBlock(inputBlock: InputBlock | null, allowBackfill = true): Promise<boolean> {
        // If we skip the block in this function and this results in a gap or no more blocks come
        // in, we'll notice via further checks in here, or via our block timeout, respectively.

        const block = checkBlock(inputBlock)
        if (block instanceof ArkErrors) {
            blockLogger.error("Received an invalid block from the watcher, skipping.", inputBlock, block.summary)
            return false
        }

        // Check for duplicates
        if (block.hash === this.#current?.hash) {
            // Don't warn when polling, since this is expected to happen all the time.
            if (this.#client.transport.type === "webSocket")
                blockLogger.warn(`Received duplicate block ${block.number}, skipping.`)
            return false
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
                    return false
                }
            }

            // Check for re-orgs and out-of-order deliveries (past block numbers)
            if (block.number <= curNum) {
                const cachedHash = this.#blockHistory.get(block.number)
                const blockInfo = `Last block: ${curNum} / ${curHash}, New block: ${block.number} / ${block.hash}`
                if (!cachedHash) {
                    const msg = "Potential long-range re-org."
                    blockLogger.error(msg, blockInfo)
                    sendAlert(msg + "\n" + blockInfo)
                    // Note: Something is very wrong if this happens. There are various things we could
                    // do, but the submitter won't really suffer from this (unless the RPC is downright
                    // malicious, but there are a lot of other problems with that). So we do nothing.
                } else if (cachedHash !== block.hash) {
                    const msg = "Detected re-org.\n" + blockInfo + "\nReplacing: " + block.number + " / " + cachedHash
                    blockLogger.error(msg)
                    sendAlert(msg + "\n" + blockInfo)
                    // Do nothing, subscribers should deal with this if they need to.
                } else {
                    blockLogger.warn("Out of order block delivery, skipping.", blockInfo)
                    // We don't clear the block timeout as we're not making progress.
                    return false
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
        currentBlockGauge.record(Number(this.#current.number))
        blockLogger.trace(`Processing new block: ${this.#current.number} / ${this.#current.hash}`)
        if (this.#callbacks.size === 0) return true

        // biome-ignore format: terse
        await Promise.all(Array.from(this.#callbacks).map(async (callback) => {
            try {
                return await callback(block)
            } catch (e) {
                blockLogger.error(`Error in callback for block ${block.number} (hash: ${block.hash})`, e)
            }
        }))
        return true
    }

    /**
     * Backfills blocks with numbers in [from, to] (inclusive).
     * Returns true iff the backfill is successful for the entire range.
     */
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
                    // Filled in meanwhile, move forward.
                    if (this.#current?.number ?? 0n > blockNumber) continue
                    const block = await promises[Number(blockNumber - from)]
                    if (!block) throw "Block was undefined" // this shouldn't happen
                    // Disallow recursive backfills. Should never happen, but theoretically possible with reorgs.
                    if (!(await this.#handleNewBlock(block, false))) throw "Block was skipped."
                } catch (e) {
                    // If the block was filled meanwhile, we can move forward.
                    if (this.#current?.number ?? 0n > blockNumber) continue
                    blockLogger.error(`Error fetching block ${blockNumber}. Stopping fill for this gap.`, e)
                    return false
                }
            }
            return true
        })
    }
}
