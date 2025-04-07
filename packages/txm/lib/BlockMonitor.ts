import { LogTag, Logger } from "@happy.tech/common"
import { ROOT_CONTEXT, SpanStatusCode, context, trace } from "@opentelemetry/api"
import type { Block } from "viem"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionManager } from "./TransactionManager.js"
import { TxmMetrics } from "./telemetry/metrics"
import { TraceMethod } from "./telemetry/traces"
/**
 * A type alias for {@link Block} with the `blockTag` set to `"latest"`, ensuring type definitions correspond to the latest block.
 */
export type LatestBlock = Block<bigint, false, "latest">

/**
 * This module is responsible for emitting the {@link Topics.NewBlock} event when a new block is received,
 * notifying other parts of the code that a new block has just occurred. Along with the notification,
 * it sends the latest block information with the event, allowing other parts of the application to use this data for their own purposes.
 */
export class BlockMonitor {
    private txmgr: TransactionManager
    private unwatch: (() => void) | undefined
    private blockTimeout: ReturnType<typeof setTimeout> | undefined
    private latestProcessedBlockNumber: bigint | undefined
    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager
    }

    async start() {
        this.scheduleTimeout()
        this.unwatch = this.txmgr.viemClient.watchBlocks({
            onBlock: this.onNewBlock.bind(this),
            ...(this.txmgr.transportProtocol === "http" ? { pollingInterval: this.txmgr.pollingInterval } : {}),
        })
    }

    @TraceMethod("txm.block-monitor.on-new-block")
    private onNewBlock(block: LatestBlock | undefined) {
        if (!block) {
            Logger.instance.error(LogTag.TXM, "Received undefined block")
            return
        }

        const span = trace.getSpan(context.active())!
        span.setAttribute("block.number", Number(block.number))

        if (this.latestProcessedBlockNumber && block.number <= this.latestProcessedBlockNumber) {
            const description = `Received block number less than or equal to latest processed block number. Skipping. Latest processed block number: ${this.latestProcessedBlockNumber}, received block number: ${block.number}`
            span.recordException(new Error(description))
            span.setStatus({ code: SpanStatusCode.ERROR })
            Logger.instance.warn(LogTag.TXM, description)
            return
        }

        this.latestProcessedBlockNumber = block.number

        if (this.blockTimeout) clearTimeout(this.blockTimeout)
        eventBus.emit(Topics.NewBlock, block)

        TxmMetrics.getInstance().currentBlockGauge.record(Number(block.number))
        TxmMetrics.getInstance().newBlockDelayHistogram.record(Date.now() - Number(block.timestamp) * 1000)

        this.txmgr.rpcLivenessMonitor.trackSuccess()

        this.scheduleTimeout()
    }

    @TraceMethod("txm.block-monitor.schedule-timeout")
    private scheduleTimeout() {
        this.blockTimeout = setTimeout(() => {
            Logger.instance.warn(LogTag.TXM, "Timeout reached. Resetting block subscription.")
            this.resetBlockSubscription()
        }, this.txmgr.blockInactivityTimeout)
    }

    @TraceMethod("txm.block-monitor.reset-block-subscription")
    private resetBlockSubscription() {
        TxmMetrics.getInstance().resetBlockMonitorCounter.add(1)
        this.txmgr.rpcLivenessMonitor.trackError()

        if (this.blockTimeout) {
            clearTimeout(this.blockTimeout)
            this.blockTimeout = undefined
        }

        if (this.unwatch) {
            this.unwatch()
            this.unwatch = undefined
        }

        // Delay block monitor restart by 500ms
        // This prevents an infinite loop of rapid restarts
        // when the blockchain node is unresponsive or down
        setTimeout(() => {
            context.with(ROOT_CONTEXT, () => {
                this.start()
            })
        }, 500)
    }
}
