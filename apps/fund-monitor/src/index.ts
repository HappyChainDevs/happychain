import { defineChain, http, webSocket, type Block, type Transport, } from "viem"
import { createPublicClient, type PublicClient } from "viem"
import { getUrlProtocol } from "@happy.tech/common"
import { env } from "./env"
import { TransactionManager } from "@happy.tech/txm"
import { logger } from "./logger"

export class FundMonitor {
    private readonly viemClient: PublicClient
    private readonly protocol: "http" | "websocket"
    private readonly txm: TransactionManager

    constructor() {
        const protocolResult = getUrlProtocol(env.RPC_URL)

        if (protocolResult.isErr()) {
            throw protocolResult.error
        }

        this.protocol = protocolResult.value

        let transport: Transport
        if (this.protocol === "http") {
            transport = http(env.RPC_URL)
        } else {
            transport = webSocket(env.RPC_URL)
        }

        /**
         * Define the viem chain object.
         * Certain properties required by viem are set to "Unknown" because they are not relevant to our library.
         * This approach eliminates the need for users to provide unnecessary properties when configuring the library.
         */
        const chain = defineChain({
            id: env.CHAIN_ID,
            name: "Unknown",
            rpcUrls: {
                default: {
                    http: this.protocol === "http" ? [env.RPC_URL] : [],
                    webSocket: this.protocol === "websocket" ? [env.RPC_URL] : [],
                },
            },
            nativeCurrency: {
                name: "Unknown",
                symbol: "UNKNOWN",
                decimals: 18,
            },
        })

        this.viemClient = createPublicClient({
            transport,
            chain,
        })

        this.txm = new TransactionManager({
            rpc: { url: env.RPC_URL },
            chainId: env.CHAIN_ID,
            blockTime: env.BLOCK_TIME,
            privateKey: env.PRIVATE_KEY,
        })
    }

    async start() {
        await this.txm.start()
        await this.initializeClient()
    }

    private async initializeClient() {
        await this.viemClient.watchBlocks({
            onBlock: this.onBlock.bind(this),
            ...(this.protocol === "http" ? { pollingInterval: 250 } : {}),
        })
    }

    private async onBlock(block: Block<bigint, false, "latest"> | undefined): Promise<void> {
        logger.info("Received block", { blockNumber: block?.number })
        if (!block) {
            return
        }

        for (const address of env.MONITOR_ADDRESSES) {
            const balance = await this.viemClient.getBalance({ address })

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

async function main() {
    try {
        const fundMonitor = new FundMonitor()
        await fundMonitor.start()
        logger.info("Fund monitor started successfully")
    } catch (error) {
        logger.error("Failed to start fund monitor:", { error })
        process.exit(1)
    }
}

main()
