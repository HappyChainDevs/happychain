import { LogTag, Logger } from "@happy.tech/common"
import type { TransactionManager } from "./TransactionManager"
import { TxmMetrics } from "./telemetry/metrics"

interface LivenessEvent {
    occurredAt: Date
    success: boolean
}

export class RpcLivenessMonitor {
    private txmgr: TransactionManager
    private events: LivenessEvent[]
    public isAlive: boolean
    private isDownSince: Date | null
    private checkIfHealthyInterval: NodeJS.Timer | null
    private consecutiveSuccessesWhileCheckingIfHealthy: number

    constructor(txmgr: TransactionManager) {
        this.txmgr = txmgr
        this.events = []
        this.isAlive = true
        this.isDownSince = null
        this.checkIfHealthyInterval = null
        this.consecutiveSuccessesWhileCheckingIfHealthy = 0
        TxmMetrics.getInstance().rpcLivenessMonitorGauge.record(this.isAlive ? 1 : 0)
    }

    onSuccess() {
        this.events.push({
            occurredAt: new Date(),
            success: true,
        })
        this.checkIfDown()
    }

    onFailure() {
        this.events.push({
            occurredAt: new Date(),
            success: false,
        })
        this.checkIfDown()
    }

    cleanOldEvents() {
        const now = new Date()
        this.events = this.events.filter((event) => {
            return now.getTime() - event.occurredAt.getTime() < this.txmgr.livenessWindow
        })
    }

    private checkIfDown() {
        if (this.isAlive && this.ratioOfSuccess() < this.txmgr.livenessThreshold) {
            this.isAlive = false
            this.isDownSince = new Date()
            this.consecutiveSuccessesWhileCheckingIfHealthy = 0
            TxmMetrics.getInstance().rpcLivenessMonitorGauge.record(this.isAlive ? 1 : 0)
            Logger.instance.error(LogTag.TXM, "Detected that the RPC is not healthy")

            this.checkIfHealthyInterval = setInterval(() => {
                this.checkIfHealthy()
            }, 2000)
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
            this.events = []
            TxmMetrics.getInstance().rpcLivenessMonitorGauge.record(this.isAlive ? 1 : 0)
            if (this.checkIfHealthyInterval) {
                clearInterval(this.checkIfHealthyInterval)
            }
        }
    }

    ratioOfSuccess() {
        this.cleanOldEvents()
        const successEvents = this.events.filter((event) => event.success)
        return successEvents.length / this.events.length
    }
}
