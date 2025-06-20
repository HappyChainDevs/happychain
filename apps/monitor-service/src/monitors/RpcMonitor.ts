import { type UnionFill, createViemPublicClient } from "@happy.tech/common"
import type { PublicClient } from "viem"
import { env } from "../env"
import { sendSlackMessageToAlertChannel } from "../slack"

enum AlertStatus {
    NORMAL = "NORMAL",
    ALERTING = "ALERTING",
    RECOVERING = "RECOVERING",
}

export type AlertNormal = {
    status: AlertStatus.NORMAL
    changedAt: Date
}

export type AlertAlerting = {
    status: AlertStatus.ALERTING
    changedAt: Date
    unhealthyAt: Date
}

export type AlertRecovering = {
    status: AlertStatus.RECOVERING
    changedAt: Date
    unhealthyAt: Date
    healthyAt: Date
    recoveredAtBlockNumber: number
}

export type Alert = UnionFill<AlertNormal | AlertAlerting | AlertRecovering>

type BlockInfo = {
    number: number
    timestamp: number
}

type RpcStatus = {
    isLive: Alert
    isSyncing: Alert
    latestBlock: BlockInfo
}

export const NotSyncingThresholdMilliseconds = 8000
export const TimeToConsiderAlertRecoveredMilliseconds = 1000 * 60

export class RpcMonitor {
    private readonly rpcStatus: Record<string, RpcStatus>
    private readonly rpcClients: Record<string, PublicClient>
    private readonly rpcLocks: Record<string, boolean>

    constructor() {
        this.rpcStatus = {}
        this.rpcClients = {}
        this.rpcLocks = {}

        for (const rpcUrl of env.RPCS_TO_MONITOR) {
            this.rpcStatus[rpcUrl] = {
                isLive: { status: AlertStatus.NORMAL, changedAt: new Date() },
                isSyncing: { status: AlertStatus.NORMAL, changedAt: new Date() },
                latestBlock: { number: 0, timestamp: 0 },
            }
            this.rpcClients[rpcUrl] = createViemPublicClient(env.CHAIN_ID, rpcUrl)
            this.rpcLocks[rpcUrl] = false
        }
    }

    async start() {
        setInterval(() => {
            for (const rpcUrl of env.RPCS_TO_MONITOR) {
                this.monitorRpcLiveness(rpcUrl)
            }
        }, Number(env.RPC_MONITOR_INTERVAL))
    }

    private async monitorRpcLiveness(rpcUrl: string) {
        if (this.rpcLocks[rpcUrl]) {
            return
        }
        this.rpcLocks[rpcUrl] = true

        const viemClient = this.rpcClients[rpcUrl]
        let isLive = true
        let isSyncing = true
        let gap = 0

        try {
            const block = await viemClient.getBlock({ blockTag: "latest" })
            const blockTimestampSeconds = Number(block.timestamp)
            gap = Date.now() - blockTimestampSeconds * 1000
            if (gap > NotSyncingThresholdMilliseconds) {
                isSyncing = false
            }
            this.rpcStatus[rpcUrl].latestBlock = {
                number: Number(block.number),
                timestamp: Number(block.timestamp),
            }
        } catch (_error) {
            isLive = false
        }

        const latestBlock = { ...this.rpcStatus[rpcUrl].latestBlock }

        this.rpcStatus[rpcUrl].isLive = await this.handleNewCheckForAnAlert(
            this.rpcStatus[rpcUrl].isLive,
            isLive,
            new Date(),
            `❗️ *RPC ${rpcUrl} not live*`,
            `✅ *RPC ${rpcUrl} live again*`,
            latestBlock,
        )
        this.rpcStatus[rpcUrl].isSyncing = await this.handleNewCheckForAnAlert(
            this.rpcStatus[rpcUrl].isSyncing,
            isSyncing,
            new Date(Date.now() - gap),
            `❗️ *RPC ${rpcUrl} not syncing*`,
            `✅ *RPC ${rpcUrl} is now syncing again*`,
            latestBlock,
        )

        this.rpcLocks[rpcUrl] = false
    }

    private async handleNewCheckForAnAlert(
        currentAlert: Alert,
        isOkay: boolean,
        alertStartTime: Date,
        alertingMessage: string,
        recoveredMessage: string,
        latestBlock: BlockInfo,
    ): Promise<Alert> {
        const isAlerting = currentAlert.status === AlertStatus.ALERTING
        const isNormal = currentAlert.status === AlertStatus.NORMAL
        const isRecovering = currentAlert.status === AlertStatus.RECOVERING

        if (isNormal && !isOkay) {
            const msg =
                `${alertingMessage}\n` +
                `• *Latest Block Number:* ${latestBlock.number}\n` +
                `• *Latest Block Timestamp:* ${new Date(latestBlock.timestamp * 1000).toISOString()}`
            await this.#sendAlert(msg)
            return {
                status: AlertStatus.ALERTING,
                changedAt: new Date(),
                unhealthyAt: alertStartTime,
            }
        }

        if (isRecovering && !isOkay)
            return {
                status: AlertStatus.ALERTING,
                changedAt: new Date(),
                unhealthyAt: currentAlert.unhealthyAt,
            }

        if (isAlerting && isOkay) {
            return {
                status: AlertStatus.RECOVERING,
                changedAt: new Date(),
                unhealthyAt: currentAlert.unhealthyAt,
                healthyAt: new Date(),
                recoveredAtBlockNumber: latestBlock.number,
            }
        }

        const timeSinceLastStatusChange = new Date().getTime() - currentAlert.changedAt.getTime()
        if (isRecovering && timeSinceLastStatusChange > TimeToConsiderAlertRecoveredMilliseconds) {
            const alertingTimeSeconds = (currentAlert.healthyAt.getTime() - currentAlert.unhealthyAt.getTime()) / 1000
            const msg =
                `${recoveredMessage}\n` +
                `• *Recovered at block number:* ${currentAlert.recoveredAtBlockNumber}\n` +
                `• *Alert duration:* ${alertingTimeSeconds}s`
            await this.#sendAlert(msg)
            return {
                status: AlertStatus.NORMAL,
                changedAt: new Date(),
            }
        }

        return currentAlert
    }

    async #sendAlert(msg: string) {
        return await sendSlackMessageToAlertChannel(`*[${new Date().toISOString()}]* ${msg}`)
    }
}
