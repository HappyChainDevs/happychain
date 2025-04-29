import { bigIntReplacer, unknownToError } from "@happy.tech/common"
import { getUrlProtocol } from "@happy.tech/common"
import { abis } from "@happy.tech/contracts/random/anvil"
import { type Result, err, ok } from "neverthrow"
import { http, type Block, type PublicClient, type Transport, createPublicClient, defineChain, webSocket } from "viem"
import { CheckRepository } from "./CheckRepository"
import { Check, CheckResult } from "./Check"
import { env } from "./env"
import { logger } from "./utils/logger"

/**
 * Main monitoring service for tracking blockchain randomness
 */
export class MonitoringService {
    private readonly checkRepository: CheckRepository
    private readonly viemClient: PublicClient
    private readonly protocol: "http" | "websocket"

    private latestBlockchainBlockNumber: bigint | undefined
    private latestMonitoringBlockNumber: bigint | undefined
    private isProcessing = false

    constructor() {
        this.checkRepository = new CheckRepository()

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
    }

    /**
     * Initialize and start the monitoring service
     */
    async start(): Promise<void> {
        await this.initializeClient()
        await this.initializeMonitoring()
    }

    /**
     * Initialize the blockchain client
     */
    private async initializeClient(): Promise<void> {
        await this.viemClient.watchBlocks({
            onBlock: this.onBlock.bind(this),
            ...(this.protocol === "http" ? { pollingInterval: 250 } : {}),
            onError: (error) => {
                console.error("Error in watching blocks:", error)
                process.exit(1)
            },
        })
    }

    /**
     * Initialize monitoring state from database
     */
    private async initializeMonitoring(): Promise<void> {
        const latestCheck = await this.checkRepository.findLatestCheck()

        if (latestCheck.isErr()) {
            console.error("Failed to retrieve latest check:", latestCheck.error)
            process.exit(1)
        }

        this.latestMonitoringBlockNumber = latestCheck.value?.blockNumber
        console.log("Starting monitoring from block:", this.latestMonitoringBlockNumber)
    }

    /**
     * Handle new blocks from the blockchain
     */
    private async onBlock(block: Block<bigint, false, "latest"> | undefined): Promise<void> {
        if (!block) {
            return
        }

        this.checkRepository.pruneChecks(block.timestamp)

        this.latestBlockchainBlockNumber = block.number

        await this.processPendingMonitoring()
    }

    /**
     * Process all blocks that haven't been monitored yet
     */
    private async processPendingMonitoring(): Promise<void> {
        if (this.isProcessing) {
            return
        }

        this.isProcessing = true

        try {
            if (!this.latestBlockchainBlockNumber) {
                return
            }

            if (!this.latestMonitoringBlockNumber) {
                this.latestMonitoringBlockNumber = this.latestBlockchainBlockNumber
            }

            let blockToMonitor = this.latestMonitoringBlockNumber + 1n
            const endBlock = this.latestBlockchainBlockNumber

            while (blockToMonitor < endBlock) {
                const result = await this.monitorBlock(blockToMonitor)
                if (result.isErr()) {
                    break
                }

                this.latestMonitoringBlockNumber = blockToMonitor
                blockToMonitor = blockToMonitor + 1n
            }
        } catch (error) {
            console.error("Error in processing monitoring:", error)
        } finally {
            this.isProcessing = false
        }
    }

    /**
     * Monitor a specific block for randomness
     */
    private async monitorBlock(blockNumber: bigint): Promise<Result<void, Error>> {
        logger.info(`Monitoring block ${blockNumber}`)

        let block: Block<bigint, false, "latest"> | undefined
        try {
            block = await this.viemClient.getBlock({
                blockNumber,
            })
        } catch (error) {
            console.error(`Failed to fetch block ${blockNumber}:`, error)
            return err(unknownToError(error))
        }

        if (!block) {
            console.warn(`Block ${blockNumber} not found`)
            return err(new Error(`Block ${blockNumber} not found`))
        }

        try {
            const random = await this.viemClient.readContract({
                address: env.RANDOM_CONTRACT_ADDRESS,
                abi: abis.Random,
                functionName: "random",
                blockNumber,
            })
            await this.checkRepository
                .saveCheck(
                    new Check(blockNumber, block.timestamp, CheckResult.Success, undefined, random),
                )
                .catch((error) => {
                    console.error("Error in saving check:", error)
                })
        } catch (err: unknown) {
            let errorMessage: string | undefined

            if (err && typeof err === "object" && "metaMessages" in err) {
                errorMessage = JSON.stringify(err.metaMessages, bigIntReplacer)
            } else {
                errorMessage = JSON.stringify(err, bigIntReplacer)
            }

            await this.checkRepository
                .saveCheck(new Check(blockNumber, block.timestamp, CheckResult.Failure, errorMessage))
                .catch((error) => {
                    console.error("Error in saving check:", error)
                })
        }

        return ok(undefined)
    }
}

async function main() {
    try {
        const monitoringService = new MonitoringService()
        await monitoringService.start()
        console.log("Monitoring service started successfully")
    } catch (error) {
        console.error("Failed to start monitoring service:", error)
        process.exit(1)
    }
}

main()
