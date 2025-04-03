import type { UUID } from "@happy.tech/common"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import type { Result } from "neverthrow"
import {
    type Abi,
    type Hex,
    type Transport as ViemTransport,
    createPublicClient,
    createWalletClient,
    defineChain,
    http as viemHttpTransport,
    webSocket as viemWebSocketTransport,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { ABIManager } from "./AbiManager.js"
import { BlockMonitor, type LatestBlock } from "./BlockMonitor.js"
import { DefaultGasLimitEstimator, type GasEstimator } from "./GasEstimator.js"
import { GasPriceOracle } from "./GasPriceOracle.js"
import { HookManager, type TxmHookHandler, type TxmHookType } from "./HookManager.js"
import { NonceManager } from "./NonceManager.js"
import { DefaultRetryPolicyManager, type RetryPolicyManager } from "./RetryPolicyManager.js"
import { RpcLivenessMonitor } from "./RpcLivenessMonitor"
import { Transaction, type TransactionConstructorConfig } from "./Transaction.js"
import { TransactionCollector } from "./TransactionCollector.js"
import { TransactionRepository } from "./TransactionRepository.js"
import { TransactionSubmitter } from "./TransactionSubmitter.js"
import { TxMonitor } from "./TxMonitor.js"
import { type EIP1559Parameters, opStackDefaultEIP1559Parameters } from "./eip1559.js"
import { initializeTelemetry } from "./telemetry/instrumentation"
import { TxmMetrics } from "./telemetry/metrics"
import { getUrlProtocol } from "./utils/getUrlProtocol"
import type { SafeViemPublicClient, SafeViemWalletClient } from "./utils/safeViemClients"
import { convertToSafeViemPublicClient, convertToSafeViemWalletClient } from "./utils/safeViemClients"

export type TransactionManagerConfig = {
    /**
     * The RPC node configuration
     */
    rpc: {
        /**
         * The url of the RPC node.
         * It can be a http or websocket url.
         */
        url: string
        /**
         * The timeout for the RPC node.
         * Defaults to 2000 milliseconds.
         */
        timeout?: number
        /**
         * The number of retries for the RPC node.
         * Defaults to 2.
         */
        retries?: number
        /**
         * The delay between retries.
         * Defaults to 50 milliseconds.
         */
        retryDelay?: number
        /**
         * Enables debug methods on the RPC node.
         * This is necessary for retrieving revert reasons for failed transactions
         * and for increasing precision in managing transactions that fail due to out-of-gas errors
         * Defaults to false.
         */
        allowDebug?: boolean

        /**
         * Specifies the polling interval in milliseconds.
         * Defaults to 1/2 of the block time.
         */
        pollingInterval?: number

        /**
         * The time without blocks before closing the connection to the RPC node and reconnecting.
         * Defaults to 4000 milliseconds.
         */
        blockInactivityTimeout?: number

        /**
         * The minimum success rate of RPC calls required to consider the RPC healthy.
         * Expressed as a decimal between 0 and 1.
         * Example: 0.85 means 85% of calls must be successful.
         * @default 0.85
         */
        livenessThreshold?: number

        /**
         * The monitoring window duration for evaluating RPC health.
         * The success rate is calculated based on RPC calls within this time frame.
         * @default 10000 (10 seconds)
         * @unit milliseconds
         */
        livenessWindow?: number

        /**
         * Number of successful consecutive chainId requests required to mark the RPC healthy again.
         * When marked unhealthy, the system will periodically send chainId requests
         * to check if the RPC has recovered.
         * @default 3
         */
        livenessSuccessCount?: number

        /**
         * Margin of time after the RPC is marked as unhealthy before the txm starts checking if it is healthy again.
         * @default 5000 (5 seconds)
         * @unit milliseconds
         */
        livenessDownDelay?: number

        /**
         * The interval between health check attempts for the RPC.
         * When unhealthy, the system will send chainId requests at this interval
         * until either the RPC recovers or the connection is terminated.
         * @default 2000 (2 seconds)
         * @unit milliseconds
         */
        livenessCheckInterval?: number
    }
    /** The private key of the account used for signing transactions. */
    privateKey: Hex

    /** Optional EIP-1559 parameters. If not provided, defaults to the OP stack's stock parameters. */
    eip1559?: EIP1559Parameters
    /**
     * Safety margin for transaction base fees, expressed as a percentage.
     * For example, a 20% increase should be represented as 20n.
     *
     * This is used to calculate the maximum fee per gas and safeguard from unanticipated or
     * unpredictable gas price increases, in particular when the transaction cannot be included in
     * the very next block.
     *
     * If not provided, defaults to 20n (20% increase).
     */
    baseFeePercentageMargin?: bigint
    /**
     * Optional maximum priority fee per gas.
     * This is the maximum amount of wei per gas the transaction is willing to pay as a tip to miners.
     * If not provided, defaults to 0n.
     */
    maxPriorityFeePerGas?: bigint

    /** The ABIs used by the TransactionManager.
     * This is a record of aliases to ABIs. The aliases are used to reference the ABIs in the
     * transactions.
     */
    abis: Record<string, Abi>

    /**
     * The expected interval (in seconds) for the creation of a new block on the blockchain.
     * Defaults to 2 seconds.
     */
    blockTime?: bigint

    /**
     * The chain ID of the blockchain.
     */
    chainId: number

    /**
     * The time (in milliseconds) after which finalized transactions are purged from the database.
     * If finalizedTransactionPurgeTime is 0, finalized transactions are not purged from the database.
     * Defaults to 2 minutes.
     */
    finalizedTransactionPurgeTime?: number

    /**
     * The gas estimator to use for estimating the gas limit of a transaction.
     * You can provide your own implementation to override the default one.
     * Default: {@link DefaultGasLimitEstimator}
     */
    gasEstimator?: GasEstimator

    /**
     * The retry policy manager to use for retrying failed transactions.
     * You can provide your own implementation to override the default one.
     * This is used to determine if a transaction should be retried based on the receipt of the transaction when it reverts.
     * Default: {@link DefaultRetryPolicyManager}
     */
    retryPolicyManager?: RetryPolicyManager

    /**
     * Transaction Manager metrics configuration.
     */
    metrics?: {
        /**
         * Whether to enable metrics collection.
         * Defaults to true.
         */
        active?: boolean
        /**
         * Port number for the default Prometheus metrics endpoint.
         * The default metric reader is a Prometheus reader that exposes metrics via this endpoint.
         * This setting is only used when custom metricReaders are not provided.
         * Defaults to 9090.
         */
        port?: number
        /**
         * Custom metric readers to use instead of the default Prometheus reader.
         * If provided, these readers will be used and the port setting will be ignored.
         * If not provided, a default Prometheus reader will be configured using the specified port.
         */
        metricReaders?: MetricReader[]
    }
}

export type TransactionOriginator = (block: LatestBlock) => Promise<Transaction[]>

/**
 * The TransactionManager is the core module of the transaction manager.
 * To use the transaction manager, you must instantiate this class.
 * Before using the transaction manager, call the {@link TransactionManager.start} method to start it.
 * Once started, use the {@link TransactionManager.addTransactionOriginator} method
 * to add a transaction originator and begin sending transactions to the blockchain.
 */
export class TransactionManager {
    public readonly collectors: TransactionOriginator[]
    public readonly blockMonitor: BlockMonitor
    public readonly viemWallet: SafeViemWalletClient
    public readonly viemClient: SafeViemPublicClient
    public readonly nonceManager: NonceManager
    public readonly gasPriceOracle: GasPriceOracle
    public readonly gasEstimator: GasEstimator
    public readonly abiManager: ABIManager
    public readonly pendingTxReporter: TxMonitor
    public readonly transactionRepository: TransactionRepository
    public readonly transactionCollector: TransactionCollector
    public readonly transactionSubmitter: TransactionSubmitter
    public readonly hookManager: HookManager
    public readonly retryPolicyManager: RetryPolicyManager
    public readonly rpcLivenessMonitor: RpcLivenessMonitor

    public readonly chainId: number
    public readonly eip1559: EIP1559Parameters
    public readonly baseFeeMargin: bigint
    public readonly maxPriorityFeePerGas: bigint
    public readonly rpcAllowDebug: boolean
    public readonly blockTime: bigint
    public readonly finalizedTransactionPurgeTime: number
    public readonly pollingInterval: number
    public readonly transportProtocol: "http" | "websocket"
    public readonly blockInactivityTimeout: number
    public readonly livenessWindow: number
    public readonly livenessThreshold: number
    public readonly livenessSuccessCount: number
    public readonly livenessDownDelay: number
    public readonly livenessCheckInterval: number

    constructor(_config: TransactionManagerConfig) {
        initializeTelemetry({
            active: _config.metrics?.active ?? true,
            port: _config.metrics?.port ?? 9090,
            metricReaders: _config.metrics?.metricReaders,
        })

        this.collectors = []

        const protocol = getUrlProtocol(_config.rpc.url)

        if (protocol.isErr()) {
            throw protocol.error
        }

        this.transportProtocol = protocol.value

        const retries = _config.rpc.retries || 2
        const retryDelay = _config.rpc.retryDelay || 50
        const timeout = _config.rpc.timeout || 2000

        let transport: ViemTransport
        if (this.transportProtocol === "http") {
            transport = viemHttpTransport(_config.rpc.url, {
                timeout,
                retryCount: retries,
                retryDelay,
            })
        } else {
            transport = viemWebSocketTransport(_config.rpc.url, {
                timeout,
                retryCount: retries,
                retryDelay,
            })
        }

        const account = privateKeyToAccount(_config.privateKey)

        /**
         * Define the viem chain object.
         * Certain properties required by viem are set to "Unknown" because they are not relevant to our library.
         * This approach eliminates the need for users to provide unnecessary properties when configuring the library.
         */
        const chain = defineChain({
            id: _config.chainId,
            name: "Unknown",
            rpcUrls: {
                default: {
                    http: protocol.value === "http" ? [_config.rpc.url] : [],
                    webSocket: protocol.value === "websocket" ? [_config.rpc.url] : [],
                },
            },
            nativeCurrency: {
                name: "Unknown",
                symbol: "UNKNOWN",
                decimals: 18,
            },
        })

        this.viemWallet = convertToSafeViemWalletClient(
            createWalletClient({
                account,
                transport,
                chain,
            }),
            {
                rpcCounter: TxmMetrics.getInstance().rpcCounter,
                rpcErrorCounter: TxmMetrics.getInstance().rpcErrorCounter,
                rpcResponseTimeHistogram: TxmMetrics.getInstance().blockchainRpcResponseTimeHistogram,
            },
        )

        this.viemClient = convertToSafeViemPublicClient(
            createPublicClient({
                transport,
                chain,
            }),
            {
                rpcCounter: TxmMetrics.getInstance().rpcCounter,
                rpcErrorCounter: TxmMetrics.getInstance().rpcErrorCounter,
                rpcResponseTimeHistogram: TxmMetrics.getInstance().blockchainRpcResponseTimeHistogram,
            },
        )

        this.nonceManager = new NonceManager(this)
        this.gasPriceOracle = new GasPriceOracle(this)
        this.gasEstimator = _config.gasEstimator || new DefaultGasLimitEstimator()
        this.blockMonitor = new BlockMonitor(this)
        this.pendingTxReporter = new TxMonitor(this)
        this.transactionRepository = new TransactionRepository(this)
        this.transactionCollector = new TransactionCollector(this)
        this.transactionSubmitter = new TransactionSubmitter(this)
        this.hookManager = new HookManager()
        this.retryPolicyManager = _config.retryPolicyManager ?? new DefaultRetryPolicyManager()
        this.rpcLivenessMonitor = new RpcLivenessMonitor(this)

        this.chainId = _config.chainId
        this.eip1559 = _config.eip1559 ?? opStackDefaultEIP1559Parameters
        this.abiManager = new ABIManager(_config.abis)

        this.baseFeeMargin = _config.baseFeePercentageMargin ?? 20n
        this.maxPriorityFeePerGas = _config.maxPriorityFeePerGas ?? 0n

        this.rpcAllowDebug = _config.rpc.allowDebug ?? false
        this.blockTime = _config.blockTime ?? 2n
        this.finalizedTransactionPurgeTime = _config.finalizedTransactionPurgeTime ?? 2 * 60 * 1000

        this.pollingInterval = _config.rpc.pollingInterval ?? (Number(this.blockTime) * 1000) / 2
        this.blockInactivityTimeout = _config.rpc.blockInactivityTimeout ?? 4000

        this.livenessWindow = _config.rpc.livenessWindow ?? 10000
        this.livenessThreshold = _config.rpc.livenessThreshold ?? 0.85
        this.livenessSuccessCount = _config.rpc.livenessSuccessCount ?? 3
        this.livenessDownDelay = _config.rpc.livenessDownDelay ?? 5000
        this.livenessCheckInterval = _config.rpc.livenessCheckInterval ?? 2000
    }

    /**
     * Adds an originator to the transaction manager.
     * An originator is a function that returns a list of transactions to be sent in the next block.
     * It is important that the originator function is as fast as possible to avoid delays when sending transactions to the blockchain
     * @param originator - The originator to add.
     */
    public addTransactionOriginator(originator: TransactionOriginator): void {
        this.collectors.push(originator)
    }

    /**
     * Adds a hook to the hook manager.
     * @param type - The type of hook to add.
     * @param handler - The handler function to add.
     */
    public addHook<T extends TxmHookType>(type: T, handler: TxmHookHandler<T>): () => void {
        return this.hookManager.addHook(type, handler)
    }

    public async getTransaction(txIntentId: UUID): Promise<Result<Transaction | undefined, Error>> {
        return this.transactionRepository.getTransaction(txIntentId)
    }

    /**
     * Creates a new transaction.
     * @param params - {@link TransactionConstructorConfig}.
     * @returns A new transaction.
     */
    public createTransaction(params: TransactionConstructorConfig): Transaction {
        return new Transaction({
            ...params,
            from: this.viemWallet.account.address,
            chainId: this.viemWallet.chain.id,
        })
    }

    public async start(): Promise<void> {
        // Start the gas price oracle to prevent other parts of the application from calling `suggestGasForNextBlock` before the gas price oracle has initialized the gas price after processing the first block
        const priceOraclePromise = this.gasPriceOracle.start()

        // Get the chain ID of the RPC node
        const rpcChainIdPromise = this.viemClient.safeGetChainId()

        // Start the transaction repository
        await this.transactionRepository.start()

        // Start the nonce manager, which depends on the transaction repository
        await this.nonceManager.start()

        const rpcChainId = await rpcChainIdPromise

        if (rpcChainId.isErr()) {
            throw rpcChainId.error
        }

        if (rpcChainId.value !== this.chainId) {
            const errorMessage = `The chain ID of the RPC node (${rpcChainId.value}) does not match the chain ID of the transaction manager (${this.chainId}).`
            throw new Error(errorMessage)
        }

        // Wait for the gas price oracle to initialize before starting the block monitor,
        // which emits 'NewBlock' events as the TXM heartbeat.
        await priceOraclePromise

        await this.blockMonitor.start()
    }
}
