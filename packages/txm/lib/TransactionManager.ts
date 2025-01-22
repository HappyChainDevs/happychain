import {
    type SafeViemPublicClient,
    type SafeViemWalletClient,
    type UUID,
    convertToSafeViemPublicClient,
    convertToSafeViemWalletClient,
    getUrlProtocol,
} from "@happy.tech/common"
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
import { Transaction, type TransactionConstructorConfig } from "./Transaction.js"
import { TransactionCollector } from "./TransactionCollector.js"
import { TransactionRepository } from "./TransactionRepository.js"
import { TransactionSubmitter } from "./TransactionSubmitter.js"
import { TxMonitor } from "./TxMonitor.js"
import { type EIP1559Parameters, opStackDefaultEIP1559Parameters } from "./eip1559.js"

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
         * Defaults to 500 milliseconds.
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

    public readonly chainId: number
    public readonly eip1559: EIP1559Parameters
    public readonly baseFeeMargin: bigint
    public readonly maxPriorityFeePerGas: bigint
    public readonly rpcAllowDebug: boolean
    public readonly blockTime: bigint
    public readonly finalizedTransactionPurgeTime: number

    constructor(_config: TransactionManagerConfig) {
        this.collectors = []

        const protocol = getUrlProtocol(_config.rpc.url)

        if (protocol.isErr()) {
            throw protocol.error
        }

        const retries = _config.rpc.retries || 2
        const retryDelay = _config.rpc.retryDelay || 50
        const timeout = _config.rpc.timeout || 500

        let transport: ViemTransport
        if (protocol.value === "http") {
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
        )

        this.viemClient = convertToSafeViemPublicClient(
            createPublicClient({
                transport,
                chain,
            }),
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
        this.retryPolicyManager = _config.retryPolicyManager || new DefaultRetryPolicyManager()

        this.chainId = _config.chainId
        this.eip1559 = _config.eip1559 || opStackDefaultEIP1559Parameters
        this.abiManager = new ABIManager(_config.abis)

        this.baseFeeMargin = _config.baseFeePercentageMargin || 20n
        this.maxPriorityFeePerGas = _config.maxPriorityFeePerGas || 0n

        this.rpcAllowDebug = _config.rpc.allowDebug || false
        this.blockTime = _config.blockTime || 2n
        this.finalizedTransactionPurgeTime = _config.finalizedTransactionPurgeTime || 2 * 60 * 1000
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
    public async addHook(handler: TxmHookHandler, type: TxmHookType): Promise<void> {
        await this.hookManager.addHook(handler, type)
    }

    public async getTransaction(txIntentId: UUID): Promise<Transaction | undefined> {
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

        // Await the completion of the gas price oracle startup before marking the TransactionManager as started
        await priceOraclePromise
    }
}
