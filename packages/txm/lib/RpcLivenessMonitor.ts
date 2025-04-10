import { LogTag, Logger } from "@happy.tech/common"
import { Topics } from "./EventBus"
import { eventBus } from "./EventBus"
import type { TransactionManager } from "./TransactionManager"
import { TxmMetrics } from "./telemetry/metrics"

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

    trackSuccess() {
        const currentSecond = this.getCurrentSecond()

        if (!this.counters[currentSecond]) {
            this.counters[currentSecond] = { successCount: 0, errorCount: 0 }
        }

        this.counters[currentSecond].successCount++
        this.checkIfDown()
    }

    trackError() {
        const currentSecond = this.getCurrentSecond()

        if (!this.counters[currentSecond]) {
            this.counters[currentSecond] = { successCount: 0, errorCount: 0 }
        }

        this.counters[currentSecond].errorCount++
        this.checkIfDown()
    }

    private checkIfDown() {
        if (this.isAlive && this.ratioOfSuccess() < this.txmgr.livenessThreshold) {
            this.isAlive = false
            this.isDownSince = new Date()
            this.consecutiveSuccessesWhileCheckingIfHealthy = 0
            this.updateLivenessMetrics()
            eventBus.emit(Topics.RpcIsDown)
            Logger.instance.error(LogTag.TXM, "Detected that the RPC is not healthy")

            this.checkIfHealthyInterval = setInterval(() => {
                this.checkIfHealthy()
            }, this.txmgr.livenessCheckInterval)
        }
    }

    private async checkIfHealthy() {
        if (this.isDownSince && this.isDownSince.getTime() + this.txmgr.livenessDownDelay > new Date().getTime()) {
            return
        }

        const chainIdResult = await this.txmgr.viemClient.safeGetChainId()

        if (chainIdResult.isOk()) {
            this.consecutiveSuccessesWhileCheckingIfHealthy++
        } else {
            this.consecutiveSuccessesWhileCheckingIfHealthy = 0
        }

        if (this.consecutiveSuccessesWhileCheckingIfHealthy > this.txmgr.livenessSuccessCount) {
            Logger.instance.info(LogTag.TXM, "Detected that the RPC is healthy")
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
