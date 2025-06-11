import { getUrlProtocol } from "@happy.tech/common"
import { createViemPublicClient } from "@happy.tech/common"
import type { PublicClient } from "viem"
import { env } from "./env"
import { logger } from "./logger"
import { FundMonitor } from "./monitors/FundMonitor"
import { RpcMonitor } from "./monitors/RpcMonitor"

export class MonitorService {
    public readonly protocol: "http" | "websocket"
    public readonly viemClient: PublicClient
    public readonly fundMonitor: FundMonitor
    public readonly rpcMonitor: RpcMonitor

    constructor() {
        const protocolResult = getUrlProtocol(env.RPC_URL)

        if (protocolResult.isErr()) {
            throw protocolResult.error
        }

        this.protocol = protocolResult.value

        this.viemClient = createViemPublicClient(env.CHAIN_ID, env.RPC_URL)

        this.fundMonitor = new FundMonitor(this)
        this.rpcMonitor = new RpcMonitor()
    }

    async start() {
        await this.fundMonitor.start()
        await this.rpcMonitor.start()
    }
}

async function main() {
    try {
        const monitorService = new MonitorService()
        await monitorService.start()
        logger.info("Monitor service started successfully")
    } catch (error) {
        logger.error("Failed to start monitor service:", { error })
        process.exit(1)
    }
}

main()
