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
}

export const NotSyncingSecondsThreshold = 8n
export const TimeToConsiderAlertRecoveredMilliseconds = 1000 * 60

export class RpcMonitor {
    private readonly rpcStatus: Record<string, RpcStatus>
    private readonly rpcClients: Record<string, PublicClient>
    private readonly rpcLocks: Record<string, boolean>

    constructor() {
        this.rpcStatus = env.RPCS_TO_MONITOR.reduce(
            (acc, rpcUrl) => {
                acc[rpcUrl] = {
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
                }
                return acc
            },
            {} as Record<string, RpcStatus>,
        )

        this.rpcClients = env.RPCS_TO_MONITOR.reduce(
            (acc, rpcUrl) => {
                acc[rpcUrl] = createViemPublicClient(env.CHAIN_ID, rpcUrl)
                return acc
            },
            {} as Record<string, PublicClient>,
        )

        this.rpcLocks = env.RPCS_TO_MONITOR.reduce(
            (acc, rpcUrl) => {
                acc[rpcUrl] = false
                return acc
            },
            {} as Record<string, boolean>,
        )
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
            // Verify RPC endpoint availability by calling getChainId()
            // This call throws an error if it fails, which is why we don't need to check its return value
            // The error will be caught in the catch block where we'll mark the RPC as not live
            await viemClient.getChainId()

            const block = await viemClient.getBlock({ blockTag: "latest" })
            const blockTimestampSeconds = block.timestamp

            // If the difference between the current time and the block timestamp is greater than the threshold, we consider the RPC is not syncing
            const gap = BigInt(Math.floor(Date.now() / 1000)) - blockTimestampSeconds
            if (gap > NotSyncingSecondsThreshold) {
                isSyncing = false
            }
        } catch (_error) {
            isLive = false
        }

        this.rpcStatus[rpcUrl].isLive = await this.handleNewCheckForAnAlert(
            this.rpcStatus[rpcUrl].isLive,
            isLive,
            `❗️❗️ RPC ${rpcUrl} is not live`,
            `✅✅ RPC ${rpcUrl} is now live again`,
        )
        this.rpcStatus[rpcUrl].isSyncing = await this.handleNewCheckForAnAlert(
            this.rpcStatus[rpcUrl].isSyncing,
            isSyncing,
            `❗️❗️ RPC ${rpcUrl} is not syncing`,
            `✅✅ RPC ${rpcUrl} is now syncing again`,
        )

        this.rpcLocks[rpcUrl] = false
    }

    private async handleNewCheckForAnAlert(
        currentAlert: Alert,
        newCheck: boolean,
        alertingMessage: string,
        recoveredMessage: string,
    ): Promise<Alert> {
        if (
            (currentAlert.status === AlertStatus.NORMAL || currentAlert.status === AlertStatus.RECOVERING) &&
            newCheck === false
        ) {
            if (currentAlert.status === AlertStatus.NORMAL) {
                await sendSlackMessageToAlertChannel(alertingMessage)
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
                unhealthyAt: new Date(),
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

            await sendSlackMessageToAlertChannel(`${recoveredMessage} - Alert duration: ${alertingTimeSeconds}s`)

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
