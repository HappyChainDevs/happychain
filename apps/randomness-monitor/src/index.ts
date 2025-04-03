import { createPublicClient, defineChain, http, webSocket, type Block, type PublicClient, type Transport } from "viem"
import { MonitoringRepository } from "./MonitorigRepository"
import { Monitoring, MonitoringResult } from "./Monitoring"
import { getUrlProtocol } from "@happy.tech/common"
import { env } from "./env"
import { abis } from "@happy.tech/contracts/random/anvil"

const monitoringRepository = new MonitoringRepository()

const latestMonitoring = await monitoringRepository.findLatestMonitoring()

if (latestMonitoring.isErr()) {
    console.error(latestMonitoring.error)
    process.exit(1)
}

console.log(latestMonitoring.value)

const newMonitoring = new Monitoring(1n, BigInt(Date.now()), MonitoringResult.Success)

await monitoringRepository.saveMonitoring(newMonitoring)

console.log(await monitoringRepository.findLatestMonitoring())



export class MonitoringService {

    private readonly monitoringRepository: MonitoringRepository
    private viemClient!: PublicClient

    constructor() {
        this.monitoringRepository = new MonitoringRepository()
    }

    async start() {
        const protocol = getUrlProtocol(env.RPC_URL)

        if (protocol.isErr()) {
            throw protocol.error
        }

        let transport: Transport
        if (protocol.value === "http") {
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
                    http: protocol.value === "http" ? [env.RPC_URL] : [],
                    webSocket: protocol.value === "websocket" ? [env.RPC_URL] : [],
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

        const block = await this.viemClient.watchBlocks({
            onBlock: this.onBlock.bind(this),
            ...(protocol.value === "http" ? { pollingInterval: 250 } : {}),
        })

        console.log(block)
    }


    async onBlock(block: Block<bigint, false, "latest"> | undefined) {
        if (!block) {
            return
        }

        const blockNumber = block.number

        console.log(blockNumber)
        
        let result: Monitoring
        try {
            const random = await this.viemClient.readContract({
                address: env.RANDOM_CONTRACT_ADDRESS,
                abi: abis.Random,
                functionName: "random",
                blockNumber: blockNumber,
            })
            console.log(random)
            result = new Monitoring(blockNumber, block.timestamp, MonitoringResult.Success)
        } catch (error) {
            console.error(error)
            result = new Monitoring(blockNumber, block.timestamp, MonitoringResult.Failure)
        }

        await this.monitoringRepository.saveMonitoring(result)
    }

    
}

const monitoringService = new MonitoringService()

monitoringService.start()