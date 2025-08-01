import { TransactionManager } from "@happy.tech/txm"
import type { MonitorService } from ".."
import { env } from "../env"
import { logger } from "../logger"

export class FundMonitor {
    private readonly monitorService: MonitorService
    private readonly txm: TransactionManager

    constructor(monitorService: MonitorService) {
        this.monitorService = monitorService

        this.txm = new TransactionManager({
            rpc: { url: env.RPC_URL },
            chainId: env.CHAIN_ID,
            blockTime: env.BLOCK_TIME,
            privateKey: env.PRIVATE_KEY,
        })
    }

    async start() {
        await this.txm.start()

        await this.monitorService.viemClient.watchBlocks({
            onBlock: this.onBlock.bind(this),
            ...(this.monitorService.protocol === "http" ? { pollingInterval: 250 } : {}),
        })
    }

    private async onBlock(): Promise<void> {
        for (const address of env.MONITOR_ADDRESSES) {
            const balance = await this.monitorService.viemClient.getBalance({ address })
            logger.info(`Received ${address} balance: ${balance}`)

            if (balance <= env.FUND_THRESHOLD) {
                logger.info("Account has less than threshold balance", { address, balance })

                const tx = await this.txm.createTransaction({
                    address: address,
                    value: env.FUNDS_TO_SEND,
                    calldata: "0x",
                })

                this.txm.sendTransactions([tx])
            }
        }
    }
}
