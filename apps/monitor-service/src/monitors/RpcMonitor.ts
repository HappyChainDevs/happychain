import type { PublicClient } from "viem"
import { createViemPublicClient } from "../createViemPublicClient"
import { env } from "../env"
import { sendSlackMessageToAlertChannel } from "../slack"

type RpcStatus = {
    isLive: boolean
    isSyncing: boolean
}

export const NotSyncingSecondsThreshold = 4n

export class RpcMonitor {
    private readonly rpcStatus: Record<string, RpcStatus>
    private readonly rpcClients: Record<string, PublicClient>
    private readonly rpcLocks: Record<string, boolean>

    constructor() {
        this.rpcStatus = env.RPCS_TO_MONITOR.reduce(
            (acc, rpcUrl) => {
                acc[rpcUrl] = {
                    isLive: true,
                    isSyncing: true,
                }
                return acc
            },
            {} as Record<string, RpcStatus>,
        )

        this.rpcClients = env.RPCS_TO_MONITOR.reduce(
            (acc, rpcUrl) => {
                acc[rpcUrl] = createViemPublicClient(rpcUrl)
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

        const newRpcStatus: RpcStatus = {
            isLive: true,
            isSyncing: true,
        }

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
                newRpcStatus.isSyncing = false
            }
        } catch (_error) {
            newRpcStatus.isLive = false
        }

        const previousRpcStatus = this.rpcStatus[rpcUrl]

        if (previousRpcStatus.isLive === true && newRpcStatus.isLive === false) {
            await sendSlackMessageToAlertChannel(`❗️❗️ RPC ${rpcUrl} is not live`)
        }
        if (previousRpcStatus.isLive === false && newRpcStatus.isLive === true) {
            await sendSlackMessageToAlertChannel(`✅✅ RPC ${rpcUrl} is now live again`)
        }

        if (previousRpcStatus.isSyncing === true && newRpcStatus.isSyncing === false) {
            await sendSlackMessageToAlertChannel(`❗️❗️ RPC ${rpcUrl} is not syncing`)
        }

        if (previousRpcStatus.isSyncing === false && newRpcStatus.isSyncing === true) {
            await sendSlackMessageToAlertChannel(`✅✅ RPC ${rpcUrl} is now syncing again`)
        }

        this.rpcStatus[rpcUrl] = newRpcStatus
        this.rpcLocks[rpcUrl] = false
    }
}
