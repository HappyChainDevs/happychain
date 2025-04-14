import { SpanStatusCode, context, trace } from "@opentelemetry/api"
import { Topics } from "./EventBus"
import { eventBus } from "./EventBus"
import type { TransactionManager } from "./TransactionManager"
import { TxmMetrics } from "./telemetry/metrics"
import { TraceMethod } from "./telemetry/traces"
import { logger } from "./utils/logger"

interface SecondCounters {
    successCount: number
    errorCount: number
}

export class RpcLivenessMonitor {
    private txmgr: TransactionManager
    private counters: Record<number, SecondCounters>
    public isAlive: boolean
    private isDownSince: Date | null
    private checkIfHealthyInterval: NodeJS.Timer | null
    private consecutiveSuccessesWhileCheckingIfHealthy: number

    constructor(txmgr: TransactionManager) {
        this.txmgr = txmgr
        this.counters = {}
        this.isAlive = true
        this.isDownSince = null
        this.checkIfHealthyInterval = null
        this.consecutiveSuccessesWhileCheckingIfHealthy = 0
        TxmMetrics.getInstance().rpcLivenessMonitorGauge.record(this.isAlive ? 1 : 0)

        setInterval(() => {
            this.cleanOldCounters()
        }, 1000)
    }

    private getCurrentSecond(): number {
        return Math.floor(Date.now() / 1000)
    }

    private cleanOldCounters(): void {
        const now = this.getCurrentSecond()
        const oldestAllowedSecond = now - Math.floor(this.txmgr.livenessWindow / 1000)

        Object.keys(this.counters).forEach((secondStr) => {
            const second = Number.parseInt(secondStr, 10)
            if (second < oldestAllowedSecond) {
                delete this.counters[second]
            }
        })
    }

    @TraceMethod("txm.rpc-liveness-monitor.track-success")
    trackSuccess() {
        const currentSecond = this.getCurrentSecond()

        if (!this.counters[currentSecond]) {
            this.counters[currentSecond] = { successCount: 0, errorCount: 0 }
        }

        this.counters[currentSecond].successCount++
        this.checkIfDown()
    }

    @TraceMethod("txm.rpc-liveness-monitor.track-error")
    trackError() {
        const currentSecond = this.getCurrentSecond()

        if (!this.counters[currentSecond]) {
            this.counters[currentSecond] = { successCount: 0, errorCount: 0 }
        }

        this.counters[currentSecond].errorCount++
        this.checkIfDown()
    }

    @TraceMethod("txm.rpc-liveness-monitor.check-if-down")
    private checkIfDown() {
        const span = trace.getSpan(context.active())!

        if (this.isAlive && this.ratioOfSuccess() < this.txmgr.livenessThreshold) {
            this.isAlive = false
            this.isDownSince = new Date()
            this.consecutiveSuccessesWhileCheckingIfHealthy = 0
            this.updateLivenessMetrics()
            eventBus.emit(Topics.RpcIsDown)
            logger.error("Detected that the RPC is not healthy")

            span.addEvent("txm.rpc-liveness-monitor.check-if-down.is-down")
            span.setStatus({ code: SpanStatusCode.ERROR })

            this.checkIfHealthyInterval = setInterval(() => {
                this.checkIfHealthy()
            }, this.txmgr.livenessCheckInterval)
        } else {
            span.addEvent("txm.rpc-liveness-monitor.check-if-down.is-up")
        }
    }

    @TraceMethod("txm.rpc-liveness-monitor.check-if-healthy")
    private async checkIfHealthy() {
        const span = trace.getSpan(context.active())!
        if (this.isDownSince && this.isDownSince.getTime() + this.txmgr.livenessDownDelay > new Date().getTime()) {
            return
        }

        const chainIdResult = await this.txmgr.viemClient.safeGetChainId()

        if (chainIdResult.isOk()) {
            span.addEvent("txm.rpc-liveness-monitor.check-if-healthy.increment-success-count")
            this.consecutiveSuccessesWhileCheckingIfHealthy++
        } else {
            span.addEvent("txm.rpc-liveness-monitor.check-if-healthy.reset-success-count")
            this.consecutiveSuccessesWhileCheckingIfHealthy = 0
        }

        if (this.consecutiveSuccessesWhileCheckingIfHealthy > this.txmgr.livenessSuccessCount) {
            logger.info("Detected that the RPC is healthy")
            span.addEvent("txm.rpc-liveness-monitor.check-if-healthy.is-up")
            this.isAlive = true
            this.isDownSince = null
            this.consecutiveSuccessesWhileCheckingIfHealthy = 0
            this.counters = {}
            this.updateLivenessMetrics()
            eventBus.emit(Topics.RpcIsUp)
            if (this.checkIfHealthyInterval) {
                clearInterval(this.checkIfHealthyInterval)
            }
        }
    }

    updateLivenessMetrics() {
        TxmMetrics.getInstance().rpcLivenessMonitorGauge.record(this.isAlive ? 1 : 0)
    }

    ratioOfSuccess() {
        let totalSuccesses = 0
        let totalEvents = 0

        Object.values(this.counters).forEach((counter) => {
            totalSuccesses += counter.successCount
            totalEvents += counter.successCount + counter.errorCount
        })

        return totalEvents > 0 ? totalSuccesses / totalEvents : 1
    }
}
