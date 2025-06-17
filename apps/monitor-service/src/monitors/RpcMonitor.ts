import { createViemPublicClient } from "@happy.tech/common"
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
    unhealthyAt: undefined
    healthyAt: undefined
}

export type AlertAlerting = {
    status: AlertStatus.ALERTING
    changedAt: Date
    unhealthyAt: Date
    healthyAt: undefined
}

export type AlertRecovering = {
    status: AlertStatus.RECOVERING
    changedAt: Date
    unhealthyAt: Date
    healthyAt: Date
}

export type Alert = AlertNormal | AlertAlerting | AlertRecovering

type RpcStatus = {
    isLive: Alert
    isSyncing: Alert
    latestBlock: {
        number: number
        timestamp: number
    }
}

export const NotSyncingSecondsThreshold = 8n
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
                isLive: {
                    status: AlertStatus.NORMAL,
                    changedAt: new Date(),
                    unhealthyAt: undefined,
                    healthyAt: undefined,
                },
                isSyncing: {
                    status: AlertStatus.NORMAL,
                    changedAt: new Date(),
                    unhealthyAt: undefined,
                    healthyAt: undefined,
                },
                latestBlock: {
                    number: 0,
                    timestamp: 0,
                },
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

        let isLive = true
        let isSyncing = true

        const viemClient = this.rpcClients[rpcUrl]

        try {
            const block = await viemClient.getBlock({ blockTag: "latest" })
            const blockTimestampSeconds = block.timestamp

            // If the difference between the current time and the block timestamp is greater than the threshold, we consider the RPC is not syncing
            const gap = BigInt(Math.floor(Date.now() / 1000)) - blockTimestampSeconds
            if (gap > NotSyncingSecondsThreshold) {
                isSyncing = false
            }

            this.rpcStatus[rpcUrl].latestBlock = {
                number: Number(block.number),
                timestamp: Number(block.timestamp),
            }
        } catch (_error) {
            isLive = false
        }

        this.rpcStatus[rpcUrl].isLive = await this.handleNewCheckForAnAlert(
            this.rpcStatus[rpcUrl].isLive,
            isLive,
            `❗️ *RPC ${rpcUrl} not live*`,
            `✅ *RPC ${rpcUrl} live again*`,
            this.rpcStatus[rpcUrl].latestBlock.number,
            this.rpcStatus[rpcUrl].latestBlock.timestamp,
        )
        this.rpcStatus[rpcUrl].isSyncing = await this.handleNewCheckForAnAlert(
            this.rpcStatus[rpcUrl].isSyncing,
            isSyncing,
            `❗️ *RPC ${rpcUrl} not syncing*`,
            `✅ *RPC ${rpcUrl} is now syncing again*`,
            this.rpcStatus[rpcUrl].latestBlock.number,
            this.rpcStatus[rpcUrl].latestBlock.timestamp,
        )

        this.rpcLocks[rpcUrl] = false
    }

    private async handleNewCheckForAnAlert(
        currentAlert: Alert,
        newCheck: boolean,
        alertingMessage: string,
        recoveredMessage: string,
        latestBlockNumber: number,
        latestBlockTimestamp: number,
    ): Promise<Alert> {
        if (
            (currentAlert.status === AlertStatus.NORMAL || currentAlert.status === AlertStatus.RECOVERING) &&
            newCheck === false
        ) {
            if (currentAlert.status === AlertStatus.NORMAL) {
                await sendSlackMessageToAlertChannel(
                    `*[${new Date().toISOString()}]* ${alertingMessage} \n• *Latest Block Number:* ${latestBlockNumber}\n• *Latest Block Timestamp:* ${new Date(latestBlockTimestamp * 1000).toISOString()}`,
                )
                return {
                    status: AlertStatus.ALERTING,
                    changedAt: new Date(),
                    unhealthyAt: new Date(),
                    healthyAt: undefined,
                }
            }

            return {
                status: AlertStatus.ALERTING,
                changedAt: new Date(),
                unhealthyAt: currentAlert.unhealthyAt,
                healthyAt: undefined,
            }
        }

        if (currentAlert.status === AlertStatus.ALERTING && newCheck === true) {
            return {
                status: AlertStatus.RECOVERING,
                changedAt: new Date(),
                unhealthyAt: currentAlert.unhealthyAt,
                healthyAt: new Date(),
            }
        }

        const timeSinceLastStatusChange = new Date().getTime() - currentAlert.changedAt.getTime()
        if (
            currentAlert.status === AlertStatus.RECOVERING &&
            timeSinceLastStatusChange > TimeToConsiderAlertRecoveredMilliseconds
        ) {
            const alertingTimeSeconds = (currentAlert.healthyAt.getTime() - currentAlert.unhealthyAt.getTime()) / 1000

            await sendSlackMessageToAlertChannel(
                `*[${new Date().toISOString()}]* ${recoveredMessage} \n• *Latest Block Number:* ${latestBlockNumber}\n• *Latest Block Timestamp:* ${new Date(latestBlockTimestamp * 1000).toISOString()} \n• *Alert duration:* ${alertingTimeSeconds}s`,
            )

            return {
                status: AlertStatus.NORMAL,
                changedAt: new Date(),
                unhealthyAt: undefined,
                healthyAt: undefined,
            }
        }

        return currentAlert
    }
}
